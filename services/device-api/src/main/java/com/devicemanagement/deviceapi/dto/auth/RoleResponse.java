package com.devicemanagement.deviceapi.dto.auth;

import com.devicemanagement.deviceapi.security.Permission;
import com.devicemanagement.deviceapi.security.RoleDefinition;
import java.util.Set;

public record RoleResponse(
    String id, String name, String description, Set<Permission> permissions, boolean active, boolean systemRole) {

  public static RoleResponse from(RoleDefinition role) {
    return new RoleResponse(
        role.id(), role.name(), role.description(), role.permissions(), role.active(), role.systemRole());
  }
}
