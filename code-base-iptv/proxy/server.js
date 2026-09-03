require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const port = Number(process.env.PORT || 3000);
const providerHost = new URL(process.env.IPTV_HOST || 'http://iptvpluss.ddns.net:25461');

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*'
}));

function decodeNumericPlaylist(text) {
  const lines = String(text || '').trim().split(/\r?\n/);
  if (lines.length < 2 || !lines.every(line => /^\d{1,3}$/.test(line.trim()))) {
    return text;
  }

  let decoded = '';
  for (const line of lines) {
    const code = Number.parseInt(line.trim(), 10);
    if (code < 0 || code > 255) return text;
    decoded += String.fromCharCode(code);
  }

  return decoded.startsWith('#EXT') ? decoded : text;
}

function isAllowedUrl(value) {
  try {
    const target = new URL(value);
    return target.protocol === providerHost.protocol &&
      target.hostname === providerHost.hostname &&
      target.port === providerHost.port;
  } catch {
    return false;
  }
}

function absoluteUrl(value, baseUrl) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function proxiedUrl(url) {
  return `/api/stream?url=${encodeURIComponent(url)}`;
}

function rewriteManifest(text, manifestUrl) {
  const normalized = decodeNumericPlaylist(text);

  return normalized.split(/\r?\n/).map(line => {
    const value = line.trim();
    if (!value || value.startsWith('#')) return line;

    const target = absoluteUrl(value, manifestUrl);
    return target && isAllowedUrl(target) ? proxiedUrl(target) : line;
  }).join('\n');
}

async function providerFetch(url) {
  if (!isAllowedUrl(url)) throw new Error('URL IPTV no autorizada');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/x-mpegURL, application/vnd.apple.mpegurl, video/mp2t, */*'
    },
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) throw new Error(`Proveedor IPTV respondió ${response.status}`);
  return response;
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'onedxd-iptv-proxy' });
});

app.get('/api/playlist', async (req, res) => {
  try {
    const username = String(req.query.username || '').trim();
    const password = String(req.query.password || '').trim();

    if (!username || !password) {
      return res.status(400).json({ error: 'Faltan las credenciales IPTV' });
    }

    const target = new URL('/get.php', providerHost);
    target.searchParams.set('username', username);
    target.searchParams.set('password', password);
    target.searchParams.set('type', 'm3u_plus');
    target.searchParams.set('output', 'm3u8');

    const response = await providerFetch(target.toString());
    const playlist = decodeNumericPlaylist(await response.text());
    const rewritten = rewriteManifest(playlist, target.toString());

    res.type('application/x-mpegURL').send(rewritten);
  } catch (error) {
    console.error('Playlist proxy error:', error.message);
    res.status(502).json({ error: 'No se pudo obtener la playlist IPTV' });
  }
});

app.get('/api/stream', async (req, res) => {
  try {
    const targetUrl = String(req.query.url || '');
    if (!isAllowedUrl(targetUrl)) return res.status(403).send('URL IPTV no autorizada');

    const response = await providerFetch(targetUrl);
    const contentType = response.headers.get('content-type') || '';

    if (targetUrl.includes('.m3u8') || contentType.includes('mpegurl')) {
      const rewritten = rewriteManifest(await response.text(), targetUrl);
      return res.type('application/x-mpegURL').send(rewritten);
    }

    res.status(response.status);
    if (contentType) res.set('Content-Type', contentType);
    return res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('Stream proxy error:', error.message);
    return res.status(502).send('No se pudo obtener el stream IPTV');
  }
});

app.listen(port, () => {
  console.log(`One DxD IPTV proxy listening on port ${port}`);
});
