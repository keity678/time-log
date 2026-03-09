const STORAGE_KEY = 'time_log_clients_v1';
let clients = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

const updateClientSelect = () => {
  const select = document.getElementById('clientSelect');
  const currentValue = select.value;
  select.innerHTML = '<option value="">--- 選択 ---</option>';
  
  const sortedClients = [...new Set(clients)].filter(c => c).sort();
  sortedClients.forEach(c => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = c;
    select.appendChild(opt);
  });
  select.value = sortedClients.includes(currentValue) ? currentValue : "";
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
    alert("既に登録済みです。");
  }
};

const removeClient = () => {
  const select = document.getElementById('clientSelect');
  const target = select.value;
  if (!target) return alert("削除する対象を選択してください。");
  if (confirm(`「${target}」を削除しますか？`)) {
    clients = clients.filter(c => c !== target);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    updateClientSelect();
  }
};

const calculateHours = () => {
  const start = document.getElementById('startTime').value;
  const end = document.getElementById('endTime').value;
  if (!start || !end) return;
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  let diff = (eH * 60 + eM) - (sH * 60 + sM);
  if (diff < 0) diff += 1440;
  document.getElementById('totalHoursDisplay').textContent = `${(diff / 60).toFixed(1)}h (${diff}分)`;
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
  output.textContent = "解析中...";
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: content }] }],
        systemInstruction: { parts: [{ text: "議事録から【日程】【参加者】【決定事項】【タスク】をMarkdown形式で抽出してください。" }] }
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
