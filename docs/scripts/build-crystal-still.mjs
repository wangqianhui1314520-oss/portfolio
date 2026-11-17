#!/usr/bin/env node
// Write the still image of the crystal T shown before the live model loads (and instead of it on narrow screens).
//
// The picture is taken from the real viewer on the work archive, so it matches the live crystal: same model,
// lights and resting pose, on a transparent background, at the viewer's own 1.15 frame. The viewer keeps its
// idle motion while it is photographed (it draws continuously only then), so the pose varies by a degree or two.
// Needs the local preview (`npm run dev`) and a Chrome with remote debugging, for example:
//   chrome --headless=new --remote-debugging-port=9222 --use-angle=d3d11 about:blank
// Usage: node scripts/build-crystal-still.mjs [debugging port = 9222] [site = http://127.0.0.1:4173/]
import {writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'assets/images/tem-crystal.webp');
const [port = '9222', site = 'http://127.0.0.1:4173/'] = process.argv.slice(2);
const WIDTH = 690, HEIGHT = 600, QUALITY = .86;   // twice the largest size the page shows it at
const sleep = ms => new Promise(done => setTimeout(done, ms));

const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {method: 'PUT'})).json();
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((opened, failed) => {socket.onopen = opened; socket.onerror = failed;});
let lastId = 0;
const pending = new Map();
socket.onmessage = event => {
  const message = JSON.parse(event.data), waiting = pending.get(message.id);
  if (!waiting) return;
  pending.delete(message.id);
  if (message.error) waiting.reject(new Error(message.error.message)); else waiting.resolve(message.result);
};
const send = (method, params = {}) => new Promise((resolveCall, reject) => {
  pending.set(++lastId, {resolve: resolveCall, reject});
  socket.send(JSON.stringify({id: lastId, method, params}));
});
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};

try {
  await send('Page.enable');
  // A tab opened in the background stays hidden, and a hidden page never draws its crystal.
  await send('Page.bringToFront');
  await send('Emulation.setDeviceMetricsOverride', {width: 1600, height: 1000, deviceScaleFactor: 1.5, mobile: false});
  await send('Page.navigate', {url: new URL('zh/work/', site).href});
  let ready = false;
  for (let attempt = 0; attempt < 240 && !ready; attempt++) {
    ready = await evaluate(`document.querySelector('[data-tem-viewer]')?.dataset.state === 'ready'`).catch(() => false);
    if (!ready) await sleep(250);
  }
  if (!ready) throw new Error('The crystal viewer did not become ready; is the preview running and WebGL available?');
  // Only the canvas remains, enlarged to the frame the still is cut from.
  await evaluate(`(() => {
    const style = document.createElement('style');
    style.textContent = \`
      html, body {background: transparent !important}
      html::before, html::after, body::before, body::after, body *::before, body *::after {display: none !important}
      body * {visibility: hidden !important}
      [data-tem-viewer] {display: block !important; position: fixed !important; left: 0 !important; top: 0 !important; margin: 0 !important; max-height: none !important}
      [data-tem-canvas] {visibility: visible !important; position: fixed !important; left: 0 !important; top: 0 !important; width: ${WIDTH}px !important; height: ${HEIGHT}px !important; max-width: none !important; opacity: 1 !important}
    \`;
    document.head.append(style);
    return true;
  })()`);
  await sleep(1500);
  await send('Emulation.setDefaultBackgroundColorOverride', {color: {r: 0, g: 0, b: 0, a: 0}});
  await sleep(300);
  const {data} = await send('Page.captureScreenshot', {format: 'png', clip: {x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: 1}});
  const pose = await evaluate(`(() => {const canvas = document.querySelector('[data-tem-canvas]'); return canvas.dataset.modelYaw + ' / ' + canvas.dataset.modelPitch;})()`);
  // Chrome scales the capture down and encodes WebP with its alpha channel; no image library is needed.
  const webp = await evaluate(`(async () => {
    const image = new Image();
    image.src = 'data:image/png;base64,${data}';
    await image.decode();
    const canvas = Object.assign(document.createElement('canvas'), {width: ${WIDTH}, height: ${HEIGHT}});
    const context = canvas.getContext('2d');
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, ${WIDTH}, ${HEIGHT});
    return canvas.toDataURL('image/webp', ${QUALITY}).split(',')[1];
  })()`);
  const bytes = Buffer.from(webp, 'base64');
  if (bytes.subarray(8, 12).toString('latin1') !== 'WEBP') throw new Error('The browser did not return a WebP image.');
  // An empty frame compresses to almost nothing; refuse to overwrite the still with one.
  if (bytes.length < 8 * 1024) throw new Error(`The capture looks empty (${bytes.length} bytes); the still was left unchanged.`);
  writeFileSync(output, bytes);
  console.log(`assets/images/tem-crystal.webp: ${WIDTH}×${HEIGHT}, ${Math.round(bytes.length / 1024)} KB, yaw / pitch ${pose}`);
} finally {
  socket.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`).catch(() => {});
}
