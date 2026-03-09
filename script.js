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
  output.textContent = "解析中...";

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: content }] }],
        systemInstruction: { parts: [{ text: "あなたはSHA株式会社の構造思考パートナーです。議事録から【日程】【参加者】【構造化決定事項】【タスク/シフト】をMarkdown形式で高密度に抽出してください。バズワードを排除し、実務に直結する表現のみを使用してください。" }] }
      })
    });
    const data = await response.json();
    if (data.candidates && data.candidates[0]) {
      output.textContent = data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("解析に失敗しました。API応答を確認してください。");
    }
  } catch (e) {
    output.textContent = "エラーが発生しました: " + e.message;
  }
};
