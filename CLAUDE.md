# CLAUDE.md — Locally Uncensored

## Project

Local-first AI chat app with image/video generation. Tauri v2 (Rust) + React 19 + TypeScript + Vite + Zustand + TailwindCSS 4.

## Commands

```bash
npm run dev          # Vite dev server (localhost:5173)
npm run build        # Production build
npx vitest run       # Run all 416 tests
npx tsc --noEmit     # Type check
```

## Architecture

### Frontend (src/)
- **api/** — Backend clients (Ollama, ComfyUI, providers, RAG, voice, agents)
- **api/providers/** — Multi-provider system (Ollama, OpenAI-compat, Anthropic)
- **components/** — React components (chat, create, models, settings, onboarding, layout)
- **hooks/** — useChat, useAgentChat, useModels, useCreate, useRAG, useVoice, useABCompare, useBenchmark, useKeyboardShortcuts, useMemory, useWorkflow
- **stores/** — Zustand stores (chat, model, settings, provider, agentMode, memory, rag, voice, create, workflow, agentWorkflow, ui, compare, benchmark)
- **lib/** — Utilities (formatters, model-compatibility, context-compaction, backend-detector, systemCheck, chat-export, benchmark-prompts, memory-extraction, workflow-engine, agent-strategy, built-in-workflows)
- **types/** — TypeScript interfaces

### Tauri Backend (src-tauri/)
- **commands/** — Rust commands (proxy, download, process, search, agent, whisper)
- Auto-starts Ollama and ComfyUI on launch
- CORS proxy for localhost calls in production .exe

### Key Patterns

**Provider Interface:** All LLM backends implement `ProviderClient` (chatStream, chatWithTools, listModels, checkConnection, getContextLength). Never call `ollama.ts` directly for chat — go through the provider.

**Model Name Prefixing:** Ollama models have no prefix (`llama3.1:8b`). Cloud models are prefixed (`openai::gpt-4o`, `anthropic::claude-sonnet-4-20250514`).

**Streaming:** Ollama uses NDJSON (`stream.ts`), OpenAI/Anthropic use SSE (`sse.ts`). Both yield unified `ChatStreamChunk`.

**Dev vs Prod Routing:** `backend.ts` routes via `isTauri()`. Dev: Vite proxy. Prod: Rust `invoke()`.

**Agent Mode:** Per-conversation toggle. Strategy: native (Ollama/OpenAI/Anthropic) or hermes_xml (prompt-based fallback). Tools need `permission: 'auto' | 'confirm'`. Strategy resolution extracted to `agent-strategy.ts` (shared by useAgentChat + WorkflowEngine).

**Memory System:** Claude Code-inspired persistent memory. 4 internal types (user/feedback/project/reference) but simplified UI (flat list, no type selection). Context-aware injection: auto-scales budget based on model context (0 at 2K, 300tok at 4K, 800tok at 8K+, 4000tok at 128K+). Auto-extraction via LLM after each turn (on by default). Types hidden from user, used internally for smart prioritization.

**Agent Workflows:** Reusable multi-step agent chains. Step types: prompt, tool, condition, loop, user_input, memory_save. WorkflowEngine class executes steps with {{variable}} interpolation. 3 built-in workflows (Research Topic, Summarize URL, Code Review). `run_workflow` tool lets agent trigger workflows. "run workflow X" prefix detection in chat.

**A/B Compare:** Separate view (ABCompare.tsx) with own store (compareStore). Parallel streaming via getProviderForModel(). Not persisted — session only.

**Benchmark:** benchmarkStore (persisted). Standalone getAverageSpeed/getLeaderboard functions (not store methods — avoids React getSnapshot loops). BenchmarkButton on each ModelCard.

**Search Providers:** Configurable in settings (auto/brave/tavily). Provider + API keys passed from agents.ts to vite middleware via backendCall("web_search"). Fallback chain: preferred > SearXNG > Brave > Tavily > DDG > Wikipedia.

**Discover Models:** Split into Uncensored (getUncensoredTextModels) and Mainstream (getMainstreamTextModels) with clickable section-header tabs.

## Rules

- UI text sizes: `text-[0.6rem]` to `text-[0.75rem]`. Icons: 10-14px. No large text.
- No emojis in code or UI. Use Lucide icons or CSS elements.
- No amber/yellow colors in benchmark UI. Keep neutral grays. Only the trophy icon stays gold.
- Every new API endpoint in vite.config.ts MUST also be implemented in Tauri Rust backend.
- Provider changes go through `providerStore` and `registry.ts`, not direct API calls.
- Ollama is default but deactivatable. Local backends and cloud are mutually exclusive.
- Cloud providers show a privacy warning popup before activation.
- Pull/Delete model only available when Ollama is the active provider.
- Tests use Vitest. Run `npx vitest run` before pushing.
- Zustand store methods that return derived data (getters) must be standalone functions, not store state — prevents React 19 getSnapshot infinite loop.

## Branch

`feature/multi-provider` — Multi-provider support + v2.0 features (A/B Compare, Benchmark, LaTeX, Token Counter, Chat Export, Keyboard Shortcuts, Search Providers, Gemma 4, Memory System, Agent Workflows). Not yet merged to master.
