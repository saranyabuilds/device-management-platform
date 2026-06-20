package com.devicemanagement.deviceapi.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.devices.heartbeat")
public record DeviceHeartbeatProperties(
    String mqttTopic, Duration timeout, boolean schedulerEnabled) {}
