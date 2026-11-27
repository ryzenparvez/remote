(function () {
  const $ = (id) => document.getElementById(id);
  const KEY = 'nr_devices';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const save = (l) => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch {} };
  const digits = (s) => String(s).replace(/\D/g, '');
  const fmt = (id) => String(id).replace(/(\d{3})(?=\d)/g, '$1 ');
  let pw = '', show = false;

  window.renderPass = (p) => {
    if (p !== undefined) pw = p;
    $('myPass').textContent = show ? pw : '*** ***';
    $('eye').className = show ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
  };
  $('eyeBtn').onclick = () => { show = !show; window.renderPass(); };

  function page(n) {
    document.querySelectorAll('.page').forEach((p) => p.classList.toggle('on', p.id === 'pg-' + n));
    document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b.dataset.p === n));
    if (n === 'list') drawList();
  }
  document.querySelectorAll('nav button').forEach((b) => (b.onclick = () => page(b.dataset.p)));

  function syncStar() {
    const id = digits($('partnerId').value);
    $('star').innerHTML = '<i class="fa-' + (load().includes(id) ? 'solid' : 'regular') + ' fa-star"></i>';
  }
  function drawDD() {
    const l = load();
    $('dd').innerHTML = l.length ? l.map((d) => '<div data-id="' + d + '">' + fmt(d) + '</div>').join('') : '<div style="color:#94a3b8;cursor:default">No saved devices</div>';
  }
  function drawList() {
    const l = load();
    $('devList').innerHTML = l.length
      ? l.map((d) => '<div class="dev"><i class="fa-solid fa-desktop"></i><span>' + fmt(d) + '</span><button class="mini" data-id="' + d + '">Connect</button><button class="ib" data-del="' + d + '"><i class="fa-solid fa-trash"></i></button></div>').join('')
      : '<p class="empty">কোনো saved device নেই। ID লিখে ★ চাপলে এখানে জমা হবে।</p>';
  }
  function pick(id) { $('partnerId').value = fmt(id); $('dd').classList.remove('show'); syncStar(); page('remote'); }
  $('star').onclick = () => {
    const id = digits($('partnerId').value); if (id.length !== 9) return;
    let l = load(); l = l.includes(id) ? l.filter((x) => x !== id) : [...l, id]; save(l); syncStar(); drawDD();
  };
  $('chev').onclick = () => { drawDD(); $('dd').classList.toggle('show'); };
  $('dd').onclick = (e) => { const id = e.target.dataset && e.target.dataset.id; if (id) pick(id); };
  $('devList').onclick = (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.id) pick(t.dataset.id);
    if (t.dataset.del) { save(load().filter((x) => x !== t.dataset.del)); drawList(); }
  };
  $('partnerId').addEventListener('input', syncStar);
  $('newPass2').onclick = () => $('newPass').click();
  document.addEventListener('click', (e) => { if (!e.target.closest('.inp')) $('dd').classList.remove('show'); });
})();
