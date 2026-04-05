import { useState, useEffect } from 'react'
import { Menu, Settings, Sun, Moon, MessageSquare, Film, Layers, GitCompareArrows, Trophy, Loader2, Power, PowerOff } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useChatStore } from '../../stores/chatStore'
import { useCompareStore } from '../../stores/compareStore'
import { useModelStore } from '../../stores/modelStore'
import { ModelSelector } from '../models/ModelSelector'
import { UpdateBadge } from './UpdateBadge'
import { DownloadBadge } from './DownloadBadge'
import { loadModel, unloadModel, listRunningModels } from '../../api/ollama'
import { getProviderIdFromModel } from '../../api/providers'

export function Header() {
  const { currentView, toggleSidebar, setView } = useUIStore()
  const { settings, updateSettings } = useSettingsStore()
  const isComparing = useCompareStore((s) => s.isComparing)
  const activeModel = useModelStore((s) => s.activeModel)
  const [loadingState, setLoadingState] = useState<'idle' | 'loading' | 'unloading'>('idle')
  const [isModelLoaded, setIsModelLoaded] = useState(false)

  // Check if active model is an Ollama model
  const isOllamaModel = activeModel ? getProviderIdFromModel(activeModel) === 'ollama' : false
  const modelToUse = activeModel?.includes('::') ? activeModel.split('::')[1] : activeModel

  const handleLoad = async () => {
    if (!modelToUse || loadingState !== 'idle') return
    setLoadingState('loading')
    try {
      await loadModel(modelToUse)
      setIsModelLoaded(true)
    } catch {}
    finally { setLoadingState('idle') }
  }

  const handleUnload = async () => {
    if (!modelToUse || loadingState !== 'idle') return
    setLoadingState('unloading')
    try {
      await unloadModel(modelToUse)
      setIsModelLoaded(false)
    } catch {}
    finally { setLoadingState('idle') }
  }

  // Check loaded state when model changes
  useEffect(() => {
    if (modelToUse && isOllamaModel) {
      listRunningModels().then(running => {
        setIsModelLoaded(running.some(r => r.includes(modelToUse.split(':')[0])))
      })
    } else {
      setIsModelLoaded(false)
    }
  }, [modelToUse, isOllamaModel])

  // Poll running state every 5s while idle
  useEffect(() => {
    if (!modelToUse || !isOllamaModel) return
    const interval = setInterval(() => {
      if (loadingState === 'idle') {
        listRunningModels().then(running => {
          setIsModelLoaded(running.some(r => r.includes(modelToUse.split(':')[0])))
        })
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [modelToUse, isOllamaModel, loadingState])

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
  }

  const navBtn = (view: string, icon: React.ReactNode, title: string) => (
    <button
      onClick={() => {
        // Always reset compare mode when navigating away
        if (view !== 'chat' || view === 'chat') useCompareStore.getState().setComparing(false)
        setView(view as any)
      }}
      className={`p-1.5 rounded-md transition-colors ${
        currentView === view && !isComparing
          ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white'
          : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
      }`}
      title={title}
    >
      {icon}
    </button>
  )

  return (
    <header className="h-10 flex items-center justify-between px-3 border-b border-gray-200 dark:border-white/[0.04] bg-gray-50 dark:bg-[#0e0e0e] z-20">
      {/* Left: Sidebar + Logo */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-white/5 text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={15} />
        </button>
        <button
          onClick={() => {
            useChatStore.getState().setActiveConversation(null)
            useCompareStore.getState().setComparing(false)
            setView('chat')
          }}
          className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
        >
          <img src="/LU-monogram-bw.png" alt="" width={16} height={16} className="dark:invert-0 invert opacity-70" />
          <span className="font-semibold text-[0.7rem] tracking-wide">LUncensored</span>
        </button>
      </div>

      {/* Center: Model Selector + Load/Unload */}
      <div className="flex items-center gap-1">
        <ModelSelector />
        {isOllamaModel && (
          <div className="flex items-center gap-0.5">
            {/* Load model (green when loaded, gray when not) */}
            <button
              onClick={handleLoad}
              disabled={loadingState !== 'idle'}
              className={`p-1 rounded-md transition-colors ${
                isModelLoaded
                  ? 'text-green-400 bg-green-500/10'
                  : 'text-gray-600 hover:text-green-400 hover:bg-green-500/10'
              }`}
              title={isModelLoaded ? 'Model loaded in VRAM' : 'Load model into VRAM'}
            >
              {loadingState === 'loading' ? (
                <Loader2 size={13} className="animate-spin text-green-400" />
              ) : (
                <Power size={13} />
              )}
            </button>
            {/* Unload model (red on hover, gray default) */}
            <button
              onClick={handleUnload}
              disabled={loadingState !== 'idle'}
              className={`p-1 rounded-md transition-colors ${
                !isModelLoaded
                  ? 'text-gray-700 opacity-30'
                  : 'text-gray-600 hover:text-red-400 hover:bg-red-500/10'
              }`}
              title="Unload model from VRAM"
            >
              {loadingState === 'unloading' ? (
                <Loader2 size={13} className="animate-spin text-red-400" />
              ) : (
                <PowerOff size={13} />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Right: Nav icons — Order: Chat, Create, A/B Compare, Benchmark, Models, Settings */}
      <div className="flex items-center gap-0.5">
        <DownloadBadge />
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          title={settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        >
          {settings.theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        {navBtn('chat', <MessageSquare size={14} />, 'Chat')}
        {navBtn('create', <Film size={14} />, 'Create')}
        <button
          onClick={() => { useCompareStore.getState().setComparing(true); setView('chat') }}
          className={`p-1.5 rounded-md transition-colors ${
            isComparing
              ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white'
              : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
          }`}
          title="A/B Compare"
        >
          <GitCompareArrows size={14} />
        </button>
        {navBtn('benchmark', <Trophy size={14} />, 'Benchmark')}
        {navBtn('models', <Layers size={14} />, 'Models')}
        {navBtn('settings', <Settings size={14} />, 'Settings')}
        <UpdateBadge />
      </div>
    </header>
  )
}
