# Locally Uncensored - Market Research (31.03.2026)

Quellen: Reddit (r/LocalLLaMA, r/selfhosted, r/comfyui, r/OpenWebUI), YouTube Kommentare (David Bombal, Tier List Videos), GitHub Issues (Open WebUI, Jan.ai, SillyTavern, AnythingLLM), Hacker News

## Die 7 groessten Pain Points der User

### 1. ALLES IST ZU KOMPLIZIERT
- "Local AI in 2026 feels like Linux in 2005. Powerful but only usable by enthusiasts. We need the Ubuntu moment." (4.1k Likes, YouTube)
- "Followed every step and got CUDA errors. Spent 3 hours on Stack Overflow. Local AI is not for normal people yet." (2.1k Likes)
- "Why does every local AI project insist on Docker? Regular people don't know what Docker is" (2.8k Likes)
- LU Vorteil: Portable Mode, kein Docker, kein Terminal noetig

### 2. OPEN WEBUI IST AUFGEBLASEN
- Docker Image von 2GB auf 8GB gewachsen
- Updates breaken staendig bestehende Setups
- 4GB+ RAM nur fuer die Web UI
- "I miss when this was just 'ollama-webui' and it did one thing well"
- "Every time I update, something breaks. I've stopped updating."
- Leute wechseln aktiv zu Msty, LM Studio, Chatbox
- LU Chance: Leichtgewichtige Alternative die einfach funktioniert

### 3. JEDER WILL EIN ALL-IN-ONE TOOL
- Meistgelikter YouTube Kommentar (4.5k Likes): "My ideal tool: one installer, bundles Ollama, clean chat UI, built-in RAG, Stable Diffusion, voice. All configurable through GUI. No terminal."
- "My dream: Ollama + automatic model updates + built-in GUI + RAG + image gen. One app." (2.7k Likes)
- "I just want ONE tool that handles text gen, image gen, voice, and RAG without needing a PhD in DevOps"
- "Someone needs to make the 'Spotify of local AI'"
- LU ist das EINZIGE Tool das Text + Image + Video in einer App vereint

### 4. COMFYUI UX IST HORROR
- "I tried to help my artist friend get started and they literally cried." (r/comfyui)
- "ComfyUI getting an F tier for UX is generous honestly" (2.1k Likes)
- "I have 47 custom nodes installed and I'm afraid to update any of them"
- Custom Nodes breaken bei jedem Update, keine Fehlermeldungen
- LU Vorteil: One-Click ComfyUI Setup Wizard abstrahiert die Komplexitaet

### 5. RAG FUNKTIONIERT NIRGENDS GUT
- "Tried to set up a RAG pipeline with local models. Gave up after 2 days. Went back to ChatGPT."
- "Been running local LLMs for a year. Still can't get reliable RAG working."
- "LlamaIndex, LangChain, Haystack... they all work great in demos and fall apart with real documents."
- Wer RAG als erstes sauber loest in einem All-in-One Tool, gewinnt

### 6. LEUTE WOLLEN LOCAL AI AGENTS
- "Please do a video on running AI agents locally. That's the next frontier but there's zero good tools for it" (1.3k Likes)
- "Local AI agents that can actually DO things - browse the web, manage files, write and execute code"
- "Local agents are going to be the next big thing but right now every 'agent framework' is just prompt chaining with extra steps"
- Noch NIEMAND hat das sauber geloest

### 7. LEUTE WUERDEN ZAHLEN
- "I'd pay $50/month for a properly maintained, all-in-one local AI platform that just works." (Reddit r/LocalLLaMA)
- "The 'free but broken' options are costing me more in time."
- Zahlungsbereitschaft existiert, besonders bei Leuten die Zeit > Geld werten

---

## Konkurrenz-Schwaechen

### Open WebUI
- Bloated (8GB Docker Image)
- Updates breaken alles
- Feature Creep - versucht alles, macht nichts gut
- Docker-Pflicht
- Kein nativer Desktop Client
- Top GitHub Issues: Chat-Ordner (#1438), Multi-Model Vergleich (#5765), MCP Support (#8828), Performance (#9563)

### Jan.ai
- Langsame Entwicklung
- Linux-Stabilitaet schlecht
- Kein Image/Video Gen

### LM Studio
- Closed Source
- Nur Model Management + Chat, keine Image Gen
- Kein RAG

### SillyTavern
- Nische (Roleplay/Creative)
- Komplexe Einrichtung
- Kein Image Gen Integration

### AnythingLLM
- RAG-fokussiert aber UI veraltet
- Keine Image/Video Gen

---

## Feature-Roadmap Empfehlung (nach User-Demand sortiert)

### Phase 1 - Sofort umsetzbar (USP staerken)
- [ ] GitHub Sponsors + Donation Links einrichten
- [ ] "Pro" Roadmap im README andeuten
- [ ] Model Router (automatisch bestes Model pro Task waehlen)

### Phase 2 - Hohes Demand (naechste 1-3 Monate)
- [ ] RAG / Document Chat (DER meistgeforderte Feature)
- [ ] Mobile App (verbindet sich zum Home-Server)
- [ ] Voice Integration (STT + TTS lokal)
- [ ] Besseres Model Management (Vergleich, Benchmarks, Notizen)

### Phase 3 - Differenzierung (3-6 Monate)
- [ ] Local AI Agents (File Management, Code Execution, Web Browse)
- [ ] Fine-Tuning GUI fuer Non-Experts
- [ ] Plugin/Extension System
- [ ] Enterprise Features (Multi-User, Admin, Usage Tracking)

### Monetarisierung
- Freemium: Basis kostenlos, Pro-Features ($9-29/mo oder Einmalzahlung)
- Pro Candidates: RAG, Agents, Fine-Tuning GUI, Cloud Sync, Model Router, Priority Support
- Enterprise: Multi-User, Admin Panel, SSO, Usage Analytics

---

## Killer-Zitat fuer Marketing
"My ideal tool: one installer, bundles Ollama, clean chat UI, built-in RAG, Stable Diffusion, voice. All configurable through GUI. No terminal. Someone build this please." - YouTube User (4.5k Likes)

Das beschreibt GENAU was Locally Uncensored werden soll.
