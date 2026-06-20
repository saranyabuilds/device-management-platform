package com.devicemanagement.deviceapi.exception;

import java.util.List;

public class DeviceRegistrationValidationException extends RuntimeException {

  private final List<FieldViolation> violations;

  public DeviceRegistrationValidationException(List<FieldViolation> violations) {
    super("Device registration validation failed");
    this.violations = List.copyOf(violations);
  }

  public List<FieldViolation> violations() {
    return violations;
  }

  public record FieldViolation(String field, String message) {}
}
