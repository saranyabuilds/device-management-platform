package com.devicemanagement.deviceapi.dto;

import java.time.LocalDateTime;
import java.util.List;

public record DeviceProfileResponse(
    DeviceProfileSummaryResponse device,
    LocalDateTime lastSeenAt,
    List<DeviceHealthIndicatorResponse> healthIndicators,
    List<DeviceFirmwareHistoryResponse> firmwareHistory,
    List<DeviceEventResponse> eventTimeline) {}
