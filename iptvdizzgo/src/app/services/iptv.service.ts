import { Injectable } from '@angular/core';
import { Channel, Provider } from './providers';
import { Credentials } from './auth.service';
@Injectable({ providedIn: 'root' })
export class IptvService {
  async fetchForProvider(provider: Provider, credentials: Credentials): Promise<Channel[]> {
    const url = new URL('/player_api.php', provider.source.host);
    url.searchParams.set('username', credentials.username);
    url.searchParams.set('password', credentials.password);
    url.searchParams.set('action', 'get_live_streams');
    let response: Response;
    try { response = await fetch(url, { signal: AbortSignal.timeout(15000) }); }
    catch { throw new Error('No se pudo conectar con el servidor IPTV. Verifica que permita CORS.'); }
    if (!response.ok) throw new Error(`Error al conectar con el servidor IPTV (${response.status}).`);
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new Error('El servidor IPTV devolvió una respuesta inválida.');
    return payload.map((item: any) => ({
      name: String(item.name || item.stream_name || 'Sin nombre'),
      url: `${provider.source.host}/live/${encodeURIComponent(credentials.username)}/${encodeURIComponent(credentials.password)}/${item.stream_id}.m3u8`,
      tvgLogo: String(item.stream_icon || ''),
      groupTitle: String(item.category_name || item.category_id || ''),
    })).filter((channel) => channel.url.endsWith('.m3u8'));
  }
  private parse(text: string): Channel[] {
    const clean = text.replace(/^\uFEFF/, '').trim();
    const numeric = clean.split(/\r?\n/);
    const decoded = numeric.length > 1 && numeric.every((line) => /^\d{1,3}$/.test(line.trim())) && numeric.every((line) => Number(line) <= 255)
      ? numeric.map((line) => String.fromCharCode(Number(line))).join('') : clean;
    const lines = decoded.split(/\r?\n/); const channels: Channel[] = []; let pending: Partial<Channel> | null = null;
    for (const line of lines.map((item) => item.trim())) {
      if (line.startsWith('#EXTINF:')) { const attributes = Object.fromEntries([...line.matchAll(/([\w-]+)=(?:"([^"]*)"|'([^']*)'|([^\s]+))/g)].map((match) => [match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? ''])); const comma = line.indexOf(','); pending = { name: (comma < 0 ? '' : line.slice(comma + 1).trim()) || attributes['tvg-name'] || 'Sin nombre', tvgLogo: attributes['tvg-logo'] ?? '', groupTitle: attributes['group-title'] ?? '' }; }
      else if (line && !line.startsWith('#') && pending) { channels.push({ name: pending.name ?? 'Sin nombre', url: line, tvgLogo: pending.tvgLogo ?? '', groupTitle: pending.groupTitle ?? '' }); pending = null; }
    }
    return channels;
  }
}