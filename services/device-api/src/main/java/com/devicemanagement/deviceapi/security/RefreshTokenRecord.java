package com.devicemanagement.deviceapi.security;

import java.time.Instant;

record RefreshTokenRecord(String tokenHash, String userId, Instant expiresAt, boolean revoked) {}
