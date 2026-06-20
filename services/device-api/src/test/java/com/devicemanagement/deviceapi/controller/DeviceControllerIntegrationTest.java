package com.devicemanagement.deviceapi.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.devicemanagement.deviceapi.config.CorrelationIdFilter;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
class DeviceControllerIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private JwtEncoder jwtEncoder;

  @Test
  void createDeviceReturnsCreatedDevice() throws Exception {
    String serialNumber = "SN-CREATE-001";

    mockMvc
        .perform(
            post("/api/v1/devices")
                .header("Authorization", bearerToken("operator@example.com"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(deviceRequest(serialNumber)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").isNotEmpty())
        .andExpect(jsonPath("$.serialNumber").value(serialNumber))
        .andExpect(jsonPath("$.status").value("ACTIVE"))
        .andExpect(jsonPath("$.registrationStatus").value("REGISTERED"))
        .andExpect(jsonPath("$.onboardingStatus").value("PENDING_ACTIVATION"))
        .andExpect(jsonPath("$.certificate.certificateId").isNotEmpty())
        .andExpect(jsonPath("$.certificate.issuerId").value("urn:device-management:local-ca"))
        .andExpect(jsonPath("$.certificate.subject").value("CN=SN-CREATE-001, OU=Devices, O=Device Management Platform"))
        .andExpect(jsonPath("$.certificate.fingerprintSha256", matchesPattern("[0-9a-f]{64}")))
        .andExpect(jsonPath("$.certificate.status").value("ISSUED"))
        .andExpect(jsonPath("$.createdAt").isNotEmpty())
        .andExpect(jsonPath("$.updatedAt").isNotEmpty());
  }

  @Test
  void duplicateSerialNumberReturnsConflict() throws Exception {
    String serialNumber = "SN-DUP-001";
    mockMvc
        .perform(
            post("/api/v1/devices")
                .header("Authorization", bearerToken("operator@example.com"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(deviceRequest(serialNumber)))
        .andExpect(status().isCreated());

    mockMvc
        .perform(
            post("/api/v1/devices")
                .header("Authorization", bearerToken("operator@example.com"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(deviceRequest(serialNumber)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.error").value("DUPLICATE_DEVICE"));
  }

  @Test
  void duplicateDetectionUsesNormalizedSerialNumber() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/devices")
                .header("Authorization", bearerToken("operator@example.com"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(deviceRequest("sn-normalized-001")))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.serialNumber").value("SN-NORMALIZED-001"));

    mockMvc
        .perform(
            post("/api/v1/devices")
                .header("Authorization", bearerToken("operator@example.com"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(deviceRequest(" SN-NORMALIZED-001 ")))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.error").value("DUPLICATE_DEVICE"));
  }

  @Test
  void invalidSerialNumberReturnsValidationError() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/devices")
                .header("Authorization", bearerToken("operator@example.com"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(deviceRequest("SN INVALID!")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.fieldErrors[0].field").value("serialNumber"));
  }

  @Test
  void certificateMetadataIsUniquePerDevice() throws Exception {
    String first =
        mockMvc
            .perform(
                post("/api/v1/devices")
                    .header("Authorization", bearerToken("operator@example.com"))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(deviceRequest("SN-CERT-001")))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    String second =
        mockMvc
            .perform(
                post("/api/v1/devices")
                    .header("Authorization", bearerToken("operator@example.com"))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(deviceRequest("SN-CERT-002")))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();

    JsonNode firstJson = objectMapper.readTree(first);
    JsonNode secondJson = objectMapper.readTree(second);

    assertThat(firstJson.at("/certificate/certificateId").asText())
        .isNotEqualTo(secondJson.at("/certificate/certificateId").asText());
    assertThat(firstJson.at("/certificate/fingerprintSha256").asText())
        .isNotEqualTo(secondJson.at("/certificate/fingerprintSha256").asText());
  }

  @Test
  void unknownDeviceReturnsNotFound() throws Exception {
    mockMvc
        .perform(get("/api/v1/devices/SN-MISSING-001").header("Authorization", bearerToken("viewer@example.com")))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.error").value("DEVICE_NOT_FOUND"));
  }

  @Test
  void blankSerialNumberReturnsValidationError() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/devices")
                .header("Authorization", bearerToken("operator@example.com"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(deviceRequest("")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.fieldErrors", hasSize(1)))
        .andExpect(jsonPath("$.fieldErrors[0].field").value("serialNumber"));
  }

  @Test
  void unauthenticatedDeviceAccessReturnsUnauthorized() throws Exception {
    mockMvc
        .perform(get("/api/v1/devices"))
        .andExpect(status().isUnauthorized())
        .andExpect(
            header()
                .string(
                    CorrelationIdFilter.CORRELATION_ID_HEADER,
                    matchesPattern("[0-9a-fA-F-]{36}")))
        .andExpect(jsonPath("$.correlationId", matchesPattern("[0-9a-fA-F-]{36}")));
  }

  @Test
  void inventorySearchesBySerialNumber() throws Exception {
    createDevice("SN-INV-SEARCH-001", "1.0.0");
    createDevice("SN-INV-OTHER-001", "1.0.0");

    mockMvc
        .perform(
            get("/api/v1/devices")
                .header("Authorization", bearerToken("viewer@example.com"))
                .param("serialNumber", "search"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items", hasSize(1)))
        .andExpect(jsonPath("$.items[0].serialNumber").value("SN-INV-SEARCH-001"))
        .andExpect(jsonPath("$.page").value(0))
        .andExpect(jsonPath("$.size").value(20))
        .andExpect(jsonPath("$.totalItems").value(1))
        .andExpect(jsonPath("$.totalPages").value(1));
  }

  @Test
  void inventoryFiltersByFirmwareVersion() throws Exception {
    createDevice("SN-INV-FW-001", "1.0.0");
    createDevice("SN-INV-FW-002", "2.1.0");

    mockMvc
        .perform(
            get("/api/v1/devices")
                .header("Authorization", bearerToken("viewer@example.com"))
                .param("serialNumber", "SN-INV-FW")
                .param("firmwareVersion", "2.1.0"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items", hasSize(1)))
        .andExpect(jsonPath("$.items[0].serialNumber").value("SN-INV-FW-002"))
        .andExpect(jsonPath("$.items[0].firmwareVersion").value("2.1.0"));
  }

  @Test
  void inventoryFiltersByStatus() throws Exception {
    createDevice("SN-INV-STATUS-001", "1.0.0");

    mockMvc
        .perform(
            get("/api/v1/devices")
                .header("Authorization", bearerToken("viewer@example.com"))
                .param("serialNumber", "SN-INV-STATUS")
                .param("status", "ACTIVE"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items", hasSize(1)))
        .andExpect(jsonPath("$.items[0].status").value("ACTIVE"));
  }

  @Test
  void inventoryPaginatesResults() throws Exception {
    createDevice("SN-INV-PAGE-001", "1.0.0");
    createDevice("SN-INV-PAGE-002", "1.0.0");
    createDevice("SN-INV-PAGE-003", "1.0.0");

    mockMvc
        .perform(
            get("/api/v1/devices")
                .header("Authorization", bearerToken("viewer@example.com"))
                .param("serialNumber", "SN-INV-PAGE")
                .param("page", "0")
                .param("size", "2"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items", hasSize(2)))
        .andExpect(jsonPath("$.page").value(0))
        .andExpect(jsonPath("$.size").value(2))
        .andExpect(jsonPath("$.totalItems").value(3))
        .andExpect(jsonPath("$.totalPages").value(2));
  }

  @Test
  void inventoryRequiresDeviceReadPermission() throws Exception {
    mockMvc
        .perform(get("/api/v1/devices").header("Authorization", bearerTokenWithoutPermissions()))
        .andExpect(status().isForbidden());
  }

  @Test
  void exportDevicesReturnsFilteredCsvWithoutSensitiveCertificateMaterial() throws Exception {
    createDevice("SN-INV-CSV-001", "3.0.0");

    String csv =
        mockMvc
            .perform(
                get("/api/v1/devices/export")
                    .header("Authorization", bearerToken("viewer@example.com"))
                    .param("serialNumber", "SN-INV-CSV"))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("text/csv")))
            .andExpect(
                header()
                    .string(
                        "Content-Disposition",
                        org.hamcrest.Matchers.containsString("device-inventory.csv")))
            .andReturn()
            .getResponse()
            .getContentAsString();

    assertThat(csv)
        .contains(
            "deviceId,serialNumber,deviceModel,firmwareVersion,customerId,status,onboardingStatus,connectivityStatus,lastSeenAt,certificateId,createdAt,updatedAt")
        .contains("SN-INV-CSV-001")
        .doesNotContain("fingerprintSha256")
        .doesNotContain("privateKey");
  }

  @Test
  void exportDevicesRequiresDeviceReadPermission() throws Exception {
    mockMvc
        .perform(get("/api/v1/devices/export").header("Authorization", bearerTokenWithoutPermissions()))
        .andExpect(status().isForbidden());
  }

  @Test
  void deviceProfileReturnsDiagnosticDetailsWithoutSensitiveMaterial() throws Exception {
    createDevice("SN-PROFILE-001", "4.0.0");

    String profile =
        mockMvc
            .perform(
                get("/api/v1/devices/SN-PROFILE-001/profile")
                    .header("Authorization", bearerToken("viewer@example.com")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.device.id").isNotEmpty())
            .andExpect(jsonPath("$.device.serialNumber").value("SN-PROFILE-001"))
            .andExpect(jsonPath("$.device.deviceModel").value("Gateway-1000"))
            .andExpect(jsonPath("$.device.firmwareVersion").value("4.0.0"))
            .andExpect(jsonPath("$.device.customerId").value("customer-001"))
            .andExpect(jsonPath("$.device.status").value("ACTIVE"))
            .andExpect(jsonPath("$.device.registrationStatus").value("REGISTERED"))
            .andExpect(jsonPath("$.device.onboardingStatus").value("PENDING_ACTIVATION"))
            .andExpect(jsonPath("$.device.certificateStatus").value("ISSUED"))
            .andExpect(jsonPath("$.device.connectivityStatus").value("UNKNOWN"))
            .andExpect(jsonPath("$.device.createdAt").isNotEmpty())
            .andExpect(jsonPath("$.device.updatedAt").isNotEmpty())
            .andExpect(jsonPath("$.lastSeenAt").doesNotExist())
            .andExpect(jsonPath("$.healthIndicators", hasSize(5)))
            .andExpect(jsonPath("$.healthIndicators[0].name").value("Connectivity"))
            .andExpect(jsonPath("$.healthIndicators[0].state").value("UNKNOWN"))
            .andExpect(jsonPath("$.firmwareHistory", hasSize(1)))
            .andExpect(jsonPath("$.firmwareHistory[0].firmwareVersion").value("4.0.0"))
            .andExpect(jsonPath("$.firmwareHistory[0].updateSource").value("REGISTRATION"))
            .andExpect(jsonPath("$.firmwareHistory[0].status").value("SUCCESS"))
            .andExpect(jsonPath("$.eventTimeline", hasSize(2)))
            .andExpect(jsonPath("$.eventTimeline[0].eventType").value("CERTIFICATE_ISSUED"))
            .andExpect(jsonPath("$.eventTimeline[1].eventType").value("DEVICE_REGISTERED"))
            .andReturn()
            .getResponse()
            .getContentAsString();

    assertThat(profile)
        .doesNotContain("fingerprintSha256")
        .doesNotContain("privateKey")
        .doesNotContain("token")
        .doesNotContain("secret");
  }

  @Test
  void unauthenticatedDeviceProfileAccessReturnsUnauthorized() throws Exception {
    mockMvc
        .perform(get("/api/v1/devices/SN-PROFILE-UNAUTH-001/profile"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void deviceProfileRequiresDeviceReadPermission() throws Exception {
    mockMvc
        .perform(
            get("/api/v1/devices/SN-PROFILE-FORBIDDEN-001/profile")
                .header("Authorization", bearerTokenWithoutPermissions()))
        .andExpect(status().isForbidden());
  }

  @Test
  void heartbeatUpdatesLastSeenAndConnectivityState() throws Exception {
    createDevice("SN-HB-001", "1.0.0");

    mockMvc
        .perform(
            post("/api/v1/devices/SN-HB-001/heartbeat")
                .header("Authorization", bearerToken("operator@example.com"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(heartbeatRequest("2099-06-19T17:00:00Z")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.serialNumber").value("SN-HB-001"))
        .andExpect(jsonPath("$.lastSeenAt").value("2099-06-19T17:00:00"))
        .andExpect(jsonPath("$.connectivityStatus").value("ONLINE"))
        .andExpect(jsonPath("$.accepted").value(true));

    mockMvc
        .perform(
            get("/api/v1/devices")
                .header("Authorization", bearerToken("viewer@example.com"))
                .param("serialNumber", "SN-HB-001"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].lastSeenAt").value("2099-06-19T17:00:00"))
        .andExpect(jsonPath("$.items[0].connectivityStatus").value("ONLINE"));

    mockMvc
        .perform(
            get("/api/v1/devices/SN-HB-001/profile")
                .header("Authorization", bearerToken("viewer@example.com")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.lastSeenAt").value("2099-06-19T17:00:00"))
        .andExpect(jsonPath("$.device.connectivityStatus").value("ONLINE"))
        .andExpect(jsonPath("$.healthIndicators[0].state").value("HEALTHY"))
        .andExpect(jsonPath("$.eventTimeline[0].eventType").value("HEARTBEAT"));
  }

  @Test
  void olderHeartbeatDoesNotMoveLastSeenBackward() throws Exception {
    createDevice("SN-HB-ORDER-001", "1.0.0");
    ingestHeartbeat("SN-HB-ORDER-001", "2099-06-19T17:00:00Z");

    mockMvc
        .perform(
            post("/api/v1/devices/SN-HB-ORDER-001/heartbeat")
                .header("Authorization", bearerToken("operator@example.com"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(heartbeatRequest("2099-06-19T16:59:00Z")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.lastSeenAt").value("2099-06-19T17:00:00"))
        .andExpect(jsonPath("$.connectivityStatus").value("ONLINE"))
        .andExpect(jsonPath("$.accepted").value(false));
  }

  @Test
  void invalidHeartbeatPayloadReturnsValidationError() throws Exception {
    createDevice("SN-HB-INVALID-001", "1.0.0");

    mockMvc
        .perform(
            post("/api/v1/devices/SN-HB-INVALID-001/heartbeat")
                .header("Authorization", bearerToken("operator@example.com"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"));
  }

  @Test
  void unknownDeviceHeartbeatReturnsNotFound() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/devices/SN-HB-MISSING-001/heartbeat")
                .header("Authorization", bearerToken("operator@example.com"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(heartbeatRequest("2099-06-19T17:00:00Z")))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.error").value("DEVICE_NOT_FOUND"));
  }

  @Test
  void unauthenticatedHeartbeatReturnsUnauthorized() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/devices/SN-HB-UNAUTHORIZED-001/heartbeat")
                .contentType(MediaType.APPLICATION_JSON)
                .content(heartbeatRequest("2026-06-19T17:00:00Z")))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void preservesProvidedCorrelationIdOnSuccessfulRequest() throws Exception {
    String correlationId = "test-correlation-id-001";

    mockMvc
        .perform(
            get("/api/v1/devices")
                .header("Authorization", bearerToken("viewer@example.com"))
                .header(CorrelationIdFilter.CORRELATION_ID_HEADER, correlationId))
        .andExpect(status().isOk())
        .andExpect(header().string(CorrelationIdFilter.CORRELATION_ID_HEADER, correlationId));
  }

  @Test
  void generatedCorrelationIdIsReturnedOnErrorResponse() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/devices")
                .header("Authorization", bearerToken("operator@example.com"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(deviceRequest("")))
        .andExpect(status().isBadRequest())
        .andExpect(
            header()
                .string(
                    CorrelationIdFilter.CORRELATION_ID_HEADER,
                    matchesPattern("[0-9a-fA-F-]{36}")))
        .andExpect(jsonPath("$.correlationId", matchesPattern("[0-9a-fA-F-]{36}")));
  }

  @Test
  void providedCorrelationIdIsIncludedInErrorResponse() throws Exception {
    String correlationId = "test-correlation-id-002";

    mockMvc
        .perform(
            post("/api/v1/devices")
                .header("Authorization", bearerToken("operator@example.com"))
                .header(CorrelationIdFilter.CORRELATION_ID_HEADER, correlationId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(deviceRequest("")))
        .andExpect(status().isBadRequest())
        .andExpect(header().string(CorrelationIdFilter.CORRELATION_ID_HEADER, correlationId))
        .andExpect(jsonPath("$.correlationId").value(correlationId));
  }

  @Test
  void prometheusMetricsEndpointIsExposed() throws Exception {
    mockMvc
        .perform(get("/actuator/prometheus"))
        .andExpect(status().isOk())
        .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("text/plain")));
  }

  @Test
  void acceptsW3cTraceparentHeader() throws Exception {
    mockMvc
        .perform(
            get("/actuator/health")
                .header(
                    "traceparent",
                    "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"))
        .andExpect(status().isOk())
        .andExpect(
            header()
                .string(
                    CorrelationIdFilter.CORRELATION_ID_HEADER,
                    matchesPattern("[0-9a-fA-F-]{36}")));
  }

  @Test
  void includesTraceContextInApplicationLogs(CapturedOutput output) throws Exception {
    mockMvc
        .perform(
            get("/api/v1/devices")
                .header("Authorization", bearerToken("viewer@example.com"))
                .header(
                    "traceparent",
                    "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"))
        .andExpect(status().isOk());

    assertThat(output.getOut())
        .containsPattern("\"traceId\":\"[0-9a-f]{32}\"")
        .containsPattern("\"spanId\":\"[0-9a-f]{16}\"");
  }

  @Test
  void viewerCannotCreateDevice() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/devices")
                .header("Authorization", bearerToken("viewer@example.com"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(deviceRequest("SN-FORBIDDEN-001")))
        .andExpect(status().isForbidden());
  }

  @Test
  void unauthenticatedDeviceRegistrationReturnsUnauthorized() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/devices")
                .contentType(MediaType.APPLICATION_JSON)
                .content(deviceRequest("SN-UNAUTHORIZED-001")))
        .andExpect(status().isUnauthorized());
  }

  private String deviceRequest(String serialNumber) {
    return deviceRequest(serialNumber, "1.0.0");
  }

  private void createDevice(String serialNumber, String firmwareVersion) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/devices")
                .header("Authorization", bearerToken("operator@example.com"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(deviceRequest(serialNumber, firmwareVersion)))
        .andExpect(status().isCreated());
  }

  private String deviceRequest(String serialNumber, String firmwareVersion) {
    return """
        {
          "serialNumber": "%s",
          "deviceModel": "Gateway-1000",
          "firmwareVersion": "%s",
          "customerId": "customer-001",
          "location": "Building A"
        }
        """
        .formatted(serialNumber, firmwareVersion);
  }

  private void ingestHeartbeat(String serialNumber, String timestamp) throws Exception {
    mockMvc
        .perform(
            post("/api/v1/devices/%s/heartbeat".formatted(serialNumber))
                .header("Authorization", bearerToken("operator@example.com"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(heartbeatRequest(timestamp)))
        .andExpect(status().isOk());
  }

  private String heartbeatRequest(String timestamp) {
    return """
        {
          "timestamp": "%s"
        }
        """
        .formatted(timestamp);
  }

  private String bearerTokenWithoutPermissions() {
    Instant now = Instant.now();
    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer("device-api")
            .issuedAt(now)
            .expiresAt(now.plusSeconds(900))
            .subject("no-device-read@example.com")
            .claim("roles", List.of())
            .claim("permissions", List.of())
            .build();
    return "Bearer "
        + jwtEncoder
            .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
            .getTokenValue();
  }

  private String bearerToken(String email) throws Exception {
    String response =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {
                          "email": "%s",
                          "password": "ChangeMe123!"
                        }
                        """
                            .formatted(email)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

    JsonNode json = objectMapper.readTree(response);
    return "Bearer " + json.get("accessToken").asText();
  }
}
