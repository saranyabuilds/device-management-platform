package com.devicemanagement.deviceapi.service;

import com.devicemanagement.deviceapi.config.DeviceHeartbeatProperties;
import com.devicemanagement.deviceapi.config.DeviceRegistrationProperties;
import com.devicemanagement.deviceapi.dto.DeviceCreateRequest;
import com.devicemanagement.deviceapi.dto.DeviceEventResponse;
import com.devicemanagement.deviceapi.dto.DeviceFirmwareHistoryResponse;
import com.devicemanagement.deviceapi.dto.DeviceHeartbeatRequest;
import com.devicemanagement.deviceapi.dto.DeviceHeartbeatResponse;
import com.devicemanagement.deviceapi.dto.DeviceHealthIndicatorResponse;
import com.devicemanagement.deviceapi.dto.DeviceInventoryQuery;
import com.devicemanagement.deviceapi.dto.DeviceInventoryResponse;
import com.devicemanagement.deviceapi.dto.DeviceProfileResponse;
import com.devicemanagement.deviceapi.dto.DeviceProfileSummaryResponse;
import com.devicemanagement.deviceapi.dto.DeviceResponse;
import com.devicemanagement.deviceapi.exception.DeviceNotFoundException;
import com.devicemanagement.deviceapi.exception.DeviceRegistrationValidationException;
import com.devicemanagement.deviceapi.exception.DuplicateDeviceException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Slf4j
@Service
public class DeviceServiceImpl implements DeviceService {

  private static final String DEFAULT_STATUS = "ACTIVE";
  private static final int MAX_PAGE_SIZE = 100;
  private static final List<String> CSV_HEADERS =
      List.of(
          "deviceId",
          "serialNumber",
          "deviceModel",
          "firmwareVersion",
          "customerId",
          "status",
          "onboardingStatus",
          "connectivityStatus",
          "lastSeenAt",
          "certificateId",
          "createdAt",
          "updatedAt");

  private final Map<String, DeviceResponse> devicesBySerialNumber = new ConcurrentHashMap<>();
  private final DeviceRegistrationProperties registrationProperties;
  private final DeviceHeartbeatProperties heartbeatProperties;
  private final DeviceCertificateGenerator certificateGenerator;
  private final Clock clock;

  public DeviceServiceImpl(
      DeviceRegistrationProperties registrationProperties,
      DeviceHeartbeatProperties heartbeatProperties,
      DeviceCertificateGenerator certificateGenerator,
      Clock clock) {
    this.registrationProperties = registrationProperties;
    this.heartbeatProperties = heartbeatProperties;
    this.certificateGenerator = certificateGenerator;
    this.clock = clock;
  }

  @Override
  public DeviceResponse createDevice(DeviceCreateRequest request) {
    String normalizedSerialNumber = normalizeSerialNumber(request.serialNumber());
    validateSerialNumber(normalizedSerialNumber);

    log.debug("Registering device with serialNumber={}", normalizedSerialNumber);

    LocalDateTime now = LocalDateTime.now(clock);
    String deviceId = UUID.randomUUID().toString();

    DeviceResponse response =
        DeviceResponse.builder()
            .id(deviceId)
            .serialNumber(normalizedSerialNumber)
            .deviceModel(request.deviceModel())
            .firmwareVersion(request.firmwareVersion())
            .customerId(request.customerId())
            .location(request.location())
            .status(DEFAULT_STATUS)
            .registrationStatus(DeviceRegistrationStatus.REGISTERED.name())
            .onboardingStatus(DeviceOnboardingStatus.PENDING_ACTIVATION.name())
            .certificate(certificateGenerator.issueCertificate(deviceId, normalizedSerialNumber))
            .lastSeenAt(null)
            .connectivityStatus(DeviceConnectivityStatus.UNKNOWN.name())
            .createdAt(now)
            .updatedAt(now)
            .build();

    DeviceResponse existing = devicesBySerialNumber.putIfAbsent(normalizedSerialNumber, response);
    if (existing != null) {
      log.warn("Duplicate device registration attempt for serialNumber={}", normalizedSerialNumber);
      throw new DuplicateDeviceException(normalizedSerialNumber);
    }

    log.info(
        "Device registered successfully with serialNumber={} certificateId={}",
        normalizedSerialNumber,
        response.certificate().certificateId());
    return response;
  }

  @Override
  public DeviceResponse getDeviceBySerialNumber(String serialNumber) {
    String normalizedSerialNumber = normalizeSerialNumber(serialNumber);
    log.debug("Looking up device with serialNumber={}", normalizedSerialNumber);
    DeviceResponse response = devicesBySerialNumber.get(normalizedSerialNumber);

    if (response == null) {
      log.warn("Device not found for serialNumber={}", normalizedSerialNumber);
      throw new DeviceNotFoundException(normalizedSerialNumber);
    }

    return response;
  }

  @Override
  public DeviceProfileResponse getDeviceProfile(String serialNumber) {
    markTimedOutDevicesOffline();
    DeviceResponse device = getDeviceBySerialNumber(serialNumber);

    return new DeviceProfileResponse(
        profileSummary(device),
        device.lastSeenAt(),
        healthIndicators(device),
        firmwareHistory(device),
        eventTimeline(device));
  }

  @Override
  public DeviceHeartbeatResponse ingestHeartbeat(String serialNumber, DeviceHeartbeatRequest request) {
    String normalizedSerialNumber = normalizeSerialNumber(serialNumber);
    LocalDateTime heartbeatAt = utcDateTime(request.timestamp());
    log.info("Heartbeat received for serialNumber={} timestamp={}", normalizedSerialNumber, heartbeatAt);

    final boolean[] accepted = {false};
    DeviceResponse updated =
        devicesBySerialNumber.compute(
            normalizedSerialNumber,
            (key, current) -> {
              if (current == null) {
                return null;
              }
              if (current.lastSeenAt() != null && heartbeatAt.isBefore(current.lastSeenAt())) {
                return current;
              }
              accepted[0] = true;
              return copyDevice(current)
                  .firmwareVersion(
                      StringUtils.hasText(request.firmwareVersion())
                          ? request.firmwareVersion()
                          : current.firmwareVersion())
                  .status(StringUtils.hasText(request.status()) ? request.status() : current.status())
                  .lastSeenAt(heartbeatAt)
                  .connectivityStatus(DeviceConnectivityStatus.ONLINE.name())
                  .updatedAt(LocalDateTime.now(clock))
                  .build();
            });

    if (updated == null) {
      log.warn("Heartbeat rejected for unknown serialNumber={}", normalizedSerialNumber);
      throw new DeviceNotFoundException(normalizedSerialNumber);
    }

    return new DeviceHeartbeatResponse(
        updated.serialNumber(), updated.lastSeenAt(), updated.connectivityStatus(), accepted[0]);
  }

  @Override
  public int markTimedOutDevicesOffline() {
    LocalDateTime timeoutCutoff =
        LocalDateTime.now(clock).minus(heartbeatProperties.timeout());
    final int[] offlineCount = {0};

    devicesBySerialNumber.replaceAll(
        (serialNumber, device) -> {
          if (shouldMarkOffline(device, timeoutCutoff)) {
            offlineCount[0]++;
            log.info("Device heartbeat timed out for serialNumber={}", serialNumber);
            return copyDevice(device)
                .connectivityStatus(DeviceConnectivityStatus.OFFLINE.name())
                .updatedAt(LocalDateTime.now(clock))
                .build();
          }
          return device;
        });

    return offlineCount[0];
  }

  @Override
  public DeviceInventoryResponse getDevices(DeviceInventoryQuery query) {
    List<DeviceResponse> filtered = filteredDevices(query);
    int page = normalizedPage(query.page());
    int size = normalizedSize(query.size());
    int fromIndex = Math.min(page * size, filtered.size());
    int toIndex = Math.min(fromIndex + size, filtered.size());
    List<DeviceResponse> items = filtered.subList(fromIndex, toIndex);
    int totalPages = filtered.isEmpty() ? 0 : (int) Math.ceil((double) filtered.size() / size);

    return new DeviceInventoryResponse(items, page, size, filtered.size(), totalPages);
  }

  @Override
  public String exportDevicesCsv(DeviceInventoryQuery query) {
    List<DeviceResponse> filtered = filteredDevices(query);
    StringBuilder csv = new StringBuilder(String.join(",", CSV_HEADERS)).append('\n');

    for (DeviceResponse device : filtered) {
      List<String> row =
          List.of(
              value(device.id()),
              value(device.serialNumber()),
              value(device.deviceModel()),
              value(device.firmwareVersion()),
              value(device.customerId()),
              value(device.status()),
              value(device.onboardingStatus()),
              value(device.connectivityStatus()),
              value(device.lastSeenAt()),
              value(device.certificate() == null ? null : device.certificate().certificateId()),
              value(device.createdAt()),
              value(device.updatedAt()));
      csv.append(String.join(",", row)).append('\n');
    }

    return csv.toString();
  }

  private String normalizeSerialNumber(String serialNumber) {
    return serialNumber == null ? "" : serialNumber.trim().toUpperCase(Locale.ROOT);
  }

  private List<DeviceResponse> filteredDevices(DeviceInventoryQuery query) {
    markTimedOutDevicesOffline();
    String serialNumber = normalizeSerialNumber(query.serialNumber());
    String firmwareVersion = normalizedFilter(query.firmwareVersion());
    String status = normalizedFilter(query.status());

    return devicesBySerialNumber.values().stream()
        .filter(device -> serialNumber.isBlank() || device.serialNumber().contains(serialNumber))
        .filter(
            device ->
                firmwareVersion.isBlank()
                    || normalizedFilter(device.firmwareVersion()).equals(firmwareVersion))
        .filter(device -> status.isBlank() || normalizedFilter(device.status()).equals(status))
        .sorted(
            Comparator.comparing(DeviceResponse::createdAt, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(DeviceResponse::serialNumber))
        .toList();
  }

  private List<DeviceHealthIndicatorResponse> healthIndicators(DeviceResponse device) {
    boolean online = DeviceConnectivityStatus.ONLINE.name().equals(device.connectivityStatus());
    return List.of(
        new DeviceHealthIndicatorResponse(
            "Connectivity",
            online
                ? "HEALTHY"
                : DeviceConnectivityStatus.OFFLINE.name().equals(device.connectivityStatus())
                    ? "CRITICAL"
                    : "UNKNOWN",
            device.lastSeenAt() == null
                ? "No heartbeat observed"
                : "Connectivity state is " + device.connectivityStatus()),
        new DeviceHealthIndicatorResponse(
            "Firmware Compliance",
            StringUtils.hasText(device.firmwareVersion()) ? "HEALTHY" : "WARNING",
            StringUtils.hasText(device.firmwareVersion())
                ? "Firmware version is reported"
                : "Firmware version is missing"),
        new DeviceHealthIndicatorResponse(
            "Certificate",
            "ISSUED".equals(normalizedFilter(device.certificate() == null ? null : device.certificate().status()))
                ? "HEALTHY"
                : "CRITICAL",
            device.certificate() == null
                ? "Certificate metadata is missing"
                : "Certificate status is " + device.certificate().status()),
        new DeviceHealthIndicatorResponse(
            "Onboarding",
            "ACTIVE".equals(normalizedFilter(device.onboardingStatus()))
                    || "PENDING_ACTIVATION".equals(normalizedFilter(device.onboardingStatus()))
                ? "WARNING"
                : "UNKNOWN",
            "Onboarding status is " + device.onboardingStatus()),
        new DeviceHealthIndicatorResponse(
            "Recent Errors", "HEALTHY", "No recent critical errors recorded"));
  }

  private List<DeviceFirmwareHistoryResponse> firmwareHistory(DeviceResponse device) {
    return List.of(
        new DeviceFirmwareHistoryResponse(
            device.firmwareVersion(), device.updatedAt(), "REGISTRATION", "SUCCESS", null));
  }

  private List<DeviceEventResponse> eventTimeline(DeviceResponse device) {
    List<DeviceEventResponse> events = new ArrayList<>();
    if (device.lastSeenAt() != null) {
      events.add(
          new DeviceEventResponse(
              device.lastSeenAt(),
              "HEARTBEAT",
              "INFO",
              "device-api",
              "Device heartbeat observed",
              null,
              null));
    }
    events.addAll(
        List.of(
            new DeviceEventResponse(
                device.updatedAt(),
                "CERTIFICATE_ISSUED",
                "INFO",
                "device-api",
                "Device certificate metadata issued",
                null,
                null),
            new DeviceEventResponse(
                device.createdAt(),
                "DEVICE_REGISTERED",
                "INFO",
                "device-api",
                "Device registered for customer " + device.customerId(),
                null,
                null)));
    return events.stream()
        .sorted(Comparator.comparing(DeviceEventResponse::timestamp, Comparator.reverseOrder()))
        .toList();
  }

  private DeviceProfileSummaryResponse profileSummary(DeviceResponse device) {
    return new DeviceProfileSummaryResponse(
        device.id(),
        device.serialNumber(),
        device.deviceModel(),
        device.firmwareVersion(),
        device.customerId(),
        device.status(),
        device.registrationStatus(),
        device.onboardingStatus(),
        device.certificate() == null ? "UNKNOWN" : device.certificate().status(),
        device.connectivityStatus(),
        device.createdAt(),
        device.updatedAt());
  }

  private boolean shouldMarkOffline(DeviceResponse device, LocalDateTime timeoutCutoff) {
    return device.lastSeenAt() != null
        && device.lastSeenAt().isBefore(timeoutCutoff)
        && DeviceConnectivityStatus.ONLINE.name().equals(device.connectivityStatus());
  }

  private LocalDateTime utcDateTime(Instant instant) {
    return LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
  }

  private DeviceResponse.DeviceResponseBuilder copyDevice(DeviceResponse device) {
    return DeviceResponse.builder()
        .id(device.id())
        .serialNumber(device.serialNumber())
        .deviceModel(device.deviceModel())
        .firmwareVersion(device.firmwareVersion())
        .customerId(device.customerId())
        .location(device.location())
        .status(device.status())
        .registrationStatus(device.registrationStatus())
        .onboardingStatus(device.onboardingStatus())
        .certificate(device.certificate())
        .lastSeenAt(device.lastSeenAt())
        .connectivityStatus(device.connectivityStatus())
        .createdAt(device.createdAt())
        .updatedAt(device.updatedAt());
  }

  private String normalizedFilter(String value) {
    return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
  }

  private int normalizedPage(int page) {
    return Math.max(page, 0);
  }

  private int normalizedSize(int size) {
    if (size <= 0) {
      return 20;
    }
    return Math.min(size, MAX_PAGE_SIZE);
  }

  private String value(Object value) {
    if (value == null) {
      return "";
    }

    String text = String.valueOf(value);
    if (text.contains(",") || text.contains("\"") || text.contains("\n") || text.contains("\r")) {
      return "\"" + text.replace("\"", "\"\"") + "\"";
    }
    return text;
  }

  private void validateSerialNumber(String serialNumber) {
    DeviceRegistrationProperties.SerialNumberPolicy policy = registrationProperties.serialNumber();
    List<DeviceRegistrationValidationException.FieldViolation> violations = new ArrayList<>();

    if (!StringUtils.hasText(serialNumber)) {
      violations.add(
          new DeviceRegistrationValidationException.FieldViolation(
              "serialNumber", "serialNumber is required"));
    } else {
      if (serialNumber.length() < policy.minLength()) {
        violations.add(
            new DeviceRegistrationValidationException.FieldViolation(
                "serialNumber",
                "serialNumber must be at least " + policy.minLength() + " characters"));
      }
      if (serialNumber.length() > policy.maxLength()) {
        violations.add(
            new DeviceRegistrationValidationException.FieldViolation(
                "serialNumber",
                "serialNumber must be at most " + policy.maxLength() + " characters"));
      }
      if (!Pattern.matches(policy.allowedPattern(), serialNumber)) {
        violations.add(
            new DeviceRegistrationValidationException.FieldViolation(
                "serialNumber",
                "serialNumber contains unsupported characters or format"));
      }
    }

    if (!violations.isEmpty()) {
      throw new DeviceRegistrationValidationException(violations);
    }
  }
}
