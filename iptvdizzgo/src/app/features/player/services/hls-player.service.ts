import { Injectable } from '@angular/core';
import Hls from 'hls.js';

@Injectable({ providedIn: 'root' })
export class HlsPlayerService {
  private hls: Hls | null = null;

  attach(video: HTMLVideoElement, source: string, onError: (message: string) => void): void {
    this.destroy();

    if (!source) {
      onError('No se recibió una URL de reproducción.');
      return;
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source;
      video.play().catch(() => undefined);
      return;
    }

    if (!Hls.isSupported()) {
      onError('Este navegador no soporta reproducción HLS.');
      return;
    }

    this.hls = new Hls({ enableWorker: true, lowLatencyMode: false });
    this.hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) onError('No se pudo reproducir este canal. Verifica que el stream esté disponible.');
    });
    this.hls.loadSource(source);
    this.hls.attachMedia(video);
    this.hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => undefined));
  }

  destroy(): void {
    this.hls?.destroy();
    this.hls = null;
  }
}
