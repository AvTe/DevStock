// ============================================================
// DevStock — Image Inserter Service
// Inserts image references into the active editor
// Smart format detection and context awareness
// ============================================================

import * as vscode from 'vscode';
import * as path from 'path';
import { StockImage, InsertFormat } from '../types';

export class ImageInserter {

    /** Insert an image reference at the cursor position in the active editor */
    async insert(image: StockImage, format?: InsertFormat, localPath?: string): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            throw new Error('No active text editor. Please open a file first.');
        }

        const document = editor.document;
        const position = editor.selection.active;

        // Auto-detect format if not specified
        const insertFormat = format || this.detectFormat(document.fileName);
        const imageUrl = localPath || image.previewUrl;
        const alt = image.description || 'Stock image';

        const snippet = this.generateSnippet(insertFormat, imageUrl, alt, image, document, position);

        // Insert at cursor position
        await editor.edit((editBuilder) => {
            editBuilder.insert(position, snippet);
        });
    }

    /** Detect the best insert format based on file extension */
    private detectFormat(fileName: string): InsertFormat {
        const ext = path.extname(fileName).toLowerCase();

        switch (ext) {
            case '.html':
            case '.htm':
            case '.ejs':
            case '.hbs':
            case '.pug':
            case '.php':
                return 'html';

            case '.md':
            case '.markdown':
            case '.mdx':
                return 'markdown';

            case '.css':
            case '.scss':
            case '.sass':
            case '.less':
                return 'css';

            case '.jsx':
            case '.tsx':
                return 'jsx';

            case '.js':
            case '.ts':
            case '.vue':
            case '.svelte':
                return 'jsx';

            default:
                return 'url';
        }
    }

    /** Generate the image snippet based on format and context */
    private generateSnippet(
        format: InsertFormat,
        imageUrl: string,
        alt: string,
        image: StockImage,
        document: vscode.TextDocument,
        position: vscode.Position
    ): string {
        // Smart CSS detection: Don't wrap in url() if we are already inside one
        if (format === 'css') {
            const lineText = document.lineAt(position.line).text;
            const prefix = lineText.substring(0, position.character).trim();
            if (prefix.endsWith('url(') || prefix.endsWith('url(\'') || prefix.endsWith('url("')) {
                return imageUrl;
            }
        }

        // Smart JSX detection: if we seem to be inside a component property (src={...}), just return URL
        if (format === 'jsx') {
            const lineText = document.lineAt(position.line).text;
            const prefix = lineText.substring(0, position.character).trim();
            if (prefix.endsWith('src={') || prefix.endsWith('src="') || prefix.endsWith('src=\'')) {
                return imageUrl;
            }
        }

        switch (format) {
            case 'html':
                return `<img src="${imageUrl}" alt="${alt}" width="${image.width}" height="${image.height}" />`;

            case 'markdown':
                return `![${alt}](${imageUrl})`;

            case 'css':
                return `background-image: url('${imageUrl}');`;

            case 'jsx':
                return `<img src="${imageUrl}" alt="${alt}" />`;

            case 'url':
            default:
                return imageUrl;
        }
    }
}
