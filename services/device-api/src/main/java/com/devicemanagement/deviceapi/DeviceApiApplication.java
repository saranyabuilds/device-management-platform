package com.devicemanagement.deviceapi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DeviceApiApplication {

  public static void main(String[] args) {
    SpringApplication.run(DeviceApiApplication.class, args);
  }
}
