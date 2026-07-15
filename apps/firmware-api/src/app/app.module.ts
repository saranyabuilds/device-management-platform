import { Module } from '@nestjs/common';
import { FirmwareController } from './controllers/firmware.controller';
import { CampaignController } from './controllers/campaign.controller';
import { FirmwareService } from './services/firmware.service';
import { CampaignService } from './services/campaign.service';
import { DeviceRegistryService } from './services/device-registry.service';
import { S3Service } from './services/s3.service';
import { CryptoService } from './services/crypto.service';
import { MqttPublisherService } from './services/mqtt-publisher.service';

@Module({
  imports: [],
  controllers: [FirmwareController, CampaignController],
  providers: [FirmwareService, CampaignService, DeviceRegistryService, S3Service, CryptoService, MqttPublisherService],
})
export class AppModule {}
