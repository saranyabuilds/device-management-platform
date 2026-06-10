package com.devicemanagement.deviceapi.controller;

import com.devicemanagement.deviceapi.dto.DeviceCreateRequest;
import com.devicemanagement.deviceapi.dto.DeviceResponse;
import com.devicemanagement.deviceapi.service.DeviceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/devices")
@Tag(name = "Devices", description = "APIs for registered hardware devices")
public class DeviceController {

  private final DeviceService deviceService;

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Create device", description = "Registers a new hardware device")
  public DeviceResponse createDevice(@Valid @RequestBody DeviceCreateRequest request) {
    log.info("Device creation request received for serialNumber={}", request.serialNumber());
    return deviceService.createDevice(request);
  }

  @GetMapping("/{serialNumber}")
  @Operation(summary = "Get device", description = "Returns device details by serial number")
  public DeviceResponse getDeviceBySerialNumber(@PathVariable String serialNumber) {
    log.info("Device lookup request received for serialNumber={}", serialNumber);
    return deviceService.getDeviceBySerialNumber(serialNumber);
  }

  @GetMapping
  @Operation(summary = "List devices", description = "Returns all in-memory sample devices")
  public List<DeviceResponse> getDevices() {
    log.info("Device list request received");
    return deviceService.getDevices();
  }
}
