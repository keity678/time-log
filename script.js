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
  }
};

const removeClient = () => {
  const select = document.getElementById('clientSelect');
  const target = select.value;
  if (!target) return;
  clients = clients.filter(c => c !== target);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  updateClientSelect();
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

// 指数的バックオフを伴うGemini API呼び出し
const callGemini = async (content) => {
  const apiKey = "";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: content }] }],
    systemInstruction: { parts: [{ text: "議事録から【日程】【参加者】【決定事項】【タスク】をMarkdown形式で抽出してください。" }] }
  };

  let delay = 1000;
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "解析結果が空でした。";
      }
    } catch (e) {
      // リトライのためにエラーを握りつぶす（指示通り）
    }
    await new Promise(resolve => setTimeout(resolve, delay));
    delay *= 2;
  }
  throw new Error("通信エラーまたは制限により解析に失敗しました。時間をおいて再度お試しください。");
};

const processMinutes = async () => {
  const fileInput = document.getElementById('fileInput');
  const textInput = document.getElementById('textInput');
  const output = document.getElementById('output');
  const resultDiv = document.getElementById('result');
  const btn = document.getElementById('processBtn');

  let content = "";
  if (fileInput.files.length > 0) {
    content = await fileInput.files[0].text();
  } else {
    content = textInput.value.trim();
  }

  if (!content) return;

  btn.disabled = true;
  resultDiv.classList.remove('hidden');
  output.textContent = "AIが解析中... (最大30秒ほどかかる場合があります)";

  try {
    const resultText = await callGemini(content);
    output.textContent = resultText;
  } catch (e) {
    output.textContent = "エラー: " + e.message;
  } finally {
    btn.disabled = false;
  }
};

window.onload = () => {
  updateClientSelect();
  document.getElementById('dateInput').valueAsDate = new Date();
  calculateHours();
};
