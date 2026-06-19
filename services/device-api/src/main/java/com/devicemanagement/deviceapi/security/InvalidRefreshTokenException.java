package com.devicemanagement.deviceapi.security;

public class InvalidRefreshTokenException extends RuntimeException {

  public InvalidRefreshTokenException() {
    super("Refresh token is invalid or expired");
  }
}
