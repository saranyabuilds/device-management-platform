package com.devicemanagement.deviceapi.dto.auth;

import jakarta.validation.constraints.NotNull;

public record PasswordPolicyValidationRequest(@NotNull String password) {}
