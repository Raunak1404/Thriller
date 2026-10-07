// Opens the player in headless Chromium in capture mode.
import { chromium } from 'playwright';
import { startServer } from '../serve.js';

export async function openEpisode({ episode = 'ep01', scale = 1, port = 8000 + Math.floor(Math.random() * 900) } = {}) {
  const server = await startServer(port);
  const launch = { args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] };
  if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(launch);
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('[console]', m.text()));
  await page.goto(`http://127.0.0.1:${port}/player/?render=1&episode=${episode}&scale=${scale}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const duration = await page.evaluate(() => window.__episode.duration);
  return {
    page,
    duration,
    async frame(t, type = 'image/jpeg', quality = 0.92) {
      const url = await page.evaluate(([t, type, q]) => window.__episode.frame(t, type, q), [t, type, quality]);
      return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    },
    async close() {
      await browser.close();
      server.close();
    },
  };
}
