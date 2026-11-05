import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateScore, calculateFu, choices, fits, winningTiles} from './score.mjs';

const score = settings => calculateScore({fu:30,han:1,dealer:false,ron:true,counted:true,...settings});
const table = [
  [30,1,1000,1500,[500,300,300],500],
  [30,2,2000,2900,[1000,500,500],1000],
  [30,3,3900,5800,[2000,1000,1000],2000],
  [30,4,7700,11600,[3900,2000,2000],3900],
  [40,3,5200,7700,[2600,1300,1300],2600],
  [60,3,7700,11600,[3900,2000,2000],3900],
  [25,2,1600,2400,[800,400,400],800],
  [50,2,3200,4800,[1600,800,800],1600],
  [20,2,null,null,[700,400,400],700],
  [40,4,8000,12000,[4000,2000,2000],4000],
];
for (const [fu,han,child,parent,tsumo,all] of table) {
  test(`${fu}符${han}翻 点数表`, () => {
    if (child !== null) {
      assert.equal(score({fu,han}).total,child);
      assert.equal(score({fu,han,dealer:true}).total,parent);
    }
    assert.deepEqual(score({fu,han,ron:false}).payments,tsumo);
    assert.deepEqual(score({fu,han,ron:false,dealer:true}).payments,[all,all,all]);
  });
}
test('満貫境界と切り上げ', () => {
  assert.equal(score({han:4,kiriage:true}).total,8000);
  assert.equal(score({fu:60,han:3,kiriage:true}).total,8000);
  assert.equal(score({fu:70,han:3}).total,8000);
  assert.equal(score({fu:20,han:5}).total,8000);
});
test('跳満から複数役満まで', () => {
  for (const [han,limit,total] of [[6,'跳満',12000],[8,'倍満',16000],[11,'三倍満',24000],[13,'数え役満',32000]]) {
    assert.equal(score({han}).limit,limit);
    assert.equal(score({han}).total,total);
  }
  assert.equal(score({han:13,counted:false}).total,24000);
  assert.equal(score({yakuman:2,dealer:true}).total,96000);
});
test('本場と供託', () => {
  assert.deepEqual(score({ron:false,honba:2,sticks:1}).payments,[700,500,500]);
  assert.equal(score({ron:false,honba:2,sticks:1}).total,2700);
  assert.equal(score({honba:2,sticks:1}).total,2600);
});
test('翻と符の入力制約', () => {
  assert.equal(score({han:0}),null);
  assert.equal(score({han:1.5}),null);
  assert.equal(score({fu:23}),null);
});
const head = tile => ({kind:'pair',tiles:[tile,tile]});
const seq = (start,open=false) => ({kind:'sequence',tiles:[start,start+1,start+2],open});
const set = (tile,kind,open=false) => ({kind,tiles:Array(kind==='kan'?4:3).fill(tile),open});
const groups = [head(5),seq(0),seq(9),seq(18),seq(24)];
const fu = settings => calculateFu({groups,win:{slot:1,tile:0},ron:false,round:27,seat:28,doubleWind:4,pinfu:true,...settings});
test('平和ツモと門前ロン', () => {
  assert.equal(fu().fu,20);
  assert.equal(fu({ron:true}).fu,30);
  assert.equal(fu({pinfu:false}).fu,30);
});
test('副露した平和形', () => {
  const open = [...groups.slice(0,4),seq(24,true)];
  assert.equal(fu({groups:open,ron:true}).fu,30);
  assert.equal(fu({groups:open}).fu,30);
  assert.equal(fu({groups:open}).eligible,false);
});
test('単騎、嵌張、辺張、両面', () => {
  for (const [slot,tile,wait,waitFu] of [[0,5,'単騎',2],[1,1,'嵌張',2],[1,2,'辺張',2],[4,24,'辺張',2],[4,26,'両面',0]]) {
    const result=fu({win:{slot,tile}});
    assert.equal(result.wait,wait);
    assert.equal(result.waitFu,waitFu);
  }
});
test('連風牌と三元牌', () => {
  const winds = [head(27),...groups.slice(1)];
  assert.equal(fu({groups:winds,seat:27}).pairFu,4);
  assert.equal(fu({groups:winds,seat:27,doubleWind:2}).pairFu,2);
  assert.equal(fu({groups:winds}).eligible,false);
  assert.equal(fu({groups:[head(31),...groups.slice(1)]}).pairFu,2);
});
test('槓子と刻子の加符', () => {
  const melds=[head(5),seq(0),set(31,'kan'),set(11,'kan',true),set(9,'triplet')];
  assert.equal(fu({groups:melds}).meldFu,48);
  assert.equal(fu({groups:melds,win:{slot:4,tile:9},ron:true}).meldFu,44);
  assert.equal(fu({groups:[head(5),seq(0),seq(9),seq(18),set(31,'triplet')],win:{slot:4,tile:31},ron:true}).winFu,10);
});
test('同じ牌の完成先と牌の上限', () => {
  const ambiguous=[head(0),...groups.slice(1)];
  assert.deepEqual(winningTiles(ambiguous).filter(item=>item.tile===0),[{slot:0,tile:0},{slot:1,tile:0}]);
  assert.equal(fu({groups:ambiguous,win:{slot:0,tile:0}}).fu,30);
  assert.equal(fu({groups:ambiguous}).fu,20);
  assert.equal(fits(ambiguous,set(0,'triplet'),4),false);
  assert.equal(choices(27,false).length,2);
  assert.deepEqual(choices(3,false).map(group=>group.tiles.map(n=>n+1).join('')),['234','345','456','444','4444']);
  assert.equal(fu({win:{slot:0,tile:0}}),null);
});
