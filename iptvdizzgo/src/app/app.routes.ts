import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'providers' },
	{ path: 'providers', loadComponent: () => import('./app').then(({ App }) => App) },
	{ path: 'login/:providerId', loadComponent: () => import('./app').then(({ App }) => App) },
	{ path: 'home/:providerId', loadComponent: () => import('./app').then(({ App }) => App) },
	{ path: 'player/:providerId', loadComponent: () => import('./app').then(({ App }) => App) },
	{ path: '**', redirectTo: 'providers' },
];
