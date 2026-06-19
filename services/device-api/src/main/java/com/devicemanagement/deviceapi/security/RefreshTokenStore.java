package com.devicemanagement.deviceapi.security;

import com.devicemanagement.deviceapi.config.AuthProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RefreshTokenStore {

  private final AuthProperties authProperties;
  private final Clock clock;
  private final Map<String, RefreshTokenRecord> refreshTokens = new ConcurrentHashMap<>();

  public IssuedRefreshToken issue(String userId) {
    String token = UUID.randomUUID() + "." + UUID.randomUUID();
    String tokenHash = hash(token);
    Instant expiresAt = clock.instant().plus(authProperties.refreshToken().ttl());

    refreshTokens.put(tokenHash, new RefreshTokenRecord(tokenHash, userId, expiresAt, false));

    return new IssuedRefreshToken(token, expiresAt);
  }

  public RefreshTokenRecord consume(String token) {
    String tokenHash = hash(token);
    RefreshTokenRecord record =
        Optional.ofNullable(refreshTokens.get(tokenHash)).orElseThrow(InvalidRefreshTokenException::new);

    if (record.revoked() || !record.expiresAt().isAfter(clock.instant())) {
      refreshTokens.remove(tokenHash);
      throw new InvalidRefreshTokenException();
    }

    refreshTokens.put(
        tokenHash, new RefreshTokenRecord(record.tokenHash(), record.userId(), record.expiresAt(), true));

    return record;
  }

  public void revoke(String token) {
    String tokenHash = hash(token);
    Optional.ofNullable(refreshTokens.get(tokenHash))
        .ifPresent(
            record ->
                refreshTokens.put(
                    tokenHash,
                    new RefreshTokenRecord(
                        record.tokenHash(), record.userId(), record.expiresAt(), true)));
  }

  private String hash(String token) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
      return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is unavailable", exception);
    }
  }

  public record IssuedRefreshToken(String token, Instant expiresAt) {}
}
