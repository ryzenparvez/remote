// Furqan Cloud Remote Access - Signaling Server
// কাজ: ID দেওয়া, password যাচাই, host-এর অনুমতি নেওয়া, WebRTC signal relay করা।
// স্ক্রিন/মাউস/কিবোর্ড ডাটা server দিয়ে যায় না - সরাসরি peer-to-peer (WebRTC)।
const { WebSocketServer } = require('ws');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });
const clients = new Map(); // id -> client

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const send = (ws, o) => ws && ws.readyState === 1 && ws.send(JSON.stringify(o));
const err = (ws, message) => send(ws, { type: 'error', message });

function genId() {
  let id;
  do { id = String(crypto.randomInt(100000000, 1000000000)); } while (clients.has(id));
  return id;
}

// সেশন বা pending request শেষ করা
function leave(c) {
  if (!c) return;
  if (c.peer) {
    const o = clients.get(c.peer);
    if (o) { o.peer = null; send(o.ws, { type: 'ended' }); }
    c.peer = null;
  }
  if (c.target) { // viewer অনুমতির অপেক্ষায় ছিল
    const h = clients.get(c.target);
    if (h && h.pending === c.id) { clearTimeout(h.timer); h.pending = null; send(h.ws, { type: 'ended' }); }
    c.target = null;
  }
}

wss.on('connection', (ws) => {
  let me = null;
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));

  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }

    switch (m.type) {
      case 'register': {
        const want = String(m.id || '');
        const id = /^\d{9}$/.test(want) && !clients.has(want) ? want : genId();
        me = { id, ws, passHash: String(m.passHash || ''), peer: null, pending: null, target: null, timer: null, fails: 0, lockUntil: 0 };
        clients.set(id, me);
        send(ws, { type: 'registered', id });
        break;
      }
      case 'set-password':
        if (me) me.passHash = String(m.passHash || '');
        break;

      case 'connect': { // viewer -> host
        if (!me) return;
        const t = clients.get(String(m.to));
        if (t === me) return err(ws, 'নিজের সাথে connect করা যাবে না');
        if (!t) return err(ws, 'ID পাওয়া যায়নি বা অফলাইন');
        if (Date.now() < t.lockUntil) return err(ws, 'অনেকবার ভুল পাসওয়ার্ড, কিছুক্ষণ পর চেষ্টা করুন');
        if (t.peer || t.pending || me.peer || me.target) return err(ws, 'Busy - অন্য সেশন চলছে');
        if (sha(m.password) !== t.passHash) {
          if (++t.fails >= 5) { t.lockUntil = Date.now() + 60000; t.fails = 0; }
          return err(ws, 'ভুল পাসওয়ার্ড');
        }
        t.fails = 0;
        t.pending = me.id; me.target = t.id;
        t.timer = setTimeout(() => {
          if (t.pending === me.id) {
            t.pending = null; me.target = null;
            send(t.ws, { type: 'ended' });
            send(ws, { type: 'rejected', message: 'Host সাড়া দেয়নি' });
          }
        }, 30000);
        send(t.ws, { type: 'incoming', from: me.id });
        send(ws, { type: 'waiting' });
        break;
      }
      case 'accept': { // host অনুমতি দিল
        if (!me || !me.pending) return;
        const v = clients.get(me.pending);
        clearTimeout(me.timer); me.pending = null;
        if (!v) return;
        v.target = null; me.peer = v.id; v.peer = me.id;
        send(v.ws, { type: 'accepted' });
        break;
      }
      case 'reject': {
        if (!me || !me.pending) return;
        const v = clients.get(me.pending);
        clearTimeout(me.timer); me.pending = null;
        if (v) { v.target = null; send(v.ws, { type: 'rejected', message: 'Host অনুমতি দেয়নি' }); }
        break;
      }
      case 'signal': { // WebRTC offer/answer/ice relay
        if (!me || !me.peer) return;
        const o = clients.get(me.peer);
        if (o) send(o.ws, { type: 'signal', data: m.data });
        break;
      }
      case 'disconnect':
        leave(me);
        break;
    }
  });

  ws.on('close', () => {
    if (!me) return;
    leave(me);
    if (clients.get(me.id) === me) clients.delete(me.id);
  });
});

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false; ws.ping();
  });
}, 25000);

console.log(`Furqan Cloud Remote Access signaling server running on port ${PORT}`);
