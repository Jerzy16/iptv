import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PROVIDERS } from '../../services/providers';

export const spaceGuard: CanActivateFn = (route) => {
  const providerId = route.paramMap.get('providerId');
  return PROVIDERS.some((provider) => provider.id === providerId)
    ? true
    : inject(Router).createUrlTree(['/providers']);
};
