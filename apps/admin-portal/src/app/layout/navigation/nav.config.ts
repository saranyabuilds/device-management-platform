import { NavItem } from './nav-item.model';

export const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
  { label: 'Devices', icon: 'devices', route: '/devices' },
  { label: 'Firmware', icon: 'memory', route: '/firmware' },
  { label: 'OTA Updates', icon: 'system_update_alt', route: '/ota-updates' },
  { label: 'Users', icon: 'group', route: '/users' },
  { label: 'Audit Logs', icon: 'fact_check', route: '/audit-logs' },
  { label: 'Settings', icon: 'settings', route: '/settings' },
];
