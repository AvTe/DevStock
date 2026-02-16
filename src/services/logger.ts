// ============================================================
// DevStock — Logger Service
// Provides a dedicated output channel for debugging and production logs
// ============================================================

import * as vscode from 'vscode';

export class Logger {
    private static outputChannel: vscode.OutputChannel;

    static init() {
        if (!this.outputChannel) {
            this.outputChannel = vscode.window.createOutputChannel('DevStock');
        }
    }

    static info(message: string) {
        this.log('INFO', message);
    }

    static warn(message: string) {
        this.log('WARN', message);
    }

    static error(message: string, error?: any) {
        let fullMessage = message;
        if (error) {
            fullMessage += ` | Error: ${error.message || error}`;
            if (error.stack) {
                fullMessage += `\nStack: ${error.stack}`;
            }
        }
        this.log('ERROR', fullMessage);
    }

    private static log(level: string, message: string) {
        if (!this.outputChannel) { this.init(); }
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] [${level}] ${message}`);
    }

    static show() {
        this.outputChannel.show();
    }
}
