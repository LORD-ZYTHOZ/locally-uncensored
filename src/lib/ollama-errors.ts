/**
 * Ollama error detection + typed errors.
 *
 * Ollama 0.20.x strict-rejects models whose on-disk manifest lacks the
 * runtime `capabilities` field (either pulled before Ollama 0.15 or whose
 * registry entry has been re-published since the local pull). The server
 * returns HTTP 400 with `{"error":"\"<model>\" does not support (chat|completion|generate)"}`.
 *
 * Two additional wrapping layers matter in practice:
 *   1. Tauri `proxy_localhost` wraps any non-2xx as Rust `Err("HTTP 400: <body>")`.
 *      The JS `localFetch` catches that, tries a direct fetch fallback, and
 *      if that also fails returns a synthetic `Response` with status 500 and
 *      body `{"error":"HTTP 400: {…}"}`.
 *   2. JSON encoding quotes the model name as `\"phi4:14b\"` when it's nested
 *      inside an outer JSON string.
 *
 * The regex here is tolerant to both wrappings and to all three API verbs
 * that can trigger it (`/api/chat`, `/api/generate` via `prompt`/`completion`).
 */

export type OllamaErrorKind = 'stale-manifest' | 'connection' | 'other'

export interface ParsedOllamaError {
  kind: OllamaErrorKind
  model: string | null
  /** Human-readable, actionable message. */
  message: string
  /** Original raw error string (for logs). */
  raw: string
}

const STALE_MANIFEST_RE =
  /[\\'"]*([\w.:/\-]+?)[\\'"]*\s+does not support (chat|completion|generate)/i

/**
 * Parse an Ollama error response into a typed structure.
 * `res` must be a non-ok Response. Safe to call on already-consumed bodies
 * (will return an `other` with the fallback message).
 */
export async function parseOllamaError(
  res: Response,
  fallback = 'Ollama request failed'
): Promise<ParsedOllamaError> {
  let raw = fallback
  try {
    const text = await res.text()
    // Only surface JSON error bodies — non-JSON responses (HTML gateway pages,
    // empty bodies) collapse to the caller-supplied fallback to avoid leaking
    // framework noise into the UI. Matches the pre-refactor behaviour of
    // OllamaProvider.extractError so existing tests keep passing.
    try {
      const data = JSON.parse(text)
      raw = (data && typeof data.error === 'string' ? data.error : fallback) || fallback
    } catch {
      raw = fallback
    }
  } catch {
    raw = fallback
  }

  const m = typeof raw === 'string' ? raw.match(STALE_MANIFEST_RE) : null
  if (m) {
    const model = m[1]
    return {
      kind: 'stale-manifest',
      model,
      message: `Model "${model}" has a stale manifest. Run "ollama pull ${model}" to refresh.`,
      raw,
    }
  }

  return { kind: 'other', model: null, message: raw, raw }
}

/** Typed error thrown by loadModel / unloadModel. */
export class ModelLoadError extends Error {
  readonly kind: OllamaErrorKind
  readonly model: string
  readonly raw: string
  constructor(parsed: ParsedOllamaError, model: string) {
    super(parsed.message)
    this.name = 'ModelLoadError'
    this.kind = parsed.kind
    this.model = parsed.model || model
    this.raw = parsed.raw
  }
}

/**
 * Produce the same user-facing message as the chat path's `extractError`.
 * Kept separate so the detection logic stays in one place; callers that
 * want the chat-style wording (terminal instructions) can use this.
 */
export function chatStyleMessage(parsed: ParsedOllamaError): string {
  if (parsed.kind === 'stale-manifest' && parsed.model) {
    return `Ollama rejected "${parsed.model}" — its manifest is stale. Open a terminal and run: ollama pull ${parsed.model}   Then reload the model.`
  }
  return parsed.message
}
