package com.devicemanagement.deviceapi.security;

import java.util.Set;

public record AuthenticatedUser(
    String id, String email, String displayName, String passwordHash, Set<UserRole> roles) {}
