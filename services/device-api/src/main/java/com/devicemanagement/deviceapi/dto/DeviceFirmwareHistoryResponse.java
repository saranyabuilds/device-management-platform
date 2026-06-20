package com.devicemanagement.deviceapi.dto;

import java.time.LocalDateTime;

public record DeviceFirmwareHistoryResponse(
    String firmwareVersion,
    LocalDateTime updatedAt,
    String updateSource,
    String status,
    String failureReason) {}
