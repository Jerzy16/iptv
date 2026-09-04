import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Channel } from '../../core/models/channel.model';
import { AuthService } from '../../core/services/auth.service';
import { ChannelService } from '../../core/services/channel.service';
import { Provider, PROVIDERS } from '../../services/providers';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [LoadingSpinnerComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  protected readonly channels = signal<Channel[]>([]);
  protected readonly featured = signal<Channel | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly provider: Provider | null;
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly channelService = inject(ChannelService);
  private readonly destroyRef = inject(DestroyRef);

  constructor(route: ActivatedRoute) {
    this.provider = PROVIDERS.find((item) => item.id === route.snapshot.paramMap.get('providerId')) ?? null;
    route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => void this.load());
  }

  private async load(): Promise<void> {
    if (!this.provider) return;
    const list = await this.channelService.load(this.provider, this.auth.getSession(this.provider.id) ?? undefined);
    this.channels.set(list);
    this.featured.set(list[0] ?? null);
    this.error.set(this.channelService.error());
    this.loading.set(false);
  }

  protected play(channel: Channel): void {
    if (this.provider) void this.router.navigate(['/player', this.provider.id], { queryParams: { url: channel.url, name: channel.name } });
  }

  protected logout(): void {
    if (!this.provider) return;
    this.auth.clearSession(this.provider.id);
    this.channelService.clear();
    void this.router.navigate(['/providers']);
  }
}
