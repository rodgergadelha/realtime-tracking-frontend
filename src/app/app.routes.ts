import { Routes } from '@angular/router';
import { DriverComponent } from './components/driver/driver';
import { ClientComponent } from './components/client/client';

export const routes: Routes = [
  { path: 'motorista', component: DriverComponent },
  { path: 'cliente', component: ClientComponent },
  { path: '', redirectTo: '/motorista', pathMatch: 'full' }
];