# DevStock — Stock Images for VS Code

<!-- <p align="center">
  <img src="resources/devstock-final.svg" alt="DevStock Logo" width="128" />
</p> -->

<h3 align="center">The ultimate stock image companion for developers. Search, Preview, and Insert high-quality images without leaving your editor.</h3>

<p align="center">
  <img src="https://img.shields.io/badge/VS%20Code-v1.85.0+-blue?logo=visual-studio-code" alt="VS Code Version" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

**DevStock** is a powerful VS Code extension that integrates **Unsplash**, **Pexels**, and **Pixabay** directly into your workflow. Whether you're building a landing page, writing markdown documentation, or styling a React component, DevStock helps you find and insert perfect placeholder images in seconds.

## ✨ 1.0.0 Features

- 🔍 **Triple-Engine Search** — Unified access to Unsplash, Pexels, and Pixabay.
- 🖼️ **Premium Lightbox** — Click any image to view it in a stunning fullscreen, high-resolution preview.
- 📋 **Context-Aware Insertion** — Automatically detects your file type:
  - **HTML**: `<img src="..." alt="..." />`
  - **Markdown**: `![alt](url)`
  - **CSS**: `background-image: url('...')` (Smart-detects if you're already inside `url()`)
  - **JSX/React**: `src={...}` support.
  - **URL**: Just the clean source link.
- 💾 **Local Downloads** — Save images directly to your project. The extension tracks local files and intelligently switches to local paths in your code.
- ⚡ **Magic Trigger** — Type `{/img}` in any file to instantly open search. Fully customizable in settings.
- ⌨️ **Keyboard Navigation** — Navigate results with arrow keys, preview with Enter, and close with Escape.
- 🛡️ **Rate Limit Awareness** — Real-time tracking of API usage so you never hit a wall mid-search.

## 🚀 Installation & Quick Start

1. **Install** the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com).
2. **API Keys**: DevStock comes with internal fallbacks, but for full performance, add your own keys in `Settings → DevStock`:
   - [Unsplash](https://unsplash.com/developers)
   - [Pexels](https://www.pexels.com/api/)
   - [Pixabay](https://pixabay.com/api/docs/)
3. **Open Explorer**: Use the Activity Bar icon or press `Ctrl + Shift + I`.

## ⚙️ Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `devstock.defaultProvider` | Start search on this provider | `unsplash` |
| `devstock.downloadPath` | Project folder for downloads | `images` |
| `devstock.triggerPattern` | The magic string to open sidebar | `{/img}` |
| `devstock.enableTrigger` | Toggle the auto-open feature | `true` |

## 🏗️ For Developers

DevStock is built with **modern TypeScript**, **esbuild**, and **Vanilla CSS** for a lightning-fast experience.

```bash
# Clone and install
git clone https://github.com/AvTe/DevStock.git
cd DevStock
npm install

# Build & Run
npm run compile
# Press F5 to launch Extension Development Host
```

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">Crafted with ❤️ for the Developer Community</p>
