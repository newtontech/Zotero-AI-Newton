# 🚀 Zotero AI Newton

<p align="center">
  <img src="addon/content/icons/newton-n-star.svg" alt="Zotero AI Newton icon" width="220" />
</p>

<div align="center">
  [![Zotero](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
  [![Stars](https://img.shields.io/github/stars/newtontech/Zotero-AI-Newton?style=social)](https://github.com/newtontech/Zotero-AI-Newton)
  [![License](https://img.shields.io/github/license/newtontech/Zotero-AI-Newton?style=flat-square)](LICENSE)
  [![Beta](https://img.shields.io/badge/version-0.0.1-beta-orange?style=flat-square)](release/zotero-ai-newton-0.0.1-beta.xpi)
  [![CI](https://github.com/newtontech/Zotero-AI-Newton/actions/workflows/ci.yml/badge.svg)](https://github.com/newtontech/Zotero-AI-Newton/actions/workflows/ci.yml)
  [![Release](https://github.com/newtontech/Zotero-AI-Newton/actions/workflows/release.yml/badge.svg)](https://github.com/newtontech/Zotero-AI-Newton/actions/workflows/release.yml)
</div>

<div align="center">[English](README.md) | [简体中文](release/README-zhCN.md)</div>

> **Transform your Zotero into an AI-powered knowledge hub!** 💥  
> Chat with items, PDFs, or entire collections using OpenAI, DeepSeek, or custom LLMs. All data stays local. No more fragmented notes—unlock seamless AI research!

📣 Promo site: https://newtontech.github.io/Zotero-AI-Newton-website

## ✨ Killer Features

- 🧠 **AI Knowledge Workspace**: Multi-turn chats with full history, auto-syncing your Zotero selection
- 📄 **PDF Superpowers**: Instant summaries & Q&A on attached PDFs
- 📂 **Collection Intelligence**: Aggregate & reason across folders before LLM calls
- 🔌 **Model Agnostic**: OpenAI, DeepSeek, or custom—plug in your API key & model
- 🎨 **Tone Mastery**: Concise, detailed, or creative responses at the flip of a switch

## 🚀 Lightning-Fast Install (Prebuilt Beta)

1. 🎯 **[Download XPI Now](release/zotero-ai-newton-0.0.1-beta.xpi)** – No build required!
2. Zotero: **Tools → Add-ons → Install Add-on From File** → Pick the XPI
3. ✅ **Auto-Updates** via `release/update-beta.json` – Stay on bleeding edge!

## Compatibility Matrix

| Component    | Supported                                        | Notes                                                                             |
| ------------ | ------------------------------------------------ | --------------------------------------------------------------------------------- |
| Zotero       | 7.x                                              | Primary target for the current beta                                               |
| OS           | macOS, Windows, Linux                            | Follows Zotero desktop support; report OS-specific UI issues with screenshots     |
| Providers    | OpenAI-compatible APIs, DeepSeek-compatible APIs | Configure base URL, API key, and model in preferences                             |
| Network mode | User-provided API key                            | Zotero data stays local; selected context is sent only to the configured provider |

## Release Flow

1. Run `npm run lint:check`.
2. Run `npm run test` when Zotero test tooling is available locally.
3. Run `npm run build` and verify the generated XPI under `.scaffold/build/`.
4. Copy the versioned XPI into `release/` and update `release/update-beta.json`.
5. Install the packaged XPI in a clean Zotero profile and test item, PDF, and collection chat.
6. Publish a GitHub release with compatibility notes and known limitations.

## Screenshot Checklist

Before each public beta, refresh screenshots or GIFs for add-on installation, preferences, item chat, PDF Q&A, and collection context preview.

### ⚙️ 2-Min Setup

1. **Edit → Preferences → Zotero AI Newton**
2. Enter your **OpenAI/DeepSeek API key** + model
3. Choose scope (auto/item/collection) & tone → **Save**
4. Go online – You're AI-ready! 🚀

### 🔨 Build from Source (Devs)

```bash
git clone https://github.com/newtontech/Zotero-AI-Newton
cd Zotero-AI-Newton
npm install
npm run build  # → .scaffold/build/*.xpi
```

Install the XPI as above. Hot-reload: `npm run start` 🔥

## ⚙️ Customize Your AI

**Edit → Preferences → Zotero AI Newton**: Pick provider, API URL/key, model, scope & tone. All local, zero telemetry! 🔒

The active AI surface is intentionally small for the beta: summaries, keyword
extraction, related-reading directions, and grounded chat. See
[AI Feature Roadmap](docs/AI_ROADMAP.md) for the YAGNI boundary and evaluation
baseline.

See [Project Roadmap](ROADMAP.md) for the stabilization roadmap and implementation status.

## 🎯 Get Started in Seconds

- Select items/collection → **AI Workspace** tab for context preview
- Open **Zotero AI Newton** sidebar (or right-click menu) → Chat away! 💬
- 🔄 Refresh context on selection changes

## 👨‍💻 Dev Mode

```bash
npm run start     # 🌡️ Hot reload
npm run lint:check # 🔍 Code quality
npm run build      # 📦 Release XPI
```

Quality gate before opening a PR:

```bash
npm run lint:check
npm run build
npm run test
```

## 🖼️ Brand Assets

- Primary icon: `addon/content/icons/newton-n-star.svg`
- Icons are centralized under `addon/content/icons` to avoid scattered asset folders.

## 🌟 Join the Revolution

⭐ **Star us** on GitHub!  
🤝 **Contribute**: Better prompts, new models, PDF magic? PRs welcome!  
💬 **Feedback**: Issues or Discord soon...

**Made with ❤️ for researchers worldwide.**
