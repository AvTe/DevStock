// ============================================================
// DevStock — Image Downloader Service
// Downloads images to the workspace project folder
// ============================================================

import * as vscode from 'vscode';
import * as path from 'path';
import axios from 'axios';
import { StockImage, ImageSize } from '../types';
import { Logger } from './logger';

export class ImageDownloader {

    /** Download an image to the project folder */
    async download(image: StockImage, size: ImageSize = 'medium'): Promise<string> {
        // Workspace Trust Check
        if (!vscode.workspace.isTrusted) {
            throw new Error('You must trust this workspace to download images.');
        }

        // Get the relevant workspace folder (based on active editor or first folder)
        let workspaceFolder: vscode.WorkspaceFolder | undefined;
        const editor = vscode.window.activeTextEditor;

        if (editor) {
            workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
        }

        if (!workspaceFolder) {
            workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        }

        if (!workspaceFolder) {
            throw new Error('No workspace folder is open. Please open a folder first.');
        }

        const workspaceRoot = workspaceFolder.uri.fsPath;
        const downloadDir = vscode.workspace
            .getConfiguration('devstock')
            .get<string>('downloadPath', 'images');

        // Create the download directory if it doesn't exist using VS Code FileSystem API
        const fullDownloadUri = vscode.Uri.file(path.join(workspaceRoot, downloadDir));
        try {
            await vscode.workspace.fs.createDirectory(fullDownloadUri);
        } catch (error) {
            Logger.warn('Failed to create download directory');
        }

        // Get the appropriate download URL based on size preference
        const downloadUrl = this.getDownloadUrl(image, size);
        if (!downloadUrl) {
            throw new Error('No download URL available for this image.');
        }

        // Generate a clean filename
        const fileName = this.generateFileName(image);
        const filePath = path.join(fullDownloadUri.fsPath, fileName);

        // Download the image
        try {
            const response = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': 'DevStock-VSCode-Extension/1.0',
                },
            });

            // Determine file extension from content-type or URL
            const contentType = response.headers['content-type'] || '';
            let ext = this.getExtensionFromContentType(contentType);
            if (!ext) {
                ext = this.getExtensionFromUrl(downloadUrl);
            }

            const finalPath = filePath.endsWith(ext) ? filePath : `${filePath}${ext}`;
            const fileUri = vscode.Uri.file(finalPath);

            // Write the file asynchronously using VS Code API
            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(response.data));

            // Return the relative path from workspace root
            const relativePath = path.relative(workspaceRoot, finalPath);
            return relativePath.replace(/\\/g, '/');
        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                throw new Error(`Failed to download image: ${error.message}`);
            }
            throw new Error(`Download error: ${error.message}`);
        }
    }

    private getDownloadUrl(image: StockImage, size: ImageSize): string {
        const urls = image.downloadUrls;
        switch (size) {
            case 'small': return urls.small || urls.medium || urls.large || urls.original;
            case 'medium': return urls.medium || urls.large || urls.original || urls.small;
            case 'large': return urls.large || urls.original || urls.medium || urls.small;
            case 'original': return urls.original || urls.large || urls.medium || urls.small;
            default: return urls.medium || urls.large || urls.original || urls.small;
        }
    }

    private generateFileName(image: StockImage): string {
        // Reserved Windows names
        const reservedNames = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;

        // Clean description for use as filename
        let desc = (image.description || 'image')
            .toLowerCase()
            .replace(/[<>:"/\\|?*]/g, '') // Remove invalid file chars
            .replace(/\s+/g, '-')
            .substring(0, 50)
            .replace(/-+$/, '')
            .trim();

        if (!desc || reservedNames.test(desc)) {
            desc = 'stock-image';
        }

        const timestamp = Date.now().toString().slice(-6);
        return `${desc}-${timestamp}`;
    }

    private getExtensionFromContentType(contentType: string): string {
        const map: Record<string, string> = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/svg+xml': '.svg',
        };
        return map[contentType.split(';')[0].trim()] || '';
    }

    private getExtensionFromUrl(url: string): string {
        try {
            const pathname = new URL(url).pathname;
            const ext = path.extname(pathname);
            if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext.toLowerCase())) {
                return ext.toLowerCase();
            }
        } catch { }
        return '.jpg'; // Default fallback
    }
}
