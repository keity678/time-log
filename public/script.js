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
        systemInstruction: { parts: [{ text: "議事録から【日程】【参加者】【決定事項】【タスク】を抽出せよ。" }] }
      })
    });
    const data = await response.json();
    output.textContent = data.candidates[0].content.parts[0].text;
  } catch (e) {
    output.textContent = "Error: " + e.message;
  }
};
