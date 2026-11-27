const { app, BrowserWindow, ipcMain, desktopCapturer, screen, session } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let nut = null;
try {
  nut = require('@nut-tree-fork/nut-js');
  nut.mouse.config.autoDelayMs = 0;
  nut.keyboard.config.autoDelayMs = 0;
} catch (e) { console.error('nut-js load failed (control disabled):', e.message); }

if (!app.requestSingleInstanceLock()) app.quit();

// ---------- config (ID, password, server) ----------
const cfgPath = () => path.join(app.getPath('userData'), 'config.json');
const newPass = () => String(crypto.randomInt(100000, 1000000));
function loadCfg() {
  let c = {};
  try { c = JSON.parse(fs.readFileSync(cfgPath(), 'utf8')); } catch {}
  let changed = false;
  if (!c.password) { c.password = newPass(); changed = true; }
  if (!c.server) { c.server = process.env.NIJER_SERVER || 'ws://localhost:8080'; changed = true; }
  if (!c.ice) { c.ice = [{ urls: 'stun:stun.l.google.com:19302' }]; changed = true; }
  if (changed) saveCfg(c);
  return c;
}
const saveCfg = (c) => fs.writeFileSync(cfgPath(), JSON.stringify(c, null, 2));

ipcMain.handle('config:get', () => loadCfg());
ipcMain.handle('config:newPassword', () => { const c = loadCfg(); c.password = newPass(); saveCfg(c); return c.password; });
ipcMain.handle('config:saveServer', (_e, s) => { const c = loadCfg(); c.server = String(s); saveCfg(c); });
ipcMain.handle('config:saveId', (_e, id) => { const c = loadCfg(); c.id = id; saveCfg(c); });

// ---------- input injection (শুধু session active থাকলে) ----------
let active = false;
ipcMain.on('session', (_e, a) => { active = !!a; });

const SPECIAL = () => {
  const { Key } = nut;
  return {
    Enter: Key.Enter, NumpadEnter: Key.Enter, Backspace: Key.Backspace, Tab: Key.Tab, Escape: Key.Escape, Space: Key.Space,
    ArrowUp: Key.Up, ArrowDown: Key.Down, ArrowLeft: Key.Left, ArrowRight: Key.Right,
    Delete: Key.Delete, Home: Key.Home, End: Key.End, PageUp: Key.PageUp, PageDown: Key.PageDown, Insert: Key.Insert, CapsLock: Key.CapsLock,
    ShiftLeft: Key.LeftShift, ShiftRight: Key.RightShift, ControlLeft: Key.LeftControl, ControlRight: Key.RightControl,
    AltLeft: Key.LeftAlt, AltRight: Key.RightAlt, MetaLeft: Key.LeftSuper, MetaRight: Key.RightSuper,
    Minus: Key.Minus, Equal: Key.Equal, BracketLeft: Key.LeftBracket, BracketRight: Key.RightBracket,
    Semicolon: Key.Semicolon, Quote: Key.Quote, Comma: Key.Comma, Period: Key.Period,
    Slash: Key.Slash, Backslash: Key.Backslash, Backquote: Key.Grave,
  };
};
function mapKey(code) {
  const { Key } = nut;
  let m;
  if ((m = /^Key([A-Z])$/.exec(code))) return Key[m[1]];
  if ((m = /^Digit(\d)$/.exec(code))) return Key['Num' + m[1]];
  if (/^F\d{1,2}$/.test(code)) return Key[code];
  return SPECIAL()[code];
}

ipcMain.on('input', async (_e, ev) => {
  if (!active || !nut) return;
  const { mouse, keyboard, Button, Point } = nut;
  try {
    switch (ev.t) {
      case 'move': {
        const d = screen.getPrimaryDisplay();
        const f = process.platform === 'win32' ? d.scaleFactor : 1;
        await mouse.setPosition(new Point(Math.round(ev.x * d.bounds.width * f), Math.round(ev.y * d.bounds.height * f)));
        break;
      }
      case 'down': await mouse.pressButton([Button.LEFT, Button.MIDDLE, Button.RIGHT][ev.b] ?? Button.LEFT); break;
      case 'up': await mouse.releaseButton([Button.LEFT, Button.MIDDLE, Button.RIGHT][ev.b] ?? Button.LEFT); break;
      case 'wheel': ev.dy > 0 ? await mouse.scrollDown(ev.dy) : await mouse.scrollUp(-ev.dy); break;
      case 'key': {
        const k = mapKey(ev.code);
        if (k === undefined) return;
        ev.down ? await keyboard.pressKey(k) : await keyboard.releaseKey(k);
        break;
      }
    }
  } catch (e) { /* ignore */ }
});

// viewer হলে full screen; শেষ হলে আগের সাইজে (1280x720) ফেরে
ipcMain.on('viewer', (e, on) => {
  const w = BrowserWindow.fromWebContents(e.sender); if (w) w.setFullScreen(!!on);
});

// ---------- window ----------
function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 960, minHeight: 600, useContentSize: true,
    title: 'Furqan Cloud Remote Access', icon: path.join(__dirname, 'build', 'icon.png'), autoHideMenuBar: true, backgroundColor: '#eef2f8',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  // getDisplayMedia() চাইলে পুরো primary screen দেওয়া হবে
  session.defaultSession.setDisplayMediaRequestHandler(async (_req, cb) => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    cb({ video: sources[0] });
  });
  createWindow();
});
app.on('window-all-closed', () => app.quit());
