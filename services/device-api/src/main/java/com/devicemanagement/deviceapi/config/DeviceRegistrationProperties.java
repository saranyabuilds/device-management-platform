package com.devicemanagement.deviceapi.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.devices.registration")
public record DeviceRegistrationProperties(
    SerialNumberPolicy serialNumber, Certificate certificate) {

  public DeviceRegistrationProperties {
    if (serialNumber == null) {
      serialNumber = new SerialNumberPolicy(6, 64, "^[A-Z0-9][A-Z0-9-]*$");
    }
    if (certificate == null) {
      certificate =
          new Certificate(
              "Device Management Local CA", "urn:device-management:local-ca", Duration.ofDays(365));
    }
  }

  public record SerialNumberPolicy(int minLength, int maxLength, String allowedPattern) {
    public SerialNumberPolicy {
      if (minLength <= 0) {
        minLength = 6;
      }
      if (maxLength < minLength) {
        maxLength = 64;
      }
      if (allowedPattern == null || allowedPattern.isBlank()) {
        allowedPattern = "^[A-Z0-9][A-Z0-9-]*$";
      }
    }
  }

  public record Certificate(String issuerName, String issuerId, Duration validity) {
    public Certificate {
      if (issuerName == null || issuerName.isBlank()) {
        issuerName = "Device Management Local CA";
      }
      if (issuerId == null || issuerId.isBlank()) {
        issuerId = "urn:device-management:local-ca";
      }
      if (validity == null || validity.isNegative() || validity.isZero()) {
        validity = Duration.ofDays(365);
      }
    }
  }
}
