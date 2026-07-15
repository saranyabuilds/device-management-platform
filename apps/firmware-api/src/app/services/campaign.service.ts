import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  CampaignStatus,
  CampaignStage,
  CampaignTargetRule,
  CreateCampaignRequest,
  RetryDevicesRequest,
  UpdateCampaignRequest,
  CampaignDeviceStatus,
} from '@device-management-platform/firmware-domain';
import { FirmwareService } from './firmware.service';
import { DeviceRegistryService } from './device-registry.service';
import { MqttPublisherService } from './mqtt-publisher.service';

interface DeviceStatus {
  deviceId: string;
  status: CampaignDeviceStatus;
  currentStageId: string;
  stageAttempts: number;
  lastUpdated: string;
  errorMessage?: string;
  downloadedAt?: string;
  installedAt?: string;
}

interface StoredCampaign {
  id: string;
  name: string;
  description?: string;
  firmwareId: string;
  targetModelIds: string[];
  targetRules: CampaignTargetRule[];
  stages: CampaignStage[];
  scheduleAt?: string;
  triggerOnApproval: boolean;
  metadata?: Record<string, unknown>;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
  pausedAt?: string;
  completedAt?: string;
  canceledAt?: string;
  deviceStatuses: Map<string, DeviceStatus>;
  totalDevices: number;
}

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);
  private readonly campaigns = new Map<string, StoredCampaign>();

  constructor(
    private readonly firmwareService: FirmwareService,
    private readonly deviceRegistryService: DeviceRegistryService,
    private readonly mqttPublisher: MqttPublisherService,
  ) {}

  async createCampaign(request: CreateCampaignRequest): Promise<StoredCampaign> {
    const firmware = await this.firmwareService.getFirmware(request.firmwareId);
    if (!firmware) {
      throw new Error(`Firmware not found: ${request.firmwareId}`);
    }

    const campaign: StoredCampaign = {
      id: uuidv4(),
      name: request.name,
      description: request.description,
      firmwareId: request.firmwareId,
      targetModelIds: request.targetModelIds,
      targetRules: request.targetRules,
      stages: request.stages.map((stage) => ({
        ...stage,
        id: uuidv4(),
      })),
      scheduleAt: request.scheduleAt,
      triggerOnApproval: request.triggerOnApproval ?? false,
      status: request.triggerOnApproval ? CampaignStatus.PendingApproval : CampaignStatus.Scheduled,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: request.metadata,
      deviceStatuses: new Map(),
      totalDevices: 0,
    };

    this.campaigns.set(campaign.id, campaign);
    return campaign;
  }

  async updateCampaign(id: string, request: UpdateCampaignRequest): Promise<StoredCampaign> {
    const campaign = this.campaigns.get(id);
    if (!campaign) {
      throw new Error(`Campaign not found: ${id}`);
    }

    if ([CampaignStatus.Completed, CampaignStatus.Cancelled].includes(campaign.status)) {
      throw new Error(`Cannot update campaign in status ${campaign.status}`);
    }

    campaign.name = request.name ?? campaign.name;
    campaign.description = request.description ?? campaign.description;
    campaign.targetModelIds = request.targetModelIds ?? campaign.targetModelIds;
    campaign.targetRules = request.targetRules ?? campaign.targetRules;
    campaign.stages = request.stages
      ? request.stages.map((stage) => ({
          ...stage,
          id: uuidv4(),
        }))
      : campaign.stages;
    campaign.scheduleAt = request.scheduleAt ?? campaign.scheduleAt;
    campaign.triggerOnApproval = request.triggerOnApproval ?? campaign.triggerOnApproval;
    campaign.metadata = request.metadata ?? campaign.metadata;
    if (request.scheduleAt) {
      campaign.status = CampaignStatus.Scheduled;
    }
    campaign.updatedAt = new Date().toISOString();

    this.campaigns.set(id, campaign);
    return campaign;
  }

  async getCampaign(id: string): Promise<StoredCampaign | undefined> {
    return this.campaigns.get(id);
  }

  async listCampaigns(): Promise<StoredCampaign[]> {
    return Array.from(this.campaigns.values());
  }

  async deleteCampaign(id: string): Promise<void> {
    this.campaigns.delete(id);
  }

  async pauseCampaign(id: string): Promise<StoredCampaign> {
    const campaign = this.campaigns.get(id);
    if (!campaign) {
      throw new Error(`Campaign not found: ${id}`);
    }
    if ([CampaignStatus.Completed, CampaignStatus.Cancelled].includes(campaign.status)) {
      throw new Error(`Cannot pause campaign in status ${campaign.status}`);
    }
    campaign.status = CampaignStatus.Paused;
    campaign.pausedAt = new Date().toISOString();
    campaign.updatedAt = new Date().toISOString();
    this.campaigns.set(id, campaign);
    return campaign;
  }

  async resumeCampaign(id: string): Promise<StoredCampaign> {
    const campaign = this.campaigns.get(id);
    if (!campaign) {
      throw new Error(`Campaign not found: ${id}`);
    }
    if (campaign.status !== CampaignStatus.Paused) {
      throw new Error(`Campaign is not paused: ${campaign.status}`);
    }
    campaign.status = CampaignStatus.Active;
    campaign.updatedAt = new Date().toISOString();
    this.campaigns.set(id, campaign);
    return campaign;
  }

  async triggerCampaign(id: string): Promise<StoredCampaign> {
    const campaign = this.campaigns.get(id);
    if (!campaign) {
      throw new Error(`Campaign not found: ${id}`);
    }
    if (campaign.status !== CampaignStatus.Scheduled && campaign.status !== CampaignStatus.PendingApproval) {
      throw new Error(`Campaign must be scheduled or pending approval to trigger. Current status: ${campaign.status}`);
    }

    // Get devices matching campaign rules
    const matchingDevices = await this.deviceRegistryService.searchDevices(campaign.targetRules);
    
    // Initialize device statuses
    const firstStageId = campaign.stages.length > 0 ? campaign.stages[0].id : 'stage-0';
    
    for (const device of matchingDevices) {
      const deviceStatus: DeviceStatus = {
        deviceId: device.id || device.serialNumber,
        status: CampaignDeviceStatus.Scheduled,
        currentStageId: firstStageId,
        stageAttempts: 0,
        lastUpdated: new Date().toISOString(),
      };
      campaign.deviceStatuses.set(deviceStatus.deviceId, deviceStatus);
    }

    campaign.totalDevices = matchingDevices.length;
    this.logger.log(`Campaign ${id} targets ${campaign.totalDevices} devices`);

    // Publish OTA commands to devices
    const firmware = await this.firmwareService.getFirmware(campaign.firmwareId);
    if (firmware) {
      const otaCommand = {
        campaignId: id,
        firmwareId: campaign.firmwareId,
        modelId: firmware.modelId,
        version: firmware.version,
        downloadUrl: `${process.env.FIRMWARE_API_URL || 'http://localhost:3000'}/api/v1/firmware/${campaign.firmwareId}/download-url`,
        sha256Checksum: firmware.sha256Checksum,
        signatureAlgorithm: firmware.signatureAlgorithm,
        signature: firmware.signatureBase64,
        stages: campaign.stages,
      };

      // Publish to MQTT for each device
      for (const device of matchingDevices) {
        const deviceId = device.id || device.serialNumber;
        const topic = `devices/${deviceId}/ota/update`;
        
        try {
          await this.mqttPublisher.publishCommand(topic, otaCommand);
          this.logger.debug(`Published OTA command to device ${deviceId}`);
        } catch (error) {
          this.logger.error(`Failed to publish OTA command to device ${deviceId}: ${error}`);
          const status = campaign.deviceStatuses.get(deviceId);
          if (status) {
            status.status = CampaignDeviceStatus.Failed;
            status.errorMessage = `Failed to publish OTA command: ${error}`;
            status.lastUpdated = new Date().toISOString();
          }
        }
      }
    }

    campaign.status = CampaignStatus.Active;
    campaign.updatedAt = new Date().toISOString();
    this.campaigns.set(id, campaign);
    return campaign;
  }

  async retryFailedDevices(id: string, request: RetryDevicesRequest): Promise<{ campaignId: string; retriedDeviceIds: string[] }> {
    const campaign = this.campaigns.get(id);
    if (!campaign) {
      throw new Error(`Campaign not found: ${id}`);
    }
    if ([CampaignStatus.Completed, CampaignStatus.Canceled].includes(campaign.status)) {
      throw new Error(`Cannot retry failed devices for campaign in status ${campaign.status}`);
    }

    const deviceIds = request.deviceIds ?? [];
    campaign.metadata = {
      ...campaign.metadata,
      lastRetryRequest: {
        requestedAt: new Date().toISOString(),
        deviceIds,
        resetRetryCounter: request.resetRetryCounter ?? false,
        batchSize: request.batchSize ?? null,
        delaySeconds: request.delaySeconds ?? null,
      },
    };
    campaign.updatedAt = new Date().toISOString();
    this.campaigns.set(id, campaign);
    this.logger.log(`Retry requested for campaign ${id} with ${deviceIds.length} device(s)`);
    return { campaignId: id, retriedDeviceIds: deviceIds };
  }

  async scheduleCampaigns(): Promise<void> {
    const now = new Date();
    for (const campaign of this.campaigns.values()) {
      if (campaign.status === CampaignStatus.Scheduled && campaign.scheduleAt) {
        const scheduleTime = new Date(campaign.scheduleAt);
        if (scheduleTime <= now) {
          await this.triggerCampaign(campaign.id);
        }
      }
    }
  }

  async handleDeviceAcknowledgment(
    campaignId: string,
    deviceId: string,
    acknowledgment: {
      status: CampaignDeviceStatus;
      currentStageId?: string;
      downloadedAt?: string;
      installedAt?: string;
      errorMessage?: string;
    },
  ): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      this.logger.warn(`Campaign not found for acknowledgment: ${campaignId}`);
      return;
    }

    const deviceStatus = campaign.deviceStatuses.get(deviceId);
    if (!deviceStatus) {
      this.logger.warn(`Device ${deviceId} not found in campaign ${campaignId}`);
      return;
    }

    // Update device status
    deviceStatus.status = acknowledgment.status;
    deviceStatus.lastUpdated = new Date().toISOString();

    if (acknowledgment.currentStageId) {
      deviceStatus.currentStageId = acknowledgment.currentStageId;
    }

    if (acknowledgment.downloadedAt) {
      deviceStatus.downloadedAt = acknowledgment.downloadedAt;
    }

    if (acknowledgment.installedAt) {
      deviceStatus.installedAt = acknowledgment.installedAt;
    }

    if (acknowledgment.errorMessage) {
      deviceStatus.errorMessage = acknowledgment.errorMessage;
    }

    this.logger.log(
      `Device ${deviceId} acknowledged campaign ${campaignId} with status ${acknowledgment.status}`,
    );

    // Check if campaign is complete
    await this.checkCampaignCompletion(campaignId);
  }

  private async checkCampaignCompletion(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return;

    const statuses = Array.from(campaign.deviceStatuses.values());
    const completed = statuses.filter((s) =>
      [CampaignDeviceStatus.Success, CampaignDeviceStatus.Failed, CampaignDeviceStatus.PermanentlyFailed].includes(
        s.status,
      ),
    );

    // Campaign complete when all devices are in terminal state
    if (completed.length === statuses.length && statuses.length > 0) {
      campaign.status = CampaignStatus.Completed;
      campaign.completedAt = new Date().toISOString();
      campaign.updatedAt = new Date().toISOString();
      this.logger.log(
        `Campaign ${campaignId} completed. Success: ${statuses.filter((s) => s.status === CampaignDeviceStatus.Success).length}/${statuses.length}`,
      );
    }
  }

  async getCampaignReport(id: string): Promise<{
    campaignId: string;
    name: string;
    status: CampaignStatus;
    totalDevices: number;
    stats: {
      pending: number;
      scheduled: number;
      inProgress: number;
      success: number;
      failed: number;
      paused: number;
      retrying: number;
      excluded: number;
      permanentlyFailed: number;
    };
    deviceStatuses: Array<{
      deviceId: string;
      status: CampaignDeviceStatus;
      currentStageId: string;
      stageAttempts: number;
      lastUpdated: string;
      downloadedAt?: string;
      installedAt?: string;
      errorMessage?: string;
    }>;
    successRate: number;
    failureRate: number;
  } | null> {
    const campaign = this.campaigns.get(id);
    if (!campaign) return null;

    const statuses = Array.from(campaign.deviceStatuses.values());
    const stats = {
      pending: statuses.filter((s) => s.status === CampaignDeviceStatus.Pending).length,
      scheduled: statuses.filter((s) => s.status === CampaignDeviceStatus.Scheduled).length,
      inProgress: statuses.filter((s) => s.status === CampaignDeviceStatus.InProgress).length,
      success: statuses.filter((s) => s.status === CampaignDeviceStatus.Success).length,
      failed: statuses.filter((s) => s.status === CampaignDeviceStatus.Failed).length,
      paused: statuses.filter((s) => s.status === CampaignDeviceStatus.Paused).length,
      retrying: statuses.filter((s) => s.status === CampaignDeviceStatus.Retrying).length,
      excluded: statuses.filter((s) => s.status === CampaignDeviceStatus.Excluded).length,
      permanentlyFailed: statuses.filter((s) => s.status === CampaignDeviceStatus.PermanentlyFailed).length,
    };

    const successRate = campaign.totalDevices > 0 ? (stats.success / campaign.totalDevices) * 100 : 0;
    const failureRate = campaign.totalDevices > 0 ? ((stats.failed + stats.permanentlyFailed) / campaign.totalDevices) * 100 : 0;

    return {
      campaignId: id,
      name: campaign.name,
      status: campaign.status,
      totalDevices: campaign.totalDevices,
      stats,
      deviceStatuses: statuses,
      successRate,
      failureRate,
    };
  }
}

