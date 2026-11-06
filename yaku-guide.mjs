import {parseHand} from './yaku.mjs';
import {rank} from './score.mjs';

const normal = [
  ['立直 リーチ','1翻','門前でテンパイを宣言し、供託を出して和了する。','45p'],
  ['ダブル立直 ダブルリーチ','2翻','副露のない第1巡に立直を宣言。立直と重複しない。','45s'],
  ['一発 イッパツ','1翻','例では立直も成立する。立直後、鳴きや槓で中断されず、自分の次のツモまでに和了。','67p'],
  ['門前清自摸和 メンゼンチンツモホー メンゼンツモ','1翻','門前の手をツモで和了。','123s'],
  ['平和 ピンフ','1翻','門前で全て順子、役牌以外の雀頭、両面待ち。','234567p'],
  ['断么九 タンヤオ','1翻','2〜8の数牌だけで和了。喰いタンを認めるルールを使用。','234567s'],
  ['一盃口 イーペーコー','1翻','門前で同一の順子が2組。二盃口とは重複しない。','112233p'],
  ['役牌 ヤクハイ 白發中 自風 場風','1翻','三元牌・場風・自風の刻子か槓子。連風牌なら場風と自風を各1翻。','555z'],
  ['海底摸月 ハイテイモーユエ ハイテイ','1翻','局の最後のツモ牌で和了。','9p'],
  ['河底撈魚 ホウテイラオユイ ホウテイ','1翻','局の最後の打牌をロン。','9s'],
  ['嶺上開花 リンシャンカイホウ リンシャン','1翻','槓の直後に補充した嶺上牌でツモ和了。','1111s'],
  ['槍槓 チャンカン','1翻','原則として他家の加槓牌をロン。暗槓に対する国士の例外は卓による。','555p'],
  ['七対子 チートイツ','2翻','門前で異なる7種の対子。同じ牌4枚を対子2組に分けない。','11223344556677p'],
  ['三色同順 サンショクドウジュン サンショク','2翻・副露1翻','萬子・筒子・索子で同じ数字の順子。','123m123p123s'],
  ['一気通貫 イッキツウカン イッツー','2翻・副露1翻','同じ種類で123・456・789の順子。','123456789p'],
  ['混全帯么九 ホンチャンタイヤオチュー チャンタ','2翻・副露1翻','全ての組に么九牌が入り、順子と字牌を含む。','123p789s55z'],
  ['純全帯么九 ジュンチャンタイヤオチュー ジュンチャン','3翻・副露2翻','全ての組に1か9が入り、順子を含み、字牌を使わない。','123p789s11m'],
  ['対々和 トイトイ','2翻','4面子が全て刻子か槓子。','333p777s'],
  ['三暗刻 サンアンコウ','2翻','暗刻・暗槓が3組。ロンで完成した刻子は暗刻に数えない。','222p555s777m'],
  ['三槓子 サンカンツ','2翻','槓子が3組。','1111p9999s1111z'],
  ['三色同刻 サンショクドウコウ','2翻','三種類の数牌で同じ数字の刻子か槓子。','333m333p333s'],
  ['小三元 ショウサンゲン','2翻','三元牌の2種が刻子か槓子、残り1種が雀頭。三元牌の役牌は別に数える。','55566677z'],
  ['混老頭 ホンロウトウ','2翻','1・9・字牌だけで和了。この例では七対子と複合する。4面子の形なら対々和と複合する。','111p999s55z'],
  ['二盃口 リャンペーコー','3翻','門前で同一順子の組を2組。この牌姿は七対子にも取れるが、別の解釈なので重複しない。一盃口も別に加えない。','112233667788p'],
  ['混一色 ホンイツ','3翻・副露2翻','一種類の数牌と字牌で和了。','123456p55z'],
  ['清一色 チンイツ','6翻・副露5翻','一種類の数牌だけで和了。','11223345678999s']
];
const limits = [
  ['国士無双 コクシムソウ コクシ','1・9・字牌13種を揃え、1種を対子にする。この例は東が雀頭で、中だけを待つ通常形。','19m19p19s1234567z'],
  ['四暗刻 スーアンコウ','暗刻・暗槓が4組。双碰でロンした刻子は暗刻に数えない。','222p555s777m444z'],
  ['大三元 ダイサンゲン','白・發・中をそれぞれ刻子または槓子にする。','555666777z'],
  ['小四喜 ショウスーシー','風牌3種を刻子か槓子、残り1種を雀頭にする。','11122233344z'],
  ['字一色 ツーイーソー','字牌だけで和了。','11133355566677z'],
  ['緑一色 リューイーソー','2・3・4・6・8索と發だけで和了。發の要否は卓による。','23466888s666z'],
  ['清老頭 チンロウトウ','数牌の1と9だけで和了。','111999p111999s11m'],
  ['四槓子 スーカンツ','槓子を4組作って和了。','1111p9999s1111m5555z'],
  ['九蓮宝燈 チューレンポートウ チューレン','門前で同色の1112345678999に同色1枚を足す。','1112345678999p'],
  ['天和 テンホー','親が配牌の時点で和了。牌姿以外の情報が必要。','123p'],
  ['地和 チーホー','子が副露の入っていない最初の自摸で和了。','123s']
];
const doubles = [
  ['国士無双十三面待ち コクシムソウジュウサンメンマチ','和了前に1・9・字牌13種が1枚ずつあり、どの1種でもアガれる。この例では九索で雀頭ができる。','19m19p19s1234567z'],
  ['四暗刻単騎 スーアンコウタンキ','暗刻・暗槓4組が揃い、雀頭の単騎待ちで和了。','222p555s777m444z'],
  ['純正九蓮宝燈 ジュンセイチューレンポートウ','和了前が同色の1112345678999で、同色の全9種を待つ。','1112345678999s'],
  ['大四喜 ダイスーシー','東南西北の全てを刻子か槓子にする。','111222333444z']
];
const local = [
  ['手の内一盃口 テノウチイーペーコー 鳴き一盃口','1翻','副露手の手の内に同じ順子が2組。このアプリではロン完成可。ロン完成を除く採用例もある。','112233s','https://w.atwiki.jp/mahjlocal/pages/88.html',true],
  ['燕返し ツバメガエシ','1翻','他家が立直を宣言した打牌をロンする。牌姿で判定できず、同名の牌のすり替えとは別の用法。','5p'],
  ['三連刻 サンレンコウ','2翻','同色の連続する3つの数字を刻子か槓子にする。副露可の例。','222333444p'],
  ['四連刻 スーレンコウ','役満','同色の連続する4つの数字を刻子か槓子にする。副露可の例で、通常役では対々和と断么九の形。','222333444555s'],
  ['一色三順 イーソーサンシュン','3翻・副露2翻','同じ順子を3組。喰い下がりを設ける例。','222333444p'],
  ['大車輪 ダイシャリン','役満','2〜8筒をすべて対子にした七対子。通常役としては七対子・清一色・断么九の形で、面子に分けると二盃口にも取れる。','22334455667788p'],
  ['大竹林 ダイチクリン','役満','大車輪の索子版。通常役では七対子・清一色・断么九の形。','22334455667788s'],
  ['大数隣 ダイスウリン','役満','大車輪の萬子版。通常役では七対子・清一色・断么九の形。','22334455667788m'],
  ['人和 レンホー','役満など','子が初回の自摸前にロン。鳴きの扱いや、満貫・役満などの評価は卓による。','123p'],
  ['八連荘 パーレンチャン','役満','親の連続和了に対する特例。連荘の数え始めや和了回数の条件が異なる。','111z'],
  ['オープン立直 オープンリーチ','2翻','手牌の全部または待ち部分を公開して立直する例。放銃時の特例も卓による。','45s'],
  ['流し満貫 ナガシマンガン','満貫など','流局まで自分の捨て牌がすべて么九牌で、鳴かれていない場合の特例。和了扱いか流局扱いかは卓による。','19p19s123z'],
  ['十三不塔 シーサンプーター','役満など','初期の14枚が対子1組だけで、ほかに面子や搭子がないとする例。成立時点や形に異説がある。','147m147p147s11234z'],
  ['百万石 ヒャクマンゴク','役満','萬子の清一色で数字の合計が100以上になる形。例は対々和と清一色の形。槓子の数え方に差がある。','777888999m'],
  ['槓振り カンブリ','1翻','他家が槓の直後に捨てた牌をロン。槍槓とは和了する牌が異なる。','4s'],
  ['石の上にも三年 イシノウエニモサンネン','役満','ダブル立直後の海底自摸を役満とする例。通常役ではダブル立直・海底・門前ツモが成立。河底ロンも含むかは卓による。','9p','https://www.jannyumon.jp/yaku/localrule/ishinouenimosannen/']
];
export const entries = [
  ...normal.map(row=>['通常役',...row]),
  ...limits.map(([name,desc,tiles])=>['役満',name,'役満',desc,tiles]),
  ...doubles.map(([name,desc,tiles])=>['ダブル役満',name,'ダブル役満',desc,tiles]),
  ...local.map(row=>['ローカル役',...row])
];
const $ = id => document.getElementById(id);
const fold = value => value.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
// ! marks a called meld. * marks the group whose last tile wins.
export const examples = {
  '立直':'678s 333m 345s 345m 11p',
  'ダブル立直':'789m 444m 678p 456m 66p',
  '一発':'678p 333p 567p 123s 77m',
  '門前清自摸和':'345m 111s 456s 234s 22m',
  '平和':'123m 567p* 345s 678m 22s',
  '断么九':'!234s 345s 456p 678m 22p',
  '一盃口':'123p 123p 456s 789m 22s',
  '役牌':'!555z 123m 456s 789p 22p',
  '海底摸月':'!678s 444p 456p 789s 66m',
  '河底撈魚':'567p 222m 789m 567s 33m',
  '嶺上開花':'!7777m 333s 123m 789s 99m',
  '槍槓':'789p 666s 678s 33s 345p',
  '七対子':'11m 44m 22p 66p 99s 11z 55z',
  '三色同順':'!123m 123p 123s 456m 55p',
  '一気通貫':'123p 456p 789p 234s 55z',
  '混全帯么九':'123p 789s 111m 999p 55z',
  '純全帯么九':'123p 789s 111m 999p 11s',
  '対々和':'!333p !777s 222m 999m 44z',
  '三暗刻':'222p 555s 777m !123m 44z',
  '三槓子':'!1111p !9999s 2222m 456m 55p',
  '三色同刻':'!333m 333p 333s 789p 55z',
  '小三元':'!555z 666z 123m 456p 77z',
  '混老頭':'11m 99m 11p 99p 11s 99s 22z',
  '二盃口':'123p 123p 678s 678s 33z',
  '混一色':'123p 456p 678p 333z 55z',
  '清一色':'!123s 234s 345s 789s 99s',
  '国士無双':'19m 19p 19s 23456z 11z 7z*',
  '四暗刻':'222p* 555s 777m 444z 11z',
  '大三元':'!555z !666z 777z 123m 22p',
  '小四喜':'111z 222z 333z 123p 44z',
  '字一色':'!111z 333z 555z 666z 77z',
  '緑一色':'234s 666s 888s 666z 22s',
  '清老頭':'!111p 999p 111s 999s 11m',
  '四槓子':'!1111p !9999s 1111m 5555z 22p',
  '九蓮宝燈':'111p 23455678p 999p*',
  '天和':'456m 222s 789m 678p 77s',
  '地和':'789m 111p 456p 345m 99p',
  '国士無双十三面待ち':'19m 19p 19s 1234567z 9s*',
  '四暗刻単騎':'333p 666s 888m 555z 22z',
  '純正九蓮宝燈':'111s 2345678s 999s 5s',
  '大四喜':'!111z !222z 333z 444z 55p',
  '手の内一盃口':'123s 123s !456p 789m 55z',
  '燕返し':'567s 444m 234m 789m 55s',
  '三連刻':'!222p 333p 444p 789s 55z',
  '四連刻':'!222s !333s 444s 555s 66m',
  '一色三順':'!234p 234p 234p 456s 55z',
  '大車輪':'22p 33p 44p 55p 66p 77p 88p',
  '大竹林':'22s 33s 44s 55s 66s 77s 88s',
  '大数隣':'22m 33m 44m 55m 66m 77m 88m',
  '人和':'789m 111p 123s 678p 22s',
  '八連荘':'567s 222m 456m 234m 99s',
  'オープン立直':'456s 555s 678s 789s 55p',
  '流し満貫':'19p 19s 123z',
  '十三不塔':'147m 147p 147s 234z 11z',
  '百万石':'!777m !888m 999m 666m 55m',
  '槓振り':'567s 111m 345s 234p 22p',
  '石の上にも三年':'789m 666s 345p 456m 77p'
};
function illustration(name,fragment) {
  const row = document.createElement('div');
  row.className = 'guideTiles';
  const hand = document.createElement('span');
  hand.className = 'guideHand';
  row.append(hand);
  const melds = [];
  const tokens = (examples[name] || fragment).split(' ');
  const concealed = [];
  let winning;
  const marked = tokens.findIndex(token=>token.endsWith('*'));
  const winningIndex = marked<0 ? tokens.length-1 : marked;
  for (const [index,token] of tokens.entries()) {
    const called = token.startsWith('!');
    const tiles = parseHand(token.replace(/^!/,'').replace(/\*$/,''));
    if (!tiles) continue;
    const group = called ? document.createElement('span') : hand;
    if (called) {
      group.className = 'guideMeld';
      group.setAttribute('aria-label','副露');
      melds.push(group);
    }
    for (const [position,tile] of tiles.entries()) {
      let face;
      if (tile>=9 && tile<27) {
        const image = document.createElement('img');
        image.className = 'tile-image';
        image.src = './tiles/'+(tile<18 ? 'Pin' : 'Sou')+rank(tile)+'.svg';
        image.alt = rank(tile)+(tile<18 ? '筒' : '索');
        face = image;
      } else {
        const span = document.createElement('span');
        span.className = tile>=27 ? 'tile honor h'+tile : 'tile';
        span.textContent = tile<9 ? '一二三四五六七八九'[tile] : '東南西北白發中'[tile-27];
        if (tile<9) {
          const suit = document.createElement('i');
          suit.textContent = '萬';
          span.append(suit);
        }
        face = span;
      }
      if (!called && !['流し満貫','十三不塔','天和'].includes(name) && index===winningIndex && position===tiles.length-1) {
        winning = document.createElement('span');
        winning.className = 'guideWin';
        winning.setAttribute('aria-label','アガリ牌');
        winning.append(face);
      } else if (called && position===0) {
        const sideways = document.createElement('span');
        sideways.className = 'guideSideways';
        sideways.append(face);
        group.append(sideways);
      } else {
        if (called) group.append(face);
        else concealed.push({tile,face});
      }
    }
  }
  concealed.sort((a,b)=>a.tile-b.tile);
  for (const {tile,face} of concealed) {
    if (name==='七対子' && hand.lastElementChild?.dataset.tile!==String(tile)) {
      const pair = document.createElement('span');
      pair.className = 'guidePair';
      pair.dataset.tile = tile;
      hand.append(pair);
    }
    (name==='七対子' ? hand.lastElementChild : hand).append(face);
  }
  if (winning) {
    if (name.startsWith('国士無双')) {
      const label = document.createElement('small');
      label.textContent = 'アガリ牌';
      winning.prepend(label);
    }
    row.append(winning);
  }
  row.append(...melds);
  return row;
}
function render() {
  const query = fold($('search').value.trim());
  const type = $('type').value;
  const value = $('value').value;
  const matches = entries.filter(([category,name,han])=>fold(name).includes(query) &&
    (!type || type===category) && (!value || han.split('・').some(part=>part.replace('副露','').replace('など','')===value)));
  const cards = matches.map(([category,name,han,desc,example,source,automatic])=>{
    const detail = document.createElement('details');
    const title = document.createElement('summary');
    const [shortName,reading] = name.split(' ');
    title.textContent = shortName+'（'+reading+'）'+(category==='ローカル役' ? '（ローカル）' : '')+' · '+han;
    const body = document.createElement('p');
    body.textContent = desc;
    detail.append(title,body,illustration(shortName,example));
    if (category==='ローカル役' || category==='ダブル役満') {
      const note = document.createElement('p');
      note.textContent = category==='ダブル役満' ? 'このアプリでは2倍役満として表示。卓の採用ルールを確認してください。' :
        automatic ? '初期OFF。候補が出たときだけカスタムから採用できます。' : '図鑑のみ。自動解析は未対応です。採用条件・翻数は卓で確認してください。';
      detail.append(note);
      if (category==='ローカル役') {
        const link = document.createElement('a');
        link.href = source || 'https://www.jannavi.net/yaku/local_yaku/';
        link.textContent = 'ローカル役の参考資料';
        detail.append(link);
      }
    }
    return detail;
  });
  $('guide').replaceChildren(...(cards.length ? cards : ['該当する役がありません。']));
}
if (typeof document !== 'undefined') {
  for (const id of ['search','type','value']) $(id).addEventListener('input',render);
  render();
}
