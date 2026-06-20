package com.devicemanagement.deviceapi.dto;

import java.time.LocalDateTime;

public record DeviceHeartbeatResponse(
    String serialNumber,
    LocalDateTime lastSeenAt,
    String connectivityStatus,
    boolean accepted) {}
