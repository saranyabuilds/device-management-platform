package com.devicemanagement.deviceapi.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.auth")
public record AuthProperties(
    @Valid Jwt jwt,
    @Valid RefreshToken refreshToken,
    @Valid PasswordPolicy passwordPolicy,
    @Valid List<SeedUser> users) {

  public AuthProperties {
    users = users == null ? List.of() : List.copyOf(users);
  }

  public record Jwt(
      @NotBlank String issuer,
      @NotBlank String secret,
      Duration accessTokenTtl,
      Duration clockSkew) {

    public Jwt {
      accessTokenTtl = accessTokenTtl == null ? Duration.ofMinutes(15) : accessTokenTtl;
      clockSkew = clockSkew == null ? Duration.ofSeconds(30) : clockSkew;
    }
  }

  public record RefreshToken(Duration ttl) {

    public RefreshToken {
      ttl = ttl == null ? Duration.ofDays(7) : ttl;
    }
  }

  public record PasswordPolicy(
      @Min(8) int minLength,
      boolean requireUppercase,
      boolean requireLowercase,
      boolean requireDigit,
      boolean requireSpecial) {

    public PasswordPolicy {
      minLength = minLength == 0 ? 12 : minLength;
    }
  }

  public record SeedUser(
      @NotBlank String id,
      @Email @NotBlank String email,
      @NotBlank String displayName,
      @NotBlank String password,
      @NotEmpty Set<String> roles) {}
}
