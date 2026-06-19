package com.devicemanagement.deviceapi.dto.auth;

import com.devicemanagement.deviceapi.security.TokenPair;
import java.time.Instant;

public record AuthTokenResponse(
    String tokenType,
    String accessToken,
    Instant accessTokenExpiresAt,
    String refreshToken,
    Instant refreshTokenExpiresAt,
    AuthUserResponse user) {

  public static AuthTokenResponse from(TokenPair tokenPair) {
    return new AuthTokenResponse(
        "Bearer",
        tokenPair.accessToken(),
        tokenPair.accessTokenExpiresAt(),
        tokenPair.refreshToken(),
        tokenPair.refreshTokenExpiresAt(),
        AuthUserResponse.from(tokenPair.user()));
  }
}
