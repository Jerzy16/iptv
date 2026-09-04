import { AfterViewInit, Component, ElementRef, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Provider, PROVIDERS } from '../../services/providers';
import { HlsPlayerService } from './services/hls-player.service';

@Component({
  selector: 'app-player',
  standalone: true,
  templateUrl: './player.component.html',
  styleUrl: './player.component.css',
})
export class PlayerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('video', { static: true }) private readonly video!: ElementRef<HTMLVideoElement>;
  protected readonly url: string;
  protected readonly provider: Provider | null;
  protected readonly channelName: string;
  protected readonly error = signal('');
  private readonly router = inject(Router);
  private readonly player = inject(HlsPlayerService);

  constructor(route: ActivatedRoute) {
    this.url = route.snapshot.queryParamMap.get('url') ?? '';
    this.channelName = route.snapshot.queryParamMap.get('name') ?? 'Reproduciendo';
    this.provider = PROVIDERS.find((item) => item.id === route.snapshot.paramMap.get('providerId')) ?? null;
  }

  ngAfterViewInit(): void {
    this.player.attach(this.video.nativeElement, this.url, (message) => this.error.set(message));
  }

  ngOnDestroy(): void {
    this.player.destroy();
  }

  protected back(): void {
    if (this.provider) void this.router.navigate(['/home', this.provider.id]);
    else void this.router.navigate(['/providers']);
  }
}
