'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Frontend: public folder OR GitHub root files
const publicFolder = path.join(__dirname, 'public');
const frontendFolder = fs.existsSync(path.join(publicFolder, 'index.html'))
  ? publicFolder
  : __dirname;

app.use(express.static(frontendFolder));

// API keys Render Environment Variables में डालना
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const GROQ_MODEL =
  process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

const SYSTEM_PROMPT = `
You are NOVA, a personal AI assistant.
Respond naturally in Hindi, Hinglish or English.
Help with learning, technology, planning, business research,
tasks and personal productivity.
Be honest about what you can and cannot do.
Never claim a payment, message, booking or external action
was completed unless a connected tool confirms it.
Never guarantee income or investment returns.
Ask for confirmation before consequential external actions.
Keep API keys and private information confidential.
`;

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    backend: 'online',
    aiConfigured: Boolean(GEMINI_API_KEY || GROQ_API_KEY),
    version: 'NOVA V11'
  });
});

// AI Chat
app.post('/api/chat', async (req, res) => {
  try {
    const message = String(req.body.message || '').trim();

    if (!message) {
      return res.status(400).json({
        ok: false,
        error: 'Message is required'
      });
    }

    const history = Array.isArray(req.body.history)
      ? req.body.history.slice(-10)
      : [];

    const errors = [];

    // Try Gemini first
    if (GEMINI_API_KEY) {
      try {
        const contents = [];

        for (const item of history) {
          if (!item || !item.content) continue;

          const role = item.role === 'assistant'
            ? 'model'
            : item.role === 'user'
              ? 'user'
              : null;

          if (role) {
            contents.push({
              role,
              parts: [{ text: String(item.content).slice(0, 4000) }]
            });
          }
        }

        contents.push({
          role: 'user',
          parts: [{ text: message }]
        });

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: SYSTEM_PROMPT }]
              },
              contents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048
              }
            }),
            signal: AbortSignal.timeout(45000)
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error?.message || `Gemini HTTP ${response.status}`
          );
        }

        const reply = data.candidates?.[0]?.content?.parts
          ?.map(part => part.text || '')
          .join('')
          .trim();

        if (!reply) throw new Error('Gemini returned an empty reply');

        return res.json({
          ok: true,
          reply,
          provider: 'Gemini',
          version: 'NOVA V11'
        });

      } catch (error) {
        errors.push('Gemini: ' + error.message);
      }
    }

    // Fallback to Groq
    if (GROQ_API_KEY) {
      try {
        const messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history
            .filter(x => x && ['user', 'assistant'].includes(x.role))
            .map(x => ({
              role: x.role,
              content: String(x.content || '').slice(0, 4000)
            })),
          { role: 'user', content: message }
        ];

        const response = await fetch(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
              model: GROQ_MODEL,
              messages,
              temperature: 0.7,
              max_tokens: 2048
            }),
            signal: AbortSignal.timeout(45000)
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error?.message || `Groq HTTP ${response.status}`
          );
        }

        const reply = data.choices?.[0]?.message?.content;

        if (!reply) throw new Error('Groq returned an empty reply');

        return res.json({
          ok: true,
          reply,
          provider: 'Groq',
          fallbackUsed: errors.length > 0,
          version: 'NOVA V11'
        });

      } catch (error) {
        errors.push('Groq: ' + error.message);
      }
    }

    return res.status(502).json({
      ok: false,
      error: 'AI providers unavailable. Check API keys and quota.',
      details: errors
    });

  } catch (error) {
    console.error('Chat error:', error.message);

    res.status(500).json({
      ok: false,
      error: 'NOVA server error'
    });
  }
});

// Voice configuration
app.get('/api/voice/config', (req, res) => {
  res.json({
    ok: true,
    enabled: true,
    language: 'hi-IN',
    controls: ['START', 'RUKO', 'REPEAT'],
    mode: 'browser-speech'
  });
});

// Memory, Tasks and Money API
// Without PostgreSQL these records are temporary.
const store = {
  memory: [],
  tasks: [],
  money: []
};

app.get('/api/storage/status', (req, res) => {
  res.json({
    ok: true,
    mode: 'temporary-memory',
    durable: false,
    note: 'PostgreSQL cloud storage is not configured in this simple server.'
  });
});

app.get('/api/:type', (req, res, next) => {
  const type = req.params.type;

  if (!['memory', 'tasks', 'money'].includes(type)) {
    return next();
  }

  res.json({
    ok: true,
    records: store[type]
  });
});

app.post('/api/:type', (req, res, next) => {
  const type = req.params.type;

  if (!['memory', 'tasks', 'money'].includes(type)) {
    return next();
  }

  const record = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  };

  store[type].push(record);

  res.status(201).json({
    ok: true,
    record
  });
});

// Money summary
app.get('/api/money/summary', (req, res) => {
  const income = store.money
    .filter(x => x.kind !== 'expense')
    .reduce((sum, x) => sum + Number(x.amount || 0), 0);

  const expenses = store.money
    .filter(x => x.kind === 'expense')
    .reduce((sum, x) => sum + Number(x.amount || 0), 0);

  res.json({
    ok: true,
    currency: 'INR',
    income,
    expenses,
    balance: income - expenses,
    note: 'Only user-entered records; not bank verified.'
  });
});

// Module status
app.get('/api/modules', (req, res) => {
  res.json({
    ok: true,
    modules: {
      aiChat: Boolean(GEMINI_API_KEY || GROQ_API_KEY),
      voice: 'frontend-required',
      memory: 'temporary-unless-database-connected',
      tasks: 'record-api',
      money: 'record-api',
      globalResearch: 'search-integration-required',
      hologram: 'frontend-required'
    }
  });
});

// Home page
app.get('/', (req, res) => {
  const indexFile = path.join(frontendFolder, 'index.html');

  if (!fs.existsSync(indexFile)) {
    return res.status(404).send('NOVA frontend index.html not found');
  }

  res.sendFile(indexFile);
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.message);

  res.status(500).json({
    ok: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('NOVA backend online on port ' + PORT);
  console.log('Frontend folder: ' + frontendFolder);
  console.log('Gemini configured: ' + Boolean(GEMINI_API_KEY));
  console.log('Groq configured: ' + Boolean(GROQ_API_KEY));
});
