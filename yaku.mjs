import {calculateFu, rank, winningTiles} from './score.mjs';

export const conditions = {
  ippatsu:'一発', haitei:'海底摸月', houtei:'河底撈魚', rinshan:'嶺上開花',
  chankan:'槍槓', tenhou:'天和', chiihou:'地和'
};
export function availableConditions({closed, ron, dealer, reach, kan}) {
  return Object.keys(conditions).filter(key => ({
    ippatsu:closed && reach, haitei:!ron, houtei:ron, rinshan:!ron && kan,
    chankan:ron, tenhou:closed && !ron && dealer && !kan && !reach,
    chiihou:closed && !ron && !dealer && !kan && !reach
  })[key]);
}
const orphan = [0,8,9,17,18,26,27,28,29,30,31,32,33];
const honor = t => t >= 27;
const terminal = t => !honor(t) && [1,9].includes(rank(t));
const edge = t => honor(t) || terminal(t);
const suit = t => Math.floor(t/9);
const countsOf = tiles => {
  const counts = Array(34).fill(0);
  for (const tile of tiles) counts[tile]++;
  return counts;
};
export function parseHand(input) {
  const compact = input.replace(/\s/g,'').toLowerCase();
  if (!/^(?:[1-9]+[mps]|[1-7]+z)+$/.test(compact)) return null;
  const tiles = [...compact.matchAll(/([1-9]+)([mpsz])/g)].flatMap(([,r,s]) =>
    [...r].map(n => 'mpsz'.indexOf(s)*9 + Number(n)-1));
  return countsOf(tiles).some(n => n > 4) ? null : tiles;
}
function decompose(counts) {
  const results = [];
  function walk(groups) {
    const start = counts.findIndex(Boolean);
    if (start < 0) {
      results.push(groups);
      return;
    }
    const options = [];
    if (counts[start] >= 3) options.push({kind:'triplet',tiles:[start,start,start]});
    if (!honor(start) && rank(start) <= 7 && counts[start+1] && counts[start+2]) {
      options.push({kind:'sequence',tiles:[start,start+1,start+2]});
    }
    for (const group of options) {
      group.tiles.forEach(t => counts[t]--);
      walk([...groups,{...group,open:false}]);
      group.tiles.forEach(t => counts[t]++);
    }
  }
  for (let t=0;t<34;t++) {
    if (counts[t]<2) continue;
    counts[t]-=2;
    walk([{kind:'pair',tiles:[t,t],open:false}]);
    counts[t]+=2;
  }
  return results;
}
function evaluate({groups,win,tiles,special,prewin,round,seat,ron,dealer,reach,event,ippatsu,dora,local,doubleWind}) {
  const melds = groups.slice(1);
  const closed = !melds.some(g=>g.open);
  const kan = melds.filter(g=>g.kind==='kan').length;
  const trips = melds.filter(g=>g.kind!=='sequence');
  const seq = melds.filter(g=>g.kind==='sequence');
  const concealed = trips.filter(g=>!g.open && !(ron && groups[win.slot]===g && g.kind==='triplet')).length;
  const pair = groups[0]?.tiles[0];
  const suits = new Set(tiles.filter(t=>!honor(t)).map(suit));
  const honors = tiles.some(honor);
  const info = special ? null : calculateFu({groups,win,round,seat,ron,doubleWind,pinfu:true});
  const normal = [], limits = [], detected = [];
  const add = (name,han=1) => normal.push({name,han});
  const limit = (name,multiple=1) => limits.push({name,multiple});
  if (!availableConditions({closed,ron,dealer,reach,kan}).includes(event)) event='';
  if (['tenhou','chiihou'].includes(event)) limit(conditions[event]);
  if (special==='kokushi') limit(new Set(prewin).size===13 ? '国士無双十三面待ち' : '国士無双',new Set(prewin).size===13 ? 2 : 1);
  if (tiles.every(honor)) limit('字一色');
  if (tiles.every(terminal)) limit('清老頭');
  if (tiles.every(t=>[19,20,21,23,25,32].includes(t))) limit('緑一色');
  const winds = trips.filter(g=>g.tiles[0]>=27 && g.tiles[0]<=30).length;
  const dragons = trips.filter(g=>g.tiles[0]>=31).length;
  if (dragons===3) limit('大三元');
  if (winds===4) limit('大四喜',2);
  else if (winds===3 && pair>=27 && pair<=30) limit('小四喜');
  if (concealed===4) limit(win.slot===0 ? '四暗刻単騎' : '四暗刻',win.slot===0 ? 2 : 1);
  if (kan===4) limit('四槓子');
  if (closed && suits.size===1 && !honors && tiles.length===14) {
    const base = [3,1,1,1,1,1,1,1,3];
    const ranks = t => Array.from({length:9},(_,i)=>t.filter(tile=>rank(tile)===i+1).length);
    if (ranks(tiles).every((n,i)=>n>=base[i])) {
      const pure = ranks(prewin).every((n,i)=>n===base[i]);
      limit(pure ? '純正九蓮宝燈' : '九蓮宝燈',pure ? 2 : 1);
    }
  }
  if (closed && reach) add(reach===2 ? 'ダブル立直' : '立直',reach);
  if (closed && !ron) add('門前清自摸和');
  if (event && !['tenhou','chiihou'].includes(event)) add(conditions[event]);
  if (ippatsu && closed && reach && !['rinshan','chankan'].includes(event)) add('一発');
  if (special==='chiitoi') add('七対子',2);
  if (info?.eligible) add('平和');
  if (tiles.every(t=>!edge(t))) add('断么九');
  if (special!=='kokushi' && tiles.every(edge)) add('混老頭',2);
  if (suits.size===1) add(honors ? '混一色' : '清一色',honors ? (closed ? 3 : 2) : (closed ? 6 : 5));
  const starts = seq.map(g=>g.tiles[0]);
  const identical = [...new Set(starts)].reduce((sum,t)=>sum+Math.floor(starts.filter(x=>x===t).length/2),0);
  if (closed && identical) add(identical===2 ? '二盃口' : '一盃口',identical===2 ? 3 : 1);
  if (closed===false && seq.some((g,i)=>!g.open && seq.slice(i+1).some(h=>!h.open && h.tiles[0]===g.tiles[0]))) {
    detected.push({name:'手の内一盃口',han:1});
    if (local) add('手の内一盃口');
  }
  if (starts.some(t=>suit(t)===0 && starts.includes(t+9) && starts.includes(t+18))) add('三色同順',closed ? 2 : 1);
  if ([0,9,18].some(t=>[t,t+3,t+6].every(n=>starts.includes(n)))) add('一気通貫',closed ? 2 : 1);
  const tripTiles = trips.map(g=>g.tiles[0]);
  if (tripTiles.some(t=>suit(t)===0 && tripTiles.includes(t+9) && tripTiles.includes(t+18))) add('三色同刻',2);
  if (trips.length===4) add('対々和',2);
  if (concealed>=3) add('三暗刻',2);
  if (kan>=3) add('三槓子',2);
  if (dragons===2 && pair>=31) add('小三元',2);
  for (const t of tripTiles) {
    if (t>=31) add('役牌・'+['白','發','中'][t-31]);
    if (t===round) add('役牌・場風');
    if (t===seat) add('役牌・自風');
  }
  if (seq.length && groups.every(g=>g.tiles.some(edge))) {
    add(honors ? '混全帯么九' : '純全帯么九',honors ? (closed ? 2 : 1) : (closed ? 3 : 2));
  }
  const valid = limits.length>0 || normal.length>0;
  if (!limits.length && valid) for (const [name,han] of Object.entries(dora)) {
    if (han && (name!=='裏ドラ' || closed && reach)) add(name,han);
  }
  return {roles:limits.length ? limits : normal,detected,valid,
    han:normal.reduce((n,r)=>n+r.han,0),multiple:limits.reduce((n,r)=>n+r.multiple,0),
    fu:info?.fu ?? (special==='chiitoi' ? 25 : undefined),wait:info?.wait,special,groups,win};
}
export function analyze(input) {
  const results = [];
  const {groups,win,hand,last} = input;
  if (hand) {
    if (hand.length!==14 || !hand.includes(last)) return results;
    const counts = countsOf(hand);
    const prewin = hand.slice();
    prewin.splice(prewin.indexOf(last),1);
    const evaluateSpecial = special => evaluate({...input,groups:[],win:{tile:last,slot:-1},tiles:hand,special,prewin});
    if (orphan.every(t=>counts[t])) results.push(evaluateSpecial('kokushi'));
    if (counts.filter(n=>n===2).length===7) results.push(evaluateSpecial('chiitoi'));
    for (const form of decompose(counts)) form.forEach((group,slot)=>{
      if (group.tiles.includes(last)) results.push(evaluate({...input,groups:form,win:{tile:last,slot},tiles:hand,prewin}));
    });
  } else if (groups.every(Boolean) && win && winningTiles(groups).some(item=>item.slot===win.slot && item.tile===win.tile)) {
    const tiles = groups.flatMap(g=>g.tiles);
    const prewin = tiles.slice();
    prewin.splice(prewin.indexOf(win.tile),1);
    results.push(evaluate({...input,tiles,prewin}));
  }
  return results;
}
