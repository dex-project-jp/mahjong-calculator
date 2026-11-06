import test from 'node:test';
import assert from 'node:assert/strict';
import {analyze,availableConditions,parseHand} from './yaku.mjs';
const base = {round:27,seat:28,ron:true,dealer:false,reach:0,dora:{},doubleWind:4};
function full(text,options={}) {
  const hand=parseHand(text);
  return analyze({...base,...options,hand,last:hand.at(-1)});
}
const role = (result,name) => result.roles.find(r=>r.name===name);
const group = (kind,text,open=false) => ({kind,tiles:parseHand(text),open});
test('門前の両面だけ平和が成立し、嵌張は成立しない',()=>{
  assert.ok(full('23455m456p45678s 9s').some(r=>role(r,'平和')));
  assert.ok(full('23455m456p45679s 8s').every(r=>!role(r,'平和')));
});
test('二盃口と七対子を別解として比較し一盃口を加算しない',()=>{
  const results=full('1122334455667p 7p');
  const two=results.find(r=>role(r,'二盃口'));
  assert.ok(two && !role(two,'一盃口') && !role(two,'七対子'));
  assert.ok(results.some(r=>role(r,'七対子') && r.fu===25));
});
test('副露三色・手の内一盃口の任意採用・ドラの制約',()=>{
  const groups=[group('pair','55z'),group('sequence','123p'),group('sequence','123p'),
    group('sequence','123s',true),group('sequence','123m')];
  const input={...base,groups,win:{tile:11,slot:2},reach:2,ippatsu:true,dora:{'裏ドラ':3,'ドラ':1}};
  const [standard]=analyze(input);
  const [withLocal]=analyze({...input,local:true});
  assert.equal(role(standard,'三色同順').han,1);
  assert.equal(standard.detected[0].name,'手の内一盃口');
  assert.equal(role(withLocal,'手の内一盃口').han,1);
  for (const name of ['一盃口','ダブル立直','一発','裏ドラ']) assert.ok(!role(withLocal,name));
  assert.equal(role(withLocal,'ドラ').han,1);
});
test('十三面国士と純正九蓮は2倍で通常役を加算しない',()=>{
  assert.deepEqual(full('19m19p19s1234567z 1m')[0].roles,[{name:'国士無双十三面待ち',multiple:2}]);
  assert.deepEqual(full('119m19p19s123456z 7z')[0].roles,[{name:'国士無双',multiple:1}]);
  assert.ok(full('1112345678999p 5p').every(r=>r.multiple===2 && role(r,'純正九蓮宝燈')));
});
test('四暗刻単騎と大四喜を複合し字一色も加算する',()=>{
  const [r]=full('1112223334445z 5z');
  assert.equal(r.multiple,5);
  assert.ok(role(r,'四暗刻単騎') && role(r,'大四喜') && role(r,'字一色'));
});
test('ロンで完成する刻子は暗刻に数えない',()=>{
  const [r]=full('11122233344m55p 4m');
  assert.equal(r.multiple,0);
  assert.ok(role(r,'三暗刻'));
});
test('ドラだけでは役が成立せず、矛盾する状況も加算しない',()=>{
  const [r]=full('12355m345p45689s 7s',{event:'rinshan',dora:{'ドラ':3}});
  assert.equal(r.valid,false);
  assert.equal(r.han,0);
  assert.ok(!availableConditions({closed:true,ron:true,dealer:true,reach:0,kan:true}).includes('tenhou'));
  assert.equal(parseHand('11111m'),null);
});

test('刻子入力と順子入力を同じ牌集合として比較する',()=>{
  const pair=group('pair','55p');
  const fourth=group('sequence','789s');
  const triplets=['222m','333m','444m'].map(t=>group('triplet',t));
  const sequences=Array.from({length:3},()=>group('sequence','234m'));
  for (const ron of [true,false]) {
    const evaluate = melds => analyze({...base,ron,groups:[pair,...melds,fourth],win:{tile:1,slot:1}});
    const results=evaluate(triplets);
    assert.deepEqual(results,evaluate(sequences));
    const triplet=results.find(r=>r.groups[1]?.kind==='triplet');
    assert.equal(Boolean(role(triplet,'三暗刻')),!ron);
    assert.equal(triplet.wait,'双碰');
    assert.ok(results.some(r=>role(r,'一盃口') && r.wait==='両面'));
  }
  const open=group('sequence','789s',true);
  const results=analyze({...base,groups:[pair,...sequences,open],win:{tile:13,slot:0}});
  assert.ok(results.some(r=>role(r,'三暗刻')));
  assert.ok(results.every(r=>r.groups.includes(open)));
});

test('面子入力でも同じ牌の七対子を比較する',()=>{
  const groups=[group('pair','77p'),...['123p','123p','456p','456p'].map(t=>group('sequence',t))];
  const results=analyze({...base,groups,win:{tile:15,slot:0}});
  assert.ok(results.some(r=>role(r,'七対子') && r.fu===25));
  assert.ok(results.some(r=>role(r,'二盃口')));
});
