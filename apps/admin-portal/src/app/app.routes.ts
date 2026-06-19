import { Route } from '@angular/router';
import { authChildGuard, authGuard } from './core/auth/auth.guard';
import { AdminShellComponent } from './layout/admin-shell/admin-shell.component';
import { AuditLogsPageComponent } from './pages/audit-logs/audit-logs-page.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';
import { DevicesPageComponent } from './pages/devices/devices-page.component';
import { FirmwarePageComponent } from './pages/firmware/firmware-page.component';
import { LoginPageComponent } from './pages/login/login-page.component';
import { NotFoundPageComponent } from './pages/not-found/not-found-page.component';
import { OtaUpdatesPageComponent } from './pages/ota-updates/ota-updates-page.component';
import { SettingsPageComponent } from './pages/settings/settings-page.component';
import { UsersPageComponent } from './pages/users/users-page.component';

export const appRoutes: Route[] = [
  { path: 'login', component: LoginPageComponent },
  {
    path: '',
    component: AdminShellComponent,
    canActivate: [authGuard],
    canActivateChild: [authChildGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardPageComponent, title: 'Dashboard' },
      { path: 'devices', component: DevicesPageComponent, title: 'Devices' },
      { path: 'firmware', component: FirmwarePageComponent, title: 'Firmware' },
      { path: 'ota-updates', component: OtaUpdatesPageComponent, title: 'OTA Updates' },
      {
        path: 'users',
        component: UsersPageComponent,
        title: 'Users',
        data: { permission: 'ROLE_MANAGE' },
      },
      {
        path: 'audit-logs',
        component: AuditLogsPageComponent,
        title: 'Audit Logs',
        data: { permission: 'AUDIT_READ' },
      },
      { path: 'settings', component: SettingsPageComponent, title: 'Settings' },
    ],
  },
  { path: '**', component: NotFoundPageComponent },
];
