import { useRef, useState, useCallback } from 'react'
import { v4 as uuid } from 'uuid'
import { chatWithTools } from '../api/ollama'
import { chatNonStreaming } from '../api/agents'
import { useChatStore } from '../stores/chatStore'
import { agentVariantExists, createAgentVariant, getAgentModelName, canFixModel } from '../api/model-template-fix'
import { useModelStore } from '../stores/modelStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useRAGStore } from '../stores/ragStore'
import { useVoiceStore } from '../stores/voiceStore'
import { retrieveContext } from '../api/rag'
import { speakStreaming, isSpeechSynthesisSupported, getVoicesAsync } from '../api/voice'
import { getOllamaTools, getToolPermission, executeAgentTool, AGENT_TOOL_DEFS } from '../api/tool-registry'
import { getToolCallingStrategy, type ToolCallingStrategy } from '../lib/model-compatibility'
import { buildHermesToolPrompt, buildHermesToolResult, parseHermesToolCalls, stripToolCallTags, hasToolCallTags } from '../api/hermes-tool-calling'
import { compactMessages, getModelMaxTokens } from '../lib/context-compaction'
import { useMemoryStore } from '../stores/memoryStore'
import type { AgentBlock, AgentToolCall, OllamaChatMessage } from '../types/agent-mode'

// ── Approval promise management ───────────────────────────────────

interface ApprovalResolver {
  resolve: (approved: boolean) => void
}

// ── Hook ──────────────────────────────────────────────────────────

export function useAgentChat() {
  const [isAgentRunning, setIsAgentRunning] = useState(false)
  const [pendingApproval, setPendingApproval] = useState<AgentToolCall | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const approvalRef = useRef<ApprovalResolver | null>(null)
  const contentRef = useRef('')
  const thinkingRef = useRef('')
  const isThinkingRef = useRef(false)
  const blocksRef = useRef<AgentBlock[]>([])
  const runningRef = useRef(false)

  // ── Approval callbacks ────────────────────────────────────────

  const approveToolCall = useCallback(() => {
    approvalRef.current?.resolve(true)
    approvalRef.current = null
    setPendingApproval(null)
  }, [])

  const rejectToolCall = useCallback(() => {
    approvalRef.current?.resolve(false)
    approvalRef.current = null
    setPendingApproval(null)
  }, [])

  // ── Wait for user approval ────────────────────────────────────

  function waitForApproval(toolCall: AgentToolCall): Promise<boolean> {
    return new Promise((resolve) => {
      approvalRef.current = { resolve }
      setPendingApproval(toolCall)
    })
  }

  // ── Add agent block and sync to store ─────────────────────────

  function addBlock(
    convId: string,
    msgId: string,
    block: AgentBlock
  ) {
    blocksRef.current = [...blocksRef.current, block]
    useChatStore.getState().updateMessageAgentBlocks(convId, msgId, blocksRef.current)
  }

  function updateLastBlock(
    convId: string,
    msgId: string,
    updates: Partial<AgentBlock>
  ) {
    const blocks = [...blocksRef.current]
    const last = blocks[blocks.length - 1]
    if (last) {
      blocks[blocks.length - 1] = { ...last, ...updates }
      blocksRef.current = blocks
      useChatStore.getState().updateMessageAgentBlocks(convId, msgId, blocks)
    }
  }

  // ── Stream a single LLM turn ──────────────────────────────────

  async function streamOneTurn(
    model: string,
    messages: OllamaChatMessage[],
    signal: AbortSignal
  ): Promise<{ content: string; thinking: string; toolCalls: { name: string; arguments: Record<string, any> }[] }> {
    const response = await chatStreamWithTools(
      model,
      messages,
      getOllamaTools(),
      {
        temperature: useSettingsStore.getState().settings.temperature,
        top_p: useSettingsStore.getState().settings.topP,
        top_k: useSettingsStore.getState().settings.topK,
        num_predict: useSettingsStore.getState().settings.maxTokens || undefined,
      },
      signal
    )

    let accContent = ''
    let accThinking = ''
    let isInThinking = false
    let toolCalls: { name: string; arguments: Record<string, any> }[] = []

    for await (const chunk of parseNDJSONStream<AgentChatChunk>(response)) {
      if (signal.aborted) break

      // Collect tool calls from the response
      if (chunk.message?.tool_calls) {
        for (const tc of chunk.message.tool_calls) {
          toolCalls.push({
            name: tc.function.name,
            arguments: tc.function.arguments,
          })
        }
      }

      // Stream text content with <think> tag parsing
      if (chunk.message?.content) {
        for (const char of chunk.message.content) {
          if (!isInThinking) {
            accContent += char
            if (accContent.endsWith('<think>')) {
              accContent = accContent.slice(0, -7)
              isInThinking = true
            }
          } else {
            accThinking += char
            if (accThinking.endsWith('</think>')) {
              accThinking = accThinking.slice(0, -8)
              isInThinking = false
            }
          }
        }

        // Update refs for UI batching
        contentRef.current = accContent
        thinkingRef.current = accThinking
      }
    }

    return { content: accContent, thinking: accThinking, toolCalls }
  }

  // ── Main agent message handler ────────────────────────────────

  const sendAgentMessage = useCallback(async (userContent: string) => {
    const { activeModel } = useModelStore.getState()
    const { settings } = useSettingsStore.getState()
    const store = useChatStore.getState()
    const persona = useSettingsStore.getState().getActivePersona()

    if (!activeModel) return

    // ── Pre-flight: determine tool calling strategy ──────────
    let modelToUse = activeModel
    let strategy: ToolCallingStrategy = getToolCallingStrategy(activeModel)

    if (strategy === 'template_fix') {
      // Try to use existing agent variant, or create one
      const agentName = getAgentModelName(activeModel)
      const exists = await agentVariantExists(activeModel)

      if (exists) {
        modelToUse = agentName
        strategy = 'native' // template-fixed models use native API
      } else {
        const { fixable } = await canFixModel(activeModel)
        if (fixable) {
          try {
            modelToUse = await createAgentVariant(activeModel)
            strategy = 'native'
          } catch {
            strategy = 'hermes_xml' // fallback to prompt-based
          }
        } else {
          strategy = 'hermes_xml'
        }
      }
    }

    // Create or get conversation
    let convId = store.activeConversationId
    if (!convId) {
      convId = store.createConversation(activeModel, persona?.systemPrompt || '')
    }

    // Add user message
    const userMessage = {
      id: uuid(),
      role: 'user' as const,
      content: userContent,
      timestamp: Date.now(),
    }
    useChatStore.getState().addMessage(convId, userMessage)

    // Add empty assistant message (will be updated with streaming content + blocks)
    const assistantMessage = {
      id: uuid(),
      role: 'assistant' as const,
      content: '',
      thinking: '',
      timestamp: Date.now(),
      agentBlocks: [],
    }
    useChatStore.getState().addMessage(convId, assistantMessage)

    // Build conversation context
    const conv = useChatStore.getState().conversations.find((c) => c.id === convId)
    if (!conv) return

    // RAG context injection (same as useChat)
    let systemPrompt = conv.systemPrompt
    const ragState = useRAGStore.getState()
    const ragEnabled = ragState.ragEnabled[convId] ?? false

    if (ragEnabled) {
      await ragState.loadChunksFromDB(convId)
      const chunks = ragState.getConversationChunks(convId)
      if (chunks.length > 0) {
        try {
          const { context: ragContext } = await retrieveContext(
            userContent, chunks, ragState.embeddingModel
          )
          if (ragContext.chunks.length > 0) {
            const contextBlock = ragContext.chunks
              .map((c: any, i: number) => `[Source ${i + 1}]\n${c.content}`)
              .join('\n\n')
            systemPrompt = `Use the following document context to help answer the user's question. If the context is not relevant, ignore it and answer normally.\n\n---\n${contextBlock}\n---\n\n${systemPrompt || ''}`
          }
        } catch (err) {
          console.error('RAG retrieval failed:', err)
        }
      }
    }

    // Memory context injection
    const memoryContext = useMemoryStore.getState().getMemoryForPrompt(userContent, 2000)
    if (memoryContext) {
      systemPrompt = (systemPrompt || '') + `\n\n## Remembered Context\n${memoryContext}`
    }

    // Build the agent system prompt — Hermes XML mode gets tool defs in the prompt
    const agentSystemPrompt = strategy === 'hermes_xml'
      ? buildHermesToolPrompt(AGENT_TOOL_DEFS) + (systemPrompt ? `\n\n${systemPrompt}` : '')
      : buildAgentSystemPrompt(systemPrompt)

    // Build messages array for Ollama (internal, includes tool messages)
    let ollamaMessages: OllamaChatMessage[] = [
      ...(agentSystemPrompt ? [{ role: 'system', content: agentSystemPrompt }] : []),
      ...conv.messages
        .filter((m) => m.role !== 'system' && m.content.trim() !== '')
        .map((m) => ({ role: m.role, content: m.content })),
    ]

    // Setup
    const abort = new AbortController()
    abortRef.current = abort
    runningRef.current = true
    setIsAgentRunning(true)
    contentRef.current = ''
    thinkingRef.current = ''
    blocksRef.current = []

    let frameScheduled = false

    // Schedule UI updates via requestAnimationFrame
    function scheduleUIUpdate() {
      if (!frameScheduled) {
        frameScheduled = true
        requestAnimationFrame(() => {
          const cId = convId!
          const mId = assistantMessage.id
          useChatStore.getState().updateMessageContent(cId, mId, contentRef.current)
          if (thinkingRef.current) {
            useChatStore.getState().updateMessageThinking(cId, mId, thinkingRef.current)
          }
          frameScheduled = false
        })
      }
    }

    try {
      // ── Agent Loop ──────────────────────────────────────────
      while (runningRef.current && !abort.signal.aborted) {
        let toolCalls: { name: string; arguments: Record<string, any> }[] = []
        let turnContent = ''
        let turnThinking = ''

        const chatOptions = {
          temperature: useSettingsStore.getState().settings.temperature,
          top_p: useSettingsStore.getState().settings.topP,
          top_k: useSettingsStore.getState().settings.topK,
          num_predict: useSettingsStore.getState().settings.maxTokens || undefined,
        }

        // Context compaction — prevent "Failed to fetch" from context overflow
        const maxCtx = await getModelMaxTokens(modelToUse)
        ollamaMessages = compactMessages(ollamaMessages, Math.floor(maxCtx * 0.8))

        if (strategy === 'native') {
          // ── Native Ollama tool calling (non-streaming for reliability) ──
          const turn = await chatWithTools(
            modelToUse, ollamaMessages, getOllamaTools(), chatOptions,
          )

          toolCalls = (turn.tool_calls || []).map((tc: any) => ({
            name: tc.function.name,
            arguments: tc.function.arguments,
          }))
          turnContent = turn.content || ''

        } else {
          // ── Hermes XML prompt-based tool calling ──
          // Tools are already in the system prompt, just do a normal chat
          const rawContent = await chatNonStreaming(
            modelToUse,
            ollamaMessages.map(m => ({ role: m.role, content: m.content })),
          )

          // Parse <tool_call> tags from output
          if (hasToolCallTags(rawContent)) {
            toolCalls = parseHermesToolCalls(rawContent)
            turnContent = stripToolCallTags(rawContent)
          } else {
            turnContent = rawContent
          }
        }

        // Parse think tags from content (both strategies)
        const thinkMatch = turnContent.match(/<think>([\s\S]*?)<\/think>/)
        if (thinkMatch) {
          turnThinking = thinkMatch[1]
          turnContent = turnContent.replace(/<think>[\s\S]*?<\/think>/, '').trim()
        }

        // Update UI
        contentRef.current = turnContent
        thinkingRef.current = turnThinking
        scheduleUIUpdate()

        // If no tool calls, the model is done
        if (toolCalls.length === 0) {
          break
        }

        // Process each tool call
        for (const tc of toolCalls) {
          if (!runningRef.current || abort.signal.aborted) break

          const toolCallId = uuid()
          const agentToolCall: AgentToolCall = {
            id: toolCallId,
            toolName: tc.name,
            args: tc.arguments,
            status: 'running',
            timestamp: Date.now(),
          }

          // Check permission
          const permission = getToolPermission(tc.name)

          if (permission === 'confirm') {
            // Needs user approval
            agentToolCall.status = 'pending_approval'
            addBlock(convId!, assistantMessage.id, {
              id: uuid(),
              phase: 'tool_call',
              content: `Requesting approval: ${tc.name}`,
              toolCall: agentToolCall,
              timestamp: Date.now(),
            })

            const approved = await waitForApproval(agentToolCall)

            if (!approved) {
              // User rejected
              agentToolCall.status = 'rejected'
              updateLastBlock(convId!, assistantMessage.id, {
                toolCall: { ...agentToolCall, status: 'rejected' },
                content: `Rejected: ${tc.name}`,
              })

              // Feed rejection back to model
              if (strategy === 'native') {
                ollamaMessages.push({
                  role: 'assistant',
                  content: '',
                  tool_calls: [{ function: { name: tc.name, arguments: tc.arguments } }],
                })
                ollamaMessages.push({
                  role: 'tool',
                  content: 'User rejected this action. Try a different approach.',
                })
              } else {
                ollamaMessages.push({
                  role: 'assistant',
                  content: `<tool_call>\n{"name": "${tc.name}", "arguments": ${JSON.stringify(tc.arguments)}}\n</tool_call>`,
                })
                ollamaMessages.push({
                  role: 'user',
                  content: buildHermesToolResult(tc.name, 'User rejected this action. Try a different approach.'),
                })
              }
              continue
            }

            // Approved — mark as running
            agentToolCall.status = 'running'
            updateLastBlock(convId!, assistantMessage.id, {
              toolCall: { ...agentToolCall, status: 'running' },
              content: `Running: ${tc.name}`,
            })
          } else {
            // Auto-approved
            addBlock(convId!, assistantMessage.id, {
              id: uuid(),
              phase: 'tool_call',
              content: `Running: ${tc.name}`,
              toolCall: agentToolCall,
              timestamp: Date.now(),
            })
          }

          // Execute the tool
          const startTime = Date.now()
          const result = await executeAgentTool(tc.name, tc.arguments)
          const duration = Date.now() - startTime

          // Update block with result
          const isError = result.startsWith('Error:')
          agentToolCall.status = isError ? 'failed' : 'completed'
          agentToolCall.result = isError ? undefined : result
          agentToolCall.error = isError ? result : undefined
          agentToolCall.duration = duration

          updateLastBlock(convId!, assistantMessage.id, {
            toolCall: { ...agentToolCall },
            content: isError ? `Failed: ${tc.name}` : `Completed: ${tc.name}`,
          })

          // Auto-save tool result to memory
          if (!isError) {
            const argsShort = JSON.stringify(tc.arguments).substring(0, 100)
            const resultShort = result.substring(0, 200)
            useMemoryStore.getState().addEntry(
              'tool_result',
              `${tc.name}(${argsShort}) → ${resultShort}`,
              `agent:${tc.name}`
            )
          }

          // Append tool call + result to messages for next iteration
          if (strategy === 'native') {
            ollamaMessages.push({
              role: 'assistant',
              content: turnContent || '',
              tool_calls: [{ function: { name: tc.name, arguments: tc.arguments } }],
            })
            ollamaMessages.push({
              role: 'tool',
              content: result,
            })
          } else {
            // Hermes XML: assistant had <tool_call> tags, result goes as user <tool_response>
            ollamaMessages.push({
              role: 'assistant',
              content: `<tool_call>\n{"name": "${tc.name}", "arguments": ${JSON.stringify(tc.arguments)}}\n</tool_call>`,
            })
            ollamaMessages.push({
              role: 'user',
              content: buildHermesToolResult(tc.name, result),
            })
          }
        }

        // Reset content for next iteration (model will produce new content)
        contentRef.current = ''
        thinkingRef.current = ''
      }

      // Final store update
      useChatStore.getState().updateMessageContent(
        convId!, assistantMessage.id, contentRef.current
      )
      if (thinkingRef.current) {
        useChatStore.getState().updateMessageThinking(
          convId!, assistantMessage.id, thinkingRef.current
        )
      }

    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const errorMsg = (err as Error).message || 'Connection failed'

        if (errorMsg.includes('does not support tools')) {
          useChatStore.getState().updateMessageContent(
            convId!, assistantMessage.id,
            `⚠️ This model does not support tool calling.\n\nThe auto-fix could not be applied. Try pulling a standard model like:\n• qwen2.5:7b\n• llama3.1:8b\n• mistral:7b`
          )
        } else {
          useChatStore.getState().updateMessageContent(
            convId!, assistantMessage.id,
            contentRef.current + '\n\n⚠️ Agent error: ' + errorMsg
          )
        }
      }
    } finally {
      setIsAgentRunning(false)
      runningRef.current = false
      abortRef.current = null
      setPendingApproval(null)
      approvalRef.current = null

      // Auto-speak if TTS enabled
      const voiceState = useVoiceStore.getState()
      if (voiceState.ttsEnabled && isSpeechSynthesisSupported() && contentRef.current.trim()) {
        try {
          let voice: SpeechSynthesisVoice | undefined
          if (voiceState.ttsVoice) {
            const voices = await getVoicesAsync()
            voice = voices.find((v) => v.name === voiceState.ttsVoice)
          }
          voiceState.setSpeaking(true)
          await speakStreaming(contentRef.current, voice, voiceState.ttsRate, voiceState.ttsPitch)
        } catch { /* TTS errors non-critical */ }
        finally { voiceState.setSpeaking(false) }
      }
    }
  }, [])

  // ── Stop the agent ────────────────────────────────────────────

  const stopAgent = useCallback(() => {
    runningRef.current = false
    abortRef.current?.abort()
    // Also resolve any pending approval to unblock the loop
    approvalRef.current?.resolve(false)
    approvalRef.current = null
    setPendingApproval(null)
  }, [])

  return {
    sendAgentMessage,
    stopAgent,
    approveToolCall,
    rejectToolCall,
    isAgentRunning,
    pendingApproval,
  }
}

// ── Agent System Prompt Builder ─────────────────────────────────

function buildAgentSystemPrompt(basePrompt: string): string {
  const agentInstructions = `You are an autonomous AI agent. You MUST use tools — NEVER answer from memory.

IMPORTANT: web_search returns ONLY short snippets, NOT real data. You MUST ALWAYS call web_fetch on the best URL to read the actual page content before answering.

Workflow:
1. web_search → get URLs
2. web_fetch → read actual page content from the best URL
3. Answer based on real data from web_fetch

Other tools: file_read, file_write, code_execute, image_generate.
Chain multiple tools as needed. If a tool fails, try a different approach.
Respond in the same language the user uses.`

  if (basePrompt) {
    return `${agentInstructions}\n\n${basePrompt}`
  }
  return agentInstructions
}
