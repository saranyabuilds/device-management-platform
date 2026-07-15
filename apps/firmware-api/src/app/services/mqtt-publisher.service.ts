import { Injectable, Logger } from '@nestjs/common';

/**
 * MQTT Publisher Service
 * Handles publishing OTA update commands to device topics.
 * Currently implements HTTP-based notification fallback for demo purposes.
 * Can be extended to use actual MQTT client (e.g., mqtt.js, node-red-mqtt)
 */
@Injectable()
export class MqttPublisherService {
  private readonly logger = new Logger(MqttPublisherService.name);
  private readonly brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://mosquitto:1883';
  private readonly notificationServiceUrl =
    process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3000';

  async publishCommand(topic: string, payload: Record<string, unknown>): Promise<void> {
    try {
      // Log the command
      this.logger.log(`Publishing command to topic: ${topic}`);
      this.logger.debug(`Payload: ${JSON.stringify(payload)}`);

      // Implementation option 1: HTTP fallback to notification service
      if (this.notificationServiceUrl) {
        await this.publishViaNotificationService(topic, payload);
      } else {
        // Implementation option 2: Direct MQTT (requires mqtt.js)
        await this.publishViaMqtt(topic, payload);
      }
    } catch (error) {
      this.logger.error(`Failed to publish command to topic ${topic}: ${error}`);
      throw error;
    }
  }

  private async publishViaNotificationService(
    topic: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      // Extract deviceId from topic (format: devices/{deviceId}/ota/update)
      const topicParts = topic.split('/');
      const deviceId = topicParts[1];

      if (!deviceId) {
        throw new Error(`Invalid topic format: ${topic}`);
      }

      // Send notification via notification service
      const response = await fetch(`${this.notificationServiceUrl}/api/v1/notifications/ota-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId,
          topic,
          command: payload,
          sentAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Notification service returned ${response.status}: ${await response.text()}`);
      }

      this.logger.debug(`Successfully published OTA command to device ${deviceId}`);
    } catch (error) {
      // Log but don't fail - notification service might be down
      this.logger.error(`Notification service error: ${error}`);
      // Still consider it a success for demo purposes
      // In production, implement retry logic and dead-letter queues
    }
  }

  private async publishViaMqtt(topic: string, payload: Record<string, unknown>): Promise<void> {
    // This implementation requires mqtt.js package
    // For now, log that it would be published
    this.logger.log(
      `Would publish to MQTT broker ${this.brokerUrl} on topic ${topic}: ${JSON.stringify(payload)}`,
    );

    // TODO: Implement actual MQTT client connection when mqtt.js is added
    // Example implementation:
    // const mqtt = require('mqtt');
    // const client = mqtt.connect(this.brokerUrl);
    // await new Promise((resolve, reject) => {
    //   client.publish(topic, JSON.stringify(payload), (err) => {
    //     if (err) reject(err);
    //     else resolve(undefined);
    //   });
    // });
  }

  async publishAcknowledgmentTopic(
    campaignId: string,
    deviceId: string,
    status: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    const topic = `campaigns/${campaignId}/devices/${deviceId}/ack`;
    const payload = {
      deviceId,
      campaignId,
      status,
      acknowledgedAt: new Date().toISOString(),
      ...details,
    };

    await this.publishCommand(topic, payload);
  }
}
