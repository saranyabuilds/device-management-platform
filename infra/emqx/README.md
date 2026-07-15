# EMQX Local Broker

This directory contains local-only EMQX configuration for secure MQTT development.

## Files

- `auth/dev-users.csv` - development username/password bootstrap users.
- `acl/dev-acl.conf` - least-privilege topic authorization rules for sample devices.
- `certs/generate-dev-certs.sh` - generates development-only CA and server TLS files.
- `certs/dev/` - ignored output directory for generated TLS files.

## Local TLS Certificates

Generate certificates before starting EMQX:

```bash
sh infra/emqx/certs/generate-dev-certs.sh
```

Generated private keys are ignored by Git and are for local development only.
Production certificates must come from environment-specific secrets or a managed
certificate process.

## Development Users

The local bootstrap file defines sample device users:

| Username | Password |
| --- | --- |
| `device_SN123456` | `dev-device-SN123456-change-me` |
| `device_SN654321` | `dev-device-SN654321-change-me` |

The username maps to a device serial number and ACL entries restrict each user
to its own topic tree.

## Topic Authorization

Current local ACL examples:

- `device_SN123456` can publish only:
  - `devices/SN123456/heartbeat`
  - `devices/SN123456/telemetry`
- `device_SN123456` can subscribe only:
  - `devices/SN123456/commands`
  - `devices/SN123456/heartbeat`
  - `devices/SN123456/telemetry`

The same pattern is repeated for `SN654321`. All unmatched actions are denied.

For production, replace static users with mTLS device certificates, EMQX JWT
authentication, or an EMQX auth webhook backed by the device registry.
