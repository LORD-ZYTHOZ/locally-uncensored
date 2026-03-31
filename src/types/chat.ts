export type Role = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  role: Role
  content: string
  thinking?: string
  timestamp: number
  sources?: { documentName: string; chunkIndex: number; preview: string }[]
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
