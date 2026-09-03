import { Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AuthService, Credentials } from './services/auth.service';
import { IptvService } from './services/iptv.service';
import { Channel, Provider, PROVIDERS } from './services/providers';

@Component({
  imports: [FormsModule],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly iptv = inject(IptvService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly providers = PROVIDERS;
  protected readonly view = signal('splash');
  protected readonly provider = signal<Provider | null>(null);
  protected readonly channels = signal<Channel[]>([]);
  protected readonly featured = signal<Channel | null>(null);
  protected readonly currentChannel = signal<Channel | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected credentials: Credentials = { username: '', password: '' };

  constructor() {
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => { if (event instanceof NavigationEnd) this.resolveRoute(); });
    setTimeout(() => this.resolveRoute(), 1200);
  }

  private resolveRoute(): void {
    const url = this.router.url;
    const path = url.split('?')[0].split('/')[1] || 'providers';
    this.view.set(path.startsWith('login') ? 'login' : path.startsWith('home') ? 'home' : path.startsWith('player') ? 'player' : 'providers');
    const id = url.split('?')[0].split('/')[2] ?? null;
    const selected = PROVIDERS.find((item) => item.id === id) ?? null;
    this.provider.set(selected);
    if (!selected) return;
    if (this.view() === 'home' && selected.requiresAuth && !this.auth.isLoggedIn(selected.id)) {
      void this.router.navigate(['/login', selected.id]);
      return;
    }
    if (this.view() === 'home') void this.loadChannels(selected);
    if (this.view() === 'player') this.currentChannel.set(this.channels().find((item) => item.url === new URL(`http://local${url}`).searchParams.get('url')) ?? null);
  }

  protected openProvider(selected: Provider): void { void this.router.navigate([selected.requiresAuth && !this.auth.isLoggedIn(selected.id) ? '/login' : '/home', selected.id]); }

  protected async submitLogin(): Promise<void> {
    const selected = this.provider();
    if (!selected || !this.credentials.username.trim() || !this.credentials.password.trim()) { this.error.set('Ingresa usuario y contraseña.'); return; }
    this.loading.set(true); this.error.set('');
    try {
      const list = await this.iptv.fetchForProvider(selected, this.credentials);
      if (!list.length) throw new Error('No se encontraron canales para estas credenciales.');
      this.auth.saveSession(selected.id, this.credentials); this.auth.saveChannels(selected.id, list);
      void this.router.navigate(['/home', selected.id]);
    } catch (err) { this.error.set(err instanceof Error ? err.message : 'No se pudo iniciar sesión.'); }
    finally { this.loading.set(false); }
  }

  private async loadChannels(selected: Provider): Promise<void> {
    if (this.channels().length && this.provider()?.id === selected.id) return;
    this.loading.set(true); this.error.set('');
    try {
      const stored = selected.requiresAuth ? this.auth.getChannels(selected.id) : null;
      const list = stored ?? await this.iptv.fetchForProvider(selected, this.auth.getSession(selected.id) ?? { username: '', password: '' });
      this.channels.set(list); this.featured.set(list[0] ?? null);
      if (!list.length) this.error.set('No hay canales disponibles para este proveedor.');
    } catch (err) { this.error.set(err instanceof Error ? err.message : 'No se pudieron cargar los canales.'); }
    finally { this.loading.set(false); }
  }

  protected play(channel: Channel): void {
    this.currentChannel.set(channel);
    const selected = this.provider();
    if (selected) { localStorage.setItem(`dxdtv_last_channel_${selected.id}`, channel.url); void this.router.navigate(['/player', selected.id], { queryParams: { url: channel.url } }); }
  }

  protected logout(): void { const selected = this.provider(); if (selected) { this.auth.clearSession(selected.id); localStorage.removeItem(`dxdtv_last_channel_${selected.id}`); } this.channels.set([]); void this.router.navigate(['/providers']); }
  protected back(): void { void this.router.navigate(['/providers']); }
  protected home(): void { const selected = this.provider(); if (selected) void this.router.navigate(['/home', selected.id]); }
}
