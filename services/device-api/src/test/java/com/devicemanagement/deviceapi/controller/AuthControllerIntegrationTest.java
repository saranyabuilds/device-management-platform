package com.devicemanagement.deviceapi.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private JwtEncoder jwtEncoder;

  @Value("${app.auth.jwt.issuer}")
  private String issuer;

  @Test
  void loginReturnsJwtAndRefreshToken() throws Exception {
    mockMvc
        .perform(loginRequest("admin@example.com", "ChangeMe123!"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.tokenType").value("Bearer"))
        .andExpect(jsonPath("$.accessToken").isNotEmpty())
        .andExpect(jsonPath("$.refreshToken").isNotEmpty())
        .andExpect(jsonPath("$.user.email").value("admin@example.com"))
        .andExpect(jsonPath("$.user.roles[0]").exists())
        .andExpect(jsonPath("$.user.permissions[0]").exists());
  }

  @Test
  void invalidLoginReturnsUnauthorized() throws Exception {
    mockMvc
        .perform(loginRequest("admin@example.com", "wrong-password"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error").value("INVALID_CREDENTIALS"));
  }

  @Test
  void refreshRotatesRefreshTokenAndRejectsReusedToken() throws Exception {
    JsonNode login = objectMapper.readTree(login("admin@example.com"));
    String refreshToken = login.get("refreshToken").asText();

    mockMvc
        .perform(refreshRequest(refreshToken))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.accessToken").isNotEmpty())
        .andExpect(jsonPath("$.refreshToken").isNotEmpty());

    mockMvc
        .perform(refreshRequest(refreshToken))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error").value("INVALID_REFRESH_TOKEN"));
  }

  @Test
  void expiredAccessTokenReturnsUnauthorized() throws Exception {
    Instant now = Instant.now();
    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer(issuer)
            .issuedAt(now.minusSeconds(120))
            .expiresAt(now.minusSeconds(60))
            .subject("admin")
            .claim("roles", List.of("ADMIN"))
            .build();
    String expiredToken =
        jwtEncoder
            .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
            .getTokenValue();

    mockMvc
        .perform(get("/api/v1/devices").header("Authorization", "Bearer " + expiredToken))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void weakPasswordFailsPolicyValidation() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/auth/password-policy/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "password": "weak"
                    }
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("PASSWORD_POLICY_FAILED"))
        .andExpect(jsonPath("$.fieldErrors[0].field").value("password"));
  }

  @Test
  void meReturnsCurrentJwtClaims() throws Exception {
    JsonNode login = objectMapper.readTree(login("viewer@example.com"));

    mockMvc
        .perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + login.get("accessToken").asText()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.subject").value("viewer"))
        .andExpect(jsonPath("$.email").value("viewer@example.com"))
        .andExpect(jsonPath("$.roles[0]").value("VIEWER"))
        .andExpect(jsonPath("$.permissions[0]").value("DEVICE_READ"));
  }

  private String login(String email) throws Exception {
    return mockMvc
        .perform(loginRequest(email, "ChangeMe123!"))
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString();
  }

  private org.springframework.test.web.servlet.RequestBuilder loginRequest(String email, String password) {
    return post("/api/v1/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content(
            """
            {
              "email": "%s",
              "password": "%s"
            }
            """
                .formatted(email, password));
  }

  private org.springframework.test.web.servlet.RequestBuilder refreshRequest(String refreshToken) {
    return post("/api/v1/auth/refresh")
        .contentType(MediaType.APPLICATION_JSON)
        .content(
            """
            {
              "refreshToken": "%s"
            }
            """
                .formatted(refreshToken));
  }
}
