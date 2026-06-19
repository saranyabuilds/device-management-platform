package com.devicemanagement.deviceapi.security;

import java.time.Instant;

public record TokenPair(
    String accessToken,
    Instant accessTokenExpiresAt,
    String refreshToken,
    Instant refreshTokenExpiresAt,
    AuthenticatedUser user) {}
