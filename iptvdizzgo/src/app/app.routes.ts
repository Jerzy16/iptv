import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { spaceGuard } from './core/guards/space.guard';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'providers' },
	{ path: 'providers', loadComponent: () => import('./features/space-selector/space-selector.component').then(({ SpaceSelectorComponent }) => SpaceSelectorComponent) },
	{ path: 'login/:providerId', canActivate: [spaceGuard], loadComponent: () => import('./features/auth/auth.component').then(({ AuthComponent }) => AuthComponent) },
	{ path: 'home/:providerId', canActivate: [spaceGuard, authGuard], loadComponent: () => import('./features/dashboard/dashboard.component').then(({ DashboardComponent }) => DashboardComponent) },
	{ path: 'player/:providerId', canActivate: [spaceGuard, authGuard], loadComponent: () => import('./features/player/player.component').then(({ PlayerComponent }) => PlayerComponent) },
	{ path: '**', redirectTo: 'providers' },
];
