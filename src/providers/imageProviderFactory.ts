// ============================================================
// DevStock — Image Provider Factory
// ============================================================

import * as vscode from 'vscode';
import { IImageProviderService, ImageProvider, SearchResult } from '../types';
import { UnsplashProvider } from './unsplash';
import { PexelsProvider } from './pexels';
import { PixabayProvider } from './pixabay';

export class ImageProviderFactory {
    private providers: Map<ImageProvider, IImageProviderService>;

    constructor() {
        this.providers = new Map();
        this.providers.set('unsplash', new UnsplashProvider());
        this.providers.set('pexels', new PexelsProvider());
        this.providers.set('pixabay', new PixabayProvider());
    }

    /** Get a specific provider */
    getProvider(name: ImageProvider): IImageProviderService {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`Unknown provider: ${name}`);
        }
        return provider;
    }

    /** Get the default provider from settings */
    getDefaultProvider(): IImageProviderService {
        const defaultName = vscode.workspace
            .getConfiguration('devstock')
            .get<ImageProvider>('defaultProvider', 'unsplash');
        return this.getProvider(defaultName);
    }

    /** Check which providers are configured */
    getConfiguredProviders(): ImageProvider[] {
        const configured: ImageProvider[] = [];
        for (const [name, provider] of this.providers) {
            if (provider.isConfigured()) {
                configured.push(name);
            }
        }
        return configured;
    }

    /** Search using a specific provider */
    async search(providerName: ImageProvider, query: string, page: number = 1): Promise<SearchResult> {
        const provider = this.getProvider(providerName);
        return provider.search(query, page);
    }

    /** Check if a specific provider has an API key */
    isProviderConfigured(name: ImageProvider): boolean {
        return this.getProvider(name).isConfigured();
    }
}
