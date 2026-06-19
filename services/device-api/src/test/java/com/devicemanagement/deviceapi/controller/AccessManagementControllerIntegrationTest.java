package com.devicemanagement.deviceapi.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
class AccessManagementControllerIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;

  @Test
  void superAdminCanViewRolesPermissionsAndUsers() throws Exception {
    String token = bearerToken("admin@example.com");

    mockMvc
        .perform(get("/api/v1/roles").header("Authorization", token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[?(@.id == 'SUPER_ADMIN')]").exists())
        .andExpect(jsonPath("$[?(@.id == 'VIEWER')]").exists());

    mockMvc
        .perform(get("/api/v1/permissions").header("Authorization", token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[?(@ == 'ROLE_MANAGE')]").exists());

    mockMvc
        .perform(get("/api/v1/users").header("Authorization", token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[?(@.email == 'viewer@example.com')]").exists());
  }

  @Test
  void userWithoutRoleManageCannotManageRoles() throws Exception {
    mockMvc
        .perform(get("/api/v1/roles").header("Authorization", bearerToken("operator@example.com")))
        .andExpect(status().isForbidden());
  }

  @Test
  void superAdminCanCreateRoleAndAssignItToUser() throws Exception {
    String token = bearerToken("admin@example.com");

    mockMvc
        .perform(
            post("/api/v1/roles")
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "name": "Audit Reviewer",
                      "description": "Can read audit logs",
                      "permissions": ["AUDIT_READ"],
                      "active": true
                    }
                    """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value("AUDIT_REVIEWER"))
        .andExpect(jsonPath("$.permissions[0]").value("AUDIT_READ"));

    mockMvc
        .perform(
            put("/api/v1/users/viewer/roles")
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "roles": ["VIEWER", "AUDIT_REVIEWER"]
                    }
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.roles[?(@ == 'AUDIT_REVIEWER')]").exists())
        .andExpect(jsonPath("$.permissions[?(@ == 'AUDIT_READ')]").exists());
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
