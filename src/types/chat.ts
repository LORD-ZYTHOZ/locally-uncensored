import type { AgentBlock } from './agent-mode'

export type Role = 'user' | 'assistant' | 'system' | 'tool'

export interface Message {
  id: string
  role: Role
  content: string
  thinking?: string
  timestamp: number
  sources?: { documentName: string; chunkIndex: number; preview: string }[]
  // Agent Mode fields
  agentBlocks?: AgentBlock[]
  toolCallSummary?: string
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  model: string
  systemPrompt: string
  createdAt: number
  updatedAt: number
}
