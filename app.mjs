import {tiles, rank, fits, choices, winningTiles, calculateFu, calculateScore} from './score.mjs';
const $ = id => document.getElementById(id);
const groups = Array(5).fill(null);
let renderYaku = () => {};
let resetYaku = () => {};
const suits = ['萬子','筒子','索子','字牌'];
const honors = ['東','南','西','北','白','發','中'];
const numerals = '一二三四五六七八九';
const slotName = slot => slot ? '面子' + slot : '雀頭';
const tileName = tile => tile >= 27 ? honors[tile-27] : rank(tile) + suits[Math.floor(tile/9)][0];
function face(tile) {
  if (tile >= 27) return '<span class="tile honor h' + tile + '">' + tileName(tile) + '</span>';
  const value = rank(tile);
  if (tile < 9) return '<span class="tile">' + numerals[value-1] + '<i>萬</i></span>';
  const file = (tile < 18 ? 'Pin' : 'Sou') + value;
  return '<img class="tile-image" src="./tiles/' + file + '.svg" alt="">';
}
const faces = list => '<span class="faces">' + list.map(tile => face(tile)).join('') + '</span>';
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
  renderYaku();
}
function calculate() {
  const info = mode === 0 ? calculateFu({groups,win,ron:ron(),round:number('round'),
    seat:number('seat'),doubleWind:rules.doubleWind,pinfu:$('pinfu').checked}) : null;
  $('pinfuRow').hidden = !info?.eligible;
  const fu = mode === 0 ? info?.fu : number(mode === 1 ? 'chi' : 'fu');
  const han = number('han');
  const yakuman = number('yakuman');

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
    renderYaku();
  })]);
  $('windRule').value = rules.doubleWind;
  $('countRule').value = rules.counted ? 'yes' : 'no';
  $('kiriRule').checked = rules.kiriage;
  $('honba').value = honba;
  $('sticks').value = sticks;
};
$('reset').onclick = () => {
  resetYaku();
  groups.fill(null); win = null; honba = 0; sticks = 0; seat = 28;
  $('han').value = ''; $('yakuman').value = 0; $('chi').value = 25; $('fu').value = 30;
  $('method').value = 'ron'; $('dealer').value = 'child'; $('round').value = 27; $('pinfu').checked = true;
  render();
};
$('seat').onchange = () => { if (!dealer()) seat = number('seat'); calculate(); };
$('dealer').onchange = render;
for (const id of ['round','method','pinfu','chi','fu','han','yakuman']) $(id).oninput = calculate;
render();

if ($('analysis')) {
  import('./yaku.mjs').then(({analyze, availableConditions, conditions, parseHand}) => {
    const winds = honors.slice(0,4).map((label,i) => [27+i,label]);
    options('analysisRound',winds);
    options('analysisSeat',winds.slice(1));
    $('analysisSeat').value = '28';
    renderYaku = () => {
      const full = $('useFullHand').checked;
      $('fullHandRow').hidden = !full;
      $('analysisWinds').hidden = !full;
      $('analysisSeat').disabled = dealer();
      const closed = full || !groups.some(g=>g?.open);
      $('reach').disabled = !closed;
      if (!closed) $('reach').value = '0';
      const reach = number('reach');
      const allowed = availableConditions({closed,ron:ron(),dealer:dealer(),reach,
        kan:!full && groups.some(g=>g?.kind==='kan')});
      const event = allowed.includes($('yakuEvent').value) ? $('yakuEvent').value : '';
      options('yakuEvent',[['','なし'],...allowed.filter(k=>k!=='ippatsu').map(k=>[k,conditions[k]])]);
      $('yakuEvent').value = event;
      $('ippatsu').disabled = !allowed.includes('ippatsu') || ['rinshan','chankan'].includes(event);
      if ($('ippatsu').disabled) $('ippatsu').checked = false;
      $('ura').disabled = !closed || !reach;
      if ($('ura').disabled) $('ura').value = '';
      const result = $('yakuResults');
      result.textContent = '和了牌を含む完成形を入力してください。';
      $('localYakuRow').hidden = true;
      const hand = full ? parseHand($('fullHand').value) : undefined;
      if ((full && !hand) || (!full && mode!==0)) return;
      const round = number(full ? 'analysisRound' : 'round');
      const seat = full ? (dealer() ? 27 : number('analysisSeat')) : number('seat');
      const input = {groups,win,hand,last:hand?.at(-1),round,seat,ron:ron(),dealer:dealer(),reach,event,
        ippatsu:$('ippatsu').checked,local:$('localYaku').checked,doubleWind:rules.doubleWind,
        dora:Object.fromEntries([['ドラ','dora'],['裏ドラ','ura'],['赤ドラ','aka']].map(([name,id])=>{
          const n=number(id);
          return [name,Number.isInteger(n) && n>0 && n<=99 ? n : 0];
        }))};
      const choices = analyze(input);
      if (!choices.length) return;
      const detected = choices.some(item=>item.detected.length);
      $('localYakuRow').hidden = !detected;
      if (!detected) $('localYaku').checked = false;
      const total = item => calculateScore({fu:item.fu,han:item.han,yakuman:item.multiple,
        ron:ron(),dealer:dealer(),kiriage:rules.kiriage,counted:rules.counted})?.total ?? 0;
      const unique = new Map();
      for (const item of choices) {
        const key = JSON.stringify([item.roles,item.fu,item.wait,item.special,item.detected]);
        if (!unique.has(key)) unique.set(key,item);
      }
      const cards = [...unique.values()].sort((a,b)=>total(b)-total(a)).map(item=>{
        const box = document.createElement('article');
        const title = document.createElement('strong');
        title.textContent = item.multiple ? item.multiple+'倍役満' : item.valid ?
          item.han+'翻 · '+item.fu+'符' : '役なし';
        const line = document.createElement('p');
        line.textContent = [item.wait,...item.roles.map(r=>r.name+' '+(r.multiple ? r.multiple+'倍役満' : r.han+'翻'))].filter(Boolean).join(' ／ ');
        box.append(title,line);
        if (full && item.groups.length) {
          const shape = document.createElement('p');
          shape.innerHTML = item.groups.map(g=>faces(g.tiles)).join(' ');
          box.append(shape);
        }
        if (item.detected.length && !input.local) {
          const note = document.createElement('p');
          note.textContent = 'ローカル役候補：手の内一盃口（カスタムで採用できます）';
          box.append(note);
        }
        if (item.valid && (item.multiple || item.han<=99)) {
          const activeFu = mode===0 ? calculateFu({groups,win,round:number('round'),seat:number('seat'),
            ron:ron(),doubleWind:rules.doubleWind,pinfu:$('pinfu').checked})?.fu : number(mode===1 ? 'chi' : 'fu');
          if ((!item.multiple && activeFu!==item.fu) || (item.multiple && mode===0 && !activeFu)) {
            const note = document.createElement('p');
            note.textContent = item.multiple ? '「符・翻入力」に切り替えると役満を適用できます。'
              : !full ? '点数計算欄の平和設定を確認してください。'
              : '点数計算欄の符を '+item.fu+'符 に合わせると適用できます。';
            box.append(note);
          } else {
            box.append(button(item.multiple ? '役満倍率に適用' : '翻数に適用',()=>{
              $('yakuman').value = item.multiple;
              if (!item.multiple) $('han').value = item.han;
              calculate();
            }));
          }
        }
        return box;
      });
      result.replaceChildren(...cards);
    };
    for (const id of ['analysis','useFullHand','fullHand','analysisRound','analysisSeat','reach','yakuEvent','ippatsu',
      'dora','ura','aka','localYaku','round','seat','method','pinfu','chi','fu']) {
      $(id).addEventListener(id==='analysis' ? 'toggle' : 'input',renderYaku);
    }
    resetYaku = () => {
      for (const id of ['useFullHand','ippatsu','localYaku']) $(id).checked = false;
      for (const id of ['fullHand','dora','ura','aka','yakuEvent']) $(id).value = '';
      $('reach').value = '0';
      $('analysisRound').value = '27';
      $('analysisSeat').value = '28';
    };
    renderYaku();
  }).catch(() => {
    $('yakuResults').textContent = '役解析を読み込めません。更新確認をお試しください。';
  });
}

if ($('appTabs')) {
  const tabs = [$('scoreTab'),$('guideTab')];
  const panels = [$('scorePage'),$('guidePage')];
  let guideRequested = false;
  function selectPage(index, focus = false) {
    tabs.forEach((tab,i) => {
      tab.setAttribute('aria-selected',i === index);
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (focus) tabs[index].focus();
    if (index === 1 && !guideRequested) {
      guideRequested = true;
      import('./yaku-guide.mjs').catch(() => {
        guideRequested = false;
        $('guide').textContent = '図鑑を読み込めません。再度タブを開いてください。';
      });
    }
  }
  tabs.forEach((tab,index) => {
    tab.onclick = () => selectPage(index);
    tab.onkeydown = event => {
      const next = {ArrowLeft:1-index,ArrowRight:1-index,Home:0,End:1}[event.key];
      if (next !== undefined) {
        event.preventDefault();
        selectPage(next,true);
      }
    };
  });
}

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
