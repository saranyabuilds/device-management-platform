package com.devicemanagement.deviceapi.service;

import com.devicemanagement.deviceapi.dto.DeviceCreateRequest;
import com.devicemanagement.deviceapi.dto.DeviceResponse;
import java.util.List;

public interface DeviceService {

  DeviceResponse createDevice(DeviceCreateRequest request);

  DeviceResponse getDeviceBySerialNumber(String serialNumber);

  List<DeviceResponse> getDevices();
}
