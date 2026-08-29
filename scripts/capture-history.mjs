import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ENDPOINTS = {
  supply: 'https://splinterlands-validator-api.splinterlands.com/extensions/tokens/SPS/supply',
  packs: 'https://vapi.splinterlands.com/market/landing',
  market: 'https://api.splinterlands.com/market/for_sale_grouped',
};

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'market-watch-history/1.0' } });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

const [supply, packPayload, market] = await Promise.all([
  fetchJson(ENDPOINTS.supply), fetchJson(ENDPOINTS.packs), fetchJson(ENDPOINTS.market),
]);

const packs = {};
for (const item of packPayload?.data?.assets ?? []) {
  if (item.assetName !== 'PACKS') continue;
  const price = Number(item.prices?.find(entry => entry.currency === 'USD')?.minPrice);
  const circulation = Math.max(0, Number(item.numCirculation));
  if (Number.isFinite(price) || Number.isFinite(circulation)) packs[String(item.detailId)] = [price, circulation];
}

const cards = {};
for (const row of Array.isArray(market) ? market : []) {
  const id = Number(row.card_detail_id), edition = Number(row.edition), foil = Number(row.foil ?? 0);
  const price = Number(row.low_price), quantity = Number(row.qty);
  if (!id || !Number.isFinite(price) || price <= 0 || !Number.isFinite(quantity)) continue;
  const key = `${id}:${foil}:${edition}`;
  if (cards[key]) {
    cards[key][0] = Math.min(cards[key][0], price);
    cards[key][1] += quantity;
  } else cards[key] = [price, quantity];
}

const now = new Date();
const date = now.toISOString().slice(0, 10);
const snapshot = { date, capturedAt: now.getTime(), s: Number(supply.burned), p: packs, c: cards };
const dataDir = path.join(ROOT, 'data');
const snapshotDir = path.join(dataDir, 'snapshots');
await fs.mkdir(snapshotDir, { recursive: true });
await fs.writeFile(path.join(snapshotDir, `${date}.json`), `${JSON.stringify(snapshot)}\n`);

let index = [];
try { index = JSON.parse(await fs.readFile(path.join(dataDir, 'index.json'), 'utf8')); } catch {}
index = [...new Set([...index, date])].sort();
await fs.writeFile(path.join(dataDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
console.log(`Captured ${date}: ${Object.keys(packs).length} packs and ${Object.keys(cards).length} card groups.`);

