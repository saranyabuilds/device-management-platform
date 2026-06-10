package com.devicemanagement.deviceapi.service;

import com.devicemanagement.deviceapi.dto.DeviceCreateRequest;
import com.devicemanagement.deviceapi.dto.DeviceResponse;
import com.devicemanagement.deviceapi.exception.DeviceNotFoundException;
import com.devicemanagement.deviceapi.exception.DuplicateDeviceException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class DeviceServiceImpl implements DeviceService {

  private static final String DEFAULT_STATUS = "ACTIVE";

  private final Map<String, DeviceResponse> devicesBySerialNumber = new ConcurrentHashMap<>();

  @Override
  public DeviceResponse createDevice(DeviceCreateRequest request) {
    log.debug("Creating device with serialNumber={}", request.serialNumber());

    DeviceResponse response =
        DeviceResponse.builder()
            .id(UUID.randomUUID().toString())
            .serialNumber(request.serialNumber())
            .deviceModel(request.deviceModel())
            .firmwareVersion(request.firmwareVersion())
            .customerId(request.customerId())
            .location(request.location())
            .status(DEFAULT_STATUS)
            .createdAt(LocalDateTime.now())
            .build();

    DeviceResponse existing = devicesBySerialNumber.putIfAbsent(request.serialNumber(), response);
    if (existing != null) {
      log.warn("Duplicate device creation attempt for serialNumber={}", request.serialNumber());
      throw new DuplicateDeviceException(request.serialNumber());
    }

    log.info("Device created successfully with serialNumber={}", request.serialNumber());
    return response;
  }

  @Override
  public DeviceResponse getDeviceBySerialNumber(String serialNumber) {
    log.debug("Looking up device with serialNumber={}", serialNumber);
    DeviceResponse response = devicesBySerialNumber.get(serialNumber);

    if (response == null) {
      log.warn("Device not found for serialNumber={}", serialNumber);
      throw new DeviceNotFoundException(serialNumber);
    }

    return response;
  }

  @Override
  public List<DeviceResponse> getDevices() {
    return new ArrayList<>(devicesBySerialNumber.values());
  }
}
