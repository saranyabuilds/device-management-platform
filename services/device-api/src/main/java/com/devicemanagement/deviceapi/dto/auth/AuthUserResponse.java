package com.devicemanagement.deviceapi.dto.auth;

import com.devicemanagement.deviceapi.security.AuthenticatedUser;
import com.devicemanagement.deviceapi.security.UserRole;
import java.util.Set;

public record AuthUserResponse(String id, String email, String displayName, Set<UserRole> roles) {

  public static AuthUserResponse from(AuthenticatedUser user) {
    return new AuthUserResponse(user.id(), user.email(), user.displayName(), user.roles());
  }
}
