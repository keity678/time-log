// --- クライアント管理ロジック ---
const STORAGE_KEY = 'time_log_clients';
let clients = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

const updateClientSelect = () => {
  const select = document.getElementById('clientSelect');
  const currentValue = select.value;
  select.innerHTML = '<option value="">--- 選択 ---</option>';
  const uniqueClients = [...new Set(clients)].filter(c => c !== "").sort();
  uniqueClients.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
  if (uniqueClients.includes(currentValue)) {
    select.value = currentValue;
  }
};

const addClient = () => {
  const input = document.getElementById('newClientName');
  const name = input.value.trim();
  if (!name) return;
  if (!clients.includes(name)) {
    clients.push(name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    updateClientSelect();
    document.getElementById('clientSelect').value = name;
    input.value = '';
  } else {
    alert("既に登録済みのクライアントです。");
  }
};

const removeClient = () => {
  const select = document.getElementById('clientSelect');
  const target = select.value;
  if (!target) {
    alert("削除するクライアントを選択してください。");
    return;
  }
  if (confirm(`「${target}」の登録を削除しますか？`)) {
    clients = clients.filter(c => c !== target);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    updateClientSelect();
    alert("削除しました。");
  }
};

const calculateHours = () => {
  const start = document.getElementById('startTime').value;
  const end = document.getElementById('endTime').value;
  if (!start || !end) return;
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  let diffMinutes = (eH * 60 + eM) - (sH * 60 + sM);
  if (diffMinutes < 0) diffMinutes += 1440; 
  const hours = (diffMinutes / 60).toFixed(1);
  document.getElementById('totalHoursDisplay').textContent = `${hours}h (${diffMinutes}分)`;
};

const processMinutes = async () => {
  const fileInput = document.getElementById('fileInput');
  const textInput = document.getElementById('textInput');
  const output = document.getElementById('output');
  const resultDiv = document.getElementById('result');
  const apiKey = ""; 
  let content = (fileInput.files.length > 0) ? await fileInput.files[0].text() : textInput.value.trim();
  if (!content) return alert("内容を入力してください");
  resultDiv.classList.remove('hidden');
  output.textContent = "AI解析中...";
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=\${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: content }] }],
        systemInstruction: { parts: [{ text: "SHA株式会社のパートナーとして議事録から【日程】【参加者】【決定事項】【タスク】をMarkdownで抽出せよ。" }] }
      })
    });
    const data = await response.json();
    output.textContent = data.candidates[0].content.parts[0].text;
  } catch (e) {
    output.textContent = "Error: " + e.message;
  }
};

window.onload = () => {
  updateClientSelect();
  document.getElementById('dateInput').valueAsDate = new Date();
  calculateHours();
};
