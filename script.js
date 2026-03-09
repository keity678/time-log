const processMinutes = async () => {
  const fileInput = document.getElementById('fileInput');
  const textInput = document.getElementById('textInput');
  const output = document.getElementById('output');
  const resultDiv = document.getElementById('result');
  
  let content = "";
  if (fileInput.files.length > 0) {
    content = await fileInput.files[0].text();
  } else {
    content = textInput.value.trim();
  }

  if (!content) return alert("議事録を入力または選択してください。");

  resultDiv.classList.remove('hidden');
  output.textContent = "解析中...";

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: content }] }],
        systemInstruction: { parts: [{ text: "議事録から【日程】【参加者】【決定事項】【タスク/シフト】を構造化して抽出してください。" }] }
      })
    });
    const data = await response.json();
    output.textContent = data.candidates[0].content.parts[0].text;
  } catch (e) {
    output.textContent = "エラー: " + e.message;
  }
};
