package com.devicemanagement.deviceapi.dto;

import java.time.LocalDateTime;

public record DeviceEventResponse(
    LocalDateTime timestamp,
    String eventType,
    String severity,
    String source,
    String message,
    String correlationId,
    String traceId) {}
