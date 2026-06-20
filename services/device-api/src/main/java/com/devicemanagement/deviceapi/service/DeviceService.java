package com.devicemanagement.deviceapi.service;

import com.devicemanagement.deviceapi.dto.DeviceCreateRequest;
import com.devicemanagement.deviceapi.dto.DeviceHeartbeatRequest;
import com.devicemanagement.deviceapi.dto.DeviceHeartbeatResponse;
import com.devicemanagement.deviceapi.dto.DeviceInventoryQuery;
import com.devicemanagement.deviceapi.dto.DeviceInventoryResponse;
import com.devicemanagement.deviceapi.dto.DeviceProfileResponse;
import com.devicemanagement.deviceapi.dto.DeviceResponse;

public interface DeviceService {

  DeviceResponse createDevice(DeviceCreateRequest request);

  DeviceResponse getDeviceBySerialNumber(String serialNumber);

  DeviceProfileResponse getDeviceProfile(String serialNumber);

  DeviceHeartbeatResponse ingestHeartbeat(String serialNumber, DeviceHeartbeatRequest request);

  int markTimedOutDevicesOffline();

  DeviceInventoryResponse getDevices(DeviceInventoryQuery query);

  String exportDevicesCsv(DeviceInventoryQuery query);
}
