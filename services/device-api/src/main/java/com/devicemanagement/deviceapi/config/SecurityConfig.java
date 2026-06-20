package com.devicemanagement.deviceapi.config;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.devicemanagement.deviceapi.exception.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@EnableConfigurationProperties({
  AuthProperties.class,
  DeviceRegistrationProperties.class,
  DeviceHeartbeatProperties.class
})
public class SecurityConfig {

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper objectMapper)
      throws Exception {
    return http.csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            authorize ->
                authorize
                    .requestMatchers("/api/v1/auth/me")
                    .authenticated()
                    .requestMatchers("/api/v1/auth/**")
                    .permitAll()
                    .requestMatchers("/actuator/health/**", "/actuator/info", "/actuator/prometheus")
                    .permitAll()
                    .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html")
                    .permitAll()
                    .requestMatchers(HttpMethod.OPTIONS, "/**")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .oauth2ResourceServer(
            oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())))
        .exceptionHandling(
            exceptions ->
                exceptions
                    .authenticationEntryPoint(
                        (request, response, exception) ->
                            writeSecurityError(
                                objectMapper,
                                response,
                                HttpServletResponse.SC_UNAUTHORIZED,
                                "UNAUTHORIZED",
                                "Authentication is required",
                                request.getRequestURI()))
                    .accessDeniedHandler(
                        (request, response, exception) ->
                            writeSecurityError(
                                objectMapper,
                                response,
                                HttpServletResponse.SC_FORBIDDEN,
                                "ACCESS_DENIED",
                                "Access is denied",
                                request.getRequestURI())))
        .build();
  }

  @Bean
  JwtEncoder jwtEncoder(AuthProperties authProperties) {
    return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSecretKey(authProperties)));
  }

  @Bean
  JwtDecoder jwtDecoder(AuthProperties authProperties) {
    NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(jwtSecretKey(authProperties)).build();
    JwtTimestampValidator timestampValidator =
        new JwtTimestampValidator(authProperties.jwt().clockSkew());
    OAuth2TokenValidator<Jwt> validator =
        new DelegatingOAuth2TokenValidator<>(
            new JwtIssuerValidator(authProperties.jwt().issuer()), timestampValidator);
    decoder.setJwtValidator(validator);
    return decoder;
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  Clock clock() {
    return Clock.systemUTC();
  }

  private JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(roleAuthoritiesConverter());
    return converter;
  }

  private Converter<Jwt, Collection<GrantedAuthority>> roleAuthoritiesConverter() {
    return jwt ->
        java.util.stream.Stream.concat(
                List.copyOf(
                        jwt.getClaimAsStringList("roles") == null
                            ? List.of()
                            : jwt.getClaimAsStringList("roles"))
                    .stream()
                    .map(role -> "ROLE_" + role),
                List.copyOf(
                        jwt.getClaimAsStringList("permissions") == null
                            ? List.of()
                            : jwt.getClaimAsStringList("permissions"))
                    .stream())
            .map(SimpleGrantedAuthority::new)
            .map(GrantedAuthority.class::cast)
            .toList();
  }

  private SecretKey jwtSecretKey(AuthProperties authProperties) {
    byte[] secret = authProperties.jwt().secret().getBytes(StandardCharsets.UTF_8);
    if (secret.length < 32) {
      throw new IllegalStateException("app.auth.jwt.secret must be at least 32 bytes");
    }
    return new SecretKeySpec(secret, "HmacSHA256");
  }

  private void writeSecurityError(
      ObjectMapper objectMapper,
      HttpServletResponse response,
      int status,
      String error,
      String message,
      String path)
      throws java.io.IOException {
    response.setStatus(status);
    response.setContentType("application/json");
    objectMapper.writeValue(
        response.getOutputStream(),
        ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(status)
            .error(error)
            .message(message)
            .path(path)
            .correlationId(org.slf4j.MDC.get(CorrelationIdFilter.CORRELATION_ID_MDC_KEY))
            .build());
  }
}
