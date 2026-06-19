package com.devicemanagement.deviceapi.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

  public static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
  public static final String CORRELATION_ID_MDC_KEY = "correlationId";

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String correlationId = correlationId(request);
    long startedAt = System.nanoTime();

    response.setHeader(CORRELATION_ID_HEADER, correlationId);
    MDC.put(CORRELATION_ID_MDC_KEY, correlationId);
    MDC.put("method", request.getMethod());
    MDC.put("path", request.getRequestURI());

    try {
      filterChain.doFilter(request, response);
    } finally {
      long durationMs = (System.nanoTime() - startedAt) / 1_000_000;
      MDC.put("status", String.valueOf(response.getStatus()));
      MDC.put("durationMs", String.valueOf(durationMs));
      log.info("HTTP request completed");
      MDC.clear();
    }
  }

  private String correlationId(HttpServletRequest request) {
    String providedCorrelationId = request.getHeader(CORRELATION_ID_HEADER);
    if (StringUtils.hasText(providedCorrelationId)) {
      return providedCorrelationId.trim();
    }
    return UUID.randomUUID().toString();
  }
}
