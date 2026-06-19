package com.devicemanagement.deviceapi.dto.auth;

import com.devicemanagement.deviceapi.security.AuthenticatedUser;
import com.devicemanagement.deviceapi.security.Permission;
import java.util.Set;

public record UserAccessResponse(
    String id, String email, String displayName, Set<String> roles, Set<Permission> permissions) {

  public static UserAccessResponse from(AuthenticatedUser user, Set<Permission> permissions) {
    return new UserAccessResponse(
        user.id(), user.email(), user.displayName(), user.roles(), permissions);
  }
}
