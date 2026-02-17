import * as https from 'https';
import * as vscode from 'vscode';

const TX_HASH_WORD_REGEX = /\b[1-9A-HJ-NP-Za-km-z]{43,44}\b/;
const TX_HASH_GLOBAL_REGEX = /\b[1-9A-HJ-NP-Za-km-z]{43,44}\b/g;

type NearNetwork = 'mainnet' | 'testnet';

type NearblocksTx = {
  transaction_hash?: string;
  signer_account_id?: string;
  receiver_account_id?: string;
  block_timestamp?: string;
  block?: { block_height?: number };
  actions?: Array<{ action?: string }>;
  outcomes?: { status?: boolean | string | null };
  outcomes_agg?: { transaction_fee?: string };
};

function getNetwork(): NearNetwork {
  return vscode.workspace
    .getConfiguration('nearTxViewer')
    .get<NearNetwork>('network', 'mainnet');
}

function getNearblocksApiBase(network: NearNetwork): string {
  return network === 'mainnet'
    ? 'https://api.nearblocks.io'
    : 'https://api-testnet.nearblocks.io';
}

function getExplorerTxUrl(network: NearNetwork, txHash: string): string {
  return `https://explorer.${network}.near.org/transactions/${txHash}`;
}

function toNear(yoctoValue?: string): string {
  const raw = Number(yoctoValue ?? '0');
  if (!Number.isFinite(raw)) return '0.000000';
  return (raw / 1e24).toFixed(6);
}

function formatTimestampNs(timestampNs?: string): string {
  const ns = Number(timestampNs ?? '0');
  if (!Number.isFinite(ns) || ns <= 0) return 'unknown';
  return new Date(ns / 1e6).toLocaleString();
}

function httpGetJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          Accept: 'application/json'
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk.toString();
        });
        res.on('end', () => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`HTTP ${res.statusCode ?? 0}`));
            return;
          }
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy(new Error('Request timed out'));
    });
  });
}

async function fetchTransaction(hash: string, network: NearNetwork): Promise<NearblocksTx | null> {
  const apiUrl = `${getNearblocksApiBase(network)}/v1/txns/${hash}`;
  const payload = await httpGetJson(apiUrl);
  const tx = payload?.txns?.[0];
  return tx ?? null;
}

function renderTxDetails(tx: NearblocksTx): string {
  const statusRaw = tx.outcomes?.status;
  const status = statusRaw === true ? 'Success' : statusRaw === false ? 'Failed' : String(statusRaw ?? 'Unknown');
  const actions = Array.isArray(tx.actions)
    ? tx.actions.map((item) => item.action).filter(Boolean).join(', ')
    : '';
  const signer = tx.signer_account_id ?? 'unknown';
  const receiver = tx.receiver_account_id ?? 'unknown';
  const feeNear = toNear(tx.outcomes_agg?.transaction_fee);
  const blockHeight = tx.block?.block_height ?? 'unknown';
  const when = formatTimestampNs(tx.block_timestamp);

  let details = '';
  details += `- **Status:** ${status}\n`;
  details += `- **Signer:** \`${signer}\`\n`;
  details += `- **Receiver:** \`${receiver}\`\n`;
  details += `- **Block:** ${blockHeight}\n`;
  details += `- **Fee:** ${feeNear} NEAR\n`;
  details += `- **Timestamp:** ${when}\n`;
  if (actions) {
    details += `- **Actions:** ${actions}\n`;
  }
  return details;
}

export function activate(context: vscode.ExtensionContext) {
  console.log('NEAR Transaction Viewer is now active');

  const hoverProvider = vscode.languages.registerHoverProvider({ scheme: 'file' }, {
    async provideHover(document, position) {
      const range = document.getWordRangeAtPosition(position, TX_HASH_WORD_REGEX);
      if (!range) return;

      const txHash = document.getText(range);
      const network = getNetwork();
      const markdown = new vscode.MarkdownString();

      markdown.appendMarkdown(`### 🔍 NEAR Transaction: \`${txHash.slice(0, 12)}...\`\n\n`);
      markdown.appendMarkdown(`- **Network:** ${network}\n`);

      try {
        const tx = await fetchTransaction(txHash, network);
        if (!tx) {
          markdown.appendMarkdown('- **Details:** transaction not found in NearBlocks\n');
        } else {
          markdown.appendMarkdown(renderTxDetails(tx));
        }
      } catch {
        markdown.appendMarkdown('- **Details:** unavailable (API request failed)\n');
      }

      markdown.appendMarkdown(`\n[Open in NEAR Explorer](${getExplorerTxUrl(network, txHash)})\n\n`);
      markdown.appendMarkdown(`[Open in Pikespeak](https://pikespeak.ai/transaction/${txHash})`);

      return new vscode.Hover(markdown, range);
    }
  });

  const linkProvider = vscode.languages.registerDocumentLinkProvider({ scheme: 'file' }, {
    provideDocumentLinks(document) {
      const network = getNetwork();
      const text = document.getText();
      const links: vscode.DocumentLink[] = [];
      TX_HASH_GLOBAL_REGEX.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = TX_HASH_GLOBAL_REGEX.exec(text)) !== null) {
        const txHash = match[0];
        const start = document.positionAt(match.index);
        const end = document.positionAt(match.index + txHash.length);
        const range = new vscode.Range(start, end);
        const target = vscode.Uri.parse(getExplorerTxUrl(network, txHash));
        const link = new vscode.DocumentLink(range, target);
        link.tooltip = 'Open NEAR transaction in explorer';
        links.push(link);
      }

      return links;
    }
  });

  context.subscriptions.push(hoverProvider, linkProvider);
}

export function deactivate() {}
