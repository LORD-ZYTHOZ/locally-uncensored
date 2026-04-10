import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Trash2, Edit3, Check, X, MessageSquare, Code } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'
import { useUIStore } from '../../stores/uiStore'
import { useModelStore } from '../../stores/modelStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useCodexStore } from '../../stores/codexStore'
import { formatDate, truncate } from '../../lib/formatters'
import type { ChatMode } from '../../types/codex'

const MODE_TABS: { mode: ChatMode; label: string; icon: typeof Code; disabled?: boolean; tag?: string }[] = [
  { mode: 'lu', label: 'LU', icon: MessageSquare },
  { mode: 'codex', label: 'Codex', icon: Code },
]

export function Sidebar() {
  const { conversations, activeConversationId, createConversation, deleteConversation, renameConversation, setActiveConversation } = useChatStore()
  const { sidebarOpen, setView } = useUIStore()
  const { activeModel } = useModelStore()
  const { getActivePersona } = useSettingsStore()
  const chatMode = useCodexStore((s) => s.chatMode)
  const setChatMode = useCodexStore((s) => s.setChatMode)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  // Filter conversations by current mode
  const modeConversations = conversations.filter(c => (c.mode || 'lu') === chatMode)

  const filtered = search
    ? modeConversations.filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.messages.some((m) => m.content.toLowerCase().includes(search.toLowerCase()))
      )
    : modeConversations

  const handleNewChat = () => {
    const persona = getActivePersona()
    if (activeModel) {
      createConversation(activeModel, persona?.systemPrompt || '', chatMode)
      setView('chat')
    }
  }

  const handleRename = (id: string) => {
    if (editTitle.trim()) {
      renameConversation(id, editTitle.trim())
    }
    setEditingId(null)
  }

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          className="w-56 h-full border-r border-gray-200 dark:border-white/[0.04] bg-gray-50 dark:bg-[#0a0a0a] flex flex-col z-20 overflow-hidden"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 224, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Mode Tabs (LU | Codex) */}
          <div className="flex items-center gap-0.5 px-2 pt-2 pb-1">
            {MODE_TABS.map(({ mode, label, icon: Icon, disabled, tag }) => {
              const isActive = chatMode === mode
              return (
                <button
                  key={mode}
                  onClick={() => { if (!disabled) { setChatMode(mode); setActiveConversation(null); setView('chat') } }}
                  disabled={disabled}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[0.6rem] font-medium transition-all flex-1 justify-center ${
                    isActive
                      ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white border border-gray-300 dark:border-white/15'
                      : disabled
                        ? 'text-gray-400 dark:text-gray-700 cursor-default'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon size={9} />
                  <span className="relative">
                    {label}
                    {tag && <span className="absolute inset-0 flex items-center justify-center text-[0.4rem] text-red-500 dark:text-red-400 font-bold bg-gray-50/80 dark:bg-[#0a0a0a]/80">{tag}</span>}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="px-2 pb-1">
            <div className="relative">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-6 pr-2 py-1 rounded-md bg-transparent border border-gray-200 dark:border-white/[0.04] text-[0.65rem] text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-gray-400 dark:focus:border-white/10"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto px-1.5 pt-1 space-y-px scrollbar-thin">
            {filtered.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-all ${
                  conv.id === activeConversationId
                    ? 'bg-gray-200 dark:bg-white/[0.06] text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.03] hover:text-gray-800 dark:hover:text-gray-200'
                }`}
                onClick={() => {
                  setActiveConversation(conv.id)
                  setView('chat')
                }}
              >
                <div className="flex-1 min-w-0">
                  {editingId === conv.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename(conv.id)}
                        className="w-full bg-white/5 rounded px-1 py-0.5 text-[0.65rem] text-white focus:outline-none"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button onClick={(e) => { e.stopPropagation(); handleRename(conv.id) }} className="text-green-400"><Check size={11} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingId(null) }} className="text-gray-500"><X size={11} /></button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[0.68rem] truncate">{truncate(conv.title, 28)}</p>
                      <p className="text-[0.55rem] text-gray-600">{formatDate(conv.updatedAt)}</p>
                    </>
                  )}
                </div>
                {editingId !== conv.id && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingId(conv.id); setEditTitle(conv.title) }}
                      className="p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300"
                    >
                      <Edit3 size={10} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                      className="p-0.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {filtered.length === 0 && (
              <p className="text-center text-gray-600 text-[0.6rem] py-6">
                {search ? 'No results' : 'No conversations'}
              </p>
            )}
          </div>

          {/* New Chat — bottom */}
          <div className="px-2 pb-2 pt-1 border-t border-white/[0.04]">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-[0.65rem] text-gray-500 hover:text-white hover:bg-white/[0.05] border border-dashed border-white/[0.08] hover:border-white/15 transition-all"
            >
              <Plus size={12} />
              <span>New Chat</span>
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
