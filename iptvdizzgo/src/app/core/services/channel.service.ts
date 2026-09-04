import { Injectable, signal } from '@angular/core';
import { Provider } from '../../services/providers';
import { Credentials } from '../models/auth.model';
import { Channel } from '../models/channel.model';
import { AuthService } from './auth.service';
import { IptvService } from '../../services/iptv.service';

@Injectable({ providedIn: 'root' })
export class ChannelService {
  readonly channels = signal<Channel[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  constructor(private readonly api: IptvService, private readonly auth: AuthService) {}

  async load(space: Provider, credentials?: Credentials): Promise<Channel[]> {
    const stored = space.requiresAuth ? this.auth.getChannels(space.id) : null;
    if (stored?.length) {
      this.channels.set(stored);
      return stored;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      const list = await this.api.fetchForProvider(space, credentials ?? { username: '', password: '' });
      this.channels.set(list);
      if (space.requiresAuth) this.auth.saveChannels(space.id, list);
      return list;
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar los canales.');
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  clear(): void {
    this.channels.set([]);
    this.error.set('');
  }
}
