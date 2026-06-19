package com.devicemanagement.deviceapi.security;

import java.util.Set;

public record RoleDefinition(
    String id, String name, String description, Set<Permission> permissions, boolean active, boolean systemRole) {}
