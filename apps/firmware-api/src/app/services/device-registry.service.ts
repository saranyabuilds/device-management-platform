import { Injectable, Logger } from '@nestjs/common';
import { CampaignTargetRule } from '@device-management-platform/firmware-domain';

interface DeviceRegistrySearchResponse {
  count: number;
  devices: Array<Record<string, unknown>>;
}

@Injectable()
export class DeviceRegistryService {
  private readonly logger = new Logger(DeviceRegistryService.name);
  private readonly registryUrl = process.env.DEVICE_REGISTRY_URL;

  async searchDevices(rules: CampaignTargetRule[]): Promise<Array<Record<string, unknown>>> {
    if (!this.registryUrl) {
      this.logger.warn('DEVICE_REGISTRY_URL not configured, returning empty device list');
      return [];
    }

    try {
      const response = await fetch(`${this.registryUrl}/api/v1/devices/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rules }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(`Device registry search failed: ${response.status} ${body}`);
        return [];
      }

      const payload = (await response.json()) as DeviceRegistrySearchResponse;
      return payload.devices;
    } catch (error) {
      this.logger.warn(`Device registry request failed: ${error}`);
      return [];
    }
  }

  async countMatchingDevices(rules: CampaignTargetRule[]): Promise<number> {
    const devices = await this.searchDevices(rules);
    return devices.length;
  }
}
