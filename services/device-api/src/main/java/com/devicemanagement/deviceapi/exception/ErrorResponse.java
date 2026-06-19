package com.devicemanagement.deviceapi.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;

@Builder
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ErrorResponse(
    LocalDateTime timestamp,
    int status,
    String error,
    String message,
    String path,
    String correlationId,
    List<FieldErrorDetail> fieldErrors) {

  @Builder
  public record FieldErrorDetail(String field, String message) {}
}
