const ENDPOINTS = {
  supply: 'https://splinterlands-validator-api.splinterlands.com/extensions/tokens/SPS/supply',
  packs: 'https://vapi.splinterlands.com/market/landing',
  catalog: 'https://api2.splinterlands.com/cards/get_details',
  market: 'https://api.splinterlands.com/market/for_sale_grouped',
};

const EDITIONS = { 0:'Alpha',1:'Beta',2:'Promo',3:'Reward',4:'Untamed',5:'Dice',6:'Gladius',7:'Chaos Legion',8:'Riftwatchers',9:'Soulbound Rewards',10:'Soulbound',11:'Promo',12:'Rebellion',13:'Soulbound Rewards',14:'Conclave Arcana',15:'Escalation',16:'Soulbound Rewards',17:'Promo',18:'Soulbound',19:'Event' };
const RARITIES = { 1:'Common',2:'Rare',3:'Epic',4:'Legendary' };
const RARITY_ORDER = ['Common','Rare','Epic','Legendary'];
const FOIL_ORDER = ['Regular','Gold','Black','Other'];
const STORAGE = { snapshots:'marketWatchSnapshotsV2', run:'marketWatchRunSheetV2', notes:'marketWatchNotesV2' };
const SEEDED_PREVIOUS = {
  capturedAt: Date.parse('2026-08-16T12:00:00Z'),
  label: 'Spreadsheet · 16 Aug 2026',
  spsBurned: null,
  packs: {
    ALPHA:{ price:29.99, supply:4070 }, BETA:{ price:5.99, supply:19387 },
    UNTAMED:{ price:2.88, supply:39794 }, DICE:{ price:1.88, supply:4490 },
  },
  cards: {},
};

const FALLBACK_PACKS = [
  { id:'ALPHA',name:'Alpha Pack',group:'Core',price:13.99,supply:5697,listed:45,image:'https://d36mxiodymuqjm.cloudfront.net/website/icons/icon_pack_alpha.png' },
  { id:'BETA',name:'Beta Pack',group:'Core',price:5.99,supply:20222,listed:831,image:'https://d36mxiodymuqjm.cloudfront.net/website/icons/icon_pack_beta.png' },
  { id:'UNTAMED',name:'Untamed Pack',group:'Core',price:2.88,supply:39794,listed:1284,image:'https://d36mxiodymuqjm.cloudfront.net/website/icons/icon_pack_untamed.png' },
  { id:'DICE',name:'Dice Pack',group:'Expansion',price:1.88,supply:4490,listed:210,image:'https://d36mxiodymuqjm.cloudfront.net/website/icons/icon_pack_dice.png' },
];

const FALLBACK_CARDS = [
  { key:'1047:0:12',id:1047,name:'Vaelok',edition:12,set:'Rebellion',rarity:'Common',foil:'Regular',price:.435,supply:4 },
  { key:'411:0:7',id:411,name:'Chaos Dragon',edition:7,set:'Chaos Legion',rarity:'Legendary',foil:'Regular',price:1.42,supply:28 },
  { key:'239:1:4',id:239,name:'Yodin Zaku',edition:4,set:'Untamed',rarity:'Legendary',foil:'Gold',price:92,supply:3 },
  { key:'696:0:12',id:696,name:'Grimbardun Smith',edition:12,set:'Rebellion',rarity:'Rare',foil:'Regular',price:.78,supply:16 },
  { key:'505:0:12',id:505,name:'Mantaroth',edition:12,set:'Rebellion',rarity:'Legendary',foil:'Regular',price:6.2,supply:11 },
  { key:'426:1:7',id:426,name:'Doctor Blight',edition:7,set:'Chaos Legion',rarity:'Legendary',foil:'Gold',price:54,supply:5 },
];

const $ = id => document.getElementById(id);
const state = {
  loading:false, spsBurned:null, packs:[], cards:[], packExpanded:false,
  snapshots:readStore(STORAGE.snapshots,[]), previous:null,
  runSheet:readStore(STORAGE.run,[]), notes:readStore(STORAGE.notes,{}), activeRunKey:null,
  filters:{ search:'',set:'all',foil:'all',sort:'movers' }, bandSet:'', presenterIndex:0, warnings:[], historySource:'seed',
};
state.previous = chooseComparison([...state.snapshots, SEEDED_PREVIOUS]);

function readStore(key,fallback){ try{const value=JSON.parse(localStorage.getItem(key));return value ?? fallback}catch{return fallback} }
function writeStore(key,value){ try{localStorage.setItem(key,JSON.stringify(value))}catch{} }
function chooseComparison(candidates){
  const target=Date.now()-14*86400000,cutoff=Date.now()-3600000;
  return candidates.filter(item=>Number.isFinite(item?.capturedAt)&&item.capturedAt<cutoff).sort((a,b)=>Math.abs(a.capturedAt-target)-Math.abs(b.capturedAt-target))[0]||SEEDED_PREVIOUS;
}
function expandSharedSnapshot(raw){
  return {capturedAt:Number(raw.capturedAt),label:`Shared history · ${raw.date}`,spsBurned:Number.isFinite(raw.s)?raw.s:null,packs:Object.fromEntries(Object.entries(raw.p||{}).map(([key,value])=>[key,{price:Number(value[0]),supply:Number(value[1])}])),cards:Object.fromEntries(Object.entries(raw.c||{}).map(([key,value])=>[key,{price:Number(value[0]),supply:Number(value[1])}]))};
}
async function loadSharedHistory(){
  try{
    const index=await fetchJson('./data/index.json',8000);if(!Array.isArray(index)||!index.length)return;
    const target=Date.now()-14*86400000;const date=[...index].sort((a,b)=>Math.abs(Date.parse(`${a}T12:00:00Z`)-target)-Math.abs(Date.parse(`${b}T12:00:00Z`)-target))[0];
    const shared=expandSharedSnapshot(await fetchJson(`./data/snapshots/${date}.json`,8000));state.previous=chooseComparison([...state.snapshots,shared]);state.historySource=state.previous===shared?'shared':'local';
  }catch{state.historySource=state.snapshots.length?'local':'seed'}
}
function esc(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
function number(value,digits=0){return Number.isFinite(value)?Number(value).toLocaleString('en-GB',{maximumFractionDigits:digits,minimumFractionDigits:digits}):'—'}
function money(value){if(!Number.isFinite(value))return '—';const digits=value<.01?5:value<1?3:2;return `$${Number(value).toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits})}`}
function signed(value,suffix=''){if(!Number.isFinite(value))return '—';return `${value>0?'+':''}${number(value,Math.abs(value)<10?1:0)}${suffix}`}
function deltaPct(current,previous){return Number.isFinite(current)&&Number.isFinite(previous)&&previous!==0?((current-previous)/previous)*100:null}
function dateLabel(ms){return new Date(ms).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
function foilName(row){if(Number(row.foil)===2)return 'Black';if(Boolean(row.gold)||Number(row.foil)===1)return 'Gold';if(Number(row.foil)===0)return 'Regular';return 'Other'}
function changeClass(value){return value>0?'positive':value<0?'negative':'neutral'}
function showToast(message){const toast=$('toast');toast.textContent=message;toast.classList.remove('hidden');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.add('hidden'),2600)}

async function fetchJson(url,timeout=18000){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
  try{const response=await fetch(url,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`${response.status}`);return await response.json()}finally{clearTimeout(timer)}
}

function normalizePacks(payload){
  const assets=payload?.data?.assets || payload?.assets || [];
  return assets.filter(item=>item.assetName==='PACKS').map(item=>({
    id:String(item.detailId),name:item.detailName||item.detailId,group:item.detailGroup||'Other',
    price:Number(item.prices?.find(price=>price.currency==='USD')?.minPrice),
    supply:Math.max(0,Number(item.numCirculation)),listed:Math.max(0,Number(item.numListed)),image:item.detailImage||'',
  })).filter(item=>Number.isFinite(item.price)||Number.isFinite(item.supply));
}

function normalizeCards(catalog,market){
  const details=new Map((Array.isArray(catalog)?catalog:[]).map(card=>[Number(card.id),card]));
  const groups=new Map();
  for(const row of Array.isArray(market)?market:[]){
    const id=Number(row.card_detail_id),edition=Number(row.edition),foil=foilName(row),key=`${id}:${row.foil??0}:${edition}`;
    const price=Number(row.low_price),supply=Number(row.qty);
    if(!id||!Number.isFinite(price)||price<=0||!Number.isFinite(supply))continue;
    const existing=groups.get(key);const detail=details.get(id);
    if(existing){existing.price=Math.min(existing.price,price);existing.supply+=supply;continue}
    groups.set(key,{key,id,name:detail?.name||`Card #${id}`,edition,set:EDITIONS[edition]||`Edition ${edition}`,rarity:RARITIES[Number(detail?.rarity)]||'Unknown',foil,price,supply});
  }
  return [...groups.values()];
}

async function loadSnapshot(){
  if(state.loading)return;state.loading=true;state.warnings=[];
  $('refreshSnapshot').disabled=true;$('refreshSnapshot').innerHTML='<span>↻</span> Refreshing…';
  $('dataState').className='data-state';$('dataState').querySelector('span').textContent='Refreshing official market sources…';
  const historyPromise=loadSharedHistory();
  const results=await Promise.allSettled([fetchJson(ENDPOINTS.supply),fetchJson(ENDPOINTS.packs),fetchJson(ENDPOINTS.catalog,25000),fetchJson(ENDPOINTS.market,25000)]);
  await historyPromise;
  if(results[0].status==='fulfilled')state.spsBurned=Number(results[0].value.burned);else state.warnings.push('SPS burn');
  if(results[1].status==='fulfilled'){const packs=normalizePacks(results[1].value);state.packs=packs.length?packs:FALLBACK_PACKS}else{state.packs=FALLBACK_PACKS;state.warnings.push('pack market')}
  if(results[2].status==='fulfilled'&&results[3].status==='fulfilled'){const cards=normalizeCards(results[2].value,results[3].value);state.cards=cards.length?cards:FALLBACK_CARDS}else{state.cards=FALLBACK_CARDS;state.warnings.push('card market')}
  state.loading=false;$('refreshSnapshot').disabled=false;$('refreshSnapshot').innerHTML='<span>↻</span> Refresh snapshot';
  ensureRunSheet();renderAll();
}

function ensureRunSheet(){
  const valid=new Set(state.cards.map(card=>card.key));state.runSheet=state.runSheet.filter(key=>valid.has(key));
  if(!state.runSheet.length)state.runSheet=rankedCards().slice(0,6).map(card=>card.key);
  state.activeRunKey=state.activeRunKey&&state.runSheet.includes(state.activeRunKey)?state.activeRunKey:state.runSheet[0]||null;
  writeStore(STORAGE.run,state.runSheet);
}

function previousCard(card){return state.previous?.cards?.[card.key]||null}
function enrichedCard(card){const previous=previousCard(card);return {...card,priceChange:deltaPct(card.price,previous?.price),supplyChange:Number.isFinite(previous?.supply)?card.supply-previous.supply:null}}
function rankedCards(){
  const q=state.filters.search.toLowerCase();let rows=state.cards.map(enrichedCard).filter(card=>(state.filters.set==='all'||card.set===state.filters.set)&&(state.filters.foil==='all'||card.foil===state.filters.foil)&&(!q||`${card.name} ${card.set} ${card.foil}`.toLowerCase().includes(q)));
  if(state.filters.sort==='supply')rows.sort((a,b)=>a.supply-b.supply||b.price-a.price);
  else if(state.filters.sort==='price')rows.sort((a,b)=>b.price-a.price);
  else rows.sort((a,b)=>(Math.abs(b.priceChange??-1)-Math.abs(a.priceChange??-1))||a.supply-b.supply);
  return rows;
}

function packSignal(pack,change){if(pack.supply<100||pack.listed<15)return ['Low supply','hot'];if(Number.isFinite(change)&&Math.abs(change)>10)return ['Watch','watch'];return ['Stable','']}
function renderOpening(){
  $('totalBurned').textContent=number(state.spsBurned,3);
  const previousBurn=state.previous?.spsBurned;const burnDelta=Number.isFinite(previousBurn)&&Number.isFinite(state.spsBurned)?state.spsBurned-previousBurn:null;
  $('burnDelta').textContent=number(burnDelta,3);$('burnDelta').className=changeClass(burnDelta);
  $('burnDeltaNote').textContent=Number.isFinite(burnDelta)?`Since ${dateLabel(state.previous.capturedAt)}`:'Save a live episode to begin comparison';
  const days=state.previous?.capturedAt?Math.max(1,Math.round((Date.now()-state.previous.capturedAt)/86400000)):null;
  $('cadence').textContent=days?`${days} days`:'—';$('cadenceNote').textContent=state.previous?.label||`Compared with ${dateLabel(state.previous.capturedAt)}`;
  $('compareLabel').textContent=state.previous?`Compared with ${dateLabel(state.previous.capturedAt)}`:'No previous episode';
  const rows=state.packExpanded?state.packs:state.packs.slice(0,7);$('packCount').textContent=`${state.packs.length} pack types`;$('togglePacks').textContent=state.packExpanded?'Show less':'Show all';
  $('packTable').innerHTML=`<div class="pack-row table-head" role="row"><span>Set</span><span>Floor price</span><span>Circulating</span><span>Change</span><span>Signal</span></div>${rows.map(pack=>{
    const previous=state.previous?.packs?.[pack.id],supplyChange=Number.isFinite(previous?.supply)?pack.supply-previous.supply:null,priceChange=deltaPct(pack.price,previous?.price),[signal,signalClass]=packSignal(pack,supplyChange);
    return `<div class="pack-row" role="row"><div class="pack-name">${pack.image?`<img class="pack-thumb" src="${esc(pack.image)}" alt="">`:''}<strong>${esc(pack.name)}<small>${esc(pack.group)} · ${number(pack.listed)} listed</small></strong></div><span class="mono">${money(pack.price)}<small class="card-movement ${changeClass(priceChange)}">${Number.isFinite(priceChange)?signed(priceChange,'%'):'new'}</small></span><span class="mono">${number(pack.supply)}</span><span class="movement ${changeClass(supplyChange)}">${Number.isFinite(supplyChange)?signed(supplyChange):'—'}</span><span class="signal ${signalClass}">${signal}</span></div>`;
  }).join('')}`;
}

function renderCardStats(){
  const rows=state.cards.map(enrichedCard),withMovement=rows.filter(card=>Number.isFinite(card.priceChange)),rising=withMovement.filter(card=>card.priceChange>0).length,low=rows.filter(card=>card.supply<=5).length,median=rows.map(card=>card.price).sort((a,b)=>a-b)[Math.floor(rows.length/2)];
  $('cardStats').innerHTML=`<article class="micro-stat"><span>Market groups</span><strong>${number(rows.length)}</strong></article><article class="micro-stat"><span>Tracked movers</span><strong>${number(withMovement.length)}</strong></article><article class="micro-stat"><span>Rising since last episode</span><strong>${number(rising)}</strong></article><article class="micro-stat"><span>Five or fewer listed</span><strong>${number(low)}</strong></article>`;
  if(Number.isFinite(median))$('cardStats').children[0].querySelector('span').title=`Median floor ${money(median)}`;
}

function renderFilters(){
  const sets=[...new Set(state.cards.map(card=>card.set))].sort();const select=$('setFilter'),current=state.filters.set;
  select.innerHTML='<option value="all">All sets</option>'+sets.map(set=>`<option value="${esc(set)}">${esc(set)}</option>`).join('');select.value=sets.includes(current)?current:'all';
}

function renderCardBands(){
  const sets=[...new Set(state.cards.map(card=>card.set))].sort();
  if(!sets.includes(state.bandSet))state.bandSet=sets[0]||'';
  const select=$('bandSetFilter');select.innerHTML=sets.map(set=>`<option value="${esc(set)}">${esc(set)}</option>`).join('');select.value=state.bandSet;
  const cards=state.cards.filter(card=>card.set===state.bandSet&&Number.isFinite(card.price)&&card.price>0);
  $('bandCount').textContent=`${number(cards.length)} market groups`;
  const additional=[...new Set(cards.map(card=>card.rarity).filter(rarity=>!RARITY_ORDER.includes(rarity)))].sort();
  const rarities=[...RARITY_ORDER,...additional];
  const headFoils=FOIL_ORDER.map(foil=>`<th colspan="2" scope="colgroup">${esc(foil)}</th>`).join('');
  const headBands=FOIL_ORDER.map(()=>'<th scope="col">Low</th><th scope="col">High</th>').join('');
  const rows=rarities.map(rarity=>{
    const cells=FOIL_ORDER.map(foil=>{
      const prices=cards.filter(card=>card.rarity===rarity&&card.foil===foil).map(card=>card.price).sort((a,b)=>a-b);
      if(!prices.length)return '<td class="band-price empty">—</td><td class="band-price empty">—</td>';
      return `<td class="band-price low">${money(prices[0])}</td><td class="band-price high">${money(prices.at(-1))}</td>`;
    }).join('');
    return `<tr><th scope="row"><span class="rarity-dot rarity-${rarity.toLowerCase()}"></span>${esc(rarity)}</th>${cells}</tr>`;
  }).join('');
  $('bandTable').innerHTML=`<thead><tr><th rowspan="2" scope="col">Rarity</th>${headFoils}</tr><tr>${headBands}</tr></thead><tbody>${rows}</tbody>`;
}

function renderCards(){
  const rows=rankedCards().slice(0,60);
  $('cardTable').innerHTML=`<div class="card-row table-head" role="row"><span>Card</span><span>Floor</span><span>Movement</span><span>Supply</span><span></span></div>${rows.map(card=>{
    const selected=state.runSheet.includes(card.key),supplyText=Number.isFinite(card.supplyChange)?`${signed(card.supplyChange)} vs prior`:'no prior data';
    return `<div class="card-row ${selected?'selected':''}" role="row" tabindex="0" data-card-key="${esc(card.key)}"><div class="card-title"><strong>${esc(card.name)}</strong><small>${esc(card.set)} · ${esc(card.foil)}</small></div><span class="mono">${money(card.price)}</span><span class="card-movement ${changeClass(card.priceChange)}">${Number.isFinite(card.priceChange)?signed(card.priceChange,'%'):'—'}</span><span class="mono">${number(card.supply)}<small class="card-supply">${supplyText}</small></span><span class="add-icon">${selected?'✓':'+'}</span></div>`;
  }).join('')}${rows.length?'':'<div class="empty-state">No cards match these filters.</div>'}`;
  document.querySelectorAll('[data-card-key]').forEach(row=>{const toggle=()=>toggleRunCard(row.dataset.cardKey);row.addEventListener('click',toggle);row.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle()}})});
}

function toggleRunCard(key){
  if(state.runSheet.includes(key)){state.runSheet=state.runSheet.filter(item=>item!==key);if(state.activeRunKey===key)state.activeRunKey=state.runSheet[0]||null}else{state.runSheet.push(key);state.activeRunKey=key}
  writeStore(STORAGE.run,state.runSheet);renderCards();renderRunSheet();showToast(state.runSheet.includes(key)?'Added to the episode run sheet':'Removed from the run sheet');
}

function renderRunSheet(){
  const cards=new Map(state.cards.map(card=>[card.key,enrichedCard(card)]));
  $('runCount').textContent=state.runSheet.length;
  $('runList').innerHTML=state.runSheet.map((key,index)=>{const card=cards.get(key);if(!card)return '';return `<div class="run-item ${key===state.activeRunKey?'active':''}" data-run-key="${esc(key)}"><span class="run-number">${String(index+1).padStart(2,'0')}</span><div><strong>${esc(card.name)}</strong><small>${money(card.price)} · ${esc(card.set)} · ${esc(card.foil)}</small></div><button class="remove-button" type="button" data-remove-key="${esc(key)}" aria-label="Remove ${esc(card.name)}">×</button></div>`}).join('')||'<div class="empty-state">Add cards from the ranking to build the episode.</div>';
  document.querySelectorAll('[data-run-key]').forEach(item=>item.addEventListener('click',event=>{if(event.target.closest('[data-remove-key]'))return;state.activeRunKey=item.dataset.runKey;renderRunSheet()}));
  document.querySelectorAll('[data-remove-key]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();toggleRunCard(button.dataset.removeKey)}));
  const textarea=$('talkingPoints');textarea.disabled=!state.activeRunKey;textarea.value=state.activeRunKey?state.notes[state.activeRunKey]||'':'';
}

function renderStatus(){
  const live=state.warnings.length===0;$('dataState').className=`data-state ${live?'live':'partial'}`;$('dataState').querySelector('span').textContent=live?`Live snapshot · ${state.packs.length} packs · ${number(state.cards.length)} card groups`:`Live with fallback for ${state.warnings.join(' and ')}`;
  const notice=$('notice');if(state.warnings.length){notice.textContent=`Some sources did not respond, so saved preview data is shown for: ${state.warnings.join(', ')}. You can refresh again before recording.`;notice.classList.remove('hidden')}else notice.classList.add('hidden');
  const last=state.snapshots.at(-1);$('saveState').textContent=last?`Last saved ${dateLabel(last.capturedAt)}`:`History ${dateLabel(state.previous.capturedAt)}`;
}

function renderAll(){renderStatus();renderOpening();renderCardStats();renderFilters();renderCardBands();renderCards();renderRunSheet();renderPresenter()}

function saveEpisode(){
  if(!state.packs.length||!state.cards.length){showToast('Refresh the market before saving');return}
  const snapshot={capturedAt:Date.now(),label:'Saved episode',spsBurned:state.spsBurned,packs:Object.fromEntries(state.packs.map(pack=>[pack.id,{price:pack.price,supply:pack.supply}])),cards:Object.fromEntries(state.cards.map(card=>[card.key,{price:card.price,supply:card.supply}]))};
  state.snapshots=[...state.snapshots,snapshot].slice(-12);writeStore(STORAGE.snapshots,state.snapshots);renderStatus();showToast('Episode snapshot saved for the next comparison');
}

function downloadCsv(){
  const packRows=state.packs.map(pack=>{const previous=state.previous?.packs?.[pack.id];return ['Pack',pack.name,pack.group,'',pack.price,previous?.price??'',deltaPct(pack.price,previous?.price)??'',pack.supply,previous?.supply??'',Number.isFinite(previous?.supply)?pack.supply-previous.supply:'','']});
  const map=new Map(state.cards.map(card=>[card.key,enrichedCard(card)]));const cardRows=state.runSheet.map(key=>{const card=map.get(key);return card?['Card',card.name,card.set,card.foil,card.price,previousCard(card)?.price??'',card.priceChange??'',card.supply,previousCard(card)?.supply??'',card.supplyChange??'',state.notes[key]||'']:null}).filter(Boolean);
  const rows=[['Section','Name','Set','Foil','Current price','Previous price','Price change %','Current supply','Previous supply','Supply change','Talking points'],...packRows,...cardRows];
  const csv=rows.map(row=>row.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(',')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`market-watch-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(url);showToast('Run sheet downloaded');
}

function presenterSlides(){
  const burnDelta=Number.isFinite(state.previous?.spsBurned)&&Number.isFinite(state.spsBurned)?state.spsBurned-state.previous.spsBurned:null;
  const slides=[{kicker:'Opening segment',title:'Total SPS burned',value:number(state.spsBurned,3),comparison:Number.isFinite(burnDelta)?`${signed(burnDelta)} since ${dateLabel(state.previous.capturedAt)}`:'Official validator supply',notes:'Begin with the SPS supply burn, then compare it with the previous episode.'}];
  slides.push(...state.packs.slice(0,state.packExpanded?state.packs.length:7).map(pack=>{const previous=state.previous?.packs?.[pack.id],priceChange=deltaPct(pack.price,previous?.price),supplyChange=Number.isFinite(previous?.supply)?pack.supply-previous.supply:null;return {kicker:'Pack market',title:pack.name,value:money(pack.price),comparison:`${Number.isFinite(priceChange)?signed(priceChange,'%'):'No price comparison'} · ${number(pack.supply)} circulating`,notes:Number.isFinite(supplyChange)?`${signed(supplyChange)} packs in circulation since the previous episode.`:`${number(pack.listed)} currently listed on the in-game market.`}}));
  const map=new Map(state.cards.map(card=>[card.key,enrichedCard(card)]));slides.push(...state.runSheet.map(key=>{const card=map.get(key);return card?{kicker:`Card deep dive · ${card.set} · ${card.foil}`,title:card.name,value:money(card.price),comparison:`${Number.isFinite(card.priceChange)?signed(card.priceChange,'%'):'No prior price'} · ${number(card.supply)} listed`,notes:state.notes[key]||'Add a talking point in Producer view before recording.'}:null}).filter(Boolean));return slides;
}

function renderPresenter(){const slides=presenterSlides();if(!slides.length)return;state.presenterIndex=Math.max(0,Math.min(state.presenterIndex,slides.length-1));const slide=slides[state.presenterIndex];$('presenterCounter').textContent=`${state.presenterIndex+1} / ${slides.length}`;$('presenterProgress').style.width=`${((state.presenterIndex+1)/slides.length)*100}%`;$('presenterKicker').textContent=slide.kicker;$('presenterTitle').textContent=slide.title;$('presenterValue').textContent=slide.value;$('presenterComparison').textContent=slide.comparison;$('presenterNotes').textContent=slide.notes;$('previousSlide').disabled=state.presenterIndex===0;$('nextSlide').textContent=state.presenterIndex===slides.length-1?'Finish':'Next →'}
function changeSlide(direction){const slides=presenterSlides();const next=state.presenterIndex+direction;if(next>=slides.length){setView('producer');return}state.presenterIndex=Math.max(0,next);renderPresenter()}
function setView(view){const presenter=view==='presenter';document.querySelector('.producer-view').classList.toggle('hidden',presenter);$('presenter').classList.toggle('hidden',!presenter);document.querySelectorAll('[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===view));if(presenter){state.presenterIndex=0;renderPresenter();window.scrollTo(0,0)}else window.scrollTo(0,0)}

function bindEvents(){
  $('refreshSnapshot').addEventListener('click',loadSnapshot);$('saveSnapshot').addEventListener('click',saveEpisode);$('togglePacks').addEventListener('click',()=>{state.packExpanded=!state.packExpanded;renderOpening();renderPresenter()});$('downloadCsv').addEventListener('click',downloadCsv);$('startPresenter').addEventListener('click',()=>setView('presenter'));$('exitPresenter').addEventListener('click',()=>setView('producer'));$('previousSlide').addEventListener('click',()=>changeSlide(-1));$('nextSlide').addEventListener('click',()=>changeSlide(1));document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
  $('searchCards').addEventListener('input',event=>{state.filters.search=event.target.value;renderCards()});$('setFilter').addEventListener('change',event=>{state.filters.set=event.target.value;if(event.target.value!=='all'){state.bandSet=event.target.value;renderCardBands()}renderCards()});$('foilFilter').addEventListener('change',event=>{state.filters.foil=event.target.value;renderCards()});$('sortCards').addEventListener('change',event=>{state.filters.sort=event.target.value;renderCards()});
  $('bandSetFilter').addEventListener('change',event=>{state.bandSet=event.target.value;renderCardBands()});
  $('talkingPoints').addEventListener('input',event=>{if(!state.activeRunKey)return;state.notes[state.activeRunKey]=event.target.value;writeStore(STORAGE.notes,state.notes)});
  document.addEventListener('keydown',event=>{if($('presenter').classList.contains('hidden'))return;if(event.key==='ArrowRight')changeSlide(1);if(event.key==='ArrowLeft')changeSlide(-1);if(event.key==='Escape')setView('producer')});
}

$('episodeDate').textContent=`Episode preparation · ${dateLabel(Date.now())}`;
bindEvents();loadSnapshot();

