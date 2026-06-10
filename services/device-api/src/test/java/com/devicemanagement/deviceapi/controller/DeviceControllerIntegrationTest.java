package com.devicemanagement.deviceapi.controller;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

  @Test
  void createDeviceReturnsCreatedDevice() throws Exception {
    String serialNumber = "SN-CREATE-001";

    mockMvc
        .perform(
            post("/api/v1/devices")
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
                .contentType(MediaType.APPLICATION_JSON)
                .content(deviceRequest(serialNumber)))
        .andExpect(status().isCreated());

    mockMvc
        .perform(
            post("/api/v1/devices")
                .contentType(MediaType.APPLICATION_JSON)
                .content(deviceRequest(serialNumber)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.error").value("DUPLICATE_DEVICE"));
  }

  @Test
  void unknownDeviceReturnsNotFound() throws Exception {
    mockMvc
        .perform(get("/api/v1/devices/SN-MISSING-001"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.error").value("DEVICE_NOT_FOUND"));
  }

  @Test
  void blankSerialNumberReturnsValidationError() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/devices")
                .contentType(MediaType.APPLICATION_JSON)
                .content(deviceRequest("")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.fieldErrors", hasSize(1)))
        .andExpect(jsonPath("$.fieldErrors[0].field").value("serialNumber"));
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
}
