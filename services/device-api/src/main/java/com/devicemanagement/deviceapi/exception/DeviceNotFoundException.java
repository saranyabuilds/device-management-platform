package com.devicemanagement.deviceapi.exception;

public class DeviceNotFoundException extends RuntimeException {

  public DeviceNotFoundException(String serialNumber) {
    super("Device with serial number " + serialNumber + " was not found");
  }
}
