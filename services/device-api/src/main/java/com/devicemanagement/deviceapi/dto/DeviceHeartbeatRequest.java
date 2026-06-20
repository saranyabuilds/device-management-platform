package com.devicemanagement.deviceapi.dto;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record DeviceHeartbeatRequest(
    @NotNull(message = "timestamp is required") Instant timestamp,
    String firmwareVersion,
    String status) {}
