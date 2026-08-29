# Market Watch Studio

A static, GitHub Pages-ready producer and presenter workflow for GatheringTheMagic's Splinterlands Market Watch.

## What it does

- Opens with total SPS burned and change since the previous saved episode.
- Tracks pack floor prices, circulating supply and movement.
- Ranks card-market groups by price movement, supply or floor price.
- Builds a recording run sheet with saved talking points.
- Provides a large-format presenter view and downloadable CSV.
- Captures a shared daily history automatically through GitHub Actions and selects the snapshot closest to 14 days ago.
- Also saves up to 12 manual episode snapshots in the browser for immediate comparisons.

Data comes from public Splinterlands and SPS Validator endpoints. If a source is temporarily unavailable, the app clearly labels fallback preview data.

## Historical data

The `Capture market history` workflow runs daily and writes a compact dated snapshot under `data/snapshots`. `data/index.json` lets the browser fetch only the comparison date it needs, so the site does not download the entire archive. No API key or separate database account is required.

## Local preview

```powershell
node serve.mjs
```

Then open `http://localhost:4175`.

## GitHub Pages

The site is served directly from the repository root. GitHub Pages should use the `main` branch and `/ (root)` folder.

