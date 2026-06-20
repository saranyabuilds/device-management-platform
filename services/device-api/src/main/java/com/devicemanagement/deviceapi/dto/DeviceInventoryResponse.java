package com.devicemanagement.deviceapi.dto;

import java.util.List;

public record DeviceInventoryResponse(
    List<DeviceResponse> items, int page, int size, long totalItems, int totalPages) {}
