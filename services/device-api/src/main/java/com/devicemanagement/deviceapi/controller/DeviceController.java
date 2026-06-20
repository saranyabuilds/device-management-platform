package com.devicemanagement.deviceapi.controller;

import com.devicemanagement.deviceapi.dto.DeviceCreateRequest;
import com.devicemanagement.deviceapi.dto.DeviceHeartbeatRequest;
import com.devicemanagement.deviceapi.dto.DeviceHeartbeatResponse;
import com.devicemanagement.deviceapi.dto.DeviceInventoryQuery;
import com.devicemanagement.deviceapi.dto.DeviceInventoryResponse;
import com.devicemanagement.deviceapi.dto.DeviceProfileResponse;
import com.devicemanagement.deviceapi.dto.DeviceResponse;
import com.devicemanagement.deviceapi.service.DeviceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
  @PreAuthorize("hasAuthority('DEVICE_WRITE')")
  @Operation(summary = "Create device", description = "Registers a new hardware device")
  public DeviceResponse createDevice(@Valid @RequestBody DeviceCreateRequest request) {
    log.info("Device creation request received for serialNumber={}", request.serialNumber());
    return deviceService.createDevice(request);
  }

  @PostMapping("/{serialNumber}/heartbeat")
  @PreAuthorize("hasAuthority('DEVICE_WRITE')")
  @Operation(summary = "Ingest device heartbeat", description = "Updates device last-seen and connectivity state")
  public DeviceHeartbeatResponse ingestHeartbeat(
      @PathVariable String serialNumber, @Valid @RequestBody DeviceHeartbeatRequest request) {
    log.info("Heartbeat ingestion request received for serialNumber={}", serialNumber);
    return deviceService.ingestHeartbeat(serialNumber, request);
  }

  @GetMapping
  @PreAuthorize("hasAuthority('DEVICE_READ')")
  @Operation(summary = "List devices", description = "Returns searchable and paginated device inventory")
  public DeviceInventoryResponse getDevices(
      @RequestParam(required = false) String serialNumber,
      @RequestParam(required = false) String firmwareVersion,
      @RequestParam(required = false) String status,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    log.info(
        "Device inventory request received serialNumber={} firmwareVersion={} status={} page={} size={}",
        serialNumber,
        firmwareVersion,
        status,
        page,
        size);
    return deviceService.getDevices(
        new DeviceInventoryQuery(serialNumber, firmwareVersion, status, page, size));
  }

  @GetMapping("/export")
  @PreAuthorize("hasAuthority('DEVICE_READ')")
  @Operation(summary = "Export devices", description = "Exports filtered device inventory as CSV")
  public ResponseEntity<String> exportDevices(
      @RequestParam(required = false) String serialNumber,
      @RequestParam(required = false) String firmwareVersion,
      @RequestParam(required = false) String status) {
    log.info(
        "Device inventory export request received serialNumber={} firmwareVersion={} status={}",
        serialNumber,
        firmwareVersion,
        status);
    String csv =
        deviceService.exportDevicesCsv(new DeviceInventoryQuery(serialNumber, firmwareVersion, status, 0, 0));
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"device-inventory.csv\"")
        .body(csv);
  }

  @GetMapping("/{serialNumber}/profile")
  @PreAuthorize("hasAuthority('DEVICE_READ')")
  @Operation(summary = "Get device profile", description = "Returns diagnostic device profile details")
  public DeviceProfileResponse getDeviceProfile(@PathVariable String serialNumber) {
    log.info("Device profile request received for serialNumber={}", serialNumber);
    return deviceService.getDeviceProfile(serialNumber);
  }

  @GetMapping("/{serialNumber}")
  @PreAuthorize("hasAuthority('DEVICE_READ')")
  @Operation(summary = "Get device", description = "Returns device details by serial number")
  public DeviceResponse getDeviceBySerialNumber(@PathVariable String serialNumber) {
    log.info("Device lookup request received for serialNumber={}", serialNumber);
    return deviceService.getDeviceBySerialNumber(serialNumber);
  }
}
