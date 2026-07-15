import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type FailureMode =
  | 'none'
  | 'offline'
  | 'delayed-heartbeat'
  | 'invalid-payload'
  | 'out-of-order-heartbeat'
  | 'telemetry-burst'
  | 'unauthorized-topic'
  | 'rejected-auth'
  | 'update-failure';

export interface MqttConfig {
  brokerUrl: string;
  caFile?: string;
  usernameTemplate: string;
  passwordTemplate: string;
  clientIdTemplate: string;
  cleanStart: boolean;
  keepAliveSeconds: number;
  connectTimeoutMs: number;
}

export interface SimulatorConfig {
  count: number;
  serials: string[];
  serialPrefix: string;
  firmwareVersion: string;
  model: string;
  tenantId: string;
  heartbeatIntervalMs: number;
  telemetryIntervalMs: number;
  durationMs: number;
  failureMode: FailureMode;
  dryRun: boolean;
  heartbeatTopicTemplate: string;
  telemetryTopicTemplate: string;
  commandsTopicTemplate: string;
  updatesTopicTemplate: string;
  startedAt: Date;
  mqtt: MqttConfig;
}

type ConfigInput = Partial<
  Omit<SimulatorConfig, 'mqtt' | 'startedAt'> & Partial<MqttConfig>
>;

const defaults: SimulatorConfig = {
  count: 1,
  serials: [],
  serialPrefix: 'SN-SIM',
  firmwareVersion: '1.0.0',
  model: 'virtual-device',
  tenantId: 'local-dev',
  heartbeatIntervalMs: 30_000,
  telemetryIntervalMs: 60_000,
  durationMs: 60_000,
  failureMode: 'none',
  dryRun: true,
  heartbeatTopicTemplate: 'devices/{serialNumber}/heartbeat',
  telemetryTopicTemplate: 'devices/{serialNumber}/telemetry',
  commandsTopicTemplate: 'devices/{serialNumber}/commands',
  updatesTopicTemplate: 'devices/{serialNumber}/updates',
  startedAt: new Date(),
  mqtt: {
    brokerUrl: 'ssl://localhost:8883',
    caFile: 'infra/emqx/certs/dev/ca.crt',
    usernameTemplate: 'device_{serialNumber}',
    passwordTemplate: 'dev-device-{serialNumber}-change-me',
    clientIdTemplate: 'simulator-{serialNumber}',
    cleanStart: false,
    keepAliveSeconds: 60,
    connectTimeoutMs: 5000,
  },
};

const failureModes = new Set<FailureMode>([
  'none',
  'offline',
  'delayed-heartbeat',
  'invalid-payload',
  'out-of-order-heartbeat',
  'telemetry-burst',
  'unauthorized-topic',
  'rejected-auth',
  'update-failure',
]);

export function parseSimulatorConfig(argv: string[], env: NodeJS.ProcessEnv = process.env): SimulatorConfig {
  const cli = parseArgs(argv);
  const fileConfig = cli.config ? readConfigFile(cli.config) : {};
  const merged = {
    ...envConfig(env),
    ...fileConfig,
    ...cli,
  };

  const failureMode = stringValue(merged.failureMode, defaults.failureMode) as FailureMode;
  if (!failureModes.has(failureMode)) {
    throw new Error(`Unsupported failure mode: ${failureMode}`);
  }

  return {
    count: positiveInteger(merged.count, defaults.count, 'count'),
    serials: stringListValue(merged.serials, defaults.serials),
    serialPrefix: stringValue(merged.serialPrefix, defaults.serialPrefix),
    firmwareVersion: stringValue(merged.firmwareVersion, defaults.firmwareVersion),
    model: stringValue(merged.model, defaults.model),
    tenantId: stringValue(merged.tenantId, defaults.tenantId),
    heartbeatIntervalMs: durationValue(merged.heartbeatIntervalMs, defaults.heartbeatIntervalMs, 'heartbeatIntervalMs'),
    telemetryIntervalMs: durationValue(merged.telemetryIntervalMs, defaults.telemetryIntervalMs, 'telemetryIntervalMs'),
    durationMs: durationValue(merged.durationMs, defaults.durationMs, 'durationMs'),
    failureMode,
    dryRun: booleanValue(merged.dryRun, defaults.dryRun),
    heartbeatTopicTemplate: stringValue(merged.heartbeatTopicTemplate, defaults.heartbeatTopicTemplate),
    telemetryTopicTemplate: stringValue(merged.telemetryTopicTemplate, defaults.telemetryTopicTemplate),
    commandsTopicTemplate: stringValue(merged.commandsTopicTemplate, defaults.commandsTopicTemplate),
    updatesTopicTemplate: stringValue(merged.updatesTopicTemplate, defaults.updatesTopicTemplate),
    startedAt: new Date(),
    mqtt: {
      brokerUrl: stringValue(merged.brokerUrl, defaults.mqtt.brokerUrl),
      caFile: optionalString(merged.caFile, defaults.mqtt.caFile),
      usernameTemplate: stringValue(merged.usernameTemplate, defaults.mqtt.usernameTemplate),
      passwordTemplate: stringValue(merged.passwordTemplate, defaults.mqtt.passwordTemplate),
      clientIdTemplate: stringValue(merged.clientIdTemplate, defaults.mqtt.clientIdTemplate),
      cleanStart: booleanValue(merged.cleanStart, defaults.mqtt.cleanStart),
      keepAliveSeconds: positiveInteger(merged.keepAliveSeconds, defaults.mqtt.keepAliveSeconds, 'keepAliveSeconds'),
      connectTimeoutMs: durationValue(merged.connectTimeoutMs, defaults.mqtt.connectTimeoutMs, 'connectTimeoutMs'),
    },
  };
}

function parseArgs(argv: string[]): ConfigInput & { config?: string } {
  const parsed: ConfigInput & { config?: string } = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const [rawKey, inlineValue] = arg.slice(2).split('=', 2);
    const key = kebabToCamel(rawKey);
    const value = inlineValue ?? (argv[index + 1]?.startsWith('--') ? 'true' : argv[++index]);

    switch (key) {
      case 'config':
        parsed.config = value;
        break;
      case 'count':
      case 'heartbeatIntervalMs':
      case 'telemetryIntervalMs':
      case 'durationMs':
      case 'keepAliveSeconds':
      case 'connectTimeoutMs':
        parsed[key] = Number(value);
        break;
      case 'serials':
        parsed.serials = value.split(',').map((serial) => serial.trim()).filter(Boolean);
        break;
      case 'dryRun':
      case 'cleanStart':
        parsed[key] = value === 'true';
        break;
      case 'heartbeatInterval':
        parsed.heartbeatIntervalMs = parseDuration(value);
        break;
      case 'telemetryInterval':
        parsed.telemetryIntervalMs = parseDuration(value);
        break;
      case 'duration':
        parsed.durationMs = parseDuration(value);
        break;
      case 'failureMode':
        parsed.failureMode = value as FailureMode;
        break;
      case 'serialPrefix':
      case 'brokerUrl':
      case 'caFile':
      case 'usernameTemplate':
      case 'passwordTemplate':
      case 'clientIdTemplate':
      case 'firmwareVersion':
      case 'model':
      case 'tenantId':
      case 'heartbeatTopicTemplate':
      case 'telemetryTopicTemplate':
      case 'commandsTopicTemplate':
      case 'updatesTopicTemplate':
        parsed[key] = value;
        break;
      default:
        throw new Error(`Unsupported option: --${rawKey}`);
    }
  }

  return parsed;
}

function envConfig(env: NodeJS.ProcessEnv): ConfigInput {
  return {
    count: numberFromEnv(env.DEVICE_SIMULATOR_COUNT),
    serialPrefix: env.DEVICE_SIMULATOR_SERIAL_PREFIX,
    serials: env.DEVICE_SIMULATOR_SERIALS?.split(',').map((serial) => serial.trim()).filter(Boolean),
    brokerUrl: env.DEVICE_SIMULATOR_BROKER_URL ?? env.MQTT_SECURE_BROKER_URL,
    caFile: env.DEVICE_SIMULATOR_CA_FILE,
    usernameTemplate: env.DEVICE_SIMULATOR_USERNAME_TEMPLATE,
    passwordTemplate: env.DEVICE_SIMULATOR_PASSWORD_TEMPLATE,
    heartbeatIntervalMs: durationFromEnv(env.DEVICE_SIMULATOR_HEARTBEAT_INTERVAL),
    telemetryIntervalMs: durationFromEnv(env.DEVICE_SIMULATOR_TELEMETRY_INTERVAL),
    durationMs: durationFromEnv(env.DEVICE_SIMULATOR_DURATION),
    failureMode: env.DEVICE_SIMULATOR_FAILURE_MODE as FailureMode | undefined,
    firmwareVersion: env.DEVICE_SIMULATOR_FIRMWARE_VERSION,
    model: env.DEVICE_SIMULATOR_MODEL,
    tenantId: env.DEVICE_SIMULATOR_TENANT_ID,
    dryRun: booleanFromEnv(env.DEVICE_SIMULATOR_DRY_RUN),
    heartbeatTopicTemplate: env.DEVICE_HEARTBEAT_TOPIC,
    telemetryTopicTemplate: env.DEVICE_TELEMETRY_TOPIC,
  };
}

function readConfigFile(path: string): ConfigInput {
  const absolutePath = resolve(path);
  return JSON.parse(readFileSync(absolutePath, 'utf8')) as ConfigInput;
}

function kebabToCamel(value: string): keyof ConfigInput | 'config' | 'heartbeatInterval' | 'telemetryInterval' | 'duration' {
  return value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()) as keyof ConfigInput;
}

function positiveInteger(value: unknown, fallback: number, name: string): number {
  const resolved = numberValue(value, fallback);
  if (!Number.isInteger(resolved) || resolved < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return resolved;
}

function durationValue(value: unknown, fallback: number, name: string): number {
  const resolved = numberValue(value, fallback);
  if (!Number.isFinite(resolved) || resolved < 1) {
    throw new Error(`${name} must be a positive duration in milliseconds`);
  }
  return resolved;
}

function numberValue(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return typeof value === 'number' ? value : Number(value);
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function stringListValue(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : fallback;
}

function optionalString(value: unknown, fallback: string | undefined): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function booleanFromEnv(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value === 'true';
}

function numberFromEnv(value: string | undefined): number | undefined {
  return value === undefined ? undefined : Number(value);
}

function durationFromEnv(value: string | undefined): number | undefined {
  return value === undefined ? undefined : parseDuration(value);
}

export function parseDuration(value: string): number {
  const match = value.match(/^(\d+)(ms|s|m|h)?$/);
  if (!match) {
    throw new Error(`Invalid duration: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? 'ms';
  const multiplier = unit === 'h' ? 3_600_000 : unit === 'm' ? 60_000 : unit === 's' ? 1000 : 1;
  return amount * multiplier;
}
