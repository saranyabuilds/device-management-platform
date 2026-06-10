package com.devicemanagement.deviceapi.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

@Builder
public record DeviceCreateRequest(
    @NotBlank(message = "serialNumber is required") String serialNumber,
    @NotBlank(message = "deviceModel is required") String deviceModel,
    @NotBlank(message = "firmwareVersion is required") String firmwareVersion,
    @NotBlank(message = "customerId is required") String customerId,
    String location) {}
