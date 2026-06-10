package com.devicemanagement.deviceapi.exception;

public class DuplicateDeviceException extends RuntimeException {

  public DuplicateDeviceException(String serialNumber) {
    super("Device with serial number " + serialNumber + " already exists");
  }
}
