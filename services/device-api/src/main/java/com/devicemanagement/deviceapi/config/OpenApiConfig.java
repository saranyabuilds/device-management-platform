package com.devicemanagement.deviceapi.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

  @Bean
  public OpenAPI deviceServiceOpenApi() {
    return new OpenAPI()
        .info(
            new Info()
                .title("Device Management - Device Service API")
                .version("v1")
                .description("REST APIs for managing registered hardware devices"));
  }
}
