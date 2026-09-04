import { Injectable, signal } from '@angular/core';
import { Credentials } from '../models/auth.model';
import { Channel } from '../models/channel.model';
import { STORAGE_KEYS } from '../constants/storage-keys.constant';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly activeSpaceId = signal<string | null>(null);

  constructor(private readonly storage: StorageService) {}

  isLoggedIn(spaceId: string): boolean {
    return this.storage.get<Credentials>(STORAGE_KEYS.session(spaceId)) !== null;
  }

  getSession(spaceId: string): Credentials | null {
    return this.storage.get<Credentials>(STORAGE_KEYS.session(spaceId));
  }

  saveSession(spaceId: string, credentials: Credentials): void {
    this.storage.set(STORAGE_KEYS.session(spaceId), credentials);
    this.activeSpaceId.set(spaceId);
  }

  saveChannels(spaceId: string, channels: Channel[]): void {
    this.storage.set(STORAGE_KEYS.channels(spaceId), channels);
  }

  getChannels(spaceId: string): Channel[] | null {
    return this.storage.get<Channel[]>(STORAGE_KEYS.channels(spaceId));
  }

  clearSession(spaceId: string): void {
    this.storage.remove(STORAGE_KEYS.session(spaceId));
    this.storage.remove(STORAGE_KEYS.channels(spaceId));
    this.activeSpaceId.set(null);
  }
}
