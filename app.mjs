import {tiles, rank, fits, choices, winningTiles, calculateFu, calculateScore} from './score.mjs';
const $ = id => document.getElementById(id);
const groups = Array(5).fill(null);
const suits = ['萬子','筒子','索子','字牌'];
const honors = ['東','南','西','北','白','發','中'];
const numerals = '一二三四五六七八九';
const slotName = slot => slot ? '面子' + slot : '雀頭';
const tileName = tile => tile >= 27 ? honors[tile-27] : rank(tile) + suits[Math.floor(tile/9)][0];
const pipPositions = [
  [4], [0,8], [0,4,8], [0,2,6,8], [0,2,4,6,8],
  [0,2,3,5,6,8], [0,2,3,4,5,6,8], [0,1,2,3,5,6,7,8], [0,1,2,3,4,5,6,7,8]
];
function face(tile) {
  if (tile >= 27) {
    return '<span class="tile honor h' + tile + '">' + tileName(tile) + '</span>';
  }
  const value = rank(tile);
  if (tile < 9) return '<span class="tile">' + numerals[value-1] + '<i>萬</i></span>';
  const circles = tile < 18;
  const marks = pipPositions[value-1].map((position,index) => {
    const x = 5 + position % 3 * 6;
    const y = 6 + Math.floor(position / 3) * 9;
    const color = index === 0 ? '#a12322' : '#236042';
    return circles ? '<circle cx="' + x + '" cy="' + y + '" r="' + (value === 1 ? 6 : 2.15) +
      '" fill="none" stroke="' + color + '" stroke-width="1.5"/>'
      : '<path d="M' + x + ' ' + (y-3) + 'v6m-1.4-3h2.8" stroke="' + color + '" stroke-width="1.4"/>';
  });
  return '<span class="tile"><svg aria-hidden="true" viewBox="0 0 22 30">' + marks.join('') + '</svg></span>';
}
const faces = list => '<span class="faces">' + list.map(face).join('') + '</span>';
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
    const node = button(slotName(slot) + (group ? ' ' + group.tiles.map(tileName).join(' ') + ' ' + suffix : ' 未選択'),
      () => pickGroup(slot), '<span>' + slotName(slot) + '</span>' + (group ? faces(group.tiles) : '＋') + '<span>' + suffix + '</span>');
    node.className = 'slot';
    return node;
  }));
  options('seat', (dealer() ? [0] : [1,2,3]).map(i => [27+i,honors[i]]));
  $('seat').value = dealer() ? 27 : seat;
  $('win').disabled = winningTiles(groups).length === 0;
  $('win').textContent = win ? 'アガリ ' + tileName(win.tile) + ' · ' + slotName(win.slot) : 'アガリ牌 ＋';
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
  $('pickerBody').replaceChildren(...children);
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
  panel(slotName(slot) + ' · ' + suits[suit], [grid(candidates.map(tile => {
    const node = button(tileName(tile), () => pickShape(slot,tile), face(tile));
    node.disabled = !choices(tile,!slot).some(candidate => fits(groups,candidate,slot));
    return node;
  })),button('戻る',() => pickGroup(slot))]);
}
function pickShape(slot,tile) {
  const candidates = choices(tile,!slot);
  if (!slot) return setGroup(slot,{...candidates[0],open:false});
  panel(slotName(slot) + ' · 組み合わせ', [grid(candidates.map(group => {
    const node = button(group.tiles.map(tileName).join(' '), () => {
      panel(slotName(slot) + ' · 暗／明', [grid(labels[group.kind].map((label,i) =>
        button(label,() => setGroup(slot,{...group,open:Boolean(i)})))),button('戻る',() => pickShape(slot,tile))]);
    }, faces(group.tiles));
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
$('win').onclick = () => panel('アガリ牌と完成した組', [grid(winningTiles(groups).map(item => {
  const node = button(tileName(item.tile) + ' · ' + slotName(item.slot), () => {
    win = item;
    $('pinfu').checked = true;
    picker.close();
    render();
  }, face(item.tile) + ' ' + slotName(item.slot));
  if (win?.tile === item.tile && win.slot === item.slot) node.classList.add('selected');
  return node;
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
