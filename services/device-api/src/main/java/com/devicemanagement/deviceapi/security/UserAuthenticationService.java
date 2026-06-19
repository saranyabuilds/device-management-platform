package com.devicemanagement.deviceapi.security;

import com.devicemanagement.deviceapi.config.AuthProperties;
import jakarta.annotation.PostConstruct;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserAuthenticationService {

  private final AuthProperties authProperties;
  private final PasswordEncoder passwordEncoder;
  private final PasswordPolicyValidator passwordPolicyValidator;
  private final RoleManagementService roleManagementService;
  private final Map<String, AuthenticatedUser> usersByEmail = new ConcurrentHashMap<>();
  private final Map<String, AuthenticatedUser> usersById = new ConcurrentHashMap<>();

  @PostConstruct
  void seedUsers() {
    authProperties
        .users()
        .forEach(
            seedUser -> {
              passwordPolicyValidator.validate(seedUser.password());
              roleManagementService.validateRoleAssignments(seedUser.roles());
              AuthenticatedUser user =
                  new AuthenticatedUser(
                      seedUser.id(),
                      normalizedEmail(seedUser.email()),
                      seedUser.displayName(),
                      passwordEncoder.encode(seedUser.password()),
                      seedUser.roles());
              usersByEmail.put(user.email(), user);
              usersById.put(user.id(), user);
            });
  }

  public AuthenticatedUser authenticate(String email, String password) {
    return Optional.ofNullable(usersByEmail.get(normalizedEmail(email)))
        .filter(candidate -> passwordEncoder.matches(password, candidate.passwordHash()))
        .orElseThrow(InvalidCredentialsException::new);
  }

  public Optional<AuthenticatedUser> findById(String id) {
    return Optional.ofNullable(usersById.get(id));
  }

  public java.util.List<AuthenticatedUser> getUsers() {
    return usersById.values().stream()
        .sorted(java.util.Comparator.comparing(AuthenticatedUser::email))
        .toList();
  }

  public AuthenticatedUser assignRoles(String userId, Set<String> roles) {
    roleManagementService.validateRoleAssignments(roles);
    AuthenticatedUser existing =
        findById(userId)
            .orElseThrow(
                () -> new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));
    AuthenticatedUser updated =
        new AuthenticatedUser(
            existing.id(),
            existing.email(),
            existing.displayName(),
            existing.passwordHash(),
            Set.copyOf(roles));
    usersById.put(updated.id(), updated);
    usersByEmail.put(updated.email(), updated);
    return updated;
  }

  private String normalizedEmail(String email) {
    return email == null ? "" : email.toLowerCase(Locale.ROOT).trim();
  }
}
