const processMinutes = async () => {
  const fileInput = document.getElementById('fileInput');
  const textInput = document.getElementById('textInput');
  const output = document.getElementById('output');
  const resultDiv = document.getElementById('result');
  
  const apiKey = ""; // 環境により自動注入
  let content = "";

  // 入力ソースの判定
  if (fileInput.files.length > 0) {
    content = await fileInput.files[0].text();
  } else {
    content = textInput.value.trim();
  }

  if (!content) {
    alert("テキストを貼り付けるか、ファイルを選択してください。");
    return;
  }

  resultDiv.classList.remove('hidden');
  output.textContent = "解析中...";

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: content }] }],
        systemInstruction: { parts: [{ text: "あなたはSHA株式会社の構造思考パートナーです。議事録から【日程】【参加者】【決定事項】【タスク/シフト】をMarkdown形式で抽出してください。" }] }
      })
    });

    const data = await response.json();
    if (data.candidates && data.candidates[0]) {
      output.textContent = data.candidates[0].content.parts[0].text;
    } else {
      output.textContent = "解析に失敗しました。内容が空か、APIエラーの可能性があります。";
    }
  } catch (e) {
    output.textContent = "エラー: " + e.message;
  }
};
