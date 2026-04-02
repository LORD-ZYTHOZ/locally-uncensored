import type { OllamaModel } from "../types/models"
import { ollamaUrl, localFetch, localFetchStream } from "./backend"

export async function listModels(): Promise<OllamaModel[]> {
  const res = await localFetch(ollamaUrl("/tags"))
  if (!res.ok) throw new Error("Failed to fetch models")
  const data = await res.json()
  return (data.models || []).map((m: any) => ({ ...m, type: "text" as const }))
}

export async function showModel(name: string) {
  const res = await localFetch(ollamaUrl("/show"), {
    method: "POST",
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error("Failed to show model")
  return res.json()
}

export async function getModelContext(name: string): Promise<number> {
  try {
    const info = await showModel(name)
    return (
      info?.model_info?.["general.context_length"] ||
      info?.parameters?.num_ctx ||
      2048
    )
  } catch {
    return 2048
  }
}

export async function chatStream(
  model: string,
  messages: { role: string; content: string }[],
  options: { temperature?: number; top_p?: number; top_k?: number; num_predict?: number } = {},
  signal?: AbortSignal
): Promise<Response> {
  const res = await localFetchStream(ollamaUrl("/chat"), {
    method: "POST",
    body: JSON.stringify({ model, messages, options, stream: true }),
  })
  if (!res.ok) throw new Error("Failed to start chat")
  return res
}

export async function pullModel(name: string, signal?: AbortSignal): Promise<Response> {
  const res = await localFetchStream(ollamaUrl("/pull"), {
    method: "POST",
    body: JSON.stringify({ name, stream: true }),
  })
  if (!res.ok) throw new Error("Failed to pull model")
  return res
}

export async function deleteModel(name: string): Promise<void> {
  const res = await localFetch(ollamaUrl("/delete"), {
    method: "DELETE",
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error("Failed to delete model")
}

export async function checkConnection(): Promise<boolean> {
  try {
    await localFetch(ollamaUrl("/tags"))
    return true
  } catch {
    return false
  }
}
