import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin.guard';
import { authorizedGuard } from './core/guards/authorized.guard';
import { guestGuard } from './core/guards/guest.guard';
import { capabilityGuard } from './core/guards/capability.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/authentication/login/login').then((component) => component.Login),
    title: 'Acceso | Sistema de Inventario TUP',
  },
  {
    path: '',
    canActivate: [authorizedGuard],
    loadComponent: () =>
      import('./layout/shell/admin-shell').then((component) => component.AdminShell),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then(
            (component) => component.DashboardPage,
          ),
        title: 'Dashboard | Sistema de Inventario TUP',
      },
      {
        path: 'usuarios',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/users/users-page/users-page').then((component) => component.UsersPage),
        title: 'Usuarios | Sistema de Inventario TUP',
      },
      {
        path: 'configuraciones/categorias',
        canActivate: [capabilityGuard('categorias')],
        loadComponent: () =>
          import('./features/categories/categories-page/categories-page').then(
            (component) => component.CategoriesPage,
          ),
        title: 'Categorías | Sistema de Inventario TUP',
      },
      {
        path: 'configuraciones/fabricantes',
        canActivate: [capabilityGuard('fabricantes')],
        loadComponent: () =>
          import('./features/manufacturers/manufacturers-page/manufacturers-page').then(
            (component) => component.ManufacturersPage,
          ),
        title: 'Fabricantes | Sistema de Inventario TUP',
      },
      {
        path: 'configuraciones/modelos-activos',
        canActivate: [capabilityGuard('modelosActivos')],
        loadComponent: () =>
          import('./features/asset-models/asset-models-page/asset-models-page').then(
            (component) => component.AssetModelsPage,
          ),
        title: 'Modelos de activos | Sistema de Inventario TUP',
      },
      {
        path: 'configuraciones/campus',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/campuses/campuses-page/campuses-page').then(
            (component) => component.CampusesPage,
          ),
        title: 'Campus | Sistema de Inventario TUP',
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
