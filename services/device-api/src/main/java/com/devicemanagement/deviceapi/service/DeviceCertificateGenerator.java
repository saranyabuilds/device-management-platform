package com.devicemanagement.deviceapi.service;

import com.devicemanagement.deviceapi.config.DeviceRegistrationProperties;
import com.devicemanagement.deviceapi.dto.DeviceCertificateMetadata;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class DeviceCertificateGenerator {

  private final DeviceRegistrationProperties properties;
  private final Clock clock;

  public DeviceCertificateGenerator(DeviceRegistrationProperties properties, Clock clock) {
    this.properties = properties;
    this.clock = clock;
  }

  public DeviceCertificateMetadata issueCertificate(String deviceId, String serialNumber) {
    LocalDateTime issuedAt = LocalDateTime.now(clock);
    LocalDateTime expiresAt = issuedAt.plus(properties.certificate().validity());
    String certificateId = "devcert-" + UUID.randomUUID();
    String subject = "CN=" + serialNumber + ", OU=Devices, O=Device Management Platform";
    String fingerprint =
        fingerprint(
            certificateId,
            deviceId,
            serialNumber,
            properties.certificate().issuerId(),
            issuedAt.toString());

    return DeviceCertificateMetadata.builder()
        .certificateId(certificateId)
        .issuerId(properties.certificate().issuerId())
        .issuerName(properties.certificate().issuerName())
        .subject(subject)
        .fingerprintSha256(fingerprint)
        .issuedAt(issuedAt)
        .expiresAt(expiresAt)
        .status(DeviceCertificateStatus.ISSUED.name())
        .build();
  }

  private String fingerprint(String... values) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      for (String value : values) {
        digest.update(value.getBytes(StandardCharsets.UTF_8));
        digest.update((byte) 0);
      }
      return HexFormat.of().formatHex(digest.digest());
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is not available", exception);
    }
  }
}
