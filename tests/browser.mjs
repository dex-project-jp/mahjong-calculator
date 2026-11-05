// Start a static server at the repository root, then run with Playwright installed:
// node tests/browser.mjs http://localhost:8000/
import assert from 'node:assert/strict';
import {chromium, devices} from 'playwright';

const browser = await chromium.launch();
try {
  const page = await browser.newPage({...devices['iPhone 13'], defaultBrowserType:'chromium'});
  const errors = [];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.argv[2] ?? 'http://localhost:8000/');
  const apply = page.getByRole('button',{name:'翻数に適用',exact:true});
  await page.locator('#analysis > summary').click();
  await apply.waitFor({state:'visible'});
  assert.equal(await apply.isEnabled(),false);
  assert.match(await page.locator('#yakuResults').innerText(),/雀頭.*面子4.*アガリ牌/);

  const grid = page.locator('#pickerBody .pickerGrid button');
  async function choose(slot,suit,tile,shape) {
    await page.locator('#groups button').nth(slot).click();
    await grid.nth(suit).click();
    await grid.nth(tile).click();
    if (slot) {
      await grid.nth(shape).click();
      await grid.first().click();
    }
  }
  await choose(0,2,1);
  await choose(1,1,0,0);
  await choose(2,1,0,0);
  await choose(3,2,3,2);
  await choose(4,0,6,2);
  await page.locator('#win').click();
  await page.getByRole('button',{name:'6索 · 面子3',exact:true}).click();
  await page.locator('#yakuResults').getByText('2翻 · 30符',{exact:true}).waitFor();
  assert.match(await page.locator('#yakuResults').innerText(),/平和 1翻.*一盃口 1翻/);
  assert.equal(await page.locator('#han').inputValue(),'');
  await apply.click();
  assert.equal(await page.locator('#han').inputValue(),'2');
  assert.match(await page.locator('#result').innerText(),/2,000/);
  await page.locator('#reach').selectOption('1');
  await page.locator('#yakuResults').getByText('3翻 · 30符',{exact:true}).waitFor();
  assert.equal(await page.locator('#han').inputValue(),'2');

  await page.getByRole('tab',{name:'麻雀役図鑑'}).click();
  await page.getByRole('tabpanel',{name:'麻雀役図鑑'}).getByText('平和 · 1翻',{exact:true}).waitFor();
  await page.getByRole('tab',{name:'点数計算'}).click();
  assert.equal(await page.locator('#han').inputValue(),'2');
  assert.match(await page.locator('#win').innerText(),/6索/);
  await page.locator('#han').fill('4');
  assert.match(await page.locator('#result').innerText(),/7,700/);
  assert.deepEqual(errors,[]);
} finally {
  await browser.close();
}
