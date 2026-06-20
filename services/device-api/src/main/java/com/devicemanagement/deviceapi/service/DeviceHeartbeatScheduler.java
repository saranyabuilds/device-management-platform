package com.devicemanagement.deviceapi.service;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(
    prefix = "app.devices.heartbeat",
    name = "scheduler-enabled",
    havingValue = "true",
    matchIfMissing = true)
public class DeviceHeartbeatScheduler {

  private final DeviceService deviceService;

  @Scheduled(fixedDelayString = "${app.devices.heartbeat.timeout}")
  public void markTimedOutDevicesOffline() {
    deviceService.markTimedOutDevicesOffline();
  }
}
