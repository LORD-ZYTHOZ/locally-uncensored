/**
 * useMemory — Hook for memory operations including LLM-based auto-extraction.
 *
 * Fires a separate inference call to analyze conversation exchanges and
 * extract memorable information. Errors are caught silently — extraction
 * failures must never disrupt the chat experience.
 */

import { useCallback } from 'react'
import { useMemoryStore } from '../stores/memoryStore'
import { useModelStore } from '../stores/modelStore'
import { getProviderForModel } from '../api/providers'
import { buildExtractionPrompt, parseExtractionResponse } from '../lib/memory-extraction'

export function useMemory() {
  /**
   * Fire-and-forget extraction: asks the active LLM to analyze a conversation
   * exchange and save any extracted memories.
   */
  const extractAndSave = useCallback(async (
    userMessage: string,
    assistantResponse: string,
    conversationId: string
  ) => {
    try {
      const { activeModel } = useModelStore.getState()
      if (!activeModel) return

      const memState = useMemoryStore.getState()
      if (!memState.settings.autoExtractEnabled) return

      // Build summary of existing memories to prevent duplicates
      const existingSummary = memState.entries
        .slice(-20)
        .map(e => `- [${e.type}] ${e.title}`)
        .join('\n')

      const messages = buildExtractionPrompt(userMessage, assistantResponse, existingSummary)

      // Use active provider for extraction call
      const { provider, modelId } = getProviderForModel(activeModel)

      // Collect full response via streaming
      let fullResponse = ''
      const stream = provider.chatStream(modelId, messages, {
        temperature: 0.1,
        maxTokens: 500,
      })

      for await (const chunk of stream) {
        if (chunk.content) fullResponse += chunk.content
        if (chunk.done) break
      }

      // Parse and save
      const result = parseExtractionResponse(fullResponse)
      if (result.shouldSave) {
        for (const memory of result.memories) {
          memState.addMemory({
            type: memory.type,
            title: memory.title,
            description: memory.description,
            content: memory.content,
            tags: memory.tags,
            source: conversationId,
          })
        }
      }
    } catch {
      // Extraction failures are non-critical — silently swallowed
    }
  }, [])

  return { extractAndSave }
}
