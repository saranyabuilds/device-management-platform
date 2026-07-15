import type { FailureMode, SimulatorConfig } from './config';

export interface VirtualDevice {
  serialNumber: string;
  deviceId: string;
  model: string;
  firmwareVersion: string;
  tenantId: string;
}

export type SimulatedMessageKind = 'heartbeat' | 'telemetry' | 'update';

export interface SimulatedMessage {
  device: VirtualDevice;
  kind: SimulatedMessageKind;
  topic: string;
  payload: unknown;
  timestamp: Date;
  failureMode: FailureMode;
}

export function createVirtualDevices(config: SimulatorConfig): VirtualDevice[] {
  const serialNumbers = config.serials.length > 0
    ? config.serials
    : Array.from({ length: config.count }, (_, index) => `${config.serialPrefix}-${String(index + 1).padStart(6, '0')}`);

  return serialNumbers.map((serialNumber) => {
    return {
      serialNumber,
      deviceId: `dev-${serialNumber}`,
      model: config.model,
      firmwareVersion: config.firmwareVersion,
      tenantId: config.tenantId,
    };
  });
}

export function expandTemplate(template: string, device: VirtualDevice): string {
  return template
    .split('{serialNumber}').join(device.serialNumber)
    .split('{deviceId}').join(device.deviceId)
    .split('{tenantId}').join(device.tenantId)
    .split('{model}').join(device.model);
}

export function credentialFromTemplate(template: string, device: VirtualDevice): string {
  return expandTemplate(template, device);
}

export function createSimulationMessages(config: SimulatorConfig): SimulatedMessage[] {
  const devices = createVirtualDevices(config);
  const messages: SimulatedMessage[] = [];

  for (const device of devices) {
    if (config.failureMode === 'offline') {
      continue;
    }

    messages.push(...heartbeatMessages(config, device));
    messages.push(...telemetryMessages(config, device));
    messages.push(...updateMessages(config, device));
  }

  return messages.sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
}

function heartbeatMessages(config: SimulatorConfig, device: VirtualDevice): SimulatedMessage[] {
  const messages: SimulatedMessage[] = [];
  const count = Math.max(1, Math.floor(config.durationMs / config.heartbeatIntervalMs));

  for (let index = 0; index < count; index += 1) {
    const offset = config.failureMode === 'delayed-heartbeat' ? config.heartbeatIntervalMs * 2 : 0;
    const timestamp =
      config.failureMode === 'out-of-order-heartbeat' && index === count - 1
        ? new Date(config.startedAt.getTime() - config.heartbeatIntervalMs)
        : new Date(config.startedAt.getTime() + index * config.heartbeatIntervalMs + offset);

    messages.push({
      device,
      kind: 'heartbeat',
      topic:
        config.failureMode === 'unauthorized-topic'
          ? 'devices/OTHER_DEVICE/heartbeat'
          : expandTemplate(config.heartbeatTopicTemplate, device),
      payload:
        config.failureMode === 'invalid-payload'
          ? { firmwareVersion: device.firmwareVersion, status: 'ONLINE' }
          : {
              timestamp: timestamp.toISOString(),
              firmwareVersion: device.firmwareVersion,
              status: 'ONLINE',
            },
      timestamp,
      failureMode: config.failureMode,
    });
  }

  return messages;
}

function telemetryMessages(config: SimulatorConfig, device: VirtualDevice): SimulatedMessage[] {
  const messages: SimulatedMessage[] = [];
  const multiplier = config.failureMode === 'telemetry-burst' ? 10 : 1;
  const count = Math.max(1, Math.floor(config.durationMs / config.telemetryIntervalMs)) * multiplier;

  for (let index = 0; index < count; index += 1) {
    const timestamp = new Date(config.startedAt.getTime() + index * Math.max(1, Math.floor(config.telemetryIntervalMs / multiplier)));
    messages.push({
      device,
      kind: 'telemetry',
      topic: expandTemplate(config.telemetryTopicTemplate, device),
      payload: {
        timestamp: timestamp.toISOString(),
        battery: clamp(100 - index, 5, 100),
        temperatureCelsius: 21 + ((index + device.serialNumber.length) % 15),
        signalStrengthDbm: -45 - (index % 25),
        memoryUsagePercent: 35 + (index % 40),
        cpuUsagePercent: 10 + (index % 70),
        uptimeSeconds: index * Math.floor(config.telemetryIntervalMs / 1000),
      },
      timestamp,
      failureMode: config.failureMode,
    });
  }

  return messages;
}

function updateMessages(config: SimulatorConfig, device: VirtualDevice): SimulatedMessage[] {
  const base = config.startedAt.getTime() + Math.floor(config.durationMs / 2);
  const statuses = config.failureMode === 'update-failure'
    ? ['UPDATE_STARTED', 'UPDATE_PROGRESS', 'UPDATE_FAILED']
    : ['UPDATE_STARTED', 'UPDATE_PROGRESS', 'UPDATE_COMPLETED'];

  return statuses.map((status, index) => {
    const timestamp = new Date(base + index * 1000);
    return {
      device,
      kind: 'update',
      topic: expandTemplate(config.updatesTopicTemplate, device),
      payload: {
        timestamp: timestamp.toISOString(),
        firmwareVersion: config.firmwareVersion,
        targetFirmwareVersion: `${config.firmwareVersion}-next`,
        status,
        progressPercent: status === 'UPDATE_STARTED' ? 0 : status === 'UPDATE_PROGRESS' ? 50 : 100,
        failureReason: status === 'UPDATE_FAILED' ? 'simulated update failure' : undefined,
      },
      timestamp,
      failureMode: config.failureMode,
    };
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
