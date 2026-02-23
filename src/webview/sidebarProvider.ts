// ============================================================
// DevStock — Sidebar Webview Provider
// Uses VS Code native theme + codicon icons for a clean look
// Added Features: Search Suggestions & Related Images
// ============================================================

import * as vscode from 'vscode';
import { ImageProviderFactory } from '../providers/imageProviderFactory';
import { ImageDownloader } from '../services/imageDownloader';
import { ImageInserter } from '../services/imageInserter';
import { WebviewToExtensionMessage, ImageProvider, StockImage, ImageSize, InsertFormat } from '../types';

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'devstock.searchPanel';
  private _view?: vscode.WebviewView;
  private providerFactory: ImageProviderFactory;
  private downloader: ImageDownloader;
  private inserter: ImageInserter;

  constructor(private readonly _extensionUri: vscode.Uri) {
    this.providerFactory = new ImageProviderFactory();
    this.downloader = new ImageDownloader();
    this.inserter = new ImageInserter();
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    const codiconsUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css')
    );

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlContent(webviewView.webview, codiconsUri);

    webviewView.webview.onDidReceiveMessage(async (message: WebviewToExtensionMessage) => {
      await this._handleMessage(message);
    });
  }

  public focus(): void {
    if (this._view) {
      this._view.show(true);
    }
  }

  private postMessage(message: any): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  private async _handleMessage(message: WebviewToExtensionMessage): Promise<void> {
    switch (message.type) {
      case 'search':
        await this._handleSearch(message.query, message.provider, message.page, message.isSuggested);
        break;
      case 'download':
        await this._handleDownload(message.image, message.size);
        break;
      case 'insert':
        await this._handleInsert(message.image, message.format);
        break;
      case 'copyUrl':
        await vscode.env.clipboard.writeText(message.url);
        vscode.window.showInformationMessage('Image URL copied to clipboard.');
        break;
      case 'openExternal':
        vscode.env.openExternal(vscode.Uri.parse(message.url));
        break;
      case 'getConfig':
        this._sendConfig();
        break;
      case 'ready':
        this._sendConfig();
        break;
    }
  }

  private async _handleSearch(query: string, provider: ImageProvider, page: number, isSuggested?: boolean): Promise<void> {
    if (!query.trim()) { return; }
    this.postMessage({ type: 'searching', query, isSuggested });
    try {
      const result = await this.providerFactory.search(provider, query, page);
      this.postMessage({ type: 'searchResults', data: result, isSuggested });
    } catch (error: any) {
      this.postMessage({ type: 'error', message: error.message });
      vscode.window.showErrorMessage(`DevStock: ${error.message}`);
    }
  }

  private async _handleDownload(image: StockImage, size: ImageSize): Promise<void> {
    try {
      const relativePath = await this.downloader.download(image, size);
      this.postMessage({ type: 'downloadComplete', success: true, filePath: relativePath });
      vscode.window.showInformationMessage(`Image saved to ${relativePath}`);
    } catch (error: any) {
      this.postMessage({ type: 'downloadComplete', success: false, error: error.message });
      vscode.window.showErrorMessage(`DevStock: ${error.message}`);
    }
  }

  private async _handleInsert(image: StockImage, format: InsertFormat): Promise<void> {
    try {
      await this.inserter.insert(image, format, image.localPath);
      this.postMessage({ type: 'insertComplete', success: true });
      vscode.window.showInformationMessage('Image reference inserted.');
    } catch (error: any) {
      this.postMessage({ type: 'insertComplete', success: false, error: error.message });
      vscode.window.showErrorMessage(`DevStock: ${error.message}`);
    }
  }

  private _sendConfig(): void {
    const config = vscode.workspace.getConfiguration('devstock');
    this.postMessage({
      type: 'config',
      defaultProvider: config.get<ImageProvider>('defaultProvider', 'unsplash'),
      hasUnsplash: this.providerFactory.isProviderConfigured('unsplash'),
      hasPexels: this.providerFactory.isProviderConfigured('pexels'),
      hasPixabay: this.providerFactory.isProviderConfigured('pixabay'),
    });
  }

  private _getHtmlContent(webview: vscode.Webview, codiconsUri: vscode.Uri): string {
    const nonce = getNonce();

    return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'none';
    img-src ${webview.cspSource} https://images.unsplash.com https://images.pexels.com https://pixabay.com https://*.pixabay.com data:;
    style-src ${webview.cspSource} 'unsafe-inline';
    script-src 'nonce-${nonce}';
    font-src ${webview.cspSource};
    connect-src https://api.unsplash.com https://api.pexels.com https://pixabay.com https://api.datamuse.com;
  ">
  <link href="${codiconsUri}" rel="stylesheet" />
  <title>DevStock</title>
  <style>
    /* ============================================ */
    /*  VS Code Native Theme — No custom colors    */
    /* ============================================ */

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      line-height: 1.4;
      overflow-x: hidden;
    }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--vscode-scrollbarSlider-hoverBackground); }

    /* ---- Header ---- */
    .header {
      padding: 12px 12px 10px;
      border-bottom: 1px solid var(--vscode-panel-border);
      position: sticky;
      top: 0;
      background: var(--vscode-sideBar-background);
      z-index: 50;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 10px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-sideBarSectionHeader-foreground);
    }

    .title-row .codicon {
      font-size: 14px;
    }

    .rate-limit-badge {
      font-size: 9px;
      padding: 1px 6px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-left: auto;
      opacity: 0.8;
    }
    .rate-limit-badge.warning {
      background: var(--vscode-inputValidation-warningBackground);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-inputValidation-warningBorder);
    }
    .rate-limit-badge.error {
      background: var(--vscode-inputValidation-errorBackground);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-inputValidation-errorBorder);
    }

    /* ---- Search ---- */
    .search-box {
      position: relative;
      margin-bottom: 8px;
    }

    .search-box .codicon {
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 14px;
      color: var(--vscode-input-placeholderForeground);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 5px 8px 5px 28px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 2px;
      font-family: inherit;
      font-size: inherit;
      outline: none;
    }

    .search-input:focus {
      border-color: var(--vscode-focusBorder);
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }

    .search-input::placeholder {
      color: var(--vscode-input-placeholderForeground);
    }

    /* ---- Suggestions ---- */
    .suggestions-list {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--vscode-dropdown-background);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 2px;
      z-index: 1000;
      display: none;
      list-style: none;
      margin: 2px 0 0;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      max-height: 200px;
      overflow-y: auto;
    }

    .suggestions-list.active { display: block; }

    .suggestion-item {
      padding: 4px 10px;
      cursor: pointer;
      font-size: 12px;
      color: var(--vscode-dropdown-foreground);
      border-bottom: 1px solid var(--vscode-dropdown-border);
    }

    .suggestion-item:last-child { border-bottom: none; }
    .suggestion-item:hover {
      background: var(--vscode-list-hoverBackground);
      color: var(--vscode-list-hoverForeground);
    }

    /* ---- Provider Tabs ---- */
    .provider-tabs {
      display: flex;
      gap: 1px;
      border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
      border-radius: 2px;
      overflow: hidden;
    }

    .provider-tab {
      flex: 1;
      padding: 4px 6px;
      text-align: center;
      font-size: 11px;
      font-family: inherit;
      color: var(--vscode-foreground);
      background: var(--vscode-input-background);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .provider-tab:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .provider-tab.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .status-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .status-dot.ok { background: var(--vscode-testing-iconPassed, #3fb950); }
    .status-dot.no { background: var(--vscode-testing-iconFailed, #f85149); }

    /* ---- Content ---- */
    .content {
      padding: 10px 12px;
      overflow-y: auto;
      max-height: calc(100vh - 130px);
    }

    /* ---- Welcome ---- */
    .welcome {
      text-align: center;
      padding: 24px 8px;
      color: var(--vscode-descriptionForeground);
    }

    .welcome .codicon {
      font-size: 32px;
      margin-bottom: 10px;
      display: block;
      opacity: 0.5;
    }

    .welcome h3 {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--vscode-foreground);
    }

    .welcome p {
      font-size: 12px;
      line-height: 1.6;
      margin-bottom: 4px;
    }

    .trigger-hint {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 10px;
      padding: 4px 10px;
      background: var(--vscode-textBlockQuote-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 2px;
      font-size: 11px;
    }

    .trigger-hint code {
      font-family: var(--vscode-editor-font-family);
      background: var(--vscode-textCodeBlock-background);
      padding: 1px 4px;
      border-radius: 2px;
      font-size: 11px;
    }

    /* ---- Loading ---- */
    .loading {
      text-align: center;
      padding: 32px 8px;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--vscode-panel-border);
      border-top-color: var(--vscode-progressBar-background);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin: 0 auto 10px;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .loading p {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }

    /* ---- Image Grid ---- */
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }

    .image-card {
      position: relative;
      border-radius: 3px;
      overflow: hidden;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      cursor: pointer;
      aspect-ratio: 4 / 3;
    }

    .image-card:hover {
      border-color: var(--vscode-focusBorder);
    }

    .image-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .image-card .card-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 16px 6px 4px;
      background: linear-gradient(transparent, rgba(0,0,0,0.7));
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .image-card:focus {
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: -2px;
    }

    .image-card:hover .card-overlay { opacity: 1; }

    .card-overlay .photographer {
      font-size: 10px;
      color: #eee;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-overlay .dimensions {
      font-size: 9px;
      color: #aaa;
      margin-top: 1px;
    }

    /* ---- Results Info ---- */
    .results-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }

    /* ---- Pagination ---- */
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 10px;
      padding: 8px 0;
    }

    .page-btn {
      padding: 3px 10px;
      font-size: 11px;
      font-family: inherit;
      border: 1px solid var(--vscode-button-secondaryBackground, var(--vscode-panel-border));
      border-radius: 2px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      cursor: pointer;
    }

    .page-btn:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .page-btn:disabled {
      opacity: 0.4;
      cursor: default;
    }

    .page-info {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      min-width: 40px;
      text-align: center;
    }

    /* ---- Preview Overlay ---- */
    .preview-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: var(--vscode-editor-background);
      z-index: 100;
      flex-direction: column;
    }

    .preview-overlay.active { display: flex; }

    .preview-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
      background: var(--vscode-sideBar-background);
    }

    .preview-title {
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 70%;
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      border-radius: 3px;
    }

    .close-btn:hover {
      background: var(--vscode-toolbar-hoverBackground);
    }

    .preview-scroll-container {
      flex: 1;
      overflow-y: auto;
      background: var(--vscode-editor-background);
    }

    .preview-image-area {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
      background: var(--vscode-editor-background);
      min-height: 200px;
    }

    .preview-image-area img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border: 1px solid var(--vscode-panel-border);
      cursor: zoom-in;
    }

    .maximize-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0.8;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    .preview-image-area:hover .maximize-btn {
      opacity: 1;
      transform: scale(1.05);
      background: rgba(0, 0, 0, 0.6);
    }

    .maximize-btn:hover {
      background: var(--vscode-button-background);
      border-color: transparent;
      transform: scale(1.15) !important;
    }

    /* ---- Grid Card Maximize ---- */
    .grid-maximize-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0;
      transform: translateY(-5px);
      transition: all 0.2s ease;
      z-index: 20;
    }

    .image-card:hover .grid-maximize-btn {
      opacity: 1;
      transform: translateY(0);
    }

    .grid-maximize-btn:hover {
      background: var(--vscode-button-background);
      transform: scale(1.1);
    }

    /* ---- Lightbox Overlay ---- */
    .lightbox-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 2000;
      display: none;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
      backdrop-filter: blur(5px);
    }

    .lightbox-overlay.active {
      display: flex;
      opacity: 1;
    }

    .lightbox-content {
      position: relative;
      max-width: 95%;
      max-height: 95%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .lightbox-image {
      max-width: 100%;
      max-height: 90vh;
      object-fit: contain;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      border-radius: 4px;
    }

    .lightbox-close {
      position: absolute;
      top: -40px;
      right: 0;
      background: transparent;
      border: none;
      color: #fff;
      font-size: 24px;
      cursor: pointer;
      opacity: 0.7;
    }

    .lightbox-close:hover { opacity: 1; }

    .preview-meta {
      padding: 8px 12px;
      border-top: 1px solid var(--vscode-panel-border);
      background: var(--vscode-sideBar-background);
      font-size: 11px;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 2px;
      color: var(--vscode-descriptionForeground);
    }

    .meta-row .codicon { font-size: 12px; }

    .meta-row a {
      color: var(--vscode-textLink-foreground);
      text-decoration: none;
    }

    .meta-row a:hover { text-decoration: underline; }

    /* ---- Suggested Images Section ---- */
    .suggested-section {
      padding: 12px;
      border-top: 1px solid var(--vscode-panel-border);
      background: var(--vscode-sideBar-background);
    }

    .suggested-label {
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--vscode-foreground);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .suggested-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
    }

    .suggested-card {
      aspect-ratio: 1;
      border-radius: 2px;
      overflow: hidden;
      border: 1px solid var(--vscode-panel-border);
      cursor: pointer;
    }

    .suggested-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .suggested-card:hover {
      border-color: var(--vscode-focusBorder);
    }

    /* ---- Format Selector ---- */
    .format-section {
      padding: 10px 12px;
      background: var(--vscode-sideBar-background);
      border-top: 1px solid var(--vscode-panel-border);
    }

    .format-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 4px;
      font-weight: 600;
    }

    .format-options {
      display: flex;
      gap: 3px;
      flex-wrap: wrap;
    }

    .format-chip {
      padding: 2px 8px;
      font-size: 11px;
      font-family: inherit;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 2px;
      background: var(--vscode-input-background);
      color: var(--vscode-foreground);
      cursor: pointer;
    }

    .format-chip:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .format-chip.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-background);
    }

    /* ---- Action Buttons ---- */
    .actions {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px;
      padding: 8px 12px 12px;
      background: var(--vscode-sideBar-background);
      border-top: 1px solid var(--vscode-panel-border);
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 5px 8px;
      font-size: 11px;
      font-family: inherit;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 2px;
      cursor: pointer;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .action-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .action-btn.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-background);
    }

    .action-btn.primary:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .action-btn .codicon { font-size: 14px; }

    /* ---- Error State ---- */
    .error-state {
      text-align: center;
      padding: 24px 8px;
    }

    .error-state .codicon {
      font-size: 28px;
      display: block;
      margin-bottom: 8px;
      color: var(--vscode-errorForeground);
    }

    .error-state p {
      font-size: 12px;
      color: var(--vscode-errorForeground);
      margin-bottom: 10px;
    }

    .retry-btn {
      padding: 4px 14px;
      font-size: 12px;
      font-family: inherit;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 2px;
      cursor: pointer;
    }

    .retry-btn:hover {
      background: var(--vscode-button-hoverBackground);
    }

    /* ---- No Results ---- */
    .no-results {
      text-align: center;
      padding: 24px 8px;
    }

    .no-results .codicon {
      font-size: 28px;
      display: block;
      margin-bottom: 8px;
      opacity: 0.5;
    }

    .no-results p {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }

    /* ---- Toast ---- */
    .toast {
      position: fixed;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%) translateY(60px);
      padding: 5px 14px;
      background: var(--vscode-notificationsInfoIcon-foreground, var(--vscode-button-background));
      color: #fff;
      font-size: 11px;
      border-radius: 2px;
      transition: transform 0.25s ease;
      z-index: 200;
      white-space: nowrap;
    }

    .toast.show { transform: translateX(-50%) translateY(0); }
    .toast.error { background: var(--vscode-errorForeground); }

    /* ---- Rate Limit Badge ---- */
    .rate-limit-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 2px;
      padding: 2px 6px;
      margin-left: auto;
    }

    .rate-limit-badge .codicon {
      font-size: 12px;
      color: var(--vscode-testing-iconFailed, #f85149);
    }

    .rate-limit-badge.ok .codicon {
      color: var(--vscode-testing-iconPassed, #3fb950);
    }

    /* ---- Remote/Local Indicator ---- */
    .image-card .location-indicator {
      position: absolute;
      top: 4px;
      right: 4px;
      background: rgba(0,0,0,0.6);
      color: #fff;
      font-size: 9px;
      padding: 2px 5px;
      border-radius: 2px;
      z-index: 10;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="title-row">
      <i class="codicon codicon-device-camera"></i>
      <span>DevStock Explorer</span>
      <div class="rate-limit-badge" id="rateLimitBadge" style="display:none">
        <i class="codicon codicon-info"></i>
        <span id="rateLimitText">Limit: --</span>
      </div>
    </div>
    <div class="search-box">
      <i class="codicon codicon-search"></i>
      <input type="text" class="search-input" id="searchInput"
             placeholder="Search images..." autocomplete="off" spellcheck="false" />
      <ul class="suggestions-list" id="suggestionsList"></ul>
    </div>

    <div class="provider-tabs" id="providerTabs">
      <button class="provider-tab active" data-provider="unsplash">
        <span class="status-dot ok" id="dotUnsplash"></span>Unsplash
      </button>
      <button class="provider-tab" data-provider="pexels">
        <span class="status-dot no" id="dotPexels"></span>Pexels
      </button>
      <button class="provider-tab" data-provider="pixabay">
        <span class="status-dot no" id="dotPixabay"></span>Pixabay
      </button>
    </div>
  </div>

  <!-- CONTENT -->
  <div class="content" id="contentArea">

    <div class="welcome" id="welcomeState">
      <i class="codicon codicon-file-media"></i>
      <h3>Welcome to DevStock</h3>
      <p>Search and insert stock images from your editor.</p>
      <div class="trigger-hint">
        <i class="codicon codicon-lightbulb"></i>
        Type <code>{/img}</code> in your editor to open this panel
      </div>

      <div class="suggested-topics" style="margin-top: 20px; text-align: left;">
        <div class="format-label" style="margin-bottom: 8px;">Suggested Topics</div>
        <div class="format-options" id="welcomeSuggestions">
          <button class="format-chip" data-query="Technology">Technology</button>
          <button class="format-chip" data-query="Nature">Nature</button>
          <button class="format-chip" data-query="Business">Business</button>
          <button class="format-chip" data-query="Abstract">Abstract</button>
          <button class="format-chip" data-query="Coding">Coding</button>
          <button class="format-chip" data-query="City">City</button>
        </div>
      </div>
    </div>

    <div class="loading" id="loadingState" style="display:none">
      <div class="spinner"></div>
      <p>Searching <span id="loadingQuery"></span>...</p>
    </div>

    <div class="error-state" id="errorState" style="display:none">
      <i class="codicon codicon-warning"></i>
      <p id="errorMessage">An error occurred</p>
      <button class="retry-btn" id="retryBtn">Try Again</button>
    </div>

    <div class="no-results" id="noResults" style="display:none">
      <i class="codicon codicon-search"></i>
      <p>No images found. Try a different search term.</p>
    </div>

    <div id="resultsArea" style="display:none">
      <div class="results-info">
        <span id="resultsCount"></span>
      </div>
      <div class="grid" id="imageGrid"></div>
      <div class="pagination" id="pagination">
        <button class="page-btn" id="prevBtn" disabled>Prev</button>
        <span class="page-info" id="pageInfo">1 / 1</span>
        <button class="page-btn" id="nextBtn" disabled>Next</button>
      </div>
    </div>
  </div>

  <!-- PREVIEW OVERLAY -->
  <div class="preview-overlay" id="previewOverlay">
    <div class="preview-header">
      <span class="preview-title" id="previewTitle">Preview</span>
      <button class="close-btn" id="previewClose"><i class="codicon codicon-close"></i></button>
    </div>

    <div class="preview-scroll-container">
      <div class="preview-image-area">
        <img id="previewImage" src="" alt="Preview" />
        <button class="maximize-btn" id="maximizeBtn" title="View Fullscreen">
          <i class="codicon codicon-screen-full"></i>
        </button>
      </div>

      <div class="preview-meta">
        <div class="meta-row">
          <i class="codicon codicon-person"></i>
          <a id="previewPhotographer" href="#" target="_blank"></a>
        </div>
        <div class="meta-row">
          <i class="codicon codicon-screen-full"></i>
          <span id="previewSize"></span>
        </div>
        <div class="meta-row">
          <i class="codicon codicon-globe"></i>
          <span id="previewProvider"></span>
        </div>
        <div class="meta-row">
          <i class="codicon codicon-file-symlink-directory"></i>
          <span id="previewSourceIndicator" style="color: var(--vscode-descriptionForeground)">Remote URL</span>
        </div>
      </div>

      <!-- Suggested Images Section -->
      <div class="suggested-section">
        <div class="suggested-label">
          <i class="codicon codicon-layers"></i> Similar Images
        </div>
        <div class="suggested-grid" id="suggestedGrid"></div>
      </div>
    </div>

    <div class="format-section">
      <div class="format-label">Insert Format</div>
      <div class="format-options" id="formatOptions">
        <button class="format-chip active" data-format="html">HTML</button>
        <button class="format-chip" data-format="markdown">MD</button>
        <button class="format-chip" data-format="css">CSS</button>
        <button class="format-chip" data-format="jsx">JSX</button>
        <button class="format-chip" data-format="url">URL</button>
      </div>
    </div>

    <div class="actions">
      <button class="action-btn primary" id="insertBtn">
        <i class="codicon codicon-insert"></i> Insert
      </button>
      <button class="action-btn" id="downloadBtn">
        <i class="codicon codicon-cloud-download"></i> Download
      </button>
      <button class="action-btn" id="copyUrlBtn">
        <i class="codicon codicon-copy"></i> Copy URL
      </button>
      <button class="action-btn" id="openSourceBtn">
        <i class="codicon codicon-link-external"></i> Source
      </button>
    </div>
  </div>

  <!-- TOAST -->
  <div class="toast" id="toast"></div>

  <!-- LIGHTBOX OVERLAY -->
  <div class="lightbox-overlay" id="lightboxOverlay">
    <div class="lightbox-content">
      <button class="lightbox-close" id="lightboxClose">&times;</button>
      <img class="lightbox-image" id="lightboxImage" src="" alt="Fullscreen Preview" />
    </div>
  </div>

  <!-- SCRIPT -->
  <script nonce="${nonce}">
    (function() {
      const vscode = acquireVsCodeApi();

      // Persistent State Management
      const previousState = vscode.getState() || {};
      let currentProvider = previousState.currentProvider || 'unsplash';
      let currentQuery = previousState.currentQuery || '';
      let currentPage = previousState.currentPage || 1;
      let totalPages = previousState.totalPages || 1;
      let currentImages = previousState.currentImages || [];
      let selectedImage = null;
      let selectedFormat = 'html';

      const $ = (id) => document.getElementById(id);

      const searchInput = $('searchInput');
      const suggestionsList = $('suggestionsList');
      const providerTabs = $('providerTabs');
      const welcomeState = $('welcomeState');
      const loadingState = $('loadingState');
      const loadingQuery = $('loadingQuery');
      const errorState = $('errorState');
      const errorMessage = $('errorMessage');
      const retryBtn = $('retryBtn');
      const noResults = $('noResults');
      const resultsArea = $('resultsArea');
      const resultsCount = $('resultsCount');
      const imageGrid = $('imageGrid');
      const prevBtn = $('prevBtn');
      const nextBtn = $('nextBtn');
      const pageInfo = $('pageInfo');
      const previewOverlay = $('previewOverlay');
      const previewClose = $('previewClose');
      const previewImage = $('previewImage');
      const previewTitle = $('previewTitle');
      const previewPhotographer = $('previewPhotographer');
      const previewSize = $('previewSize');
      const previewProvider = $('previewProvider');
      const suggestedGrid = $('suggestedGrid');
      const formatOptions = $('formatOptions');
      const insertBtn = $('insertBtn');
      const downloadBtn = $('downloadBtn');
      const openSourceBtn = $('openSourceBtn');
      const toast = $('toast');
      const lightboxOverlay = $('lightboxOverlay');
      const lightboxImage = $('lightboxImage');
      const lightboxClose = $('lightboxClose');
      const maximizeBtn = $('maximizeBtn');

      // Initialize from saved state
      if (currentQuery) {
        searchInput.value = currentQuery;
        if (currentImages.length > 0) {
          renderImages(currentImages);
          updatePaginationUI();
          showState('results');
        }
      }

      function saveState() {
        vscode.setState({
          currentProvider,
          currentQuery,
          currentPage,
          totalPages,
          currentImages
        });
      }

      function updatePaginationUI() {
        resultsCount.textContent = (previousState.totalResults || currentImages.length).toLocaleString() + ' results';
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= totalPages;
        pageInfo.textContent = currentPage + ' / ' + Math.min(totalPages, 999);
      }

      // --- Suggestions (Datamuse API) ---
      let suggestionsTimeout;
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim();
        
        if (q.length < 2) {
          suggestionsList.classList.remove('active');
          return;
        }

        clearTimeout(suggestionsTimeout);
        suggestionsTimeout = setTimeout(fetchSuggestions, 300);

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          if (q.length >= 2) { 
            currentQuery = q; 
            currentPage = 1; 
            saveState();
            doSearch(); 
          }
        }, 800);
      });

      async function fetchSuggestions() {
        const q = searchInput.value.trim();
        if (!q) return;

        try {
          const response = await fetch('https://api.datamuse.com/sug?s=' + encodeURIComponent(q) + '&max=6');
          const data = await response.json();
          
          if (data && data.length > 0) {
            suggestionsList.innerHTML = '';
            data.forEach(item => {
              const li = document.createElement('li');
              li.className = 'suggestion-item';
              li.textContent = item.word;
              li.addEventListener('click', () => {
                searchInput.value = item.word;
                currentQuery = item.word;
                currentPage = 1;
                suggestionsList.classList.remove('active');
                saveState();
                doSearch();
              });
              suggestionsList.appendChild(li);
            });
            suggestionsList.classList.add('active');
          } else {
            suggestionsList.classList.remove('active');
          }
        } catch (e) {
          console.error('Suggestions fetch failed', e);
        }
      }

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box')) {
          suggestionsList.classList.remove('active');
        }
      });

      // --- Search ---
      let searchTimeout;
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          clearTimeout(searchTimeout);
          suggestionsList.classList.remove('active');
          const q = searchInput.value.trim();
          if (q.length >= 1) { 
            currentQuery = q; 
            currentPage = 1; 
            saveState();
            doSearch(); 
          }
        }
      });

      function doSearch() {
        vscode.postMessage({ type: 'search', query: currentQuery, provider: currentProvider, page: currentPage });
      }

      // Welcome suggestions
      $('welcomeSuggestions').addEventListener('click', (e) => {
        const chip = e.target.closest('.format-chip');
        if (!chip) return;
        const q = chip.dataset.query;
        searchInput.value = q;
        currentQuery = q;
        currentPage = 1;
        saveState();
        doSearch();
      });

      // Provider tabs
      providerTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.provider-tab');
        if (!tab) return;
        document.querySelectorAll('.provider-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentProvider = tab.dataset.provider;
        saveState();
        if (currentQuery) { currentPage = 1; doSearch(); }
      });

      // Pagination
      prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; saveState(); doSearch(); } });
      nextBtn.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; saveState(); doSearch(); } });
      retryBtn.addEventListener('click', () => { if (currentQuery) doSearch(); });

      // --- Preview & Similar Images ---
      function openPreview(img) {
        selectedImage = img;
        previewImage.src = img.previewUrl;
        previewTitle.textContent = img.description || 'Untitled';
        previewPhotographer.textContent = img.photographer;
        previewPhotographer.href = img.photographerUrl || '#';
        previewSize.textContent = img.width + ' x ' + img.height;
        previewProvider.textContent = img.provider.charAt(0).toUpperCase() + img.provider.slice(1);
        
        // Show if we have a local version
        const sourceIndicator = $('previewSourceIndicator');
        if (img.localPath) {
          sourceIndicator.textContent = 'Local File: ' + img.localPath;
          sourceIndicator.style.color = 'var(--vscode-testing-iconPassed)';
        } else {
          sourceIndicator.textContent = 'Remote URL (Not downloaded)';
          sourceIndicator.style.color = 'var(--vscode-descriptionForeground)';
        }

        previewOverlay.classList.add('active');
        
        fetchSimilarImages(img);
      }

      async function fetchSimilarImages(img) {
        suggestedGrid.innerHTML = '<div class="spinner" style="grid-column: span 3; margin: 10px auto;"></div>';
        vscode.postMessage({ type: 'search', query: img.description || 'background', provider: currentProvider, page: 1, isSuggested: true });
      }

      previewClose.addEventListener('click', () => { previewOverlay.classList.remove('active'); selectedImage = null; });

      formatOptions.addEventListener('click', (e) => {
        const chip = e.target.closest('.format-chip');
        if (!chip) return;
        document.querySelectorAll('.format-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedFormat = chip.dataset.format;
      });

      // Actions
      insertBtn.addEventListener('click', () => {
        if (!selectedImage) return;
        vscode.postMessage({ type: 'insert', image: selectedImage, format: selectedFormat });
        previewOverlay.classList.remove('active');
      });

      downloadBtn.addEventListener('click', () => {
        if (!selectedImage) return;
        vscode.postMessage({ type: 'download', image: selectedImage, size: 'medium' });
      });

      copyUrlBtn.addEventListener('click', () => {
        if (!selectedImage) return;
        vscode.postMessage({ type: 'copyUrl', url: selectedImage.previewUrl });
        showToast('URL copied');
      });

      openSourceBtn.addEventListener('click', () => {
        if (!selectedImage) return;
        vscode.postMessage({ type: 'openExternal', url: selectedImage.sourceUrl });
      });

      // --- Lightbox / Fullscreen Preview ---
      function openLightbox() {
        if (!selectedImage) return;
        lightboxImage.src = selectedImage.downloadUrls.large || selectedImage.previewUrl;
        lightboxOverlay.classList.add('active');
      }

      maximizeBtn.addEventListener('click', () => {
        openLightbox();
      });

      previewImage.addEventListener('click', () => {
        maximizeBtn.click();
      });

      lightboxClose.addEventListener('click', () => {
        lightboxOverlay.classList.remove('active');
      });

      lightboxOverlay.addEventListener('click', (e) => {
        if (e.target === lightboxOverlay) {
          lightboxOverlay.classList.remove('active');
        }
      });

      // State management
      function showState(state) {
        welcomeState.style.display = 'none';
        loadingState.style.display = 'none';
        errorState.style.display = 'none';
        noResults.style.display = 'none';
        resultsArea.style.display = 'none';
        switch (state) {
          case 'welcome': welcomeState.style.display = ''; break;
          case 'loading': loadingState.style.display = ''; break;
          case 'error': errorState.style.display = ''; break;
          case 'noResults': noResults.style.display = ''; break;
          case 'results': resultsArea.style.display = ''; break;
        }
      }

      function renderImages(images) {
        imageGrid.innerHTML = '';
        currentImages = images;
        images.forEach((img, idx) => {
          const card = document.createElement('div');
          card.className = 'image-card';
          card.tabIndex = 0; // Make focusable
          card.innerHTML =
            '<img src="' + img.thumbnailUrl + '" alt="' + (img.description || 'Image') + '" loading="lazy" />' +
            '<button class="grid-maximize-btn" title="Quick Preview"><i class="codicon codicon-screen-full"></i></button>' +
            '<div class="card-overlay">' +
              '<div class="photographer">' + img.photographer + '</div>' +
              '<div class="dimensions">' + img.width + ' x ' + img.height + '</div>' +
            '</div>';
          
          card.querySelector('.grid-maximize-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            selectedImage = img;
            openLightbox();
          });

          card.addEventListener('click', () => { focusedIndex = idx; openPreview(img); });
          imageGrid.appendChild(card);
        });
      }

      function renderSuggested(images) {
        suggestedGrid.innerHTML = '';
        images.slice(0, 6).forEach(img => {
          const card = document.createElement('div');
          card.className = 'suggested-card';
          card.innerHTML = '<img src="' + img.thumbnailUrl + '" alt="Suggested" />';
          card.addEventListener('click', () => openPreview(img));
          suggestedGrid.appendChild(card);
        });
      }

      // Keyboard Navigation for Grid
      let focusedIndex = -1;
      document.addEventListener('keydown', (e) => {
        if (previewOverlay.classList.contains('active')) {
          if (e.key === 'Escape') {
            if (lightboxOverlay.classList.contains('active')) {
              lightboxOverlay.classList.remove('active');
            } else {
              previewOverlay.classList.remove('active');
              selectedImage = null;
            }
          }
          return;
        }

        if (document.activeElement.tagName === 'INPUT') return;

        const cards = document.querySelectorAll('.image-card');
        if (cards.length === 0) return;

        if (e.key === 'ArrowRight') {
          focusedIndex = Math.min(focusedIndex + 1, cards.length - 1);
          cards[focusedIndex].focus();
        } else if (e.key === 'ArrowLeft') {
          focusedIndex = Math.max(focusedIndex - 1, 0);
          cards[focusedIndex].focus();
        } else if (e.key === 'ArrowDown') {
          focusedIndex = Math.min(focusedIndex + 2, cards.length - 1);
          cards[focusedIndex].focus();
        } else if (e.key === 'ArrowUp') {
          focusedIndex = Math.max(focusedIndex - 2, 0);
          cards[focusedIndex].focus();
        } else if (e.key === 'Enter' && focusedIndex !== -1) {
          openPreview(currentImages[focusedIndex]);
        }
      });

      function updateRateLimitUI(limit) {
        if (!limit) {
          $('rateLimitBadge').style.display = 'none';
          return;
        }
        $('rateLimitBadge').style.display = 'flex';
        $('rateLimitText').textContent = limit.remaining + ' left';
        
        $('rateLimitBadge').classList.remove('warning', 'error');
        if (limit.remaining === 0) {
          $('rateLimitBadge').classList.add('error');
          $('rateLimitText').textContent = 'Limit Reached';
        } else if (limit.remaining < 5) {
          $('rateLimitBadge').classList.add('warning');
        }
      }

      function showToast(msg, isError) {
        toast.textContent = msg;
        toast.className = 'toast' + (isError ? ' error' : '');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
      }

      // Messages from extension
      window.addEventListener('message', (event) => {
        const msg = event.data;
        switch (msg.type) {
          case 'searching':
            if (msg.isSuggested) return;
            loadingQuery.textContent = '"' + msg.query + '"';
            showState('loading');
            break;
          case 'searchResults': {
            const d = msg.data;
            if (msg.isSuggested) {
              renderSuggested(d.images);
              return;
            }
            if (!d.images || d.images.length === 0) { showState('noResults'); return; }
            totalPages = d.totalPages;
            currentPage = d.currentPage;
            currentImages = d.images;
            
            saveState(); // Save to VS Code persistent state
            updateRateLimitUI(d.rateLimit);

            resultsCount.textContent = d.totalResults.toLocaleString() + ' results';
            renderImages(d.images);
            prevBtn.disabled = currentPage <= 1;
            nextBtn.disabled = currentPage >= totalPages;
            pageInfo.textContent = currentPage + ' / ' + Math.min(totalPages, 999);
            showState('results');
            break;
          }
          case 'downloadComplete':
            if (msg.success && msg.filePath && selectedImage) {
              selectedImage.localPath = msg.filePath;
              // Update state for this image in currentImages
              const idx = currentImages.findIndex(i => i.id === selectedImage.id);
              if (idx !== -1) {
                currentImages[idx].localPath = msg.filePath;
                saveState();
              }
              $('previewSourceIndicator').textContent = 'Local File: ' + msg.filePath;
              $('previewSourceIndicator').style.color = 'var(--vscode-testing-iconPassed)';
            }
            showToast(msg.success ? 'Saved: ' + msg.filePath : (msg.error || 'Download failed'), !msg.success);
            break;
          case 'insertComplete':
            showToast(msg.success ? 'Inserted' : (msg.error || 'Insert failed'), !msg.success);
            break;
          case 'error':
            errorMessage.textContent = msg.message;
            showState('error');
            break;
          case 'config':
            $('dotUnsplash').className = 'status-dot ' + (msg.hasUnsplash ? 'ok' : 'no');
            $('dotPexels').className = 'status-dot ' + (msg.hasPexels ? 'ok' : 'no');
            $('dotPixabay').className = 'status-dot ' + (msg.hasPixabay ? 'ok' : 'no');
            if (msg.defaultProvider && !previousState.currentProvider) {
              currentProvider = msg.defaultProvider;
              document.querySelectorAll('.provider-tab').forEach(t =>
                t.classList.toggle('active', t.dataset.provider === currentProvider)
              );
            }
            break;
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && previewOverlay.classList.contains('active')) {
          previewOverlay.classList.remove('active');
          selectedImage = null;
        }
      });

      vscode.postMessage({ type: 'ready' });
      searchInput.focus();
    })();
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) { text += chars.charAt(Math.floor(Math.random() * chars.length)); }
  return text;
}
