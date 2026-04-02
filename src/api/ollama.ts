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

// Agent Mode: chat with tool calling support
export async function chatStreamWithTools(
  model: string,
  messages: { role: string; content: string; tool_calls?: any[] }[],
  tools: { type: string; function: { name: string; description: string; parameters: any } }[],
  options: { temperature?: number; top_p?: number; top_k?: number; num_predict?: number } = {},
  signal?: AbortSignal
): Promise<Response> {
  const res = await localFetchStream(ollamaUrl("/chat"), {
    method: "POST",
    body: JSON.stringify({ model, messages, tools, options, stream: true }),
  })
  if (!res.ok) {
    // Try to extract Ollama's error message
    try {
      const errorData = await res.json()
      throw new Error(errorData.error || "Failed to start agent chat")
    } catch (e) {
      if (e instanceof Error && e.message !== "Failed to start agent chat") throw e
      throw new Error("Failed to start agent chat")
    }
  }
  return res
}

// Agent Mode: non-streaming tool call (more reliable for detecting tool calls)
export async function chatWithTools(
  model: string,
  messages: { role: string; content: string; tool_calls?: any[] }[],
  tools: { type: string; function: { name: string; description: string; parameters: any } }[],
  options: { temperature?: number; top_p?: number; top_k?: number; num_predict?: number } = {},
): Promise<{ content: string; tool_calls?: any[] }> {
  const res = await localFetch(ollamaUrl("/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, tools, options, stream: false }),
  })
  if (!res.ok) {
    try {
      const errorData = await res.json()
      throw new Error(errorData.error || "Failed to start agent chat")
    } catch (e) {
      if (e instanceof Error && e.message !== "Failed to start agent chat") throw e
      throw new Error("Failed to start agent chat")
    }
  }
  const data = await res.json()
  return {
    content: data.message?.content || '',
    tool_calls: data.message?.tool_calls,
  }
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

export async function listRunningModels(): Promise<string[]> {
  try {
    const res = await localFetch(ollamaUrl("/ps"))
    if (!res.ok) return []
    const data = await res.json()
    return (data.models || []).map((m: any) => m.name || m.model)
  } catch {
    return []
  }
}

export async function unloadModel(name: string): Promise<void> {
  await localFetch(ollamaUrl("/generate"), {
    method: "POST",
    body: JSON.stringify({ model: name, keep_alive: 0 }),
  })
}

export async function unloadAllModels(): Promise<number> {
  const running = await listRunningModels()
  for (const name of running) {
    try { await unloadModel(name) } catch { /* continue */ }
  }
  return running.length
}

export async function checkConnection(): Promise<boolean> {
  try {
    await localFetch(ollamaUrl("/tags"))
    return true
  } catch {
    return false
  }
}
