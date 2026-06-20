package com.devicemanagement.deviceapi.dto;

import java.time.LocalDateTime;
import lombok.Builder;

@Builder
public record DeviceCertificateMetadata(
    String certificateId,
    String issuerId,
    String issuerName,
    String subject,
    String fingerprintSha256,
    LocalDateTime issuedAt,
    LocalDateTime expiresAt,
    String status) {}
