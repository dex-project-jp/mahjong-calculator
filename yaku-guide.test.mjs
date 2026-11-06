import assert from 'node:assert/strict';
import test from 'node:test';
import {analyze,parseHand} from './yaku.mjs';
import {entries,examples} from './yaku-guide.mjs';

const circumstances={
 '立直':{reach:1},'ダブル立直':{reach:2},'一発':{reach:1,ippatsu:true},'門前清自摸和':{ron:false},
 '海底摸月':{ron:false,event:'haitei'},'河底撈魚':{event:'houtei'},'嶺上開花':{ron:false,event:'rinshan'},
 '槍槓':{event:'chankan'},'四暗刻':{ron:false},'天和':{ron:false,dealer:true,seat:27,event:'tenhou'},
 '地和':{ron:false,event:'chiihou'},'手の内一盃口':{local:true},'石の上にも三年':{reach:2,ron:false,event:'haitei'}
};
const extras = {
  '一発':['立直'],'小三元':['役牌・發','役牌・白'],'混老頭':['七対子'],
  '二盃口':['七対子'],'四連刻':['対々和','断么九'],'百万石':['対々和','清一色'],
  '石の上にも三年':['ダブル立直','海底摸月','門前清自摸和'],
};
for (const name of ['大車輪','大竹林','大数隣']) extras[name]=['七対子','断么九','清一色','二盃口','平和'];

const seen = new Set();
for (const [category,label] of entries) {
  const [name,reading] = label.split(' ');
  test('図鑑 '+name,()=>{
    assert.match(reading,/^[ァ-ヶー]+$/);
    const tokens = examples[name].split(' ');
    const piles = tokens.map(t=>parseHand(t.replace(/[!*]/g,'')));
    const explicit = tokens.findIndex(t=>t.endsWith('*'));
    const winningIndex = explicit<0 ? tokens.length-1 : explicit;
    const last = piles[winningIndex].at(-1);
    const all = parseHand(tokens.join('').replace(/[!*]/g,''));
    assert.ok(all,'各牌は最大4枚');
    const signature = [...all].sort((a,b)=>a-b).join();
    assert.ok(!seen.has(signature),'牌姿は役ごとに異なる');
    seen.add(signature);
    if (name==='流し満貫') {
      assert.ok(all.every(t=>t>=27 || [0,8].includes(t%9)));
      return;
    }
    const kans = ['三槓子','四槓子','嶺上開花'].includes(name) ? piles.filter(t=>t.length===4).length : 0;
    assert.equal(all.length,14+kans);
    if (name==='十三不塔') {
      const unique=[...new Set(all)].sort((a,b)=>a-b);
      assert.equal(unique.length,13);
      assert.ok(unique.every((t,i)=>t>=27 || i===0 || Math.floor(t/9)!==Math.floor(unique[i-1]/9) || t-unique[i-1]>2));
      return;
    }
    assert.ok(!tokens[winningIndex].startsWith('!'));
    const input={ron:true,round:27,seat:28,dora:{},doubleWind:4,...circumstances[name]};
    if (tokens.some(t=>t.startsWith('!')) || kans) {
      const shapes=piles.map((tiles,i)=>({
        kind:tiles.length===2?'pair':tiles.length===4?'kan':tiles[0]===tiles[1]?'triplet':'sequence',
        tiles,open:tokens[i].startsWith('!')
      }));
      const pair=shapes.find(g=>g.kind==='pair');
      const groups=[pair,...shapes.filter(g=>g!==pair)];
      Object.assign(input,{groups,win:{tile:last,slot:groups.indexOf(shapes[winningIndex])}});
    } else Object.assign(input,{hand:all,last});
    const results = analyze(input);
    assert.ok(results.length,'和了形が存在する');
    const target = name==='役牌' ? '役牌・白' : name;
    const supported = category!=='ローカル役' || name==='手の内一盃口';
    if (supported) assert.ok(results.some(r=>r.roles.some(y=>y.name===target)),'対象役が成立する');
    for (const {roles} of results) for (const {name:role} of roles) {
      assert.ok(role===target || extras[name]?.includes(role),'意図しない複合役 '+role);
    }
    if (name==='平和') assert.ok(results.some(r=>r.wait==='両面'));
    if (name.startsWith('国士無双')) {
      const before=[...all];
      before.splice(before.indexOf(last),1);
      assert.equal(new Set(before).size,name==='国士無双' ? 12 : 13);
    }
    if (name==='槍槓') assert.equal(all.filter(t=>t===last).length,1);
  });
}
