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

// Legacy categories (kept for migration)
export type MemoryCategory = 'fact' | 'tool_result' | 'decision' | 'context'

export interface MemoryEntry {
  id: string
  category: MemoryCategory
  content: string
  timestamp: number
  source?: string // e.g. "agent:web_search", "user:manual", "auto:extraction"
}

// ── Enhanced Memory System (Claude Code-inspired) ─────────────

export type MemoryType = 'user' | 'feedback' | 'project' | 'reference'

export interface MemoryFile {
  id: string
  type: MemoryType
  title: string       // ~60 chars, index-friendly
  description: string // ~120 chars, one-line hook for relevance matching
  content: string     // full text
  tags: string[]
  createdAt: number
  updatedAt: number
  source: string      // conversationId | 'manual' | 'auto:extraction'
}

export interface MemorySettings {
  autoExtractEnabled: boolean    // default false — opt-in (costs extra inference)
  autoExtractInAllModes: boolean // default false — whether to also extract outside agent mode
  maxMemoriesInPrompt: number    // default 10
  maxMemoryChars: number         // default 3000
}

// Migration map: old category → new type
export const MEMORY_MIGRATION_MAP: Record<MemoryCategory, MemoryType> = {
  fact: 'user',
  tool_result: 'reference',
  decision: 'project',
  context: 'project',
}

// Context-aware memory budget tiers
export interface MemoryBudgetTier {
  maxContext: number   // upper bound of model context
  budgetTokens: number // tokens allocated for memory
  maxMemories: number  // max entries to inject
  typesAllowed: MemoryType[] | 'all'
}

export const MEMORY_BUDGET_TIERS: MemoryBudgetTier[] = [
  { maxContext: 2048,   budgetTokens: 0,    maxMemories: 0,  typesAllowed: [] },
  { maxContext: 4096,   budgetTokens: 300,  maxMemories: 3,  typesAllowed: ['user', 'feedback'] },
  { maxContext: 8192,   budgetTokens: 800,  maxMemories: 8,  typesAllowed: 'all' },
  { maxContext: 131072, budgetTokens: 2000, maxMemories: 15, typesAllowed: 'all' },
  { maxContext: Infinity, budgetTokens: 4000, maxMemories: 25, typesAllowed: 'all' },
]
