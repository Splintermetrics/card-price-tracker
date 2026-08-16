const API = "/api";
const $ = id => document.getElementById(id);
const money = n => Number.isFinite(n) ? `$${n.toFixed(2)}` : "—";
const cutoff = Date.now() - 28 * 24 * 60 * 60 * 1000;
let cards = [], sales = [], selected = null;

// A small local fallback keeps the UI useful when opened offline or when the API is rate-limited.
const fallbackCards = [{card_detail_id:1047,name:"Vaelok",rarity:3,card_set:"Chaos Legion",color:"Life"}];
const fallbackSales = [{date:"2026-07-21T23:41:30Z",price:1.99,buyer:"dmower",seller:"pipitiwpitiw",uid:"C17-1047-CE507133",card_detail_id:1047},{date:"2026-07-22T06:35:36Z",price:.35,buyer:"andy-b",seller:"apolqtiee",uid:"C17-1047-1A8E080A",card_detail_id:1047},{date:"2026-07-23T05:57:06Z",price:.28,buyer:"mori-no-giant",seller:"raccoonamatata",uid:"C17-1047-573DA026",card_detail_id:1047},{date:"2026-07-23T07:21:45Z",price:.435,buyer:"marcox828",seller:"samsungzflip",uid:"C17-1047-2AF6CF87",card_detail_id:1047}];
function normalizeRow(row, cardMap) {
  const id = Number(row.card_detail_id ?? row.card_id ?? row.card_detail?.id);
  const date = row.event_date ?? row.market_date ?? row.timestamp ?? row.date ?? row.created_date;
  const price = Number(row.payment_amount ?? row.price ?? row.usd_price ?? row.market_price);
  const type = String(row.event_type ?? row.transfer_type ?? row.type ?? "sale").toLowerCase();
  if (!id || !date || !Number.isFinite(price) || price <= 0 || new Date(date).getTime() < cutoff || (type !== "sale" && type !== "market" && type !== "purchase")) return null;
  return {date,price,buyer:row.to_player ?? row.buyer ?? row.player ?? "unknown",seller:row.from_player ?? row.seller ?? "unknown",uid:row.card_uid ?? row.uid ?? row.card_id ?? "",card_detail_id:id,name:cardMap.get(id)?.name ?? `Card #${id}`,gold:Boolean(row.gold) || Number(row.foil) === 1};
}
async function fetchJson(url){const response=await fetch(url);if(!response.ok)throw new Error(`${response.status}`);return response.json();}
async function loadData(){
  const from = new Date(cutoff).toISOString(); const to = new Date().toISOString();
  try {
    const rawCards = await fetchJson(`${API}/cards`); cards = Array.isArray(rawCards) ? rawCards : rawCards.cards ?? [];
    const cardMap = new Map(cards.map(c=>[Number(c.id ?? c.card_detail_id),c]));
    const rawHistory = await fetchJson(`${API}/market-history?from_date=${encodeURIComponent(from)}&to_date=${encodeURIComponent(to)}`);
    const rows = Array.isArray(rawHistory) ? rawHistory : rawHistory.history ?? rawHistory.data ?? rawHistory.sales ?? [];
    sales = rows.map(row=>normalizeRow(row,cardMap)).filter(Boolean);
    if (!sales.length) throw new Error("No recent sales returned");
    $('dataStatus').textContent=`Live API · ${cards.length.toLocaleString()} cards · 4-week window`;
  } catch(error) {
    cards=fallbackCards; sales=fallbackSales; $('dataStatus').textContent="Offline preview · connect the API to load all cards"; console.warn("Using fallback data",error);
  }
  selected = sales[0]?.card_detail_id ?? cards[0]?.id; render();
}
function cardName(id){return cards.find(c=>Number(c.id ?? c.card_detail_id)===Number(id))?.name ?? sales.find(s=>s.card_detail_id===Number(id))?.name ?? `Card #${id}`;}
function stats(){const prices=sales.map(s=>s.price).sort((a,b)=>a-b), median=prices.length?prices[Math.floor(prices.length/2)]:NaN, latest=[...sales].sort((a,b)=>new Date(a.date)-new Date(b.date)).at(-1); $('latest').textContent=money(latest?.price); $('latestFoot').textContent=latest?`${new Date(latest.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})} · ${cardName(latest.card_detail_id)}`:"No sales"; $('median').textContent=money(median); $('saleCount').textContent=sales.length.toLocaleString(); $('volume').textContent=money(sales.reduce((a,x)=>a+x.price,0)); $('activeCards').textContent=new Set(sales.map(s=>s.card_detail_id)).size.toLocaleString(); $('catalogCount').textContent=cards.length.toLocaleString(); $('salesPill').textContent=`${sales.length.toLocaleString()} sales`;}
function renderCards(){const groups=[...new Map(sales.map(s=>[s.card_detail_id,s])).values()].map(x=>({id:x.card_detail_id,name:cardName(x.card_detail_id),rows:sales.filter(s=>s.card_detail_id===x.card_detail_id)})).sort((a,b)=>b.rows.length-a.rows.length).slice(0,8); $('cardList').innerHTML=groups.map(g=>{const prices=g.rows.map(x=>x.price).sort((a,b)=>a-b);return `<button class="card-row ${g.id===selected?'selected':''}" data-card="${g.id}"><div class="card-art"><span>◎</span><small>SL<br>MARKET</small></div><div class="card-name"><strong>${g.name}</strong><small>${g.rows.length} sales · ${g.rows.filter(x=>x.gold).length?'gold + ':''}recent activity</small></div><div class="card-price"><strong>${money(prices[Math.floor(prices.length/2)])}</strong><small>median</small></div><div class="sparkline"><svg viewBox="0 0 100 30"><polyline points="0,23 12,20 24,21 36,15 48,17 60,10 72,14 84,9 100,11" /></svg></div><span class="row-arrow">→</span></button>`}).join('')||'<div class="empty">No card sales in this window.</div>'; document.querySelectorAll('[data-card]').forEach(el=>el.addEventListener('click',()=>{selected=Number(el.dataset.card);render();}));}
function renderActivity(list=[...sales].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6)){ $('activityList').innerHTML=list.map(x=>`<div class="activity-item"><div class="activity-icon">↗</div><div class="activity-name"><strong>${x.name ?? cardName(x.card_detail_id)}</strong><small>${x.buyer} bought from ${x.seller} · ${new Date(x.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</small></div><div class="activity-price">${money(x.price)}</div></div>`).join('')||'<div class="empty">No matching sales.</div>'; }
function renderChart(){const rows=sales.filter(s=>s.card_detail_id===Number(selected)).sort((a,b)=>new Date(a.date)-new Date(b.date));const title=cardName(selected);$('selectedCardTitle').innerHTML=`${title} <span>·</span> four-week history`;$('chartSub').textContent=`${rows.length} recorded sale${rows.length===1?'':'s'} · selected card`;$('chartPrice').textContent=money(rows.length?rows.map(x=>x.price).sort((a,b)=>a-b)[Math.floor(rows.length/2)]:NaN);const svg=$('chart'),w=900,h=270,pad=16;if(!rows.length){svg.innerHTML='';return;}const max=Math.max(...rows.map(x=>x.price),.1),pts=rows.map((x,i)=>[pad+(i/Math.max(rows.length-1,1))*(w-pad*2),h-pad-(x.price/max)*(h-pad*2)]),line=pts.map(p=>p.join(',')).join(' ');svg.innerHTML=`<defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#c8f169" stop-opacity=".22"/><stop offset="1" stop-color="#c8f169" stop-opacity="0"/></linearGradient></defs><polygon class="chart-area" points="${pad},${h-pad} ${line} ${w-pad},${h-pad}"/><polyline class="chart-line" points="${line}"/>${pts.map((p,i)=>`<circle class="chart-point" cx="${p[0]}" cy="${p[1]}" r="${i===pts.length-1?6:3}" data-index="${i}"/>`).join('')}`;document.querySelectorAll('.chart-point').forEach(dot=>dot.addEventListener('mouseenter',e=>{const x=rows[+e.target.dataset.index],t=$('tooltip');t.textContent=`${new Date(x.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})} · ${money(x.price)}`;t.style.display='block';t.style.left=`${(+e.target.getAttribute('cx')/900)*100}%`;t.style.top=`${(+e.target.getAttribute('cy')/270)*100-12}%`;}));}
function render(){stats();renderCards();renderActivity();renderChart();}
function filter(){const q=$('search').value.toLowerCase();const filtered=sales.filter(x=>[x.name,cardName(x.card_detail_id),x.buyer,x.seller,x.uid].join(' ').toLowerCase().includes(q));renderActivity(filtered);}
$('search').addEventListener('input',filter);$('clearSelection').addEventListener('click',()=>{selected=sales[0]?.card_detail_id;render();});loadData();
