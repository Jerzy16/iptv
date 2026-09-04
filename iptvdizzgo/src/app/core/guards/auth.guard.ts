import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PROVIDERS } from '../../services/providers';

export const authGuard: CanActivateFn = (route) => {
  const providerId = route.paramMap.get('providerId');
  const auth = inject(AuthService);
  const router = inject(Router);
  const provider = PROVIDERS.find((item) => item.id === providerId);
  return provider && (!provider.requiresAuth || auth.isLoggedIn(provider.id))
    ? true
    : router.createUrlTree(['/login', providerId]);
};
