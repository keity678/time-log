// クライアント管理ロジック
let clients = JSON.parse(localStorage.getItem('clients') || '[]');

const updateClientSelect = () => {
  const select = document.getElementById('clientSelect');
  const currentValue = select.value;
  select.innerHTML = '<option value="">--- 選択 ---</option>';
  clients.sort().forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
  select.value = currentValue;
};

const addClient = () => {
  const name = document.getElementById('newClientName').value.trim();
  if (name && !clients.includes(name)) {
    clients.push(name);
    localStorage.setItem('clients', JSON.stringify(clients));
    updateClientSelect();
    document.getElementById('newClientName').value = '';
  }
};

const removeClient = () => {
  const select = document.getElementById('clientSelect');
  if (select.value && confirm(`${select.value} を削除しますか？`)) {
    clients = clients.filter(c => c !== select.value);
    localStorage.setItem('clients', JSON.stringify(clients));
    updateClientSelect();
  }
};

// 時間計算ロジック
const calculateHours = () => {
  const start = document.getElementById('startTime').value;
  const end = document.getElementById('endTime').value;
  if (!start || !end) return;

  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  
  let diffMinutes = (eH * 60 + eM) - (sH * 60 + sM);
  if (diffMinutes < 0) diffMinutes += 1440; // 翌日跨ぎ対応

  const hours = (diffMinutes / 60).toFixed(1);
  document.getElementById('totalHoursDisplay').textContent = `${hours}h (${diffMinutes}分)`;
};

// 議事録解析ロジック
const processMinutes = async () => {
  const fileInput = document.getElementById('fileInput');
  const textInput = document.getElementById('textInput');
  const output = document.getElementById('output');
  const resultDiv = document.getElementById('result');
  
  const apiKey = ""; 
  let content = (fileInput.files.length > 0) ? await fileInput.files[0].text() : textInput.value.trim();

  if (!content) {
    alert("議事録の内容を入力するか、ファイルを選択してください。");
    return;
  }

  resultDiv.classList.remove('hidden');
  output.textContent = "AI解析中...";
  output.scrollIntoView({ behavior: 'smooth' });

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: content }] }],
        systemInstruction: { parts: [{ text: "あなたはSHA株式会社のパートナーです。議事録から【日程】【参加者】【決定事項】【タスク/シフト】をMarkdown形式で構造化してください。無駄な挨拶や解説は不要です。" }] }
      })
    });
    const data = await response.json();
    if (data.candidates && data.candidates[0]) {
      output.textContent = data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("解析結果が返ってきませんでした。内容を確認してください。");
    }
  } catch (e) {
    output.textContent = "Error: " + e.message;
  }
};

// ページ読み込み時の初期化
window.onload = () => {
  updateClientSelect();
  document.getElementById('dateInput').valueAsDate = new Date();
  calculateHours();
};
