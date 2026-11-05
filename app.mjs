import {tiles, rank, fits, choices, winningTiles, calculateFu, calculateScore} from './score.mjs';
const $ = id => document.getElementById(id);
const groups = Array(5).fill(null);
const suits = ['萬子','筒子','索子','字牌'];
const honors = ['東','南','西','北','白','發','中'];
const numerals = '一二三四五六七八九';
const slotName = slot => slot ? '面子' + slot : '雀頭';
const tileName = tile => tile >= 27 ? honors[tile-27] : rank(tile) + suits[Math.floor(tile/9)][0];
const circleRows = [[1],[1,1],[1,1,1],[2,2],[2,1,2],[2,2,2],[1,1,1,2,2],[2,2,2,2],[3,3,3]];
const bambooRows = [[],[1,1],[1,2],[2,2],[2,1,2],[3,3],[1,3,3],[2,2,2,2],[3,3,3]];
function face(tile) {
  if (tile >= 27) return '<span class="tile honor h' + tile + '">' + tileName(tile) + '</span>';
  const value = rank(tile);
  if (tile < 9) return '<span class="tile">' + numerals[value-1] + '<i>萬</i></span>';
  const circles = tile < 18;
  let marks;
  if (circles && value === 1) {
    marks = '<circle cx="12" cy="16" r="9" fill="none" stroke="#244c55" stroke-width="2"/>' +
      '<circle cx="12" cy="16" r="6" fill="none" stroke="#286344" stroke-width="1.5"/>' +
      '<circle cx="12" cy="16" r="3" fill="#a12322"/>';
  } else if (!circles && value === 1) {
    marks = '<path d="M4 23l5-8q1-3 5-4l1-4q2-3 5-1l2 2-4 2q2 8-5 11l-3 4-1-4-6 5z" fill="#246044"/>' +
      '<path d="M9 18q3-5 7-4-2 5-7 4z" fill="#a12322"/>' +
      '<circle cx="18" cy="7.5" r=".7" fill="#fffbee"/>' +
      '<path d="M6 27h12m-6-6-1 6m4-7 1 7" fill="none" stroke="#244c55" stroke-width="1.2"/>';
  } else {
    const rows = (circles ? circleRows : bambooRows)[value-1];
    marks = rows.map((count,row) => Array.from({length:count},(_,column) => {
      const x = 12 + (column - (count-1)/2) * 7;
      const y = 16 + (row - (rows.length-1)/2) * Math.min(12,24/rows.length + 1);
      const color = circles
        ? ((value === 5 && row === 1) || value === 7 && row > 2 || value === 9 && row === 1 ? '#a12322' : row % 2 ? '#286344' : '#244c55')
        : ((value === 5 && row === 1) || value === 7 && row === 0 || value === 9 && row === 0 ? '#a12322' : '#246044');
      const shape = circles
        ? '<circle r="2.65" fill="none" stroke="currentColor" stroke-width="1.15"/><circle r=".8" fill="currentColor"/>'
        : '<path d="M-1.6-3.3h3.2L.9-1.2l.7 1.2-.7 1.2.7 2.1h-3.2l.7-2.1L-1.6 0l.7-1.2z" fill="currentColor"/>';
      return '<g transform="translate(' + x + ' ' + y + ')" color="' + color + '">' + shape + '</g>';
    }).join('')).join('');
  }
  return '<span class="tile"><svg aria-hidden="true" viewBox="0 0 24 32">' + marks + '</svg></span>';
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
