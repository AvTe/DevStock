// ============================================================
// DevStock — Extension Entry Point
// Registers all commands, providers, and event listeners
// ============================================================

import * as vscode from 'vscode';
import { SidebarProvider } from './webview/sidebarProvider';
import { TriggerDetector } from './services/triggerDetector';
import { Logger } from './services/logger';

export function activate(context: vscode.ExtensionContext) {
    Logger.init();
    Logger.info('DevStock extension is now active!');

    // ---- Register Sidebar Webview Provider ----
    const sidebarProvider = new SidebarProvider(context.extensionUri);
    const sidebarDisposable = vscode.window.registerWebviewViewProvider(
        SidebarProvider.viewType,
        sidebarProvider,
        {
            webviewOptions: {
                retainContextWhenHidden: true,
            },
        }
    );
    context.subscriptions.push(sidebarDisposable);

    // ---- Register Commands ----
    const searchCommand = vscode.commands.registerCommand('devstock.searchImages', () => {
        // Focus the sidebar
        vscode.commands.executeCommand('devstock.searchPanel.focus');
    });
    context.subscriptions.push(searchCommand);

    const openSidebarCommand = vscode.commands.registerCommand('devstock.openSidebar', () => {
        vscode.commands.executeCommand('devstock.searchPanel.focus');
    });
    context.subscriptions.push(openSidebarCommand);

    // ---- Register Trigger Detector ----
    const triggerDetector = new TriggerDetector();
    triggerDetector.onTrigger(() => {
        // When {/img} is typed, focus the sidebar panel
        vscode.commands.executeCommand('devstock.searchPanel.focus');
        vscode.window.showInformationMessage('DevStock: Image search panel opened! 🖼️');
    });
    context.subscriptions.push(triggerDetector);

    // ---- Show activation message on first load ----
    const hasShownWelcome = context.globalState.get<boolean>('devstock.hasShownWelcome', false);
    if (!hasShownWelcome) {
        vscode.window
            .showInformationMessage(
                'DevStock is ready! Type {/img} in your editor or press Ctrl+Shift+I to search stock images.',
                'Open DevStock'
            )
            .then((selection) => {
                if (selection === 'Open DevStock') {
                    vscode.commands.executeCommand('devstock.searchPanel.focus');
                }
            });
        context.globalState.update('devstock.hasShownWelcome', true);
    }
}

export function deactivate() {
    Logger.info('DevStock extension deactivated.');
}
