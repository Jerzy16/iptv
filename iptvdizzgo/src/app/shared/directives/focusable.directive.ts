import { Directive, HostBinding } from '@angular/core';

@Directive({ selector: '[appFocusable]', standalone: true })
export class FocusableDirective {
  @HostBinding('attr.tabindex') readonly tabIndex = '0';
}
