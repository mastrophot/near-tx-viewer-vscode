import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('NEAR Transaction Viewer is now active');

  const hoverProvider = vscode.languages.registerHoverProvider({ scheme: 'file' }, {
    provideHover(document, position, token) {
      // NEAR transaction hashes are base58, length 43-44
      const range = document.getWordRangeAtPosition(position, /[1-9A-HJ-NP-Za-km-z]{43,44}/);
      if (!range) return;

      const txHash = document.getText(range);
      const network = vscode.workspace.getConfiguration('nearTxViewer').get('network', 'mainnet');
      
      const markdown = new vscode.MarkdownString();
      markdown.appendMarkdown(`### 🔍 NEAR Transaction: **${txHash.substring(0, 8)}...**\n\n`);
      markdown.appendMarkdown(`- **Network:** ${network}\n\n`);
      markdown.appendMarkdown(`[View on NEAR Explorer](https://explorer.${network}.near.org/transactions/${txHash})\n\n`);
      markdown.appendMarkdown(`[View on Pikespeak](https://pikespeak.ai/transaction/${txHash})`);
      
      return new vscode.Hover(markdown);
    }
  });

  context.subscriptions.push(hoverProvider);
}

export function deactivate() {}
