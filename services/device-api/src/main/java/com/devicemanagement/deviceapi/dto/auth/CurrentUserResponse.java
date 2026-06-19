package com.devicemanagement.deviceapi.dto.auth;

import java.util.List;
import org.springframework.security.oauth2.jwt.Jwt;

public record CurrentUserResponse(
    String subject, String email, String displayName, List<String> roles, List<String> permissions) {

  public static CurrentUserResponse from(Jwt jwt) {
    return new CurrentUserResponse(
        jwt.getSubject(),
        jwt.getClaimAsString("email"),
        jwt.getClaimAsString("name"),
        jwt.getClaimAsStringList("roles"),
        jwt.getClaimAsStringList("permissions"));
  }
}
