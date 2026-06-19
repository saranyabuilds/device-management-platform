import { NavItem } from './nav-item.model';

export const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
  { label: 'Devices', icon: 'devices', route: '/devices', permission: 'DEVICE_READ' },
  { label: 'Firmware', icon: 'memory', route: '/firmware' },
  { label: 'OTA Updates', icon: 'system_update_alt', route: '/ota-updates' },
  { label: 'Users', icon: 'group', route: '/users', permission: 'ROLE_MANAGE' },
  { label: 'Audit Logs', icon: 'fact_check', route: '/audit-logs', permission: 'AUDIT_READ' },
  { label: 'Settings', icon: 'settings', route: '/settings' },
];
