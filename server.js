const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3001);

const publicDir = path.join(__dirname, 'public');
// Vercel(Serverless)では /tmp のみ書き込み可能
const uploadsDir = path.join('/tmp', 'uploads');
const logsFile = path.join('/tmp', 'logs.json');

// ディレクトリ作成
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ---- ミドルウェア ----
app.use(express.static(publicDir));
app.use(express.json());

// multer設定
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB上限
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.txt', '.md', '.text', '.markdown'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('対応ファイル: .txt / .md のみ'));
    }
  },
});

// OpenAI クライアント（キーが無い場合は null）
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log('[time-log] OpenAI API 有効');
} else {
  console.log('[time-log] OPENAI_API_KEY未設定 → AI要約は無効');
}

// ---- ページ ----
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, project: 'time-log' });
});

// ---- logs.json ----
function readLogs() {
  try {
    if (!fs.existsSync(logsFile)) return [];
    const txt = fs.readFileSync(logsFile, 'utf8');
    const data = JSON.parse(txt);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function writeLogs(logs) {
  fs.writeFileSync(logsFile, JSON.stringify(logs, null, 2), 'utf8');
}

function genId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// ---- API: ログ一覧 ----
app.get('/api/logs', (req, res) => {
  res.status(200).json(readLogs());
});

// ---- API: ログ追加 ----
app.post('/api/logs', (req, res) => {
  const payload = req.body || {};
  const client = String(payload.client || '').trim();
  const minutes = Number(payload.minutes || 0);
  const memo = String(payload.memo || '');
  const startTime = String(payload.startTime || '');
  const endTime = String(payload.endTime || '');

  if (!client) return res.status(400).json({ error: 'client is required' });

  const logs = readLogs();
  const now = new Date().toISOString();

  const item = {
    id: genId(),
    client,
    minutes,
    startTime,
    endTime,
    memo,
    createdAt: now,
    updatedAt: now,
  };
  logs.unshift(item);
  writeLogs(logs);

  res.status(201).json(item);
});

// ---- API: ログ削除 ----
app.delete('/api/logs/:id', (req, res) => {
  const { id } = req.params;
  const logs = readLogs();
  const next = logs.filter((x) => x.id !== id);
  if (next.length === logs.length) return res.status(404).json({ error: 'not found' });
  writeLogs(next);
  res.status(200).json({ ok: true });
});

// ---- API: 議事録要約 ----
app.post('/api/summarize', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'ファイルが添付されていません' });
    }

    // ファイル読み取り
    const filePath = req.file.path;
    const text = fs.readFileSync(filePath, 'utf8');

    // 一時ファイル削除
    fs.unlinkSync(filePath);

    if (!text.trim()) {
      return res.status(400).json({ error: 'ファイルが空です' });
    }

    // OpenAI APIキーが無い場合 → テキスト先頭を返す
    if (!openai) {
      const preview = text.slice(0, 500).trim();
      return res.status(200).json({
        summary: preview,
        source: 'preview',
        message: 'OPENAI_API_KEY未設定のため、テキスト先頭を返しました',
      });
    }

    // OpenAI で要約
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content:
            'あなたは業務ログ作成アシスタントです。以下の議事録・作業メモを読み、「この時間に何をしたか」を箇条書き（3〜5項目）で簡潔にまとめてください。出力は日本語で、各項目は「・」で始めてください。',
        },
        {
          role: 'user',
          content: text.slice(0, 8000), // トークン節約のため8000文字まで
        },
      ],
    });

    const summary = completion.choices?.[0]?.message?.content?.trim() || '';

    return res.status(200).json({ summary, source: 'openai' });
  } catch (err) {
    console.error('[summarize error]', err);
    // multerのファイルフィルタエラー
    if (err.message?.includes('対応ファイル')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: '要約に失敗しました: ' + err.message });
  }
});

// ---- 起動 ----
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, HOST, () => {
    console.log(`[time-log] http://${HOST}:${PORT}`);
  });
}

module.exports = app;