import {tiles, rank, fits, choices, winningTiles, calculateFu, calculateScore} from './score.mjs';
const $ = id => document.getElementById(id);
const groups = Array(5).fill(null);
const suits = ['萬子','筒子','索子','字牌'];
const honors = ['東','南','西','北','白','發','中'];
const numerals = '一二三四五六七八九';
const slotName = slot => slot ? '面子' + slot : '雀頭';
const tileName = tile => tile >= 27 ? honors[tile-27] : rank(tile) + suits[Math.floor(tile/9)][0];
function face(tile, red = false) {
  if (tile >= 27) return '<span class="tile honor h' + tile + '">' + tileName(tile) + '</span>';
  const value = rank(tile);
  if (tile < 9) return '<span class="tile">' + numerals[value-1] + '<i>萬</i></span>';
  const file = (tile < 18 ? 'Pin' : 'Sou') + value + (red ? '-Dora' : '');
  return '<img class="tile-image" src="./tiles/' + file + '.svg" alt="">';
}
function faces(list, redTile) {
  const redIndex = list.indexOf(redTile);
  return '<span class="faces">' + list.map((tile,i) => face(tile,i === redIndex)).join('') + '</span>';
}
const labels = {sequence:['門前','チー'],triplet:['暗刻','明刻'],kan:['暗槓','明槓']};
let mode = 0, win = null, seat = 28, honba = 0, sticks = 0;
const rules = {doubleWind:4, kiriage:false, counted:true};
try {
  const saved = JSON.parse(localStorage.getItem('mahjong-rules'));
  if ([2,4].includes(saved?.doubleWind)) rules.doubleWind = saved.doubleWind;
  if (typeof saved?.kiriage === 'boolean') rules.kiriage = saved.kiriage;
  if (typeof saved?.counted === 'boolean') rules.counted = saved.counted;
} catch {}
const number = id => $(id).value === '' ? NaN : Number($(id).value);
function options(id, items) {
  $(id).replaceChildren(...items.map(([value,label]) => new Option(label,value)));
}
options('round', honors.slice(0,4).map((label,i) => [27+i,label]));
options('fu', [20,25,...Array.from({length:15},(_,i)=>30+i*10)].map(n=>[n,n]));
$('fu').value = 30;
for (let i=1;i<=10;i++) $('yakuman').add(new Option(i === 1 ? '役満' : i + '倍役満',i));
function button(label, action, html) {
  const node = document.createElement('button');
  node.type = 'button';
  if (html) { node.innerHTML = html; node.setAttribute('aria-label',label); }
  else node.textContent = label;
  node.onclick = action;
  return node;
}
const ron = () => $('method').value === 'ron';
const dealer = () => $('dealer').value === 'dealer';
function render() {
  $('hand').hidden = mode !== 0;
  $('chiRow').hidden = mode !== 1;
  $('fuRow').hidden = mode !== 2;
  [...$('modes').children].forEach((node,i) => node.setAttribute('aria-pressed',i === mode));
  $('groups').replaceChildren(...groups.map((group,slot) => {
    const suffix = group && slot ? labels[group.kind][Number(group.open)] : '';
    const node = button(slotName(slot) + (group ? ' ' + group.tiles.map((tile,i) => (i === group.tiles.indexOf(group.redTile) ? '赤' : '') + tileName(tile)).join(' ') + ' ' + suffix : ' 未選択'),
      () => pickGroup(slot), '<span>' + slotName(slot) + '</span>' + (group ? faces(group.tiles,group.redTile) : '＋') + '<span>' + suffix + '</span>');
    node.className = 'slot';
    return node;
  }));
  options('seat', (dealer() ? [0] : [1,2,3]).map(i => [27+i,honors[i]]));
  $('seat').value = dealer() ? 27 : seat;
  $('win').disabled = winningTiles(groups).length === 0;
  $('win').textContent = win ? 'アガリ ' + (win.red ? '赤' : '') + tileName(win.tile) + ' · ' + slotName(win.slot) : 'アガリ牌 ＋';
  calculate();
}
function calculate() {
  const info = mode === 0 ? calculateFu({groups,win,ron:ron(),round:number('round'),
    seat:number('seat'),doubleWind:rules.doubleWind,pinfu:$('pinfu').checked}) : null;
  $('pinfuRow').hidden = !info?.eligible;
  const fu = mode === 0 ? info?.fu : number(mode === 1 ? 'chi' : 'fu');
  const han = number('han');
  const yakuman = number('yakuman');
  $('han').disabled = Boolean(yakuman);
  const score = mode === 0 && !info ? null : calculateScore({fu,han,yakuman,dealer:dealer(),ron:ron(),
    honba,sticks,kiriage:rules.kiriage,counted:rules.counted});
  if (!score) {
    $('result').textContent = mode === 0 && !info ? '雀頭・面子とアガリ牌を選択' : (fu ? fu + '符 · 翻数を入力' : '入力を確認');
    return;
  }
  const fmt = n => n.toLocaleString('ja-JP');
  const [first,other] = score.payments;
  const payment = ron() ? '放銃者 ' + fmt(first) : dealer()
    ? fmt(first) + '点オール' : '親 ' + fmt(first) + '点 ／ 子 各 ' + fmt(other) + '点';
  $('result').innerHTML = '<small>' + (yakuman ? score.limit : fu + '符 · ' + han + '翻 ' + score.limit) +
    '</small><strong>' + fmt(score.total) + ' 点</strong><div>' + payment + (ron() ? '点' : '') +
    '</div>' + (honba || sticks ? '<p>' + honba + '本場 · 供託 ' + sticks + '本</p>' : '') +
    (info ? '<p>' + info.wait + ' · 基本20 ＋ 雀頭' + info.pairFu + ' ＋ 面子' + info.meldFu +
      ' ＋ 待ち' + info.waitFu + ' ＋ アガリ' + info.winFu + '符' + (info.raw !== info.fu ? ' → ' + info.fu + '符' : '') + '</p>' : '');
}
const picker = $('picker');
function panel(title, children) {
  $('pickerTitle').textContent = title;
  const body = $('pickerBody');
  body.replaceChildren(...children);
  body.scrollTop = 0;
  if (!picker.open) picker.showModal();
}
function grid(nodes) {
  const node = document.createElement('div');
  node.className = 'pickerGrid';
  node.append(...nodes);
  return node;
}
function pickGroup(slot) {
  const clear = groups[slot] ? [button('この枠を空にする', () => setGroup(slot,null))] : [];
  panel(slotName(slot) + ' · 種類', [grid(suits.map((suit,i) => button(suit,() => pickTile(slot,i)))),...clear]);
}
function pickTile(slot,suit) {
  const candidates = tiles.filter(tile => Math.floor(tile/9) === suit);
  const redTile = suit === 1 ? 13 : 22;
  const buttons = candidates.map(tile => tileButton(tile,false));
  if (suit === 1 || suit === 2) buttons.push(tileButton(redTile,true));
  panel(slotName(slot) + ' · ' + suits[suit], [grid(buttons),button('戻る',() => pickGroup(slot))]);

  function tileButton(tile,red) {
    const node = button((red ? '赤' : '') + tileName(tile), () => pickShape(slot,tile,red), face(tile,red));
    node.disabled = !choices(tile,!slot).some(candidate => fits(groups,candidate,slot));
    return node;
  }
}
function pickShape(slot,tile,red) {
  const candidates = choices(tile,!slot);
  const redTile = red ? tile : undefined;
  if (!slot) return setGroup(slot,{...candidates[0],open:false,redTile});
  panel(slotName(slot) + ' · 組み合わせ', [grid(candidates.map(group => {
    const label = group.tiles.map((value,i) =>
      (i === group.tiles.indexOf(redTile) ? '赤' : '') + tileName(value)).join(' ');
    const node = button(label, () => {
      panel(slotName(slot) + ' · 暗／明', [grid(labels[group.kind].map((label,i) =>
        button(label,() => setGroup(slot,{...group,open:Boolean(i),redTile})))),button('戻る',() => pickShape(slot,tile,red))]);
    }, faces(group.tiles,redTile));
    node.disabled = !fits(groups,group,slot);
    return node;
  })),button('戻る',() => pickTile(slot,Math.floor(tile/9)))]);
}
function setGroup(slot,group) {
  if (group && !fits(groups,group,slot)) return;
  groups[slot] = group;
  if (win?.slot === slot) win = null;
  picker.close();
  render();
  $('groups').children[slot].focus();
}
$('win').onclick = () => panel('アガリ牌と完成した組', [grid(winningTiles(groups).flatMap(item => {
  const group = groups[item.slot];
  const hasRed = group.redTile === item.tile;
  const hasNormal = !hasRed || group.tiles.filter(tile => tile === item.tile).length > 1;
  return [...(hasNormal ? [false] : []), ...(hasRed ? [true] : [])].map(red => {
    const node = button((red ? '赤' : '') + tileName(item.tile) + ' · ' + slotName(item.slot), () => {
      win = {...item,red};
      $('pinfu').checked = true;
      picker.close();
      render();
    }, face(item.tile,red) + ' ' + slotName(item.slot));
    if (win?.tile === item.tile && win.slot === item.slot && win.red === red) node.classList.add('selected');
    return node;
  });
}))]);
$('modes').append(...['通常手','七対子','符・翻入力'].map((label,i) => button(label,() => {mode=i;render();})));
$('close').onclick = () => picker.close();
$('settings').onclick = () => {
  const node = document.createElement('div');
  node.innerHTML = '<div class="row"><label>連風牌の雀頭<select id="windRule"><option value="4">4符</option><option value="2">2符</option></select></label><label>13翻以上<select id="countRule"><option value="yes">数え役満</option><option value="no">三倍満</option></select></label></div><p><label id="pinfuRowSetting"><span><input id="kiriRule" type="checkbox">切り上げ満貫</span></label></p><div class="row"><label>本場<input id="honba" type="number" inputmode="numeric" min="0" max="999"></label><label>供託（本）<input id="sticks" type="number" inputmode="numeric" min="0" max="999"></label></div><p id="settingsError" role="alert"></p>';
  panel('ルール・加算点', [node,button('適用',() => {
    const amounts = ['honba','sticks'].map(id => Number($(id).value));
    if (amounts.some(n => !Number.isInteger(n) || n < 0 || n > 999)) {
      $('settingsError').textContent = '本場・供託は0〜999の整数を入力';
      return;
    }
    [honba,sticks] = amounts;
    Object.assign(rules,{doubleWind:number('windRule'),counted:$('countRule').value==='yes',kiriage:$('kiriRule').checked});
    try { localStorage.setItem('mahjong-rules',JSON.stringify(rules)); } catch {}
    picker.close();
    calculate();
  })]);
  $('windRule').value = rules.doubleWind;
  $('countRule').value = rules.counted ? 'yes' : 'no';
  $('kiriRule').checked = rules.kiriage;
  $('honba').value = honba;
  $('sticks').value = sticks;
};
$('reset').onclick = () => {
  groups.fill(null); win = null; honba = 0; sticks = 0; seat = 28;
  $('han').value = ''; $('yakuman').value = 0; $('chi').value = 25; $('fu').value = 30;
  $('method').value = 'ron'; $('dealer').value = 'child'; $('round').value = 27; $('pinfu').checked = true;
  render();
};
$('seat').onchange = () => { if (!dealer()) seat = number('seat'); calculate(); };
$('dealer').onchange = render;
for (const id of ['round','method','pinfu','chi','fu','han','yakuman']) $(id).oninput = calculate;
render();

const registration = 'serviceWorker' in navigator
  ? navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(() => null) : Promise.resolve(null);
$('update').onclick = async () => {
  const status = $('status');
  const worker = await registration;
  if (!worker) { status.textContent = '更新確認にはHTTPSでの起動が必要です'; return; }
  try {
    await worker.update();
    const installing = worker.installing;
    if (installing) {
      await new Promise(resolve => {
        const settled = () => {
          if (['installed','activating','activated','redundant'].includes(installing.state)) {
            installing.removeEventListener('statechange',settled);
            resolve();
          }
        };
        installing.addEventListener('statechange',settled);
        settled();
      });
    }
    if (worker.waiting) {
      status.replaceChildren(button('更新を適用（入力をリセット）',() => {
        navigator.serviceWorker.addEventListener('controllerchange',() => location.reload(),{once:true});
        worker.waiting?.postMessage('activate');
      }));
    } else status.textContent = '利用可能な更新はありません';
  } catch { status.textContent = '更新を確認できませんでした'; }
};
