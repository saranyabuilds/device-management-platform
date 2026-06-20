package com.devicemanagement.deviceapi.dto;

public record DeviceInventoryQuery(
    String serialNumber, String firmwareVersion, String status, int page, int size) {}
