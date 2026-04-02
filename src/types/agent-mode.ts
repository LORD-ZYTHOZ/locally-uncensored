// Agent Mode — Type Definitions
// Part of the Agent Mode feature (coding-orch branch)

// Permission tiers (Claude Code pattern)
export type ToolPermission = 'auto' | 'confirm'

// Tool definition for internal use
export interface AgentToolDef {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, {
      type: string
      description: string
      enum?: string[]
    }>
    required: string[]
  }
  permission: ToolPermission
}

// Ollama tool format (sent in API request)
export interface OllamaTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, any>
      required: string[]
    }
  }
}

// What Ollama returns when the model calls a tool
export interface OllamaToolCall {
  function: {
    name: string
    arguments: Record<string, any>
  }
}

// Ollama chat message format (extended for tool calling)
export interface OllamaChatMessage {
  role: string
  content: string
  tool_calls?: OllamaToolCall[]
}

// Streaming chunk format for agent chat
export interface AgentChatChunk {
  message?: {
    content: string
    role?: string
    tool_calls?: OllamaToolCall[]
  }
  done?: boolean
}

// Tool call lifecycle status
export type ToolCallStatus = 'pending_approval' | 'running' | 'completed' | 'failed' | 'rejected'

// Internal tracking of a tool call
export interface AgentToolCall {
  id: string
  toolName: string
  args: Record<string, any>
  status: ToolCallStatus
  result?: string
  error?: string
  duration?: number
  timestamp: number
}

// Phases rendered as distinct UI blocks in chat
export type AgentPhase = 'thinking' | 'planning' | 'tool_call' | 'reflection' | 'answer'

// A block in the agent's response (tool call, thinking, etc.)
export interface AgentBlock {
  id: string
  phase: AgentPhase
  content: string
  toolCall?: AgentToolCall
  timestamp: number
}

// Sandbox configuration
export type SandboxLevel = 'restricted' | 'full'

// ── Memory System ─────────────────────────────────────────────

export type MemoryCategory = 'fact' | 'tool_result' | 'decision' | 'context'

export interface MemoryEntry {
  id: string
  category: MemoryCategory
  content: string
  timestamp: number
  source?: string // e.g. "agent:web_search", "user:manual", "auto:extraction"
}
