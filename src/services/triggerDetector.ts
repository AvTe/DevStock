// ============================================================
// DevStock — Trigger Detector Service
// Detects customizable trigger typed in the editor and opens the sidebar
// Optimized for performance with debouncing and configuration
// ============================================================

import * as vscode from 'vscode';

export class TriggerDetector implements vscode.Disposable {
    private disposable: vscode.Disposable;
    private onTriggerCallback: (() => void) | undefined;
    private debounceTimer: NodeJS.Timeout | undefined;

    constructor() {
        this.disposable = vscode.workspace.onDidChangeTextDocument(
            this.handleDocumentChange.bind(this)
        );
    }

    /** Register a callback to fire when the trigger is detected */
    onTrigger(callback: () => void): void {
        this.onTriggerCallback = callback;
    }

    private handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
        const config = vscode.workspace.getConfiguration('devstock');
        const enabled = config.get<boolean>('enableTrigger', true);
        if (!enabled || !event.contentChanges.length) {
            return;
        }

        const triggerPattern = config.get<string>('triggerPattern', '{/img}');
        if (!triggerPattern) { return; }

        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.uri.toString() !== event.document.uri.toString()) {
            return;
        }

        // Optimization: Only scan if the change could possibly involve the trigger pattern
        // (usually the last character typed matches the last character of the trigger)
        const lastChange = event.contentChanges[event.contentChanges.length - 1];
        if (!lastChange.text.includes(triggerPattern[triggerPattern.length - 1]) &&
            !lastChange.text.includes(triggerPattern[0])) {
            // This is a rough heuristic but saves full line scans for most keystrokes
            // Only skip if the typed text doesn't contain the start or end characters
            if (lastChange.text.length === 1) { return; }
        }

        // Debounce to prevent multiple heavy scans during rapid typing
        if (this.debounceTimer) { clearTimeout(this.debounceTimer); }

        this.debounceTimer = setTimeout(() => {
            this.scanAndTrigger(event, editor, triggerPattern);
        }, 150);
    }

    private async scanAndTrigger(
        event: vscode.TextDocumentChangeEvent,
        editor: vscode.TextEditor,
        pattern: string
    ): Promise<void> {
        for (const change of event.contentChanges) {
            // We only check the lines affected by content changes
            const startLine = change.range.start.line;
            const endLine = change.range.start.line + (change.text.split('\n').length - 1);

            for (let i = startLine; i <= endLine; i++) {
                if (i >= event.document.lineCount) { continue; }

                const line = event.document.lineAt(i);
                const lineText = line.text;
                const triggerIndex = lineText.indexOf(pattern);

                if (triggerIndex !== -1) {
                    const triggerRange = new vscode.Range(
                        new vscode.Position(i, triggerIndex),
                        new vscode.Position(i, triggerIndex + pattern.length)
                    );

                    // Delete the trigger text and notify
                    await editor.edit((editBuilder) => {
                        editBuilder.delete(triggerRange);
                    });

                    if (this.onTriggerCallback) {
                        this.onTriggerCallback();
                    }
                    return; // Stop after first match
                }
            }
        }
    }

    dispose(): void {
        this.disposable.dispose();
        if (this.debounceTimer) { clearTimeout(this.debounceTimer); }
    }
}
