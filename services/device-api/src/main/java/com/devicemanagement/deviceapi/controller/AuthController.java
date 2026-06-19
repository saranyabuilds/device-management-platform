package com.devicemanagement.deviceapi.controller;

import com.devicemanagement.deviceapi.dto.auth.AuthTokenResponse;
import com.devicemanagement.deviceapi.dto.auth.CurrentUserResponse;
import com.devicemanagement.deviceapi.dto.auth.LoginRequest;
import com.devicemanagement.deviceapi.dto.auth.PasswordPolicyValidationRequest;
import com.devicemanagement.deviceapi.dto.auth.RefreshTokenRequest;
import com.devicemanagement.deviceapi.security.AuthSessionService;
import com.devicemanagement.deviceapi.security.PasswordPolicyValidator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Login, refresh token, and session APIs")
public class AuthController {

  private final AuthSessionService authSessionService;
  private final PasswordPolicyValidator passwordPolicyValidator;

  @PostMapping("/login")
  @Operation(summary = "Login", description = "Authenticates a user and returns JWT tokens")
  public AuthTokenResponse login(@Valid @RequestBody LoginRequest request) {
    return AuthTokenResponse.from(authSessionService.login(request.email(), request.password()));
  }

  @PostMapping("/refresh")
  @Operation(summary = "Refresh session", description = "Rotates a refresh token and issues a new JWT")
  public AuthTokenResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
    return AuthTokenResponse.from(authSessionService.refresh(request.refreshToken()));
  }

  @PostMapping("/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Operation(summary = "Logout", description = "Revokes the submitted refresh token")
  public void logout(@Valid @RequestBody RefreshTokenRequest request) {
    authSessionService.logout(request.refreshToken());
  }

  @PostMapping("/password-policy/validate")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Operation(summary = "Validate password policy")
  public void validatePassword(@Valid @RequestBody PasswordPolicyValidationRequest request) {
    passwordPolicyValidator.validate(request.password());
  }

  @GetMapping("/me")
  @Operation(summary = "Current user", description = "Returns claims for the current JWT subject")
  public CurrentUserResponse me(Authentication authentication) {
    return CurrentUserResponse.from((Jwt) authentication.getPrincipal());
  }
}
