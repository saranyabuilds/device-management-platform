package com.devicemanagement.deviceapi.security;

import com.devicemanagement.deviceapi.config.AuthProperties;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PasswordPolicyValidator {

  private final AuthProperties authProperties;

  public void validate(String password) {
    List<String> violations = violations(password);
    if (!violations.isEmpty()) {
      throw new PasswordPolicyException(violations);
    }
  }

  public List<String> violations(String password) {
    AuthProperties.PasswordPolicy policy = authProperties.passwordPolicy();
    List<String> violations = new ArrayList<>();
    String candidate = password == null ? "" : password;

    if (candidate.length() < policy.minLength()) {
      violations.add("Password must be at least " + policy.minLength() + " characters long");
    }
    if (policy.requireUppercase() && candidate.chars().noneMatch(Character::isUpperCase)) {
      violations.add("Password must include an uppercase letter");
    }
    if (policy.requireLowercase() && candidate.chars().noneMatch(Character::isLowerCase)) {
      violations.add("Password must include a lowercase letter");
    }
    if (policy.requireDigit() && candidate.chars().noneMatch(Character::isDigit)) {
      violations.add("Password must include a number");
    }
    if (policy.requireSpecial()
        && candidate.chars().noneMatch(character -> !Character.isLetterOrDigit(character))) {
      violations.add("Password must include a special character");
    }

    return violations;
  }
}
