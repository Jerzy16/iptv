import { Injectable } from '@angular/core';
import { Channel } from './providers';
export interface Credentials { username: string; password: string; }
@Injectable({ providedIn: 'root' })
export class AuthService {
  private key(id: string, type: string): string { return `dxdtv_${type}_${id}`; }
  isLoggedIn(id: string): boolean { return !!localStorage.getItem(this.key(id, 'session')); }
  saveSession(id: string, credentials: Credentials): void { localStorage.setItem(this.key(id, 'session'), JSON.stringify(credentials)); }
  getSession(id: string): Credentials | null { try { return JSON.parse(localStorage.getItem(this.key(id, 'session')) ?? 'null'); } catch { return null; } }
  clearSession(id: string): void { localStorage.removeItem(this.key(id, 'session')); localStorage.removeItem(this.key(id, 'channels')); }
  saveChannels(id: string, channels: Channel[]): void { localStorage.setItem(this.key(id, 'channels'), JSON.stringify(channels)); }
  getChannels(id: string): Channel[] | null { try { return JSON.parse(localStorage.getItem(this.key(id, 'channels')) ?? 'null'); } catch { return null; } }
}