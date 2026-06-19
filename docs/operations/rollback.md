# Rollback Runbook

This platform deploys `admin-portal` and `device-api` as Kubernetes Deployments.
Each deployment keeps Kubernetes rollout history through `revisionHistoryLimit`.

## Roll Back To The Previous Revision

Use the rollback GitHub Actions workflow:

1. Open **Actions**.
2. Run **Rollback Kubernetes Deployment**.
3. Select the target environment.
4. Choose `admin-portal`, `device-api`, or `all`.
5. Leave `image_tag` blank to run `kubectl rollout undo`.

The workflow verifies rollout status after rollback.

## Roll Back To A Specific Image Tag

Provide `image_tag`, for example:

```text
sha-495954d0f0aa
```

The workflow updates the selected deployment image to that immutable tag and
waits for rollout completion.

## Manual Commands

```bash
kubectl -n <namespace> rollout history deployment/device-api-<env>
kubectl -n <namespace> rollout undo deployment/device-api-<env>
kubectl -n <namespace> rollout status deployment/device-api-<env> --timeout=180s
kubectl -n <namespace> get pods -l app.kubernetes.io/name=device-api
```

For the admin portal:

```bash
kubectl -n <namespace> rollout undo deployment/admin-portal-<env>
kubectl -n <namespace> rollout status deployment/admin-portal-<env> --timeout=180s
```
