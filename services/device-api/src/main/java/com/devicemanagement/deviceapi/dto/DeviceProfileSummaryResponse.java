package com.devicemanagement.deviceapi.dto;

import java.time.LocalDateTime;

public record DeviceProfileSummaryResponse(
    String id,
    String serialNumber,
    String deviceModel,
    String firmwareVersion,
    String customerId,
    String status,
    String registrationStatus,
    String onboardingStatus,
    String certificateStatus,
    String connectivityStatus,
    LocalDateTime createdAt,
    LocalDateTime updatedAt) {}
