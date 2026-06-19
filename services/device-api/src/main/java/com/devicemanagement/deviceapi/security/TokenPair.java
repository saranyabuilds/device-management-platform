package com.devicemanagement.deviceapi.security;

import java.time.Instant;
import java.util.Set;

public record TokenPair(
    String accessToken,
    Instant accessTokenExpiresAt,
    String refreshToken,
    Instant refreshTokenExpiresAt,
    AuthenticatedUser user,
    Set<Permission> permissions) {}
