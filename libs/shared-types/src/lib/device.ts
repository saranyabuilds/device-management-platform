export interface Device {
  id: string;
  serialNumber: string;
  firmwareVersion: string;
  model: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DECOMMISSIONED';
  lastSeenAt?: string;
}
