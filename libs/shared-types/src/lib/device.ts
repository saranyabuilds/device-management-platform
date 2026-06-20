export interface Device {
  id: string;
  serialNumber: string;
  firmwareVersion: string;
  model: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DECOMMISSIONED';
  connectivityStatus?: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  lastSeenAt?: string;
}
