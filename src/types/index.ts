// ============================================================
// DevStock — Types & Interfaces
// ============================================================

/** Supported image providers */
export type ImageProvider = 'unsplash' | 'pexels' | 'pixabay';

/** Supported insert formats */
export type InsertFormat = 'html' | 'markdown' | 'css' | 'jsx' | 'url';

/** Preferred image size */
export type ImageSize = 'small' | 'medium' | 'large' | 'original';

/** Unified stock image representation across all providers */
export interface StockImage {
    id: string;
    provider: ImageProvider;
    description: string;
    photographer: string;
    photographerUrl: string;
    thumbnailUrl: string;
    previewUrl: string;
    downloadUrls: {
        small: string;
        medium: string;
        large: string;
        original: string;
    };
    width: number;
    height: number;
    sourceUrl: string;
    color?: string;
    localPath?: string;
}

/** Search result from any provider */
export interface SearchResult {
    images: StockImage[];
    totalResults: number;
    totalPages: number;
    currentPage: number;
    provider: ImageProvider;
    rateLimit?: {
        limit: number;
        remaining: number;
        reset?: number; // timestamp in seconds
    };
}

/** Messages sent from Webview → Extension */
export type WebviewToExtensionMessage =
    | { type: 'search'; query: string; provider: ImageProvider; page: number; isSuggested?: boolean }
    | { type: 'download'; image: StockImage; size: ImageSize }
    | { type: 'insert'; image: StockImage; format: InsertFormat }
    | { type: 'copyUrl'; url: string }
    | { type: 'openExternal'; url: string }
    | { type: 'getConfig' }
    | { type: 'ready' };

/** Messages sent from Extension → Webview */
export type ExtensionToWebviewMessage =
    | { type: 'searchResults'; data: SearchResult; isSuggested?: boolean }
    | { type: 'searching'; query: string; isSuggested?: boolean }
    | { type: 'downloadComplete'; success: boolean; filePath?: string; error?: string }
    | { type: 'insertComplete'; success: boolean; error?: string }
    | { type: 'error'; message: string }
    | { type: 'config'; defaultProvider: ImageProvider; hasUnsplash: boolean; hasPexels: boolean; hasPixabay: boolean };

/** Provider API interface — each provider must implement this */
export interface IImageProviderService {
    readonly name: ImageProvider;
    search(query: string, page?: number, perPage?: number): Promise<SearchResult>;
    isConfigured(): boolean;
}
