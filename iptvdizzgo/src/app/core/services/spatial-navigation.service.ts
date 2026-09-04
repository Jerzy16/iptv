import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SpatialNavigationService {
  start(): void {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  stop(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && document.activeElement instanceof HTMLElement) {
      document.activeElement.click();
    }
  };
}
