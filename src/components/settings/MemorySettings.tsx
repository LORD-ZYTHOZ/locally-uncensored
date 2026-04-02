import { useState, useRef } from 'react'
import { Brain, Download, Upload, Trash2, Search, Tag } from 'lucide-react'
import { useMemoryStore } from '../../stores/memoryStore'
import { GlowButton } from '../ui/GlowButton'
import type { MemoryCategory } from '../../types/agent-mode'

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  fact: 'Facts',
  tool_result: 'Tool Results',
  decision: 'Decisions',
  context: 'Context',
}

const CATEGORY_COLORS: Record<MemoryCategory, string> = {
  fact: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  tool_result: 'bg-green-500/15 text-green-400 border-green-500/30',
  decision: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  context: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
}

export function MemorySettings() {
  const { entries, removeEntry, clearAll, exportAsMarkdown, importFromMarkdown } = useMemoryStore()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<MemoryCategory | 'all'>('all')
  const [confirmClear, setConfirmClear] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = entries.filter(e => {
    if (activeCategory !== 'all' && e.category !== activeCategory) return false
    if (search) {
      return e.content.toLowerCase().includes(search.toLowerCase())
    }
    return true
  })

  const handleExport = () => {
    const md = exportAsMarkdown()
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'agent-memory.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      if (content) importFromMarkdown(content)
    }
    reader.readAsText(file)
    e.target.value = '' // reset
  }

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    clearAll()
    setConfirmClear(false)
  }

  const categories: (MemoryCategory | 'all')[] = ['all', 'fact', 'tool_result', 'decision', 'context']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-purple-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Agent Memory</h2>
        </div>
        <span className="text-[0.65rem] text-gray-500">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search memory..."
          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 dark:focus:border-white/20"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-[0.65rem] px-2 py-1 rounded-full border transition-colors ${
              activeCategory === cat
                ? 'border-white/30 bg-white/10 text-white'
                : 'border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20'
            }`}
          >
            {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
            {cat !== 'all' && (
              <span className="ml-1 text-gray-600">
                {entries.filter(e => e.category === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Entries list */}
      <div className="space-y-1 max-h-[300px] overflow-y-auto scrollbar-thin">
        {filtered.length === 0 && (
          <p className="text-[0.7rem] text-gray-500 text-center py-4">
            {entries.length === 0 ? 'No memories yet. Agent Mode will auto-save tool results here.' : 'No matching entries.'}
          </p>
        )}
        {filtered.map(entry => (
          <div key={entry.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.03] group">
            <Tag size={10} className={`mt-1 shrink-0 ${
              entry.category === 'fact' ? 'text-blue-400' :
              entry.category === 'tool_result' ? 'text-green-400' :
              entry.category === 'decision' ? 'text-purple-400' : 'text-amber-400'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-[0.7rem] text-gray-300 break-words">{entry.content}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[0.55rem] px-1 py-0.5 rounded border ${CATEGORY_COLORS[entry.category]}`}>
                  {CATEGORY_LABELS[entry.category]}
                </span>
                {entry.source && (
                  <span className="text-[0.55rem] text-gray-600">{entry.source}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => removeEntry(entry.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all shrink-0"
              aria-label="Delete entry"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <GlowButton variant="secondary" onClick={handleExport} className="flex-1 text-xs flex items-center justify-center gap-1.5">
          <Download size={12} /> Export .md
        </GlowButton>
        <GlowButton variant="secondary" onClick={() => fileInputRef.current?.click()} className="flex-1 text-xs flex items-center justify-center gap-1.5">
          <Upload size={12} /> Import .md
        </GlowButton>
        <GlowButton
          variant={confirmClear ? 'danger' : 'secondary'}
          onClick={handleClear}
          className="text-xs flex items-center justify-center gap-1.5 px-3"
        >
          <Trash2 size={12} /> {confirmClear ? 'Confirm?' : 'Clear'}
        </GlowButton>
        <input ref={fileInputRef} type="file" accept=".md,.txt" onChange={handleImport} className="hidden" />
      </div>
    </div>
  )
}
