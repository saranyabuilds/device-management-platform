import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CreateCampaignRequest, RetryDevicesRequest, UpdateCampaignRequest } from '@device-management-platform/firmware-domain';
import { CampaignService } from '../services/campaign.service';

@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  async create(@Body() request: CreateCampaignRequest) {
    return this.campaignService.createCampaign(request);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() request: UpdateCampaignRequest) {
    return this.campaignService.updateCampaign(id, request);
  }

  @Get()
  async list() {
    return this.campaignService.listCampaigns();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.campaignService.getCampaign(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.campaignService.deleteCampaign(id);
  }

  @Post(':id/pause')
  async pause(@Param('id') id: string) {
    return this.campaignService.pauseCampaign(id);
  }

  @Post(':id/resume')
  async resume(@Param('id') id: string) {
    return this.campaignService.resumeCampaign(id);
  }

  @Post(':id/trigger')
  async trigger(@Param('id') id: string) {
    return this.campaignService.triggerCampaign(id);
  }

  @Post(':id/retry')
  async retry(@Param('id') id: string, @Body() request: RetryDevicesRequest) {
    return this.campaignService.retryFailedDevices(id, request);
  }

  @Get(':id/report')
  async getReport(@Param('id') id: string) {
    return this.campaignService.getCampaignReport(id);
  }

  @Post(':id/devices/:deviceId/acknowledge')
  async acknowledgeDevice(
    @Param('id') id: string,
    @Param('deviceId') deviceId: string,
    @Body() acknowledgment: {
      status: string;
      currentStageId?: string;
      downloadedAt?: string;
      installedAt?: string;
      errorMessage?: string;
    },
  ) {
    await this.campaignService.handleDeviceAcknowledgment(id, deviceId, acknowledgment);
    return { success: true };
  }
}
