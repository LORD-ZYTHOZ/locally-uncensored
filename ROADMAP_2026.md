# Locally Uncensored — Strategy & Roadmap
**Stand: 28. März 2026**

---

## Markt-Analyse

### Der local AI Stack heute (März 2026)

| Tool | Stars | Was es macht | LU-Differenziator |
|------|-------|--------------|-------------------|
| **Ollama** | 166K | LLM Runtime lokal | davon abhängig |
| **AUTOMATIC1111 SD WebUI** | 162K | Image Gen (nur SD) | davon abhängig |
| **Open WebUI** | 129K | Chat-UI für Ollama, RAG builtin, Docker | kein Image/Video |
| **Stable Diffusion WebUI** | 162K | Image Gen lokal | davon abhängig |
| **SillyTavern** | 25K | Chat + Personas, Roleplay-Fokus | kein Image/Video |
| **ComfyUI** | ?K | Image/Video Gen Standard | davon abhängig |
| **Claraverse** | 3.7K | Chat + Image + iOS/Android, RAG | LU = deren Web-Alternative |
| **OpenLoaf** | 28 | Workspace: Chat + Image + Video + Docs + Email | sehr frisch, weniger Personas |
| **askimo** | 60 | Chat + RAG + MCP, kein Image/Video | davon abweichend |
| **Open WebUI** | 129K | RAG + Ollama, kein Image/Video | LU hat was die nicht haben |
| **LM Studio** | closed | Chat + Models, closed source | LU = open source Alternative |

### Was schiefgeht bei der Konkurrenz

**Open WebUI (129K Stars):**
- RAG ist eingebaut — LU hat das NICHT
- Chat-only, kein Image/Video
- Docker-pflichtig
- Braucht separate Image/Video Tools

**SillyTavern (25K Stars):**
- Personas sind gut aber manuell
- Kein Image/Video nativ
- Open Source aber kein echtes "all-in-one"

**Claraverse (3.7K):**
- Am nächsten an LU — Chat + Image + Android/iOS
- RAG builtin
- Aber: Fokus auf Mobile, nicht auf lokale Desktop-Experience
- LU kann deren Web-Alternative sein

**OpenLoaf (28 Stars):**
- Verrät was der Markt WILL: ein echtes All-in-one
- Aber: 28 Stars, also ganz am Anfang
- LU hat 4 Tage Vorsprung und schon bessere Numbers

**LM Studio:**
- Closed Source — Menschen wollen offene Alternativen
- LU = die offene Alternative die nicht закрыта ist

---

## Locally Uncensored — Status Quo

### Zahlen (28.03.2026)
- **Stars:** 9
- **Forks:** 1
- **Views:** 301 (115 Unique)
- **Spike:** 27.03 — 183 Views, 74 Unique (Desktop App Launch)
- **Releases:** v1.0.0 (25.03), v1.1.0 (27.03)
- **Downloads:** 2 (v1.1.0), 0 (v1.0.0)
- **Issues:** 0
- **Community:** 0 Beiträge, 0 PRs
- **Alter:** 4 Tage

### Was LU aktuell kann
- Chat mit 25+ Personas
- Image Generation (ComfyUI)
- Video Generation (Wan 2.1/2.2, AnimateDiff)
- Model Manager (Ollama + ComfyUI)
- Auto-Detection aller installierten Models
- One-Click ComfyUI Install
- Dark/Light Mode
- Tauri v2 Desktop App (Win/Mac/Linux)
- Landing Page + SEO
- CI/CD für alle 3 Plattformen

### Was LU NICHT kann (aber sollte)
- **RAG / Document Chat** — PDFs hochladen und mit Dokumenten chatten
- **Audio** — TTS / Music Generation
- **Plugin System** — Community kann nix beitragen
- **Mobile UI** — nur Desktop
- **Export/Import** — keine Backups
- **Custom Persona Creator** — Personas sind hardcoded

---

## Differenziatoren

LU ist aktuell das **einzige** Tool das folgendes gleichzeitig kann:

1. **Chat + Image + Video** in einer UI
2. **Lokal, open source, no Docker**
3. **One-Click Setup** (ComfyUI auto-install)
4. **25+ Personas** out of the box
5. **Tauri Desktop App** (native, nicht Electron)

Das ist ein echtes Alleinstellungsmerkmal. Niemand sonst hat das Paket.

---

## Feature Priority

### Phase 1 — Die Lücken schließen (April 2026)

**1. RAG / Document Chat** [HOCH]
- PDFs, DOCs, TXT hochladen und chatten
- Ollama für Embedding + Retrieval
- Das ist das größte fehlende Feature
- Open WebUI hat das — LU braucht das auch
- Technologie: LlamaIndex oder plain Ollama Embeddings

**2. Verbesserter Model Discover** [MITTEL]
- Mehr Modell-Empfehlungen
- Mehr Modelle zum Download anbieten
- "Trending Models" Section
- Clear differentiation between good/bad models

**3. Custom Persona Creator** [MITTEL]
- Eigenen Persona bauen
- Name, Avatar, System Prompt, Parameters
- Speichern/Teilen

### Phase 2 — Features die LU rocken machen (Mai 2026)

**4. Audio — TTS + Music** [MITTEL]
- Text-to-Speech Output
- HeartMuLa Integration (bzw. was David schon hat)
- Music Generation
-Das macht LU zum echten "Alles aus einer Hand"

**5. Community Features** [MITTEL]
- Discord Server oder GitHub Discussions aktivieren
- Feedback Loop: "Try it and tell us"
- Showcase: Community Creations
- Social Proof aufbauen

**6. Export/Import + Backup** [NIEDRIG]
- Chats exportieren
- Settings exportieren
- Personas exportieren/importieren
- Backup/Restore

### Phase 3 — Scale (Juni+ 2026)

**7. Plugin System** [MITTEL]
- Community kann Plugins bauen
- Das ist wie LU sich selbst überlebt
- Open WebUI hat das — LU braucht das für Ecosystem

**8. Mobile UI** [NIEDRIG]
- Responsive Layout für Phone/Tablet
- LU auf dem Handy wäre krass

**9. Open Core / Monetarisierung** [STRATEGISCH]
- Free: Chat + Image + Video
- Pro: RAG + Audio + Cloud Sync + Multi-User
- Enterprise: Teams, SLA, Branding
- GitHub Sponsors reicht erstmal aber frühzeitig über Monetarisierung nachdenken

---

## Go-To-Market Strategie (nächste 30 Tage)

### Wo wir sind
- 4 Tage alt, 9 Stars, 0 Issues
-Launch-Spike war der Desktop-App Release

### Was funktioniert HEUTE für Open Source Projects

**1. Show HN / Product Hunt Launch**
- Show HN post (geplant Di 14:30 — steht in den Memory Notes)
- Product Hunt launchen
- Das ist der größte einzelne Traffic-Boot

**2. Multi-Channel Seeding (non-promotional)**
- r/selfhosted: organisch seeding, kein "I built X", nur informative Posts
- r/LocalLLaMA: "I made an all-in-one local AI app" (authentisch, nicht Promo)
- r/StableDiffusion: ComfyUI-Integration erwähnen
- Dev.to article: "Why I built Locally Uncensored — a real use case story"
- Hashnode blog (purptech account ist ready laut Memory)

**3. Social Proof aufbauen**
- Discord aktivieren
- "I tried it" Posts encourage
- Screenshots/GIFs in Discussions
- Die 9 Stars sind nix — 50-100 Stars wäre was

**4. Content / SEO**
- Dev.to article fertig (laut Memory "Dev.to articles ready")
- Hashnode blog aufsetzen (Blog-Setup noetig)
- Landing Page ist schon gut — SEO + sitemap ready
- Meta Descriptions + Keywords passen

**5. Community seeding**
- LU braucht Beta Tester (Feedback!)
- Closed Beta mit Formular
- Discord für Diskussionen
- Issues öffnen (künstlich wenn nötig): "Feedback wanted: RAG priorities"

### Was NICHT funktioniert
- Direkte Promotion Posts in Communities
- "Built X with Y" Slop (r/selfhosted fail am 26.03)
- Reddit Posts ohne echten Mehrwert
- Bitten um Stars/Forks

---

## Konkurrenz-Analyse Detail

### Warum Open WebUI (129K Stars) nicht reicht

Open WebUI hat RAG, hat Ollama-Integration, hat Docker — aber:
- Kein Image Generation
- Kein Video Generation
- Docker-Komplexität
- LU = das was OWUI nicht hat

**Positionierung:** "Open WebUI für Chat, LU für alles was darüber hinausgeht"

### Warum SillyTavern (25K Stars) nicht reicht

- Personas sind gut, aber kein Image/Video
- Vielleicht die Personas-Kategorie — LU kann das besser

### Warum Claraverse (3.7K) gefährlich ist

Claraverse hat erkannt was LU auch erkannt hat — aber:
- LU ist 4 Tage alt, Claraverse hat schon 3.7K Stars
- Aber: Claraverse ist Mobile-first, LU ist Desktop-first
- LU kann Claraverse für Desktop-User sein

### Warum OpenLoaf (28 Stars) interessant ist

28 Stars aber die Idee ist richtig — LU hat mehr:
- LU = Desktop-Alternative zu OpenLoaf
- LU hat mehr Stars in 4 Tagen als OpenLoaf in ? Monaten

---

## Technologie-Trends (März 2026)

**Ollama:**
- Kimi-K2.5, GLM-5, MiniMax, DeepSeek, Qwen, Gemma
- Läuft 166K Stars, massive Community
- Ollama = Standard für lokale LLMs

**ComfyUI:**
- Image + Video Generation Standard
- Wan 2.1/2.2 + AnimateDiff supported
- FLUX.1 + Juggernaut XL dominating

**RAG:**
- LlamaIndex + Ollama Embeddings = der Weg
- Jeder will das — LU braucht das auch

**MCP (Model Context Protocol):**
- Open WebUI unterstützt es
- LU sollte das auch unterstützen
- MCP = Tool-Use für LLMs

**Tauri v2:**
- LU nutzt es bereits
- Besser als Electron, kleiner, native
- CI/CD funktioniert already für alle Plattformen

**Vision LLMs:**
- Claude, GPT-4V, Gemini — alle können Bild-Analyse
- LU könnte Vision-Models für RAG nutzen (Bild-Analyse von Floor Plans etc.)

---

## Zusammenfassung — Was LU jetzt braucht

1. **RAG** — größte Lücke, hat Open WebUI, LU braucht das
2. **Show HN / Product Hunt** — nächster Traffic-Boot
3. **Social Proof** — 50-100 Stars als Ziel
4. **Community** — Discord/Discussions aktivieren
5. **Audio** — TTS + Music, macht LU komplett
6. **Plugin System** — Ecosystem bauen

---

## Offene Fragen (für David)

- [ ] Wer ist die Zielgruppe genau? Privacy-Freaks? AI Enthusiasten? Content Creators?
- [ ] Monetarisierung — wann den Schritt gehen? Jetzt GitHub Sponsors, später Open Core?
- [ ] RAG-Stack — LlamaIndex oder was Eigenes mit Ollama Embeddings?
- [ ] MCP Support —priorität?
- [ ] Mobile UI — erst Desktop stabil, dann Mobile?
