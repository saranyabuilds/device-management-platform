package com.devicemanagement.deviceapi.security;

import java.util.Arrays;
import java.util.Comparator;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class RoleManagementService {

  private final Map<String, RoleDefinition> rolesById = new ConcurrentHashMap<>();

  public RoleManagementService() {
    addSystemRole(
        UserRole.SUPER_ADMIN.name(),
        "Super Admin",
        "Full platform administration",
        Set.of(
            Permission.DEVICE_READ,
            Permission.DEVICE_WRITE,
            Permission.USER_READ,
            Permission.USER_WRITE,
            Permission.ROLE_MANAGE,
            Permission.AUDIT_READ));
    addSystemRole(
        UserRole.ADMIN.name(),
        "Admin",
        "Administrative access without role ownership",
        Set.of(
            Permission.DEVICE_READ,
            Permission.DEVICE_WRITE,
            Permission.USER_READ,
            Permission.USER_WRITE,
            Permission.AUDIT_READ));
    addSystemRole(
        UserRole.OPERATOR.name(),
        "Operator",
        "Device operations access",
        Set.of(Permission.DEVICE_READ, Permission.DEVICE_WRITE));
    addSystemRole(
        UserRole.VIEWER.name(), "Viewer", "Read-only device access", Set.of(Permission.DEVICE_READ));
  }

  public Set<Permission> permissionsForRoles(Set<String> roleIds) {
    return roleIds.stream()
        .map(this::requireActiveRole)
        .flatMap(role -> role.permissions().stream())
        .collect(java.util.stream.Collectors.toUnmodifiableSet());
  }

  public java.util.List<RoleDefinition> getRoles() {
    return rolesById.values().stream()
        .sorted(Comparator.comparing(RoleDefinition::id))
        .toList();
  }

  public java.util.List<Permission> getPermissions() {
    return Arrays.stream(Permission.values()).toList();
  }

  public RoleDefinition createRole(String name, String description, Set<Permission> permissions) {
    String id = normalizeRoleId(name);
    if (rolesById.containsKey(id)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Role already exists");
    }
    RoleDefinition role =
        new RoleDefinition(id, name.trim(), description, Set.copyOf(permissions), true, false);
    rolesById.put(id, role);
    return role;
  }

  public RoleDefinition updateRole(
      String roleId, String name, String description, Set<Permission> permissions, boolean active) {
    RoleDefinition existing = requireRole(roleId);
    if (existing.systemRole()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "System roles cannot be changed");
    }

    RoleDefinition updated =
        new RoleDefinition(
            existing.id(), name.trim(), description, Set.copyOf(permissions), active, false);
    rolesById.put(updated.id(), updated);
    return updated;
  }

  public void validateRoleAssignments(Set<String> roleIds) {
    roleIds.forEach(this::requireActiveRole);
  }

  private void addSystemRole(
      String id, String name, String description, Set<Permission> permissions) {
    rolesById.put(id, new RoleDefinition(id, name, description, permissions, true, true));
  }

  private RoleDefinition requireActiveRole(String roleId) {
    RoleDefinition role = requireRole(roleId);
    if (!role.active()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role is inactive: " + roleId);
    }
    return role;
  }

  private RoleDefinition requireRole(String roleId) {
    RoleDefinition role = rolesById.get(normalizeRoleId(roleId));
    if (role == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown role: " + roleId);
    }
    return role;
  }

  private String normalizeRoleId(String value) {
    return value == null
        ? ""
        : value.trim().replaceAll("[^A-Za-z0-9]+", "_").toUpperCase(Locale.ROOT);
  }
}
