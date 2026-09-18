# Contributing to Helios Lab Frontend

React, Freighter, and Vite UI for the Stellar Testnet lab.

## Local setup

```bash
npm install
npm run dev        # http://localhost:5173
```

Run the [backend](https://github.com/ayyldCem-0/backend) on `:8787` for lab panel + API-backed reads.

```bash
npm run lint
npm run build
```

## PR guidelines

1. One issue per PR when possible
2. Prefix titles with `[frontend]`
3. Keep signing in Freighter — never handle secret keys in the UI beyond the wallet
4. Default network is Testnet

Sibling layers: [backend](https://github.com/ayyldCem-0/backend), [contract](https://github.com/ayyldCem-0/contract).

## Code of conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
