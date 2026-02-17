import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('NEAR Transaction Viewer is now active');

  const hoverProvider = vscode.languages.registerHoverProvider({ scheme: 'file' }, {
    async provideHover(document, position, token) {
      // NEAR transaction hashes are base58, length 43-44
      const range = document.getWordRangeAtPosition(position, /[1-9A-HJ-NP-Za-km-z]{43,44}/);
      if (!range) return;

      const txHash = document.getText(range);
      const network = vscode.workspace.getConfiguration('nearTxViewer').get('network', 'mainnet');
      
      let details = '';
      try {
        const apiNetwork = network === 'mainnet' ? 'api' : 'api-testnet';
        const rx = await fetch(`https://${apiNetwork}.nearblocks.io/v1/txns/${txHash}`);
        const data: any = await rx.json();
        if (data && data.txns && data.txns[0]) {
          const tx = data.txns[0];
          details = `\n- **Status:** ${tx.status || 'Success'}\n`;
          details += `- **Signer:** ${tx.signer_id}\n`;
          details += `- **Receiver:** ${tx.receiver_id}\n`;
          details += `- **Fee:** ${(Number(tx.transaction_fee) / 1e24).toFixed(6)} NEAR\n`;
        }
      } catch (e) {
        details = '\n*Transaction details unavailable*\n';
      }

      const markdown = new vscode.MarkdownString();
      markdown.appendMarkdown(`### 🔍 NEAR Transaction: **${txHash.substring(0, 8)}...**\n\n`);
      markdown.appendMarkdown(`- **Network:** ${network}\n`);
      markdown.appendMarkdown(details);
      markdown.appendMarkdown(`\n[View on NEAR Explorer](https://explorer.${network}.near.org/transactions/${txHash})\n\n`);
      markdown.appendMarkdown(`[View on Pikespeak](https://pikespeak.ai/transaction/${txHash})`);
      
      return new vscode.Hover(markdown);
    }
  });


  context.subscriptions.push(hoverProvider);
}

export function deactivate() {}
