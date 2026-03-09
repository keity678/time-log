'use strict';

/* ---------- DOM refs ---------- */
const $ = (sel) => document.querySelector(sel);

const clientSel = $('#clientSelect');
const clientNew = $('#clientNew');
const addClientBtn = $('#addClientBtn');
const workDate = $('#workDate');
const startTimeEl = $('#startTime');
const endTimeEl = $('#endTime');
const calcValue = $('#calcValue');
const saveBtn = $('#saveBtn');
const resetBtn = $('#resetBtn');
const timerEl = $('#timer');
const startBtn = $('#startBtn');
const stopSaveBtn = $('#stopSaveBtn');
const memoEl = $('#memo');
const reloadBtn = $('#reloadBtn');
const logsTbody = $('#logsTbody');
const logCards = $('#logCards');
const statusEl = $('#status');

// File upload
const fileInput = $('#fileInput');
const fileDropArea = $('#fileDropArea');
const fileNameEl = $('#fileName');
const summarizeBtn = $('#summarizeBtn');
const summarizeBtnText = $('#summarizeBtnText');

/* ---------- helpers ---------- */
function setToday() {
  if (!workDate) return;
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  workDate.value = `${yyyy}-${mm}-${dd}`;
}

function fmt(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function esc(str) {
  return (str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function minutesToLabel(min) {
  const n = Number(min || 0);
  if (n < 60) return `${n}分`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h}h ${m}分` : `${h}h`;
}

function setStatus(t, cls) {
  if (!statusEl) return;
  statusEl.textContent = t || '';
  statusEl.className = 'status-bar' + (cls ? ' ' + cls : '');
}

function setTimer(ms) {
  if (timerEl) timerEl.textContent = fmt(ms);
}

function getSelectedClient() {
  return (clientSel?.value || '').trim();
}

/* ---------- Time range auto-calc ---------- */
function calcMinutes() {
  const s = startTimeEl?.value || '';
  const e = endTimeEl?.value || '';
  if (!s || !e) {
    if (calcValue) calcValue.textContent = '—';
    return 0;
  }

  const [sh, sm] = s.split(':').map(Number);
  const [eh, em] = e.split(':').map(Number);
  let minutes = (eh * 60 + em) - (sh * 60 + sm);

  // 日跨ぎ対応（例: 22:00 → 02:00 = 4h）
  if (minutes < 0) minutes += 24 * 60;

  const hours = (minutes / 60).toFixed(1);
  if (calcValue) calcValue.textContent = `${hours}h（${minutes}分）`;
  return minutes;
}

if (startTimeEl) startTimeEl.addEventListener('change', calcMinutes);
if (endTimeEl) endTimeEl.addEventListener('change', calcMinutes);

/* ---------- File upload ---------- */
if (fileInput) {
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
      if (fileNameEl) fileNameEl.textContent = file.name;
      if (fileDropArea) fileDropArea.classList.add('has-file');
      if (summarizeBtn) summarizeBtn.disabled = false;
    } else {
      if (fileNameEl) fileNameEl.textContent = 'ファイルを選択（.txt / .md）';
      if (fileDropArea) fileDropArea.classList.remove('has-file');
      if (summarizeBtn) summarizeBtn.disabled = true;
    }
  });
}

if (summarizeBtn) {
  summarizeBtn.addEventListener('click', async () => {
    const file = fileInput?.files[0];
    if (!file) return;

    // ローディング状態
    summarizeBtn.disabled = true;
    summarizeBtn.classList.add('loading');
    if (summarizeBtnText) summarizeBtnText.innerHTML = '<span class="spinner"></span> 要約中…';

    try {
      const formData = new FormData();
      formData.append('file', file);

      const r = await fetch('/api/summarize', {
        method: 'POST',
        body: formData,
      });

      const data = await r.json();

      if (!r.ok) {
        throw new Error(data.error || '要約に失敗しました');
      }

      // 稼働内容に自動入力
      if (memoEl && data.summary) {
        memoEl.value = data.summary;
      }

      if (data.source === 'preview') {
        setStatus('⚠ APIキー未設定のためプレビューを表示', 'error');
      } else {
        setStatus('✓ AI要約を稼働内容に入力しました', 'saved');
      }
    } catch (e) {
      console.error(e);
      setStatus('要約失敗: ' + e.message, 'error');
    } finally {
      summarizeBtn.disabled = false;
      summarizeBtn.classList.remove('loading');
      if (summarizeBtnText) summarizeBtnText.textContent = 'AI で稼働内容を要約';
    }
  });
}

/* ---------- timer state ---------- */
let running = false;
let startAt = null;
let tickTimer = null;
let currentClient = '';

/* ---------- API ---------- */
async function loadLogs() {
  setStatus('読み込み中…');
  try {
    const r = await fetch('/api/logs');
    if (!r.ok) throw new Error(`GET /api/logs ${r.status}`);
    const logs = await r.json();

    // -- PC: table --
    if (logsTbody) {
      logsTbody.innerHTML = '';
      if (logs.length === 0) {
        logsTbody.innerHTML = '<tr><td colspan="5" class="empty-msg">まだ履歴がありません</td></tr>';
      } else {
        for (const row of logs) {
          const tr = document.createElement('tr');
          const dt = new Date(row.createdAt || row.updatedAt || Date.now()).toLocaleString('ja-JP');
          const timeRange = (row.startTime && row.endTime) ? `${row.startTime}〜${row.endTime}` : '';
          const timeDisplay = timeRange ? `${minutesToLabel(row.minutes)} (${timeRange})` : minutesToLabel(row.minutes);
          tr.innerHTML = `
            <td>${dt}</td>
            <td>${esc(row.client)}</td>
            <td>${timeDisplay}</td>
            <td>${esc(row.memo)}</td>
            <td><button class="btn-danger" data-act="del" data-id="${row.id}">削除</button></td>
          `;
          logsTbody.appendChild(tr);
        }
      }
    }

    // -- Mobile: cards --
    if (logCards) {
      logCards.innerHTML = '';
      if (logs.length === 0) {
        logCards.innerHTML = '<div class="empty-msg">まだ履歴がありません</div>';
      } else {
        for (const row of logs) {
          const dt = new Date(row.createdAt || row.updatedAt || Date.now()).toLocaleString('ja-JP');
          const timeRange = (row.startTime && row.endTime) ? `${row.startTime}〜${row.endTime}` : '';
          const div = document.createElement('div');
          div.className = 'log-card';
          div.innerHTML = `
            <div class="log-card-head">
              <span class="log-card-client">${esc(row.client)}</span>
              <span class="log-card-time">${dt}</span>
            </div>
            <div class="log-card-body">
              <span class="log-card-minutes">${minutesToLabel(row.minutes)}</span>
              ${timeRange ? `<span class="log-card-range">${timeRange}</span>` : ''}
            </div>
            ${row.memo ? `<div class="log-card-memo">${esc(row.memo)}</div>` : ''}
            <div class="log-card-actions">
              <button class="btn-danger" data-act="del" data-id="${row.id}">削除</button>
            </div>
          `;
          logCards.appendChild(div);
        }
      }
    }

    setStatus('');
  } catch (e) {
    console.error(e);
    setStatus('読み込み失敗', 'error');
  }
}

async function saveLog(minutes, opts = {}) {
  setStatus('保存中…');
  const payload = {
    client: currentClient,
    minutes,
    memo: memoEl?.value || '',
    startTime: opts.startTime || '',
    endTime: opts.endTime || '',
  };

  const r = await fetch('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!r.ok) throw new Error(`POST /api/logs ${r.status}`);
  setStatus('保存しました', 'saved');
  await loadLogs();
}

/* ---------- timer ---------- */
function timerStart() {
  currentClient = getSelectedClient() || (clientNew?.value?.trim()) || '';

  if (!currentClient) {
    alert('クライアント名を選択/入力してください');
    return;
  }

  running = true;
  startAt = Date.now();
  if (startBtn) startBtn.disabled = true;
  if (stopSaveBtn) stopSaveBtn.disabled = false;
  setStatus('計測中…');

  tickTimer = setInterval(() => {
    setTimer(Date.now() - startAt);
  }, 250);
}

async function stopSave() {
  if (!running) return;
  running = false;
  clearInterval(tickTimer);
  tickTimer = null;

  const elapsedMs = Date.now() - startAt;
  startAt = null;

  if (startBtn) startBtn.disabled = false;
  if (stopSaveBtn) stopSaveBtn.disabled = true;
  setTimer(0);

  const minutes = Math.max(1, Math.round(elapsedMs / 60000));
  try {
    await saveLog(minutes);
  } catch (e) {
    console.error(e);
    setStatus('保存失敗', 'error');
    alert('保存に失敗しました');
  }
}

/* ---------- client management ---------- */
function addClient() {
  const name = clientNew?.value?.trim() || '';
  if (!name) return;

  const opt = document.createElement('option');
  opt.value = name;
  opt.textContent = name;
  if (clientSel) {
    clientSel.appendChild(opt);
    clientSel.value = name;
  }
  if (clientNew) clientNew.value = '';
}

function delClient() {
  if (!clientSel) return;
  const opt = clientSel.selectedOptions[0];
  if (!opt || !opt.value) return; // 「— 選択 —」は消さない
  if (!confirm(`「${opt.value}」を一覧から削除しますか？`)) return;
  opt.remove();
  clientSel.value = '';
}

/* ---------- manual save (time range input) ---------- */
if (saveBtn) {
  saveBtn.addEventListener('click', async () => {
    const client = (clientSel?.value || clientNew?.value || '').trim();
    if (!client) return alert('クライアント名を入力/選択してください');

    const minutes = calcMinutes();
    if (!minutes) return alert('開始時刻と終了時刻を設定してください');

    currentClient = client;

    try {
      await saveLog(minutes, {
        startTime: startTimeEl?.value || '',
        endTime: endTimeEl?.value || '',
      });
      if (memoEl) memoEl.value = '';
      // ファイル入力もリセット
      if (fileInput) {
        fileInput.value = '';
        if (fileNameEl) fileNameEl.textContent = 'ファイルを選択（.txt / .md）';
        if (fileDropArea) fileDropArea.classList.remove('has-file');
        if (summarizeBtn) summarizeBtn.disabled = true;
      }
    } catch (e) {
      console.error(e);
      setStatus('保存に失敗しました', 'error');
    }
  });
}

/* ---------- reset ---------- */
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    if (startTimeEl) startTimeEl.value = '09:00';
    if (endTimeEl) endTimeEl.value = '18:00';
    if (memoEl) memoEl.value = '';
    if (fileInput) {
      fileInput.value = '';
      if (fileNameEl) fileNameEl.textContent = 'ファイルを選択（.txt / .md）';
      if (fileDropArea) fileDropArea.classList.remove('has-file');
      if (summarizeBtn) summarizeBtn.disabled = true;
    }
    setStatus('');
    setToday();
    calcMinutes();
  });
}

/* ---------- event delegation ---------- */
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  if (btn === addClientBtn) return addClient();
  if (btn === startBtn) return timerStart();
  if (btn === stopSaveBtn) return stopSave();
  if (btn === reloadBtn) return loadLogs();

  if (btn.dataset.act === 'del') {
    const id = btn.dataset.id;
    if (!id) return;
    if (!confirm('削除しますか？')) return;

    setStatus('削除中…');
    try {
      const r = await fetch(`/api/logs/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(`DELETE /api/logs/${id} ${r.status}`);
      await loadLogs();
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus('削除失敗', 'error');
    }
  }
});

/* ---------- init ---------- */
window.addEventListener('DOMContentLoaded', () => {
  if (startBtn) startBtn.disabled = false;
  if (stopSaveBtn) stopSaveBtn.disabled = true;
  setTimer(0);
  setToday();
  calcMinutes();
  loadLogs();
});