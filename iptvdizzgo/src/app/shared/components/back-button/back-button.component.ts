import { Component, output } from '@angular/core';

@Component({
  selector: 'app-back-button',
  standalone: true,
  template: '<button class="icon-button" type="button" aria-label="Volver" (click)="back.emit()">&#8592;</button>',
  styles: '.icon-button { width: 48px; height: 48px; display: grid; place-items: center; border: 1px solid #6a7d95; border-radius: 50%; color: #fff; background: #18212ecc; font-size: 1.4rem; }',
})
export class BackButtonComponent {
  readonly back = output<void>();
}
