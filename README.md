<p align="center">
  <img src="public/logo.png" width="96" alt="Kitewell logo" />
</p>

# Kitewell — Frontend

React + Vite wallet lab UI for Stellar Testnet. Connect Freighter, fund with Friendbot, manage trustlines, send XLM, and inspect payment history.

Sibling repos:

| Layer | Repo |
|-------|------|
| Backend | [Kitewell-lab/backend](https://github.com/Kitewell-lab/backend) |
| Contract | [Kitewell-lab/contract](https://github.com/Kitewell-lab/contract) |

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173. Freighter must be on **Testnet**.

The Vite dev server proxies `/api` and `/health` to the backend at `http://localhost:8787`. Run the [backend](https://github.com/Kitewell-lab/backend) in another terminal:

```bash
# from the backend repo
npm install
npm run dev
```

Override the API origin with `VITE_API_BASE` if needed.

## Features

- Freighter connect / disconnect (`setAllowed`, `getAddress`, `signTransaction`)
- Friendbot funding
- Balances + `changeTrust`
- Native XLM payments + history
- Backend-backed account/payment reads (Horizon fallback)
- Lab panel for API + contract status

## License

MIT — [LICENSE](./LICENSE).

## Network

Testnet only by default. No Mainnet funds.
