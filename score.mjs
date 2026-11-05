export const tiles = Array.from({length:34}, (_, i) => i);
export const rank = tile => tile % 9 + 1;
const honor = tile => tile >= 27;
const terminal = tile => honor(tile) || [1,9].includes(rank(tile));

export function fits(groups, candidate, slot) {
  const counts = Array(34).fill(0);
  return [...groups.filter((_, i) => i !== slot), candidate].every(
    group => !group || group.tiles.every(tile => ++counts[tile] <= 4)
  );
}

export function choices(tile, pair) {
  if (pair) return [{kind:'pair', tiles:[tile,tile]}];
  const sequences = honor(tile) ? [] : [-2,-1,0].flatMap(offset => {
    const start = tile + offset;
    return rank(tile) + offset >= 1 && rank(tile) + offset <= 7
      ? [{kind:'sequence',tiles:[start,start+1,start+2]}] : [];
  });
  return [...sequences, ...[3,4].map(length => ({
    kind:length === 3 ? 'triplet' : 'kan', tiles:Array(length).fill(tile)
  }))];
}

export function winningTiles(groups) {
  return groups.flatMap((group, slot) => !group || group.open || group.kind === 'kan'
    ? [] : [...new Set(group.tiles)].map(tile => ({slot,tile})));
}

export function calculateFu({groups, win, ron, round, seat, doubleWind, pinfu}) {
  if (groups.length !== 5 || !groups.every(Boolean) || !win ||
      !winningTiles(groups).some(item => item.slot === win.slot && item.tile === win.tile)) return null;
  const closed = groups.every(group => !group.open);
  const head = groups[0].tiles[0];
  const pairFu = head >= 31 ? 2 : head === round && head === seat ? doubleWind
    : head === round || head === seat ? 2 : 0;
  const group = groups[win.slot];
  let wait = {pair:'単騎',triplet:'双碰',sequence:'両面'}[group.kind];
  if (group.kind === 'sequence') {
    if (win.tile === group.tiles[1]) wait = '嵌張';
    else if ((rank(group.tiles[0]) === 1 && win.tile === group.tiles[2]) ||
             (rank(group.tiles[0]) === 7 && win.tile === group.tiles[0])) wait = '辺張';
  }
  const waitFu = ['単騎','嵌張','辺張'].includes(wait) ? 2 : 0;
  const eligible = closed && !pairFu && wait === '両面' &&
    groups.slice(1).every(item => item.kind === 'sequence');
  const meldFu = groups.slice(1).reduce((sum, item, index) => {
    if (item.kind === 'sequence') return sum;
    const open = item.open || (ron && win.slot === index + 1 && item.kind === 'triplet');
    return sum + (item.kind === 'kan' ? 8 : 2) * (open ? 1 : 2) *
      (terminal(item.tiles[0]) ? 2 : 1);
  }, 0);
  const winFu = ron ? (closed ? 10 : 0) : (eligible && pinfu ? 0 : 2);
  const raw = 20 + pairFu + meldFu + waitFu + winFu;
  return {fu: !closed && raw === 20 ? 30 : Math.ceil(raw / 10) * 10,
    raw, eligible, wait, pairFu, meldFu, waitFu, winFu};
}

export function calculateScore({fu, han, dealer, ron, kiriage, counted, yakuman = 0, honba = 0, sticks = 0}) {
  const valid = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
  if (!valid(yakuman,0,10) || !valid(honba,0,999) || !valid(sticks,0,999) ||
      (!yakuman && (!valid(han,1,99) || !(fu === 25 || (valid(fu,20,170) && fu % 10 === 0))))) return null;
  let base, limit = '';
  if (yakuman) { base = 8000 * yakuman; limit = yakuman === 1 ? '役満' : yakuman + '倍役満'; }
  else if (han >= 13 && counted) { base = 8000; limit = '数え役満'; }
  else if (han >= 11) { base = 6000; limit = '三倍満'; }
  else if (han >= 8) { base = 4000; limit = '倍満'; }
  else if (han >= 6) { base = 3000; limit = '跳満'; }
  else {
    base = fu * 2 ** (han + 2);
    if (han >= 5 || base >= 2000 || (kiriage && base === 1920)) { base = 2000; limit = '満貫'; }
  }
  const pay = multiplier => Math.ceil(base * multiplier / 100) * 100;
  const payments = ron ? [pay(dealer ? 6 : 4) + 300 * honba]
    : dealer ? Array(3).fill(pay(2) + 100 * honba)
    : [pay(2) + 100 * honba, ...Array(2).fill(pay(1) + 100 * honba)];
  return {limit, payments, total:payments.reduce((sum, amount) => sum + amount, 0) + sticks * 1000};
}
