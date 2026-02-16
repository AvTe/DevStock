// ============================================================
// DevStock — Pixabay API Provider
// ============================================================

import * as vscode from 'vscode';
import axios from 'axios';
import { IImageProviderService, SearchResult, StockImage } from '../types';
import { Logger } from '../services/logger';

const PIXABAY_API_BASE = 'https://pixabay.com/api/';

export class PixabayProvider implements IImageProviderService {
    readonly name = 'pixabay' as const;

    private getApiKey(): string {
        return vscode.workspace.getConfiguration('devstock').get<string>('pixabayApiKey', '');
    }

    isConfigured(): boolean {
        return this.getApiKey().trim().length > 0;
    }

    async search(query: string, page: number = 1, perPage: number = 20): Promise<SearchResult> {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('Pixabay API key is not configured. Go to Settings → DevStock → Pixabay API Key.');
        }

        try {
            const response = await axios.get(PIXABAY_API_BASE, {
                params: {
                    key: apiKey,
                    q: query,
                    page,
                    per_page: perPage,
                    image_type: 'photo',
                    safesearch: true,
                },
                timeout: 10000,
            });

            const data = response.data;
            const images: StockImage[] = data.hits.map((item: any) => ({
                id: `pixabay-${item.id}`,
                provider: 'pixabay',
                description: item.tags || query,
                photographer: item.user || 'Unknown',
                photographerUrl: `https://pixabay.com/users/${item.user}-${item.user_id}/`,
                thumbnailUrl: item.previewURL || item.webformatURL,
                previewUrl: item.webformatURL || item.largeImageURL,
                downloadUrls: {
                    small: item.previewURL || '',
                    medium: item.webformatURL || '',
                    large: item.largeImageURL || '',
                    original: item.fullHDURL || item.imageURL || item.largeImageURL || '',
                },
                width: item.imageWidth || 0,
                height: item.imageHeight || 0,
                sourceUrl: item.pageURL || '',
                color: '#333333',
            }));

            const totalResults = data.totalHits || 0;
            const totalPages = Math.ceil(totalResults / perPage);

            return {
                images,
                totalResults,
                totalPages,
                currentPage: page,
                provider: 'pixabay',
                rateLimit: {
                    limit: parseInt(response.headers['x-ratelimit-limit'] as string || '0'),
                    remaining: parseInt(response.headers['x-ratelimit-remaining'] as string || '0'),
                    reset: parseInt(response.headers['x-ratelimit-reset'] as string || '0'),
                }
            };
        } catch (error: any) {
            Logger.error(`Pixabay Search Failed (Query: ${query})`, error);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401 || error.response?.status === 400) {
                    throw new Error('Invalid Pixabay API key. Please check your settings.');
                }
                if (error.response?.status === 429) {
                    throw new Error('Pixabay API rate limit exceeded. Please try again later.');
                }
                throw new Error(`Pixabay API error: ${error.response?.statusText || error.message}`);
            }
            throw new Error(`Failed to search Pixabay: ${error.message}`);
        }
    }
}
