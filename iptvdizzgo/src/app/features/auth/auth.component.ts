import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ChannelService } from '../../core/services/channel.service';
import { Provider, PROVIDERS } from '../../services/providers';
import { BackButtonComponent } from '../../shared/components/back-button/back-button.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, BackButtonComponent, LoadingSpinnerComponent],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css',
})
export class AuthComponent {
  protected readonly provider: Provider | null;
  protected username = '';
  protected password = '';
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly channels = inject(ChannelService);

  constructor(route: ActivatedRoute) {
    this.provider = PROVIDERS.find((item) => item.id === route.snapshot.paramMap.get('providerId')) ?? null;
  }

  protected async submit(): Promise<void> {
    if (!this.provider || !this.username.trim() || !this.password.trim()) {
      this.error.set('Ingresa usuario y contraseña.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const credentials = { username: this.username.trim(), password: this.password };
    try {
      const channels = await this.channels.load(this.provider, credentials);
      if (!channels.length) {
        this.error.set(this.channels.error() || 'No se encontraron canales para estas credenciales.');
      } else {
        this.auth.saveSession(this.provider.id, credentials);
        void this.router.navigate(['/home', this.provider.id]);
      }
    } catch {
      this.error.set('No fue posible consultar el servidor IPTV.');
    } finally {
      this.loading.set(false);
    }
  }

  protected routerBack(): void {
    void this.router.navigate(['/providers']);
  }
}
