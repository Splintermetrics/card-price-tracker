# Market Watch Studio

A static, GitHub Pages-ready producer and presenter workflow for GatheringTheMagic's Splinterlands Market Watch.

## What it does

- Opens with total SPS burned and change since the previous saved episode.
- Tracks pack floor prices, circulating supply and movement.
- Ranks card-market groups by price movement, supply or floor price.
- Builds a recording run sheet with saved talking points.
- Provides a large-format presenter view and downloadable CSV.
- Saves up to 12 episode snapshots in the browser for repeat comparisons.

Data comes from public Splinterlands and SPS Validator endpoints. If a source is temporarily unavailable, the app clearly labels fallback preview data.

## Local preview

```powershell
node serve.mjs
```

Then open `http://localhost:4175`.

## GitHub Pages

The site is served directly from the repository root. GitHub Pages should use the `main` branch and `/ (root)` folder.

