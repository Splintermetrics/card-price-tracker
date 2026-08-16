# Card Ledger

Four-week Splinterlands market-history explorer.

## Run locally

From this folder:

```powershell
node serve.mjs
```

Then open `http://localhost:4175`.

The server proxies the Splinterlands card catalog and market-history endpoints so the browser stays same-origin. If the API is unavailable, the interface falls back to a small local Vaelok preview.
