package com.devicemanagement.deviceapi.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

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
            .fieldErrors(fieldErrors)
            .build();

    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
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
            .build();

    return ResponseEntity.status(status).body(response);
  }
}
