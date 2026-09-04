import { Component } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: '<span class="spinner" aria-label="Cargando"></span>',
  styles: '.spinner { display: block; width: 42px; height: 42px; border: 4px solid #40516a; border-top-color: #d9e7f5; border-radius: 50%; animation: spin .8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }',
})
export class LoadingSpinnerComponent {}
