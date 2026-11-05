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

  const press = name => page.getByRole('button',{name,exact:true}).press('Enter');
  async function choose(slot,suit,tile,shape) {
    await press(slot+' 未選択');
    await press(suit);
    await press(tile);
    if (shape) {
      await press(shape);
      await press('門前');
    }
  }
  await choose('雀頭','索子','2索');
  await choose('面子1','筒子','1筒','1筒 2筒 3筒');
  await choose('面子2','筒子','1筒','1筒 2筒 3筒');
  await choose('面子3','索子','4索','4索 5索 6索');
  await choose('面子4','萬子','7萬','7萬 8萬 9萬');
  await page.locator('#win').press('Enter');
  await press('6索 · 面子3');
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
