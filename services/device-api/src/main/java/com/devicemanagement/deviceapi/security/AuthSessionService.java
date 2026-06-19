package com.devicemanagement.deviceapi.security;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthSessionService {

  private final UserAuthenticationService userAuthenticationService;
  private final JwtTokenService jwtTokenService;
  private final RefreshTokenStore refreshTokenStore;

  public TokenPair login(String email, String password) {
    return issueTokenPair(userAuthenticationService.authenticate(email, password));
  }

  public TokenPair refresh(String refreshToken) {
    RefreshTokenRecord consumedToken = refreshTokenStore.consume(refreshToken);
    AuthenticatedUser user =
        userAuthenticationService
            .findById(consumedToken.userId())
            .orElseThrow(InvalidRefreshTokenException::new);

    return issueTokenPair(user);
  }

  public void logout(String refreshToken) {
    refreshTokenStore.revoke(refreshToken);
  }

  private TokenPair issueTokenPair(AuthenticatedUser user) {
    JwtTokenService.IssuedAccessToken accessToken = jwtTokenService.issueAccessToken(user);
    RefreshTokenStore.IssuedRefreshToken refreshToken = refreshTokenStore.issue(user.id());
    return new TokenPair(
        accessToken.token(), accessToken.expiresAt(), refreshToken.token(), refreshToken.expiresAt(), user);
  }
}
