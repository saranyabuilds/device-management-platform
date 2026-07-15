import { parseDuration, parseSimulatorConfig } from './config';

describe('parseSimulatorConfig', () => {
  it('parses CLI options and keeps dry-run enabled by default', () => {
    const config = parseSimulatorConfig([
      '--count',
      '3',
      '--serial-prefix',
      'SN-LOAD',
      '--heartbeat-interval',
      '5s',
      '--telemetry-interval',
      '1m',
      '--duration',
      '2m',
      '--failure-mode',
      'telemetry-burst',
      '--firmware-version',
      '2.1.0',
      '--model',
      'gateway-x',
      '--tenant-id',
      'tenant-a',
    ], {});

    expect(config.count).toBe(3);
    expect(config.serialPrefix).toBe('SN-LOAD');
    expect(config.heartbeatIntervalMs).toBe(5000);
    expect(config.telemetryIntervalMs).toBe(60_000);
    expect(config.durationMs).toBe(120_000);
    expect(config.failureMode).toBe('telemetry-burst');
    expect(config.firmwareVersion).toBe('2.1.0');
    expect(config.model).toBe('gateway-x');
    expect(config.tenantId).toBe('tenant-a');
    expect(config.dryRun).toBe(true);
  });

  it('uses environment values for broker and topic templates', () => {
    const config = parseSimulatorConfig([], {
      DEVICE_SIMULATOR_BROKER_URL: 'ssl://emqx:8883',
      DEVICE_HEARTBEAT_TOPIC: 'custom/{serialNumber}/heartbeat',
      DEVICE_TELEMETRY_TOPIC: 'custom/{serialNumber}/telemetry',
      DEVICE_SIMULATOR_DRY_RUN: 'false',
    });

    expect(config.mqtt.brokerUrl).toBe('ssl://emqx:8883');
    expect(config.heartbeatTopicTemplate).toBe('custom/{serialNumber}/heartbeat');
    expect(config.telemetryTopicTemplate).toBe('custom/{serialNumber}/telemetry');
    expect(config.dryRun).toBe(false);
  });

  it('parses explicit serial lists', () => {
    const config = parseSimulatorConfig(['--serials', 'SN123456,SN654321'], {});

    expect(config.serials).toEqual(['SN123456', 'SN654321']);
  });

  it('rejects unknown failure modes', () => {
    expect(() => parseSimulatorConfig(['--failure-mode', 'bad-mode'], {})).toThrow('Unsupported failure mode');
  });
});

describe('parseDuration', () => {
  it('supports milliseconds, seconds, minutes, and hours', () => {
    expect(parseDuration('250ms')).toBe(250);
    expect(parseDuration('5s')).toBe(5000);
    expect(parseDuration('2m')).toBe(120_000);
    expect(parseDuration('1h')).toBe(3_600_000);
  });
});
