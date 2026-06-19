package com.devicemanagement.deviceapi.dto.auth;

import jakarta.validation.constraints.NotEmpty;
import java.util.Set;

public record UserRoleAssignmentRequest(@NotEmpty Set<String> roles) {}
