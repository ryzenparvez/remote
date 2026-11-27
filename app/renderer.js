const $ = (id) => document.getElementById(id);
const fmt = (id) => String(id).replace(/(\d{3})(?=\d)/g, '$1 ');
let cfg, ws, pc, dc, localStream, role = null, pendingFrom = null, queue = Promise.resolve(), retryT;

async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
const send = (o) => ws && ws.readyState === 1 && ws.send(JSON.stringify(o));
const setDot = (el, cls) => (el.dataset.s = cls || '');

function setNet(on) {
  setDot($('netDot'), on ? 'on' : 'err');
  $('netText').textContent = on ? 'Online' : 'Offline';
  setDot($('hostDot'), on ? 'on' : 'err');
  $('hostStatus').textContent = on ? 'Ready — waiting for Viewer' : 'Server-এর সাথে connect হচ্ছে…';
}
function setConn(text, cls) { $('connStatus').textContent = text; setDot($('connDot'), cls); }

// ---------- WebSocket ----------
function openWs() {
  ws = new WebSocket(cfg.server);
  ws.onopen = async () => {
    setNet(true);
    send({ type: 'register', id: cfg.id, passHash: await sha(cfg.password) });
  };
  ws.onclose = () => { setNet(false); endSession(false); clearTimeout(retryT); retryT = setTimeout(openWs, 3000); };
  ws.onerror = () => {};
  ws.onmessage = (e) => handle(JSON.parse(e.data));
}

function handle(m) {
  switch (m.type) {
    case 'registered':
      cfg.id = m.id; native.saveId(m.id); $('myId').textContent = fmt(m.id); break;
    case 'incoming':
      pendingFrom = m.from;
      $('modalText').textContent = `ID ${fmt(m.from)} আপনার কম্পিউটার কন্ট্রোল করতে চায়। অনুমতি দেবেন?`;
      $('modal').classList.add('show'); break;
    case 'waiting': setConn('Host-এর অনুমতির অপেক্ষায়…', 'wait'); break;
    case 'accepted': startViewer(); break;
    case 'rejected': role = null; setConn(m.message || 'Rejected', 'err'); break;
    case 'error': role = null; setConn(m.message, 'err'); break;
    case 'ended': $('modal').classList.remove('show'); endSession(false); break;
    case 'signal': queue = queue.then(() => onSignal(m.data)).catch(console.error); break;
  }
}

// ---------- WebRTC ----------
function newPc() {
  const p = new RTCPeerConnection({ iceServers: cfg.ice });
  p.onicecandidate = (e) => e.candidate && send({ type: 'signal', data: { candidate: e.candidate } });
  p.onconnectionstatechange = () => {
    if (p !== pc) return;
    if (p.connectionState === 'failed' || p.connectionState === 'closed') endSession(true);
  };
  return p;
}

async function onSignal(d) {
  if (!pc) return;
  if (d.sdp) {
    await pc.setRemoteDescription(d.sdp);
    if (d.sdp.type === 'offer') {
      const a = await pc.createAnswer();
      await pc.setLocalDescription(a);
      send({ type: 'signal', data: { sdp: pc.localDescription } });
    }
  } else if (d.candidate) {
    try { await pc.addIceCandidate(d.candidate); } catch {}
  }
}

// ---------- Host ----------
async function startHost() {
  try {
    role = 'host';
    localStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
    pc = newPc();
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));
    dc = pc.createDataChannel('input');
    dc.onmessage = (e) => { try { native.input(JSON.parse(e.data)); } catch {} };
    native.session(true);
    $('banner').classList.add('show');
    $('bannerText').textContent = `ID ${fmt(pendingFrom)} আপনার কম্পিউটার কন্ট্রোল করছে`;
    $('hostStatus').textContent = 'Remote session চলছে';
    setDot($('hostDot'), 'wait');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    send({ type: 'signal', data: { sdp: pc.localDescription } });
  } catch (e) { console.error(e); endSession(true); }
}

$('btnAccept').onclick = () => { $('modal').classList.remove('show'); send({ type: 'accept' }); startHost(); };
$('btnReject').onclick = () => { $('modal').classList.remove('show'); send({ type: 'reject' }); };
$('bannerStop').onclick = () => endSession(true);

// ---------- Viewer ----------
$('btnConnect').onclick = () => {
  const to = $('partnerId').value.replace(/\D/g, '');
  if (to.length !== 9) return setConn('৯ ডিজিটের সঠিক ID দিন', 'err');
  if (!$('partnerPass').value) return setConn('Password দিন', 'err');
  role = 'viewer';
  send({ type: 'connect', to, password: $('partnerPass').value });
};
$('btnDisconnect').onclick = () => endSession(true);
$('viewerStop').onclick = () => endSession(true);
$('partnerId').oninput = (e) => (e.target.value = fmt(e.target.value.replace(/\D/g, '').slice(0, 9)));

function startViewer() {
  pc = newPc();
  pc.ontrack = (e) => {
    $('video').srcObject = e.streams[0];
    $('viewer').classList.add('show');
    $('vbar').style.display = 'flex';
    native.viewerMode(true);
    setConn('Connected', 'on');
    $('btnDisconnect').disabled = false;
  };
  pc.ondatachannel = (e) => { dc = e.channel; };
}

const sendInput = (o) => dc && dc.readyState === 'open' && dc.send(JSON.stringify(o));
function norm(e) {
  const v = $('video'), vw = v.videoWidth, vh = v.videoHeight;
  if (!vw) return null;
  const r = v.getBoundingClientRect(), s = Math.min(r.width / vw, r.height / vh), w = vw * s, h = vh * s;
  const ox = r.left + (r.width - w) / 2, oy = r.top + (r.height - h) / 2;
  const c = (n) => Math.min(1, Math.max(0, n));
  return { x: c((e.clientX - ox) / w), y: c((e.clientY - oy) / h) };
}
let moveQ = null;
$('video').addEventListener('mousemove', (e) => {
  const p = norm(e); if (!p) return;
  if (moveQ) { moveQ = p; return; }
  moveQ = p;
  requestAnimationFrame(() => { sendInput({ t: 'move', ...moveQ }); moveQ = null; });
});
$('video').addEventListener('mousedown', (e) => { const p = norm(e); if (p) sendInput({ t: 'move', ...p }); sendInput({ t: 'down', b: e.button }); e.preventDefault(); });
$('video').addEventListener('mouseup', (e) => { sendInput({ t: 'up', b: e.button }); e.preventDefault(); });
$('video').addEventListener('contextmenu', (e) => e.preventDefault());
$('video').addEventListener('wheel', (e) => {
  const dy = Math.sign(e.deltaY) * Math.max(1, Math.round(Math.abs(e.deltaY) / 100));
  sendInput({ t: 'wheel', dy }); e.preventDefault();
}, { passive: false });
const keyH = (down) => (e) => {
  if (role !== 'viewer' || !$('viewer').classList.contains('show')) return;
  sendInput({ t: 'key', down, code: e.code }); e.preventDefault();
};
window.addEventListener('keydown', keyH(true));
window.addEventListener('keyup', keyH(false));

// ---------- End session ----------
function endSession(notify) {
  if (notify) send({ type: 'disconnect' });
  if (pc) { const p = pc; pc = null; try { p.close(); } catch {} }
  if (localStream) { localStream.getTracks().forEach((t) => t.stop()); localStream = null; }
  dc = null; role = null; pendingFrom = null;
  native.session(false);
  $('banner').classList.remove('show');
  $('viewer').classList.remove('show');
  $('vbar').style.display = 'none';
  $('video').srcObject = null;
  $('btnDisconnect').disabled = true;
  setConn('Ready to connect (End-to-end encryption)', '');
  native.viewerMode(false);
  if (ws && ws.readyState === 1) { $('hostStatus').textContent = 'Ready — waiting for Viewer'; setDot($('hostDot'), 'on'); }
}

// ---------- UI ----------
$('copyId').onclick = () => navigator.clipboard.writeText(String(cfg.id || ''));
$('copyPass').onclick = () => navigator.clipboard.writeText(cfg.password);
$('newPass').onclick = async () => {
  cfg.password = await native.newPassword();
  renderPass(cfg.password);
  send({ type: 'set-password', passHash: await sha(cfg.password) });
};

$('saveServer').onclick = async () => {
  const v = $('setServerInp').value.trim(), b = $('saveServer');
  const done = (t) => { b.textContent = t; setTimeout(() => (b.textContent = 'Save'), 1500); };
  if (!/^wss?:\/\/\S+$/i.test(v)) return done('Invalid');
  cfg.server = v; await native.saveServer(v); done('Saved');
  clearTimeout(retryT);
  if (ws) { ws.onclose = null; ws.close(); }
  endSession(false); setNet(false); openWs();
};

(async () => {
  cfg = await native.getConfig();
  renderPass(cfg.password);
  $('setServerInp').value = cfg.server;
  if (cfg.id) $('myId').textContent = fmt(cfg.id);
  openWs();
})();
