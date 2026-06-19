package com.devicemanagement.deviceapi.dto.auth;

import com.devicemanagement.deviceapi.security.Permission;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.Set;

public record RoleUpsertRequest(
    @NotBlank String name, String description, @NotEmpty Set<Permission> permissions, boolean active) {}
