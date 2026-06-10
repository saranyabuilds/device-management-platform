package com.devicemanagement.deviceapi.dto;

import java.time.LocalDateTime;
import lombok.Builder;

@Builder
public record DeviceResponse(
    String id,
    String serialNumber,
    String deviceModel,
    String firmwareVersion,
    String customerId,
    String location,
    String status,
    LocalDateTime createdAt) {}
