const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.MODEL || 'openrouter/free';
const SYSTEM = 'Kamu adalah asisten chatbot yang ramah dan ringkas. Jawab dalam bahasa yang dipakai pengguna.';

if (!API_KEY) {
  console.error('OPENROUTER_API_KEY belum di-set.');
  process.exit(1);
}

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) req.destroy();
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Panggil OpenRouter, ulangi sampai 3x kalau server sibuk (429/502/503)
async function callUpstream(messages) {
  let res;
  for (let attempt = 1; attempt <= 3; attempt++) {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: [{ role: 'system', content: SYSTEM }, ...messages],
      }),
    });
    if (![429, 502, 503].includes(res.status)) return res;
    await sleep(1500 * attempt);
  }
  return res;
}

async function handleChat(req, res) {
  let messages;
  try {
    messages = JSON.parse(await readBody(req)).messages;
    if (!Array.isArray(messages) || messages.length === 0) throw new Error('bad');
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Body harus berisi { messages: [...] }' }));
  }

  try {
    const upstream = await callUpstream(messages);

    if (!upstream.ok) {
      const text = await upstream.text();
      res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: text }));
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Ubah format stream OpenAI ke format yang dibaca app.js
    const decoder = new TextDecoder();
    let buf = '';
    for await (const chunk of upstream.body) {
      buf += decoder.decode(chunk, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const evt = JSON.parse(line.slice(6));
          const text = evt.choices?.[0]?.delta?.content || '';
          if (text) {
            res.write(
              'data: ' +
                JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } }) +
                '\n\n'
            );
          }
        } catch {}
      }
    }
    res.end();
  } catch (err) {
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err) }));
  }
}

// Kirim file dari folder public (index.html, style.css, app.js, dll)
function serveStatic(req, res) {
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    res.writeHead(400);
    return res.end('Bad request');
  }
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/chat') return handleChat(req, res);
  if (req.method === 'GET') return serveStatic(req, res);
  res.writeHead(405);
  res.end('Method not allowed');
});

server.listen(PORT, () => console.log(`Chatbot jalan di http://localhost:${PORT}`));