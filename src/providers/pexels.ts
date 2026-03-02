// ============================================================
// DevStock — Pexels API Provider
// ============================================================

import * as vscode from 'vscode';
import axios from 'axios';
import { IImageProviderService, SearchResult, StockImage } from '../types';
import { Logger } from '../services/logger';
import { BUILTIN_KEYS } from '../config/keys';

const PEXELS_API_BASE = 'https://api.pexels.com/v1';

export class PexelsProvider implements IImageProviderService {
    readonly name = 'pexels' as const;

    private getApiKey(): string {
        const userKey = vscode.workspace.getConfiguration('devstock').get<string>('pexelsApiKey', '');
        return userKey.trim() || BUILTIN_KEYS.pexels;
    }

    isConfigured(): boolean {
        return this.getApiKey().trim().length > 0;
    }

    async search(query: string, page: number = 1, perPage: number = 20): Promise<SearchResult> {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error('Pexels API key is not configured. Go to Settings → DevStock → Pexels API Key.');
        }

        try {
            const response = await axios.get(`${PEXELS_API_BASE}/search`, {
                headers: {
                    'Authorization': apiKey,
                },
                params: {
                    query,
                    page,
                    per_page: perPage,
                },
                timeout: 10000,
            });

            const data = response.data;
            const images: StockImage[] = data.photos.map((item: any) => ({
                id: `pexels-${item.id}`,
                provider: 'pexels',
                description: item.alt || query,
                photographer: item.photographer || 'Unknown',
                photographerUrl: item.photographer_url || '',
                thumbnailUrl: item.src?.tiny || item.src?.small,
                previewUrl: item.src?.medium || item.src?.large,
                downloadUrls: {
                    small: item.src?.small || '',
                    medium: item.src?.medium || '',
                    large: item.src?.large2x || item.src?.large || '',
                    original: item.src?.original || '',
                },
                width: item.width || 0,
                height: item.height || 0,
                sourceUrl: item.url || '',
                color: item.avg_color || '#333333',
            }));

            const totalResults = data.total_results || 0;
            const totalPages = Math.ceil(totalResults / perPage);

            return {
                images,
                totalResults,
                totalPages,
                currentPage: page,
                provider: 'pexels',
                rateLimit: {
                    limit: parseInt(response.headers['x-ratelimit-limit'] as string || '0'),
                    remaining: parseInt(response.headers['x-ratelimit-remaining'] as string || '0'),
                    reset: parseInt(response.headers['x-ratelimit-reset'] as string || '0'),
                }
            };
        } catch (error: any) {
            Logger.error(`Pexels Search Failed (Query: ${query})`, error);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    throw new Error('Invalid Pexels API key. Please check your settings.');
                }
                if (error.response?.status === 429) {
                    throw new Error('Pexels API rate limit exceeded. Please try again later.');
                }
                throw new Error(`Pexels API error: ${error.response?.statusText || error.message}`);
            }
            throw new Error(`Failed to search Pexels: ${error.message}`);
        }
    }
}
