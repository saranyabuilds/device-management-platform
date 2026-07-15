import { readFileSync } from 'node:fs';
import * as net from 'node:net';
import * as tls from 'node:tls';
import type { Socket } from 'node:net';
import type { MqttConfig } from './config';

export interface PublishOptions {
  clientId: string;
  username: string;
  password: string;
  topic: string;
  payload: string;
}

interface BrokerEndpoint {
  host: string;
  port: number;
  secure: boolean;
}

export class MqttPublisher {
  constructor(private readonly config: MqttConfig) {}

  async publish(options: PublishOptions): Promise<void> {
    const endpoint = parseBrokerUrl(this.config.brokerUrl);
    const socket = await this.connectSocket(endpoint);

    try {
      socket.write(connectPacket({
        clientId: options.clientId,
        username: options.username,
        password: options.password,
        cleanStart: this.config.cleanStart,
        keepAliveSeconds: this.config.keepAliveSeconds,
      }));
      await waitForConnack(socket, this.config.connectTimeoutMs);

      socket.write(publishPacket(options.topic, options.payload));
      socket.write(Buffer.from([0xe0, 0x00]));
    } finally {
      socket.end();
    }
  }

  private connectSocket(endpoint: BrokerEndpoint): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`MQTT connection timed out after ${this.config.connectTimeoutMs}ms`));
      }, this.config.connectTimeoutMs);

      const onConnect = (socket: Socket) => {
        clearTimeout(timeout);
        resolve(socket);
      };

      const onError = (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      };

      if (endpoint.secure) {
        const socket = tls.connect({
          host: endpoint.host,
          port: endpoint.port,
          ca: this.config.caFile ? readFileSync(this.config.caFile) : undefined,
          servername: endpoint.host === 'localhost' ? 'localhost' : endpoint.host,
        });
        socket.once('secureConnect', () => onConnect(socket));
        socket.once('error', onError);
        return;
      }

      const socket = net.connect({ host: endpoint.host, port: endpoint.port });
      socket.once('connect', () => onConnect(socket));
      socket.once('error', onError);
    });
  }
}

export function parseBrokerUrl(value: string): BrokerEndpoint {
  const url = new URL(value.replace(/^ssl:\/\//, 'mqtts://').replace(/^tcp:\/\//, 'mqtt://'));
  const secure = url.protocol === 'mqtts:';
  if (url.protocol !== 'mqtt:' && url.protocol !== 'mqtts:') {
    throw new Error(`Unsupported MQTT broker protocol: ${url.protocol}`);
  }

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : secure ? 8883 : 1883,
    secure,
  };
}

function connectPacket(options: {
  clientId: string;
  username: string;
  password: string;
  cleanStart: boolean;
  keepAliveSeconds: number;
}): Buffer {
  const variableHeader = Buffer.concat([
    encodeString('MQTT'),
    Buffer.from([0x04, connectFlags(options.cleanStart), options.keepAliveSeconds >> 8, options.keepAliveSeconds & 0xff]),
  ]);
  const payload = Buffer.concat([encodeString(options.clientId), encodeString(options.username), encodeString(options.password)]);
  const remainingLength = encodeRemainingLength(variableHeader.length + payload.length);
  return Buffer.concat([Buffer.from([0x10]), remainingLength, variableHeader, payload]);
}

function connectFlags(cleanStart: boolean): number {
  const username = 0x80;
  const password = 0x40;
  const cleanSession = cleanStart ? 0x02 : 0x00;
  return username | password | cleanSession;
}

function publishPacket(topic: string, payload: string): Buffer {
  const body = Buffer.concat([encodeString(topic), Buffer.from(payload)]);
  return Buffer.concat([Buffer.from([0x30]), encodeRemainingLength(body.length), body]);
}

function encodeString(value: string): Buffer {
  const content = Buffer.from(value);
  const length = Buffer.alloc(2);
  length.writeUInt16BE(content.length);
  return Buffer.concat([length, content]);
}

function encodeRemainingLength(length: number): Buffer {
  const encoded: number[] = [];
  let value = length;
  do {
    let digit = value % 128;
    value = Math.floor(value / 128);
    if (value > 0) {
      digit |= 0x80;
    }
    encoded.push(digit);
  } while (value > 0);
  return Buffer.from(encoded);
}

function waitForConnack(socket: Socket, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for MQTT CONNACK'));
    }, timeoutMs);

    const onData = (data: Buffer) => {
      cleanup();
      if (data.length < 4 || data[0] !== 0x20 || data[3] !== 0x00) {
        reject(new Error(`MQTT connection rejected with CONNACK code ${data[3] ?? 'unknown'}`));
        return;
      }
      resolve();
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off('data', onData);
      socket.off('error', onError);
    };

    socket.once('data', onData);
    socket.once('error', onError);
  });
}
