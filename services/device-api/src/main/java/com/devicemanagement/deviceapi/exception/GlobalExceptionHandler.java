package com.devicemanagement.deviceapi.exception;

import com.devicemanagement.deviceapi.config.CorrelationIdFilter;
import com.devicemanagement.deviceapi.security.InvalidCredentialsException;
import com.devicemanagement.deviceapi.security.InvalidRefreshTokenException;
import com.devicemanagement.deviceapi.security.PasswordPolicyException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(DeviceNotFoundException.class)
  public ResponseEntity<ErrorResponse> handleDeviceNotFound(
      DeviceNotFoundException exception, HttpServletRequest request) {
    log.warn("Device not found: {}", exception.getMessage());
    return buildErrorResponse(
        HttpStatus.NOT_FOUND, "DEVICE_NOT_FOUND", exception.getMessage(), request.getRequestURI());
  }

  @ExceptionHandler(DuplicateDeviceException.class)
  public ResponseEntity<ErrorResponse> handleDuplicateDevice(
      DuplicateDeviceException exception, HttpServletRequest request) {
    log.warn("Duplicate device creation attempt: {}", exception.getMessage());
    return buildErrorResponse(
        HttpStatus.CONFLICT, "DUPLICATE_DEVICE", exception.getMessage(), request.getRequestURI());
  }

  @ExceptionHandler(DeviceRegistrationValidationException.class)
  public ResponseEntity<ErrorResponse> handleDeviceRegistrationValidationFailure(
      DeviceRegistrationValidationException exception, HttpServletRequest request) {
    List<ErrorResponse.FieldErrorDetail> fieldErrors =
        exception.violations().stream()
            .map(
                violation ->
                    ErrorResponse.FieldErrorDetail.builder()
                        .field(violation.field())
                        .message(violation.message())
                        .build())
            .toList();

    log.warn(
        "Device registration validation failure for path {}: {}",
        request.getRequestURI(),
        fieldErrors);

    ErrorResponse response =
        ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("VALIDATION_FAILED")
            .message(exception.getMessage())
            .path(request.getRequestURI())
            .correlationId(correlationId())
            .fieldErrors(fieldErrors)
            .build();

    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorResponse> handleValidationFailure(
      MethodArgumentNotValidException exception, HttpServletRequest request) {
    List<ErrorResponse.FieldErrorDetail> fieldErrors =
        exception.getBindingResult().getFieldErrors().stream()
            .map(
                fieldError ->
                    ErrorResponse.FieldErrorDetail.builder()
                        .field(fieldError.getField())
                        .message(fieldError.getDefaultMessage())
                        .build())
            .toList();

    log.warn("Validation failure for path {}: {}", request.getRequestURI(), fieldErrors);

    ErrorResponse response =
        ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("VALIDATION_FAILED")
            .message("Request validation failed")
            .path(request.getRequestURI())
            .correlationId(correlationId())
            .fieldErrors(fieldErrors)
            .build();

    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
  }

  @ExceptionHandler(InvalidCredentialsException.class)
  public ResponseEntity<ErrorResponse> handleInvalidCredentials(
      InvalidCredentialsException exception, HttpServletRequest request) {
    log.warn("Invalid login attempt for path {}", request.getRequestURI());
    return buildErrorResponse(
        HttpStatus.UNAUTHORIZED,
        "INVALID_CREDENTIALS",
        exception.getMessage(),
        request.getRequestURI());
  }

  @ExceptionHandler(InvalidRefreshTokenException.class)
  public ResponseEntity<ErrorResponse> handleInvalidRefreshToken(
      InvalidRefreshTokenException exception, HttpServletRequest request) {
    log.warn("Invalid refresh token for path {}", request.getRequestURI());
    return buildErrorResponse(
        HttpStatus.UNAUTHORIZED,
        "INVALID_REFRESH_TOKEN",
        exception.getMessage(),
        request.getRequestURI());
  }

  @ExceptionHandler(PasswordPolicyException.class)
  public ResponseEntity<ErrorResponse> handlePasswordPolicyFailure(
      PasswordPolicyException exception, HttpServletRequest request) {
    List<ErrorResponse.FieldErrorDetail> fieldErrors =
        exception.getViolations().stream()
            .map(
                message ->
                    ErrorResponse.FieldErrorDetail.builder()
                        .field("password")
                        .message(message)
                        .build())
            .toList();

    ErrorResponse response =
        ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("PASSWORD_POLICY_FAILED")
            .message(exception.getMessage())
            .path(request.getRequestURI())
            .correlationId(correlationId())
            .fieldErrors(fieldErrors)
            .build();

    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ErrorResponse> handleAccessDenied(
      AccessDeniedException exception, HttpServletRequest request) {
    log.warn("Forbidden request for path {}", request.getRequestURI());
    return buildErrorResponse(
        HttpStatus.FORBIDDEN, "ACCESS_DENIED", "Access is denied", request.getRequestURI());
  }

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<ErrorResponse> handleResponseStatusException(
      ResponseStatusException exception, HttpServletRequest request) {
    HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
    return buildErrorResponse(
        status,
        status.name(),
        exception.getReason() == null ? status.getReasonPhrase() : exception.getReason(),
        request.getRequestURI());
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleGenericException(
      Exception exception, HttpServletRequest request) {
    log.error("Unhandled exception for path {}", request.getRequestURI(), exception);
    return buildErrorResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "INTERNAL_SERVER_ERROR",
        "An unexpected error occurred",
        request.getRequestURI());
  }

  private ResponseEntity<ErrorResponse> buildErrorResponse(
      HttpStatus status, String error, String message, String path) {
    ErrorResponse response =
        ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(status.value())
            .error(error)
            .message(message)
            .path(path)
            .correlationId(correlationId())
            .build();

    return ResponseEntity.status(status).body(response);
  }

  private String correlationId() {
    return org.slf4j.MDC.get(CorrelationIdFilter.CORRELATION_ID_MDC_KEY);
  }
}
