# X/Twitter Launch Thread — Locally Uncensored

---

**Tweet 1 (Hook)**

I built an open-source desktop app that combines local LLM chat and image generation in one interface.

No cloud. No API keys. No data leaves your machine.

It's called Locally Uncensored, and it's free.

github.com/PurpleDoubleD/locally-uncensored

🧵 Here's what it does:

---

**Tweet 2 (The Problem)**

Running local AI right now means juggling multiple tools:

- Ollama or llama.cpp for chat
- ComfyUI or A1111 for image gen
- Different UIs, different configs, different windows

Locally Uncensored puts both behind one interface. One app, two backends.

---

**Tweet 3 (How It Works)**

Under the hood:

→ Chat connects to Ollama (Llama, Mistral, Phi, Gemma, etc.)
→ Image/video gen connects to ComfyUI (Stable Diffusion, Flux, etc.)
→ Built with Tauri v2 + React
→ ~15 MB install (not Electron)
→ Runs on macOS, Windows, Linux

---

**Tweet 4 (Privacy)**

Everything runs on your hardware.

No accounts. No telemetry. No server calls. Your prompts, your images, your conversations — they stay on your machine.

This is what "local AI" should actually mean.

---

**Tweet 5 (Tech Stack)**

For the devs wondering about the stack:

- Tauri v2 (Rust backend, webview frontend)
- React + TypeScript
- Communicates with Ollama and ComfyUI via their local APIs
- MIT licensed — fork it, modify it, ship it

PRs welcome.

---

**Tweet 6 (What's Next)**

Currently working on:
- Workflow templates for ComfyUI
- Better model management
- More customization options

If you're into local AI, self-hosting, or just want an alternative to cloud AI tools — give it a try.

⭐ github.com/PurpleDoubleD/locally-uncensored

---

**Tweet 7 (CTA)**

If this is useful to you:

→ Star it on GitHub (helps visibility)
→ Try it and open issues (helps quality)
→ Share it with someone who runs Ollama or ComfyUI

Building in the open. Feedback welcome.
