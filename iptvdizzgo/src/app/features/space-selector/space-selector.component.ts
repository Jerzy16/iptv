import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Provider, PROVIDERS } from '../../services/providers';
import { SpaceService } from '../../core/services/space.service';
import { FocusableDirective } from '../../shared/directives/focusable.directive';

@Component({
  selector: 'app-space-selector',
  standalone: true,
  imports: [FocusableDirective],
  templateUrl: './space-selector.component.html',
  styleUrl: './space-selector.component.css',
})
export class SpaceSelectorComponent {
  protected readonly providers = PROVIDERS;
  private readonly router = inject(Router);
  private readonly spaces = inject(SpaceService);

  protected choose(provider: Provider): void {
    this.spaces.select(provider);
    void this.router.navigate([provider.requiresAuth ? '/login' : '/home', provider.id]);
  }
}
