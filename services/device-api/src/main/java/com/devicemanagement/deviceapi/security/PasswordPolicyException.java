package com.devicemanagement.deviceapi.security;

import java.util.List;

public class PasswordPolicyException extends RuntimeException {

  private final transient List<String> violations;

  public PasswordPolicyException(List<String> violations) {
    super("Password does not meet policy requirements");
    this.violations = List.copyOf(violations);
  }

  public List<String> getViolations() {
    return violations;
  }
}
