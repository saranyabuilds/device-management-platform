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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
class DeviceControllerIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;

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
        .andExpect(jsonPath("$.createdAt").isNotEmpty());
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

  private String deviceRequest(String serialNumber) {
    return """
        {
          "serialNumber": "%s",
          "deviceModel": "Gateway-1000",
          "firmwareVersion": "1.0.0",
          "customerId": "customer-001",
          "location": "Building A"
        }
        """
        .formatted(serialNumber);
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
