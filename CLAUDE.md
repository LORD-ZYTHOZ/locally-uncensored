# CLAUDE.md — Locally Uncensored

## Project Overview

Local-first AI desktop app: Chat + Image Generation + Video Generation in one UI. No cloud, no censorship, no tracking.

- **Stack**: React 19 + TypeScript + Tailwind CSS 4 + Vite 8 + Tauri 2 (Rust)
- **State**: Zustand with localStorage persistence
- **AI Backends**: Ollama (text/chat), ComfyUI (images/video)
- **Repo**: github.com/PurpleDoubleD/locally-uncensored

## Architecture

```
src/
  api/           — Backend abstraction, ComfyUI API, dynamic workflows, model discovery
  components/    — React components (chat, create, models, agents, settings, layout, ui)
  hooks/         — React hooks (useCreate, useChat, useModels, useAgent, useVoice)
  stores/        — Zustand stores (createStore, chatStore, workflowStore, etc.)
  types/         — TypeScript type definitions
  lib/           — Utilities (formatters, privacy helpers)
src-tauri/       — Rust backend (Tauri commands for ComfyUI, Ollama, downloads)
vite.config.ts   — Dev server with ComfyUI launcher, API proxies, middleware
docs/            — Static landing pages and blog (GitHub Pages)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/api/comfyui.ts` | ComfyUI API: model fetching, workflow builders (legacy), submission, history |
| `src/api/comfyui-nodes.ts` | Node discovery via `/object_info`, caching, categorization |
| `src/api/dynamic-workflow.ts` | Dynamic workflow builder — replaces hardcoded builders |
| `src/api/workflows.ts` | Workflow Finder: CivitAI search, import, parameter injection |
| `src/api/discover.ts` | Model marketplace: bundles, CivitAI model search, downloads |
| `src/api/backend.ts` | Dual-mode abstraction (Vite dev → `/local-api/*`, Tauri → `invoke()`) |
| `src/hooks/useCreate.ts` | Image/video generation flow: build workflow → submit → poll → gallery |
| `src/stores/createStore.ts` | Generation params, gallery, prompt history |
| `src/stores/workflowStore.ts` | Installed workflows, model-to-workflow assignments, CivitAI API key |
| `src/components/create/CreateView.tsx` | Main generation UI (output top, prompt bottom) |
| `src/components/create/ParamPanel.tsx` | Right sidebar: model, sampler, steps, size, seed |
| `src/components/create/WorkflowFinder.tsx` | Workflow selection + search modal trigger |
| `vite.config.ts` | ComfyUI auto-start, POST proxy (Vite 8 workaround), download proxy, image proxy |

## ComfyUI Integration

- **Connection**: `localhost:8188`, auto-discovered and auto-started
- **POST Proxy**: Custom middleware in vite.config.ts because Vite 8 blocks POST through standard proxy
- **Model Types**: `flux | flux2 | sdxl | sd15 | wan | hunyuan | unknown`
- **Dynamic Builder**: Queries `/object_info` for all 600+ nodes, auto-selects strategy (unet_flux, unet_video, checkpoint, animatediff)
- **Legacy Builders**: `buildSDXLImgWorkflow`, `buildFluxImgWorkflow`, `buildWanVideoWorkflow`, `buildAnimateDiffWorkflow` — kept as fallback
- **VAE/CLIP Resolution**: `findMatchingVAE()` and `findMatchingCLIP()` match by model type keywords (flux→ae/flux, wan→wan, hunyuan→hunyuanvideo/qwen)

## Generation Flow

```
User clicks Generate
→ classifyModel(filename) — always fresh, never from stale store
→ Check workflowStore for custom workflow assignment
  → If custom: injectParameters() + resolve VAE/CLIP
  → If incompatible (wrong loader type): skip, use auto
→ buildDynamicWorkflow() — queries /object_info, picks strategy
  → Fallback: legacy builders if dynamic fails
→ submitWorkflow() via localFetch to ComfyUI /prompt
→ Poll /history/{promptId} every 1s
→ On complete: extract outputs, show execution time, add to gallery
```

## Privacy Rules

- **All external images** proxied through `/local-api/proxy-image` — external servers never see user IP
- **All downloads** proxied through `/local-api/proxy-download` — follows redirects server-side
- **No Google Fonts** — system fonts everywhere
- **No CDN scripts** — PDF.js worker bundled locally
- **No analytics/telemetry** — zero external tracking
- **API keys** stored only in browser localStorage, never in code

## Dev Commands

```bash
npm run dev          # Start dev server (auto-starts Ollama + ComfyUI)
npm run build        # Production build
npm run tauri:dev    # Tauri dev mode
npm run tauri:build  # Build desktop .exe
```

## Conventions

- **Language**: UI text in English, user communicates in German
- **Dark Mode**: Deep blacks (`#0a0a0a` body, `#111111` header, `#0e0e0e` sidebar), not ChatGPT-grey
- **Light Mode**: Full dual-mode support, all components have `dark:` variants
- **Components**: Functional React, no class components
- **Styling**: Tailwind utility classes, no CSS modules
- **State**: Zustand stores with `persist` middleware for user data
- **Commits**: Conventional commits (feat/fix/docs), Co-Authored-By Claude
- **No emojis** in code/UI unless explicitly requested
- **Default View**: Model Manager (not Chat) — configured in `uiStore.ts`

## Tauri Production (.exe) — CRITICAL

Every feature that works in dev mode MUST also work in the Tauri .exe. The #1 source of bugs:

- **CORS blocking**: In Tauri, the WebView origin is `http://tauri.localhost`. Direct `fetch()` to `http://localhost:11434` or `http://localhost:8188` is blocked by CORS. ALL localhost calls MUST go through `localFetch()` / `localFetchStream()` from `backend.ts`, which routes through Rust `invoke('proxy_localhost')` in production.
- **NEVER use `fetch(ollamaUrl(...))` or `fetch(comfyuiUrl(...))`** — always use `localFetch(ollamaUrl(...))` or `localFetch(comfyuiUrl(...))`
- **CSP must include `http://ipc.localhost`** — Tauri IPC uses this origin, CSP blocks invoke() without it
- **Dual-mode routing**: `src/api/backend.ts` routes `backendCall()` to Vite middleware (dev) or Rust `invoke()` (production)
- **External API calls**: NEVER use `fetch('/civitai-api/...')` directly. Use `fetchExternal()` from `backend.ts`
- **New Vite middleware = new Rust command**: If you add a `/local-api/*` endpoint to `vite.config.ts`, you MUST also implement the equivalent `#[tauri::command]` in `src-tauri/src/commands/`
- **Endpoint map**: All dev-mode routes must be in the `endpointMap` in `backend.ts`
- **Ollama URL**: `ollamaUrl()` returns `http://localhost:11434/api{path}` in Tauri (the `/api` prefix is required!)
- **Download manager**: Uses `CancellationToken` for pause/cancel, `Range` header for resume. Downloads tracked in `Arc<Mutex<HashMap>>` shared between spawned task and progress endpoint
- **Process stdout/stderr**: Always drain piped outputs in background threads or ComfyUI will deadlock
- **ComfyUI path discovery**: Deep scans user home (depth 7), also checks running process. Falls back to manual path input in UI.
- **Test the .exe**: After any backend change, verify with `cargo check` in `src-tauri/`

## Model Bundles (Image + Video)

Complete packages in `src/api/discover.ts` — "Install All" downloads everything needed:

**Image (3):** Juggernaut XL V9 (SDXL), FLUX.1 schnell FP8, FLUX.1 dev FP8
- SDXL: single checkpoint file (includes VAE+CLIP)
- FLUX: 4 files each (UNET + VAE + T5-XXL + CLIP_L)

**Video (3):** Wan 2.1 1.3B, Wan 2.1 14B FP8, HunyuanVideo 1.5 T2V FP8
- Wan: 3 files (Model + VAE + UMT5)
- HunyuanVideo: 4 files (Model + VAE + Qwen2.5 + CLIP_L)

All URLs verified working (HTTP 200) from Comfy-Org / comfyanonymous HuggingFace repos.

## Common Pitfalls

- **Vite 8 POST blocking**: All POST to ComfyUI must go through the custom middleware in vite.config.ts, not the standard proxy
- **HMR store drift**: After code changes, stores can have stale instances. Always test with full page reload (Ctrl+Shift+R)
- **Model type from store**: Never trust `imageModelType` from createStore at generation time. Always re-classify with `classifyModel(filename)`
- **CivitAI downloads**: Need API key (user enters in Workflow Finder). Downloads are ZIP archives, not raw JSON
- **ComfyUI workflow formats**: Two formats exist — API format (`class_type` nodes) and Web/UI format (`nodes[]` + `links[]`). The app handles both via `convertWebToApiFormat()`
- **CLIP/VAE fallback**: Never silently use wrong model type. Throw descriptive error with download instructions instead
- **HunyuanVideo VAE/CLIP**: Uses `hunyuanvideo` VAE (not Wan VAE) and `qwen` text encoder (not UMT5). Matchers in `comfyui.ts` handle this separately.
