/**
 * Model Compatibility for Agent Mode
 *
 * Agent Mode ONLY works with models that have native Ollama tool calling.
 * No workarounds, no fallbacks — if Ollama says no tools, no agent mode.
 *
 * Face of Agent Mode: Hermes 3 (uncensored + native tool calling)
 */

const AGENT_COMPATIBLE = [
  // ── Hermes: THE uncensored agent model ──
  'hermes3', 'hermes-3', 'hermes',
  // ── Standard models with native tool calling ──
  'qwen3', 'qwen2.5',
  'llama3.1', 'llama3.2', 'llama3.3', 'llama4',
  'mistral', 'mistral-nemo', 'mistral-small', 'mistral-large',
  'command-r',
  'phi-4', 'phi4',
  'deepseek-v2.5', 'deepseek-v3',
  'glm4', 'glm-4',
  'gemma3',
  'nemotron',
]

/**
 * Check if a model supports Agent Mode.
 * Must have native Ollama tool calling. No abliterated, no uncensored.
 */
export function isAgentCompatible(modelName: string): boolean {
  const name = modelName.toLowerCase()
  if (name.includes('abliterated') || name.includes('uncensored')) return false
  const baseName = name.replace(/^[^/]+\//, '').replace(/-instruct/g, '').replace(/-chat/g, '').replace(/:.*$/, '')
  return AGENT_COMPATIBLE.some((f) => baseName.startsWith(f))
}

export const isToolCallingModel = isAgentCompatible
export const hasNativeToolCalling = isAgentCompatible

export type ToolCallingStrategy = 'native' | 'template_fix' | 'hermes_xml'

export function getToolCallingStrategy(modelName: string): ToolCallingStrategy {
  return isAgentCompatible(modelName) ? 'native' : 'hermes_xml'
}

export interface RecommendedModel {
  name: string
  label: string
  reason: string
  hot?: boolean
}

export function getRecommendedAgentModels(): RecommendedModel[] {
  return [
    { name: 'hermes3:8b', label: 'Hermes 3 8B', reason: 'Uncensored + native tool calling. THE agent model.', hot: true },
    { name: 'hermes3:70b', label: 'Hermes 3 70B', reason: 'Maximum power uncensored agent. Needs 48GB+.', hot: true },
    { name: 'qwen2.5:7b', label: 'Qwen 2.5 7B', reason: 'Fast, reliable tool calling' },
    { name: 'llama3.1:8b', label: 'Llama 3.1 8B', reason: 'Proven tool calling all-rounder' },
  ]
}
