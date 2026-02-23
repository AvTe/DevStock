# Changelog

All notable changes to the **DevStock** extension will be documented here.

## [1.0.2] - 2025-02-23

### 🐛 Bug Fix

- Redesigned activity bar SVG icon to match the gallery-style PNG icon (stacked cards with mountains and sun). Uses filled paths for better VS Code rendering compatibility.

## [1.0.1] - 2025-02-23

### 🐛 Bug Fix

- Fixed activity bar icon not displaying. Replaced embedded-raster SVG with a proper vector SVG using `currentColor` for theme compatibility.

## [1.0.0] - 2025-02-23

### 🚀 Initial Release

- **Triple-Engine Search** — Unified access to Unsplash, Pexels, and Pixabay
- **Premium Lightbox** — Fullscreen high-resolution image preview
- **Context-Aware Insertion** — Auto-detects HTML, Markdown, CSS, JSX, and plain URL
- **Smart CSS/JSX Detection** — Avoids double-wrapping `url()` or `src={}`
- **Local Downloads** — Save images directly to your project folder
- **Magic Trigger** — Type `{/img}` to instantly open search (customizable)
- **Keyboard Navigation** — Arrow keys to navigate grid, Enter to preview, Escape to close
- **Rate Limit Awareness** — Real-time API usage tracking with visual indicators
- **Workspace Trust** — Downloads only work in trusted workspaces
- **Production Logger** — Dedicated "DevStock" output channel for debugging
