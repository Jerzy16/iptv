import { Injectable, signal } from '@angular/core';
import { Provider, PROVIDERS } from '../../services/providers';
import { STORAGE_KEYS } from '../constants/storage-keys.constant';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class SpaceService {
  readonly selected = signal<Provider | null>(null);

  constructor(private readonly storage: StorageService) {}

  select(space: Provider): void {
    this.selected.set(space);
    this.storage.set(STORAGE_KEYS.selectedSpace, space.id);
  }

  resolve(id: string | null): Provider | null {
    const selected = PROVIDERS.find((space) => space.id === id) ?? null;
    this.selected.set(selected);
    return selected;
  }

  clear(): void {
    this.selected.set(null);
    this.storage.remove(STORAGE_KEYS.selectedSpace);
  }
}
