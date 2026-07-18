const puppeteer    = require('puppeteer');
const { execSync } = require('child_process');
const fs           = require('fs');
const path         = require('path');

const projects = require('../config/projects');
const pages    = require('../config/pages');

const projectName = process.argv[2];

const project      = projects[projectName];
const projectPages = pages[projectName];

const CAPTURE_WIDTH  = 1440;
const CAPTURE_HEIGHT = 900;
const OUTPUT_DIR     = path.join(__dirname, '..', 'percy-screenshots');

const sleep = ms => new Promise(r => setTimeout(r, ms));

function ensureOutputDir() {
  if (fs.existsSync(OUTPUT_DIR)) fs.rmSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function scrollUntilAllImagesLoaded(page) {
  let previousLoaded = -1;
  let passCount      = 0;

  while (passCount < 5) {
    passCount++;

    await page.evaluate(async () => {
      await new Promise(resolve => {
        const distance = 300, delay = 150;
        let scrolled = 0;
        window.scrollTo(0, 0);
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          scrolled += distance;
          if (scrolled >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, delay);
      });
    });

    await page.waitForNetworkIdle({ idleTime: 1000, timeout: 20000 }).catch(() => {});

    const { total, loaded } = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('img')];
      return {
        total:  imgs.length,
        loaded: imgs.filter(i => i.complete && i.naturalWidth > 0).length,
      };
    });

    console.log(`  scroll pass ${passCount}: ${loaded}/${total} images loaded`);

    if (loaded === previousLoaded || loaded >= total * 0.95) break;
    previousLoaded = loaded;
    await sleep(500);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);

  // Force-load any images still stuck in overflow-hidden containers (e.g. carousels)
  // that scroll-based lazy loading never reached.
  await page.evaluate(async () => {
    const unloaded = [...document.querySelectorAll('img')].filter(i => !i.complete || i.naturalWidth === 0);
    await Promise.all(unloaded.map(img => new Promise(resolve => {
      img.loading = 'eager';
      img.onload  = resolve;
      img.onerror = resolve;
      const src = img.src;
      img.src = '';
      img.src = src;
    })));
  });
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 }).catch(() => {});
}

async function clickContinueIfPresent(page) {
  try {
    // Try buttons with common class first
    const buttons = await page.$$('button.pds-button');
    for (const b of buttons) {
      const txt = await page.evaluate(el => (el.innerText || el.textContent || '').trim(), b).catch(() => '');
        if (txt && txt.toLowerCase().includes('continue')) {
        await b.click().catch(() => {});
        await sleep(500);
        return true;
      }
    }

    // Fallback XPath for buttons containing the text
    const xpath = "//button[contains(normalize-space(.), 'Continue') or contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'continue')]";
    const els = await page.$x(xpath);
      if (els && els.length) {
      await els[0].click().catch(() => {});
      await sleep(500);
      return true;
    }

    // Look inside frames (sandboxed iframes)
    for (const f of page.frames()) {
      try {
        const fb = await f.$('button.pds-button');
        if (fb) {
          const ftxt = await f.evaluate(el => (el.innerText || el.textContent || '').trim(), fb).catch(() => '');
          if (ftxt && ftxt.toLowerCase().includes('continue')) {
            await fb.click().catch(() => {});
            await sleep(500);
            return true;
          }
        }
        const fels = await f.$x(xpath);
        if (fels && fels.length) {
          await fels[0].click().catch(() => {});
          await sleep(500);
          return true;
        }
      } catch (e) {
        // ignore frame errors
      }
    }
  } catch (e) {
    // ignore
  }
  return false;
}

async function capturePage(browser, snapshotName, pagePath) {
  const url  = `${project.baseUrl}${pagePath}`;
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT });

  await page.setRequestInterception(true);
  page.on('request', req => {
    const blocked = ['google-analytics', 'googletagmanager', 'hotjar', 'intercom'];
    blocked.some(b => req.url().includes(b)) ? req.abort() : req.continue();
  });

  try {
    console.log(`Capturing: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    // Helper to retry operations that may fail due to navigation/context loss
    const runWithRetries = async (fn, tries = 3) => {
      for (let i = 0; i < tries; i++) {
        try {
          return await fn();
        } catch (e) {
          const msg = (e && e.message) ? e.message : '';
          if (msg.includes('Execution context was destroyed') || msg.includes('Target closed') || msg.includes('JSHandle')) {
            console.warn(`  Transient error: ${msg.replace(/\n/g, ' ')} -- retrying (${i + 1}/${tries})`);
            await sleep(1000);
            await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 }).catch(() => {});
            continue;
          }
          throw e;
        }
      }
      throw new Error('Operation failed after retries');
    };

    // Attempt to click any "Continue" button that appears (sandbox/modal)
    await runWithRetries(() => clickContinueIfPresent(page)).catch(() => {});
    await runWithRetries(() => scrollUntilAllImagesLoaded(page));
    await page.bringToFront();
    // Try again after bringing to front in case button appears later
    await runWithRetries(() => clickContinueIfPresent(page)).catch(() => {});
    await sleep(300);
    await runWithRetries(() => page.screenshot({
      path:     path.join(OUTPUT_DIR, `${snapshotName}.png`),
      fullPage: true,
    }));
  } catch (err) {
    console.error(`  Failed: ${err.message}`);
  } finally {
    await page.close();
  }
}

(async () => {
  ensureOutputDir();

  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 120000,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  console.log(`\n=== Capturing screenshots for: ${project.name} ===\n`);

  for (const pagePath of projectPages) {
    const name = pagePath === '/' ? 'home' : pagePath.replace(/\//g, '-').replace(/^-|-$/g, '');
    await capturePage(browser, name, pagePath);
  }

  await browser.close();

  console.log(`\n=== Uploading to Percy ===\n`);
  execSync(`npx percy upload ${OUTPUT_DIR}`, {
    stdio: 'inherit',
    env: { ...process.env },
  });

  console.log(`\n=== Done! ===\n`);
})();
