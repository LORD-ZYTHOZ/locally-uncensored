import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import type { MemoryEntry, MemoryCategory } from '../types/agent-mode'

interface MemoryState {
  entries: MemoryEntry[]
  lastSynced: number

  // Actions
  addEntry: (category: MemoryCategory, content: string, source?: string) => void
  removeEntry: (id: string) => void
  clearAll: () => void
  searchMemory: (query: string) => MemoryEntry[]
  getMemoryForPrompt: (query: string, maxChars?: number) => string
  exportAsMarkdown: () => string
  importFromMarkdown: (markdown: string) => void
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      entries: [],
      lastSynced: 0,

      addEntry: (category, content, source) => {
        const trimmed = content.trim()
        if (!trimmed) return

        // Deduplicate: don't add if exact same content already exists
        const existing = get().entries
        if (existing.some(e => e.content === trimmed && e.category === category)) return

        set((state) => ({
          entries: [
            ...state.entries,
            {
              id: uuid(),
              category,
              content: trimmed,
              timestamp: Date.now(),
              source,
            },
          ],
          lastSynced: Date.now(),
        }))
      },

      removeEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
          lastSynced: Date.now(),
        })),

      clearAll: () => set({ entries: [], lastSynced: Date.now() }),

      searchMemory: (query) => {
        const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
        if (words.length === 0) return get().entries.slice(-20) // return recent

        return get().entries
          .map((entry) => {
            const text = entry.content.toLowerCase()
            const score = words.reduce((s, w) => s + (text.includes(w) ? 1 : 0), 0)
            return { entry, score }
          })
          .filter(({ score }) => score > 0)
          .sort((a, b) => b.score - a.score)
          .map(({ entry }) => entry)
      },

      getMemoryForPrompt: (query, maxChars = 2000) => {
        const relevant = get().searchMemory(query)
        if (relevant.length === 0) return ''

        const categoryLabels: Record<MemoryCategory, string> = {
          fact: 'Known fact',
          tool_result: 'Previous result',
          decision: 'Decision',
          context: 'Context',
        }

        let result = ''
        for (const entry of relevant) {
          const line = `- [${categoryLabels[entry.category]}] ${entry.content}\n`
          if (result.length + line.length > maxChars) break
          result += line
        }

        return result
      },

      exportAsMarkdown: () => {
        const entries = get().entries
        if (entries.length === 0) return '# Agent Memory\n\nNo entries yet.\n'

        const categoryOrder: MemoryCategory[] = ['fact', 'tool_result', 'decision', 'context']
        const categoryTitles: Record<MemoryCategory, string> = {
          fact: 'Facts',
          tool_result: 'Tool Results',
          decision: 'Decisions',
          context: 'Context',
        }

        let md = '# Agent Memory\n\n'

        for (const cat of categoryOrder) {
          const catEntries = entries.filter(e => e.category === cat)
          if (catEntries.length === 0) continue

          md += `## ${categoryTitles[cat]}\n\n`
          for (const entry of catEntries) {
            const date = new Date(entry.timestamp).toLocaleDateString()
            md += `- ${entry.content}`
            if (entry.source) md += ` *(${entry.source})*`
            md += ` — ${date}\n`
          }
          md += '\n'
        }

        return md
      },

      importFromMarkdown: (markdown) => {
        const lines = markdown.split('\n')
        const newEntries: MemoryEntry[] = []
        let currentCategory: MemoryCategory = 'fact'

        const categoryMap: Record<string, MemoryCategory> = {
          'facts': 'fact',
          'tool results': 'tool_result',
          'decisions': 'decision',
          'context': 'context',
        }

        for (const line of lines) {
          // Detect category headers
          const headerMatch = line.match(/^##\s+(.+)/)
          if (headerMatch) {
            const header = headerMatch[1].toLowerCase().trim()
            if (categoryMap[header]) {
              currentCategory = categoryMap[header]
            }
            continue
          }

          // Parse list items
          const itemMatch = line.match(/^-\s+(.+?)(?:\s+\*\((.+?)\)\*)?(?:\s+—\s+.+)?$/)
          if (itemMatch) {
            const content = itemMatch[1].trim()
            const source = itemMatch[2] || 'import'
            if (content) {
              newEntries.push({
                id: uuid(),
                category: currentCategory,
                content,
                timestamp: Date.now(),
                source,
              })
            }
          }
        }

        if (newEntries.length > 0) {
          set((state) => ({
            entries: [...state.entries, ...newEntries],
            lastSynced: Date.now(),
          }))
        }
      },
    }),
    { name: 'locally-uncensored-memory' }
  )
)
