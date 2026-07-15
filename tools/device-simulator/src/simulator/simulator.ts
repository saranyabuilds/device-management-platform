import type { MqttPublisher } from './mqtt-publisher';
import type { SimulatorConfig } from './config';
import { createSimulationMessages, credentialFromTemplate } from './messages';

export interface SimulationLog {
  level: 'info' | 'warn' | 'error';
  event: string;
  serialNumber?: string;
  topic?: string;
  messageKind?: string;
  failureMode?: string;
  dryRun?: boolean;
  error?: string;
}

export interface SimulationStats {
  devicesStarted: number;
  messagesGenerated: number;
  messagesPublished: number;
  failuresSimulated: number;
  publishErrors: number;
  durationMs: number;
}

export interface SimulationResult {
  logs: SimulationLog[];
  stats: SimulationStats;
}

export interface Publisher {
  publish(options: {
    clientId: string;
    username: string;
    password: string;
    topic: string;
    payload: string;
  }): Promise<void>;
}

export async function runSimulation(config: SimulatorConfig, publisher?: MqttPublisher | Publisher): Promise<SimulationResult> {
  const startedAt = Date.now();
  const messages = createSimulationMessages(config);
  const serialNumbers = new Set(messages.map((message) => message.device.serialNumber));
  const logs: SimulationLog[] = [];
  let messagesPublished = 0;
  let publishErrors = 0;

  for (const message of messages) {
    logs.push({
      level: 'info',
      event: config.dryRun ? 'message_generated' : 'message_publish_attempt',
      serialNumber: message.device.serialNumber,
      topic: message.topic,
      messageKind: message.kind,
      failureMode: message.failureMode,
      dryRun: config.dryRun,
    });

    if (config.dryRun || !publisher) {
      continue;
    }

    try {
      const password =
        config.failureMode === 'rejected-auth'
          ? 'invalid-password-for-rejected-auth-simulation'
          : credentialFromTemplate(config.mqtt.passwordTemplate, message.device);

      await publisher.publish({
        clientId: credentialFromTemplate(config.mqtt.clientIdTemplate, message.device),
        username: credentialFromTemplate(config.mqtt.usernameTemplate, message.device),
        password,
        topic: message.topic,
        payload: JSON.stringify(message.payload),
      });
      messagesPublished += 1;
    } catch (error) {
      publishErrors += 1;
      logs.push({
        level: 'error',
        event: 'message_publish_failed',
        serialNumber: message.device.serialNumber,
        topic: message.topic,
        messageKind: message.kind,
        failureMode: message.failureMode,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const failuresSimulated = config.failureMode === 'none' ? 0 : messages.length || config.count;

  return {
    logs,
    stats: {
      devicesStarted: config.failureMode === 'offline' ? config.count : serialNumbers.size,
      messagesGenerated: messages.length,
      messagesPublished,
      failuresSimulated,
      publishErrors,
      durationMs: Date.now() - startedAt,
    },
  };
}
