package com.devicemanagement.deviceapi.security;

import com.devicemanagement.deviceapi.config.AuthProperties;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class JwtTokenService {

  private final AuthProperties authProperties;
  private final JwtEncoder jwtEncoder;
  private final Clock clock;

  public IssuedAccessToken issueAccessToken(AuthenticatedUser user) {
    Instant issuedAt = clock.instant();
    Instant expiresAt = issuedAt.plus(authProperties.jwt().accessTokenTtl());
    List<String> roles = user.roles().stream().map(UserRole::name).sorted().toList();

    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer(authProperties.jwt().issuer())
            .issuedAt(issuedAt)
            .expiresAt(expiresAt)
            .subject(user.id())
            .claim("email", user.email())
            .claim("name", user.displayName())
            .claim("roles", roles)
            .build();

    JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
    String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    return new IssuedAccessToken(token, expiresAt);
  }

  public record IssuedAccessToken(String token, Instant expiresAt) {}
}
