# NEAR Transaction Viewer

Inline transaction insights for VS Code.

## Features

- **Hash Detection:** Recognizes NEAR transaction hashes (base58) in your code.
- **Hover Details:** Shows status, signer, receiver, block, fee, actions, and timestamp inline.
- **Click-to-Open:** Transaction hashes become clickable links to full explorer pages.
- **Multi-Explorer Support:** Links to both the official NEAR Explorer and Pikespeak.ai.
- **Network Support:** Works with both `mainnet` and `testnet`.

## Usage

Hover over any string that looks like a NEAR transaction hash to see inline details.
Click a detected hash to open the full transaction view in NEAR Explorer.

## Configuration

- `nearTxViewer.network`: Choose between `mainnet` or `testnet` for lookups and explorer links.

## License

MIT
