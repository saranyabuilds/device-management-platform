package com.devicemanagement.deviceapi.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.devicemanagement.deviceapi.config.DeviceHeartbeatProperties;
import com.devicemanagement.deviceapi.config.DeviceRegistrationProperties;
import com.devicemanagement.deviceapi.dto.DeviceCreateRequest;
import com.devicemanagement.deviceapi.dto.DeviceHeartbeatRequest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

class DeviceServiceImplTest {

  @Test
  void markTimedOutDevicesOfflineTransitionsOnlineDevicesAfterTimeout() {
    MutableClock clock = new MutableClock(Instant.parse("2026-06-19T17:00:00Z"));
    DeviceRegistrationProperties registrationProperties =
        new DeviceRegistrationProperties(null, null);
    DeviceServiceImpl service =
        new DeviceServiceImpl(
            registrationProperties,
            new DeviceHeartbeatProperties("devices/{serialNumber}/heartbeat", Duration.ofMinutes(5), false),
            new DeviceCertificateGenerator(registrationProperties, clock),
            clock);

    service.createDevice(
        new DeviceCreateRequest(
            "SN-TIMEOUT-001", "Gateway-1000", "1.0.0", "customer-001", "Building A"));
    service.ingestHeartbeat(
        "SN-TIMEOUT-001",
        new DeviceHeartbeatRequest(Instant.parse("2026-06-19T17:00:00Z"), null, null));

    clock.setInstant(Instant.parse("2026-06-19T17:06:00Z"));

    assertThat(service.markTimedOutDevicesOffline()).isEqualTo(1);
    assertThat(service.getDeviceBySerialNumber("SN-TIMEOUT-001").connectivityStatus())
        .isEqualTo(DeviceConnectivityStatus.OFFLINE.name());
    assertThat(service.getDeviceProfile("SN-TIMEOUT-001").healthIndicators().get(0).state())
        .isEqualTo("CRITICAL");
  }

  private static final class MutableClock extends Clock {
    private Instant instant;

    private MutableClock(Instant instant) {
      this.instant = instant;
    }

    void setInstant(Instant instant) {
      this.instant = instant;
    }

    @Override
    public ZoneId getZone() {
      return ZoneId.of("UTC");
    }

    @Override
    public Clock withZone(ZoneId zone) {
      return this;
    }

    @Override
    public Instant instant() {
      return instant;
    }
  }
}
