import { Injectable } from '@angular/core';
import { PlatformType } from '../../models/platform.model';

@Injectable({ providedIn: 'root' })
export class PlatformDetectorService {
  detect(): PlatformType {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('tizen')) return 'tizen';
    if (userAgent.includes('webos')) return 'webos';
    if (userAgent.includes('android tv')) return 'android-tv';
    return 'browser';
  }
}
