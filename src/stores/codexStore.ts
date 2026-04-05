import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMode, CodexThread, CodexEvent, FileTreeNode } from '../types/codex'

interface CodexState {
  chatMode: ChatMode
  threads: Record<string, CodexThread>
  workingDirectory: string
  fileTree: FileTreeNode[]

  setChatMode: (mode: ChatMode) => void
  setWorkingDirectory: (dir: string) => void
  setFileTree: (tree: FileTreeNode[]) => void

  getThread: (conversationId: string) => CodexThread | undefined
  initThread: (conversationId: string, workingDir: string) => string
  addEvent: (conversationId: string, event: CodexEvent) => void
  setThreadStatus: (conversationId: string, status: CodexThread['status']) => void
}

export const useCodexStore = create<CodexState>()(
  persist(
    (set, get) => ({
      chatMode: 'lu',
      threads: {},
      workingDirectory: '',
      fileTree: [],

      setChatMode: (mode) => set({ chatMode: mode }),
      setWorkingDirectory: (dir) => set({ workingDirectory: dir }),
      setFileTree: (tree) => set({ fileTree: tree }),

      getThread: (conversationId) => get().threads[conversationId],

      initThread: (conversationId, workingDir) => {
        const id = `codex-${Date.now()}`
        set((state) => ({
          threads: {
            ...state.threads,
            [conversationId]: {
              id,
              conversationId,
              events: [],
              status: 'idle',
              workingDirectory: workingDir,
            },
          },
        }))
        return id
      },

      addEvent: (conversationId, event) =>
        set((state) => {
          const thread = state.threads[conversationId]
          if (!thread) return state
          return {
            threads: {
              ...state.threads,
              [conversationId]: {
                ...thread,
                events: [...thread.events, event],
              },
            },
          }
        }),

      setThreadStatus: (conversationId, status) =>
        set((state) => {
          const thread = state.threads[conversationId]
          if (!thread) return state
          return {
            threads: {
              ...state.threads,
              [conversationId]: { ...thread, status },
            },
          }
        }),
    }),
    {
      name: 'locally-uncensored-codex',
      partialize: (state) => ({
        chatMode: state.chatMode,
        workingDirectory: state.workingDirectory,
      }),
    }
  )
)
