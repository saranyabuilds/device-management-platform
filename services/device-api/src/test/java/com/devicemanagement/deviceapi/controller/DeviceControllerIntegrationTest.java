package com.devicemanagement.deviceapi.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
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
    mockMvc.perform(get("/api/v1/devices")).andExpect(status().isUnauthorized());
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
