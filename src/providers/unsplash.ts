// ============================================================
// DevStock — Unsplash API Provider
// ============================================================

import * as vscode from 'vscode';
import axios from 'axios';
import { IImageProviderService, SearchResult, StockImage } from '../types';
import { Logger } from '../services/logger';
import { BUILTIN_KEYS } from '../config/keys';

const UNSPLASH_API_BASE = 'https://api.unsplash.com';

export class UnsplashProvider implements IImageProviderService {
    readonly name = 'unsplash' as const;

    private getApiKey(): string {
        const userKey = vscode.workspace.getConfiguration('devstock').get<string>('unsplashApiKey', '');
        return userKey.trim() || BUILTIN_KEYS.unsplash;
    }

    isConfigured(): boolean {
        return this.getApiKey().trim().length > 0;
    }

    async search(query: string, page: number = 1, perPage: number = 20): Promise<SearchResult> {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('Unsplash API key is not configured. Go to Settings → DevStock → Unsplash API Key.');
        }

        try {
            const response = await axios.get(`${UNSPLASH_API_BASE}/search/photos`, {
                headers: {
                    'Authorization': `Client-ID ${apiKey}`,
                },
                params: {
                    query,
                    page,
                    per_page: perPage,
                    orientation: 'landscape',
                },
                timeout: 10000,
            });

            const data = response.data;
            const images: StockImage[] = data.results.map((item: any) => ({
                id: `unsplash-${item.id}`,
                provider: 'unsplash',
                description: item.description || item.alt_description || query,
                photographer: item.user?.name || 'Unknown',
                photographerUrl: item.user?.links?.html || '',
                thumbnailUrl: item.urls?.thumb || item.urls?.small,
                previewUrl: item.urls?.regular || item.urls?.small,
                downloadUrls: {
                    small: item.urls?.small || '',
                    medium: item.urls?.regular || '',
                    large: item.urls?.full || '',
                    original: item.urls?.raw || '',
                },
                width: item.width || 0,
                height: item.height || 0,
                sourceUrl: item.links?.html || '',
                color: item.color || '#333333',
            }));

            return {
                images,
                totalResults: data.total || 0,
                totalPages: data.total_pages || 0,
                currentPage: page,
                provider: 'unsplash',
                rateLimit: {
                    limit: parseInt(response.headers['x-ratelimit-limit'] as string || '0'),
                    remaining: parseInt(response.headers['x-ratelimit-remaining'] as string || '0'),
                }
            };
        } catch (error: any) {
            Logger.error(`Unsplash Search Failed (Query: ${query})`, error);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    throw new Error('Invalid Unsplash API key. Please check your settings.');
                }
                if (error.response?.status === 403) {
                    throw new Error('Unsplash API rate limit exceeded. Please try again later.');
                }
                throw new Error(`Unsplash API error: ${error.response?.statusText || error.message}`);
            }
            throw new Error(`Failed to search Unsplash: ${error.message}`);
        }
    }
}
