import { parseSimulatorConfig } from './config';
import { createSimulationMessages, createVirtualDevices, expandTemplate } from './messages';

describe('device simulator messages', () => {
  it('generates deterministic unique serial numbers', () => {
    const config = parseSimulatorConfig(['--count', '2', '--serial-prefix', 'SN-TEST'], {});

    expect(createVirtualDevices(config).map((device) => device.serialNumber)).toEqual([
      'SN-TEST-000001',
      'SN-TEST-000002',
    ]);
  });

  it('uses explicit serial numbers when provided', () => {
    const config = parseSimulatorConfig(['--serials', 'SN123456,SN654321'], {});

    expect(createVirtualDevices(config).map((device) => device.serialNumber)).toEqual(['SN123456', 'SN654321']);
  });

  it('expands topic templates by serial number and tenant', () => {
    const config = parseSimulatorConfig(['--serial-prefix', 'SN-TOPIC'], {});
    const [device] = createVirtualDevices(config);

    expect(expandTemplate('tenants/{tenantId}/devices/{serialNumber}/telemetry', device)).toBe(
      'tenants/local-dev/devices/SN-TOPIC-000001/telemetry',
    );
  });

  it('generates heartbeat telemetry and update messages', () => {
    const config = parseSimulatorConfig(['--duration', '60s', '--heartbeat-interval', '30s', '--telemetry-interval', '60s'], {});

    const messages = createSimulationMessages(config);

    expect(messages.some((message) => message.kind === 'heartbeat')).toBe(true);
    expect(messages.some((message) => message.kind === 'telemetry')).toBe(true);
    expect(messages.some((message) => message.kind === 'update')).toBe(true);
    expect(messages[0].topic).toContain('devices/SN-SIM-000001/');
  });

  it('simulates invalid heartbeat payloads', () => {
    const config = parseSimulatorConfig(['--failure-mode', 'invalid-payload'], {});

    const heartbeat = createSimulationMessages(config).find((message) => message.kind === 'heartbeat');

    expect(heartbeat?.payload).not.toHaveProperty('timestamp');
  });

  it('simulates telemetry bursts', () => {
    const normal = parseSimulatorConfig(['--duration', '60s', '--telemetry-interval', '60s'], {});
    const burst = parseSimulatorConfig(['--duration', '60s', '--telemetry-interval', '60s', '--failure-mode', 'telemetry-burst'], {});

    const normalTelemetry = createSimulationMessages(normal).filter((message) => message.kind === 'telemetry');
    const burstTelemetry = createSimulationMessages(burst).filter((message) => message.kind === 'telemetry');

    expect(burstTelemetry.length).toBeGreaterThan(normalTelemetry.length);
  });

  it('simulates update failures', () => {
    const config = parseSimulatorConfig(['--failure-mode', 'update-failure'], {});

    const updatePayloads = createSimulationMessages(config)
      .filter((message) => message.kind === 'update')
      .map((message) => message.payload);

    expect(updatePayloads).toContainEqual(expect.objectContaining({ status: 'UPDATE_FAILED' }));
  });
});
