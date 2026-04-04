import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AIModel, PullProgress, ModelCategory } from '../types/models'
import { unloadModel } from '../api/ollama'

interface ModelState {
  models: AIModel[]
  activeModel: string | null
  pullProgress: PullProgress | null
  isPulling: boolean
  isModelLoading: boolean
  categoryFilter: ModelCategory
  setModels: (models: AIModel[]) => void
  setActiveModel: (name: string) => void
  setPullProgress: (progress: PullProgress | null) => void
  setIsPulling: (pulling: boolean) => void
  setIsModelLoading: (loading: boolean) => void
  setCategoryFilter: (category: ModelCategory) => void
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      models: [],
      activeModel: null,
      pullProgress: null,
      isPulling: false,
      isModelLoading: false,
      categoryFilter: 'all',

      setModels: (models) =>
        set((state) => ({
          models,
          activeModel: state.activeModel || (models.length > 0 ? models[0].name : null),
        })),

      setActiveModel: (name) => {
        const prev = get().activeModel
        set({ activeModel: name })

        // Auto-unload previous Ollama model to free RAM/VRAM (fire-and-forget)
        // Only unload local Ollama models (no '::' provider prefix)
        if (prev && prev !== name && !prev.includes('::')) {
          unloadModel(prev).catch(() => {})
        }
      },

      setPullProgress: (progress) => set({ pullProgress: progress }),

      setIsPulling: (pulling) => set({ isPulling: pulling }),

      setIsModelLoading: (loading) => set({ isModelLoading: loading }),

      setCategoryFilter: (category) => set({ categoryFilter: category }),
    }),
    {
      name: 'chat-models',
      partialize: (state) => ({ activeModel: state.activeModel, categoryFilter: state.categoryFilter }),
    }
  )
)
