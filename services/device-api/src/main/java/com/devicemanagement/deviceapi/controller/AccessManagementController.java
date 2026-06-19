package com.devicemanagement.deviceapi.controller;

import com.devicemanagement.deviceapi.dto.auth.RoleResponse;
import com.devicemanagement.deviceapi.dto.auth.RoleUpsertRequest;
import com.devicemanagement.deviceapi.dto.auth.UserAccessResponse;
import com.devicemanagement.deviceapi.dto.auth.UserRoleAssignmentRequest;
import com.devicemanagement.deviceapi.security.Permission;
import com.devicemanagement.deviceapi.security.RoleManagementService;
import com.devicemanagement.deviceapi.security.UserAuthenticationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
@Tag(name = "Access Management", description = "Role, permission, and user-role APIs")
public class AccessManagementController {

  private final RoleManagementService roleManagementService;
  private final UserAuthenticationService userAuthenticationService;

  @GetMapping("/roles")
  @PreAuthorize("hasAuthority('ROLE_MANAGE')")
  @Operation(summary = "List roles")
  public List<RoleResponse> getRoles() {
    return roleManagementService.getRoles().stream().map(RoleResponse::from).toList();
  }

  @PostMapping("/roles")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('ROLE_MANAGE')")
  @Operation(summary = "Create role")
  public RoleResponse createRole(@Valid @RequestBody RoleUpsertRequest request) {
    log.info("Role creation requested for name={}", request.name());
    return RoleResponse.from(
        roleManagementService.createRole(
            request.name(), request.description(), request.permissions()));
  }

  @PutMapping("/roles/{roleId}")
  @PreAuthorize("hasAuthority('ROLE_MANAGE')")
  @Operation(summary = "Update role")
  public RoleResponse updateRole(
      @PathVariable String roleId, @Valid @RequestBody RoleUpsertRequest request) {
    log.info("Role update requested for roleId={}", roleId);
    return RoleResponse.from(
        roleManagementService.updateRole(
            roleId,
            request.name(),
            request.description(),
            request.permissions(),
            request.active()));
  }

  @GetMapping("/permissions")
  @PreAuthorize("hasAuthority('ROLE_MANAGE')")
  @Operation(summary = "List permissions")
  public List<Permission> getPermissions() {
    return roleManagementService.getPermissions();
  }

  @GetMapping("/users")
  @PreAuthorize("hasAuthority('USER_READ')")
  @Operation(summary = "List users with access assignments")
  public List<UserAccessResponse> getUsers() {
    return userAuthenticationService.getUsers().stream()
        .map(user -> UserAccessResponse.from(user, roleManagementService.permissionsForRoles(user.roles())))
        .toList();
  }

  @PutMapping("/users/{userId}/roles")
  @PreAuthorize("hasAuthority('ROLE_MANAGE')")
  @Operation(summary = "Replace user role assignments")
  public UserAccessResponse assignRoles(
      @PathVariable String userId, @Valid @RequestBody UserRoleAssignmentRequest request) {
    log.info("Role assignment requested for userId={} roles={}", userId, request.roles());
    var user = userAuthenticationService.assignRoles(userId, request.roles());
    return UserAccessResponse.from(user, roleManagementService.permissionsForRoles(user.roles()));
  }
}
