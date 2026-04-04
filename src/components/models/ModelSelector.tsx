import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, Loader2, Power } from 'lucide-react'
import { useModels } from '../../hooks/useModels'
import { useModelStore } from '../../stores/modelStore'
import { unloadAllModels } from '../../api/ollama'
import { displayModelName } from '../../api/providers'
import { formatBytes } from '../../lib/formatters'
import type { AIModel } from '../../types/models'

// ── Badge configs ─────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  text: 'text-blue-400',
  image: 'text-purple-400',
  video: 'text-emerald-400',
}

const TYPE_LABEL: Record<string, string> = {
  text: 'TXT',
  image: 'IMG',
  video: 'VID',
}

const PROVIDER_BADGE: Record<string, { label: string; color: string }> = {
  ollama: { label: 'Ollama', color: 'text-emerald-400/70' },
  openai: { label: 'Cloud', color: 'text-sky-400/70' },
  anthropic: { label: 'Claude', color: 'text-violet-400/70' },
}

function getProviderBadge(model: AIModel) {
  const provider = ('provider' in model && model.provider) || 'ollama'
  const providerName = ('providerName' in model && model.providerName) || 'Ollama'

  if (providerName && providerName !== 'Ollama' && providerName !== 'OpenAI-Compatible' && providerName !== 'Anthropic') {
    return { label: providerName, color: PROVIDER_BADGE[provider]?.color || PROVIDER_BADGE.ollama.color }
  }
  return PROVIDER_BADGE[provider] || PROVIDER_BADGE.ollama
}

// ── Group models by provider ──────────────────────────────────

function groupByProvider(models: AIModel[]): { provider: string; models: AIModel[] }[] {
  const groups: Record<string, AIModel[]> = {}
  for (const m of models) {
    const providerName = ('providerName' in m && m.providerName) || 'Ollama'
    if (!groups[providerName]) groups[providerName] = []
    groups[providerName].push(m)
  }

  return Object.entries(groups)
    .sort(([a], [b]) => {
      if (a === 'Ollama') return -1
      if (b === 'Ollama') return 1
      return a.localeCompare(b)
    })
    .map(([provider, models]) => ({ provider, models }))
}

// ── Component ─────────────────────────────────────────────────

export function ModelSelector() {
  const { models, activeModel, setActiveModel, fetchModels } = useModels()
  const isModelLoading = useModelStore((s) => s.isModelLoading)
  const [open, setOpen] = useState(false)
  const [unloading, setUnloading] = useState(false)
  const [unloadDone, setUnloadDone] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchModels() }, [fetchModels])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeDisplayName = activeModel ? displayModelName(activeModel).split(':')[0] : 'Select Model'
  const activeModelObj = models.find((m) => m.name === activeModel)
  const activeType = activeModelObj?.type || 'text'
  const groups = groupByProvider(models)
  const hasOllamaModels = models.some(m => m.type === 'text' && (('provider' in m && m.provider === 'ollama') || !('provider' in m)))

  return (
    <div ref={ref} className="relative">
      {/* ── Trigger Button ── */}
      <button
        onClick={() => setOpen(!open)}
        className={`
          group flex items-center gap-1.5 h-[26px] px-2 rounded-md
          bg-transparent border transition-all text-[0.7rem]
          hover:bg-white/[0.04]
          ${isModelLoading
            ? 'border-blue-500/40 shadow-[0_0_6px_rgba(59,130,246,0.2)]'
            : 'border-white/[0.06] hover:border-white/[0.1]'
          }
        `}
      >
        {/* Type indicator dot */}
        <span className={`w-1.5 h-1.5 rounded-full ${
          activeType === 'text' ? 'bg-blue-400' : activeType === 'image' ? 'bg-purple-400' : 'bg-emerald-400'
        } ${isModelLoading ? 'animate-pulse' : ''}`} />

        {/* Model name */}
        <span className="text-gray-300 max-w-[140px] truncate leading-none">
          {activeDisplayName}
        </span>

        {/* Chevron / Spinner */}
        {isModelLoading ? (
          <Loader2 size={10} className="animate-spin text-blue-400 ml-0.5" />
        ) : (
          <ChevronDown size={10} className={`text-gray-500 transition-transform ml-0.5 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* ── Dropdown ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-72 rounded-lg overflow-hidden z-50 bg-[#0f0f0f] border border-white/[0.06] shadow-2xl shadow-black/50"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
          >
            {/* Scrollable model list */}
            <div className="py-1 max-h-[280px] overflow-y-auto scrollbar-thin">
              {models.length === 0 && (
                <p className="text-[0.65rem] text-gray-600 text-center py-3">No models available</p>
              )}

              {groups.map(({ provider, models: groupModels }) => (
                <div key={provider}>
                  {/* Section header */}
                  {groups.length > 1 && (
                    <div className="px-2.5 pt-2 pb-0.5">
                      <span className="text-[0.55rem] font-medium uppercase tracking-widest text-gray-600">
                        {provider}
                      </span>
                    </div>
                  )}

                  {groupModels.map((model: AIModel) => {
                    const modelDisplayName = displayModelName(model.name)
                    const modelProvider = ('provider' in model && model.provider) || 'ollama'
                    const providerBadge = getProviderBadge(model)
                    const isActive = model.name === activeModel

                    return (
                      <button
                        key={model.name}
                        onClick={() => { setActiveModel(model.name); setOpen(false) }}
                        className={`
                          w-full flex items-center gap-2 px-2.5 py-[5px] mx-1 rounded text-left transition-colors
                          ${isActive
                            ? 'bg-white/[0.06] text-white'
                            : 'text-gray-400 hover:bg-white/[0.03] hover:text-gray-200'
                          }
                        `}
                        style={{ width: 'calc(100% - 8px)' }}
                      >
                        {/* Type dot */}
                        <span className={`w-1 h-1 rounded-full shrink-0 ${
                          model.type === 'text' ? 'bg-blue-400/70' : model.type === 'image' ? 'bg-purple-400/70' : 'bg-emerald-400/70'
                        }`} />

                        {/* Model info */}
                        <div className="flex-1 min-w-0 flex items-center gap-1.5">
                          <span className={`text-[0.7rem] truncate ${isActive ? 'text-white' : ''}`}>
                            {modelDisplayName}
                          </span>

                          {/* Subtle meta */}
                          {model.type !== 'text' && (
                            <span className={`text-[8px] uppercase font-medium tracking-wide ${TYPE_COLOR[model.type] || 'text-gray-500'} opacity-60`}>
                              {TYPE_LABEL[model.type] || model.type}
                            </span>
                          )}
                          {modelProvider !== 'ollama' && (
                            <span className={`text-[8px] ${providerBadge.color}`}>
                              {providerBadge.label}
                            </span>
                          )}
                        </div>

                        {/* Details on right */}
                        <div className="flex items-center gap-1 shrink-0">
                          {model.type === 'text' && 'details' in model && (model as any).details && (
                            <span className="text-[8px] text-gray-600">
                              {(model as any).details.parameter_size}
                            </span>
                          )}
                          {isActive && <Check size={11} className="text-blue-400" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Sticky footer: Unload */}
            {hasOllamaModels && (
              <div className="border-t border-white/[0.04] px-1 py-1">
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (unloading) return
                    setUnloading(true)
                    setUnloadDone(false)
                    try {
                      await unloadAllModels()
                      setUnloadDone(true)
                      setTimeout(() => setUnloadDone(false), 2000)
                    } catch { /* ignore */ }
                    finally { setUnloading(false) }
                  }}
                  disabled={unloading}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-[5px] rounded text-[0.6rem] text-red-500/60 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors disabled:opacity-40"
                >
                  {unloading ? <Loader2 size={10} className="animate-spin" /> : <Power size={10} />}
                  <span>{unloadDone ? 'Unloaded' : unloading ? 'Unloading...' : 'Unload all models'}</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
