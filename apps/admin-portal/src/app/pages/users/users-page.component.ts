import { AsyncPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, finalize, forkJoin } from 'rxjs';
import { ApiService } from '../../core/http/api.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { MaterialModule } from '../../shared/material/material.module';

interface RoleResponse {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly string[];
  readonly active: boolean;
  readonly systemRole: boolean;
}

interface UserAccessResponse {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

interface RoleDraft {
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly string[];
}

@Component({
  imports: [AsyncPipe, FormsModule, MaterialModule],
  selector: 'app-users-page',
  styles: `
    .access-grid {
      display: grid;
      gap: 16px;
      grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
    }

    .access-list {
      display: grid;
      gap: 12px;
    }

    .user-row,
    .role-row {
      display: grid;
      gap: 12px;
      padding: 16px 0;
    }

    .user-row__header,
    .role-row__header {
      align-items: center;
      display: flex;
      gap: 12px;
      justify-content: space-between;
    }

    .role-options,
    .permission-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 16px;
    }

    .muted {
      color: rgba(0, 0, 0, 0.62);
      margin: 0;
    }

    @media (max-width: 900px) {
      .access-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
  template: `
    <section class="page-header">
      <h1>Role Management</h1>
      <p>Manage user role assignments and inspect the platform permission matrix.</p>
    </section>

    @if (vm$ | async; as vm) {
      <section class="access-grid">
        <div class="surface-panel">
          <div class="user-row__header">
            <h2>Users</h2>
            <button mat-button type="button" (click)="loadAccessModel()" [disabled]="vm.loading">
              <mat-icon>refresh</mat-icon>
              <span>Refresh</span>
            </button>
          </div>

          <div class="access-list">
            @for (user of vm.users; track user.id) {
              <article class="user-row">
                <div class="user-row__header">
                  <div>
                    <strong>{{ user.displayName }}</strong>
                    <p class="muted">{{ user.email }}</p>
                  </div>
                  <button
                    mat-flat-button
                    color="primary"
                    type="button"
                    (click)="saveRoles(user)"
                    [disabled]="vm.loading"
                  >
                    Save Roles
                  </button>
                </div>

                <div class="role-options" aria-label="Assigned roles">
                  @for (role of vm.roles; track role.id) {
                    <mat-checkbox
                      [ngModel]="hasRole(user, role.id)"
                      (ngModelChange)="setRole(user, role.id, $event)"
                      [disabled]="!role.active || vm.loading"
                    >
                      {{ role.name }}
                    </mat-checkbox>
                  }
                </div>

                <p class="muted">Effective permissions: {{ user.permissions.join(', ') }}</p>
                <mat-divider />
              </article>
            }
          </div>
        </div>

        <aside class="surface-panel">
          <h2>Permission Matrix</h2>

          <form class="role-row" (ngSubmit)="createRole()" #roleForm="ngForm">
            <mat-form-field appearance="outline">
              <mat-label>Role name</mat-label>
              <input
                matInput
                name="roleName"
                required
                [ngModel]="vm.roleDraft.name"
                (ngModelChange)="updateRoleDraft({ name: $event })"
              />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Description</mat-label>
              <input
                matInput
                name="roleDescription"
                [ngModel]="vm.roleDraft.description"
                (ngModelChange)="updateRoleDraft({ description: $event })"
              />
            </mat-form-field>

            <div class="permission-list" aria-label="New role permissions">
              @for (permission of vm.permissions; track permission) {
                <mat-checkbox
                  [ngModel]="vm.roleDraft.permissions.includes(permission)"
                  [ngModelOptions]="{ standalone: true }"
                  (ngModelChange)="setDraftPermission(permission, $event)"
                >
                  {{ permission }}
                </mat-checkbox>
              }
            </div>

            <button
              mat-flat-button
              color="primary"
              type="submit"
              [disabled]="roleForm.invalid || vm.roleDraft.permissions.length === 0 || vm.loading"
            >
              Create Role
            </button>
          </form>

          <mat-divider />

          <div class="access-list">
            @for (role of vm.roles; track role.id) {
              <article class="role-row">
                <div class="role-row__header">
                  <div>
                    <strong>{{ role.name }}</strong>
                    <p class="muted">{{ role.description }}</p>
                  </div>
                  @if (!role.active) {
                    <span class="muted">Inactive</span>
                  }
                  @if (!role.systemRole && role.active) {
                    <button mat-button type="button" (click)="deactivateRole(role)" [disabled]="vm.loading">
                      Deactivate
                    </button>
                  }
                </div>
                <div class="permission-list">
                  @for (permission of role.permissions; track permission) {
                    <span>{{ permission }}</span>
                  }
                </div>
                <mat-divider />
              </article>
            }
          </div>
        </aside>
      </section>
    }
  `,
})
export class UsersPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly vmSubject = new BehaviorSubject<{
    readonly users: UserAccessResponse[];
    readonly roles: RoleResponse[];
    readonly permissions: string[];
    readonly roleDraft: RoleDraft;
    readonly loading: boolean;
  }>({
    users: [],
    roles: [],
    permissions: [],
    roleDraft: { name: '', description: '', permissions: [] },
    loading: true,
  });

  readonly vm$ = this.vmSubject.asObservable();

  ngOnInit(): void {
    this.loadAccessModel();
  }

  loadAccessModel(): void {
    this.vmSubject.next({ ...this.vmSubject.value, loading: true });
    forkJoin({
      users: this.api.get<UserAccessResponse[]>('/users'),
      roles: this.api.get<RoleResponse[]>('/roles'),
      permissions: this.api.get<string[]>('/permissions'),
    })
      .pipe(finalize(() => this.vmSubject.next({ ...this.vmSubject.value, loading: false })))
      .subscribe({
        next: (model) =>
          this.vmSubject.next({
            ...model,
            roleDraft: this.vmSubject.value.roleDraft,
            loading: false,
          }),
        error: () => this.notifications.showError('Unable to load role management data.'),
      });
  }

  hasRole(user: UserAccessResponse, roleId: string): boolean {
    return user.roles.includes(roleId);
  }

  setRole(user: UserAccessResponse, roleId: string, assigned: boolean): void {
    const nextRoles = new Set(user.roles);
    if (assigned) {
      nextRoles.add(roleId);
    } else {
      nextRoles.delete(roleId);
    }

    this.replaceUser({ ...user, roles: [...nextRoles].sort() });
  }

  saveRoles(user: UserAccessResponse): void {
    this.vmSubject.next({ ...this.vmSubject.value, loading: true });
    this.api
      .put<{ roles: readonly string[] }, UserAccessResponse>(`/users/${user.id}/roles`, {
        roles: user.roles,
      })
      .pipe(finalize(() => this.vmSubject.next({ ...this.vmSubject.value, loading: false })))
      .subscribe({
        next: (updatedUser) => {
          this.replaceUser(updatedUser);
          this.notifications.showInfo('User roles updated.');
        },
        error: () => this.notifications.showError('Unable to update user roles.'),
      });
  }

  updateRoleDraft(update: Partial<RoleDraft>): void {
    this.vmSubject.next({
      ...this.vmSubject.value,
      roleDraft: { ...this.vmSubject.value.roleDraft, ...update },
    });
  }

  setDraftPermission(permission: string, assigned: boolean): void {
    const permissions = new Set(this.vmSubject.value.roleDraft.permissions);
    if (assigned) {
      permissions.add(permission);
    } else {
      permissions.delete(permission);
    }
    this.updateRoleDraft({ permissions: [...permissions].sort() });
  }

  createRole(): void {
    const roleDraft = this.vmSubject.value.roleDraft;
    this.vmSubject.next({ ...this.vmSubject.value, loading: true });
    this.api
      .post<
        { name: string; description: string; permissions: readonly string[]; active: boolean },
        RoleResponse
      >('/roles', { ...roleDraft, active: true })
      .pipe(finalize(() => this.vmSubject.next({ ...this.vmSubject.value, loading: false })))
      .subscribe({
        next: (role) => {
          this.vmSubject.next({
            ...this.vmSubject.value,
            roles: [...this.vmSubject.value.roles, role].sort((left, right) =>
              left.id.localeCompare(right.id),
            ),
            roleDraft: { name: '', description: '', permissions: [] },
          });
          this.notifications.showInfo('Role created.');
        },
        error: () => this.notifications.showError('Unable to create role.'),
      });
  }

  deactivateRole(role: RoleResponse): void {
    this.vmSubject.next({ ...this.vmSubject.value, loading: true });
    this.api
      .put<
        { name: string; description: string; permissions: readonly string[]; active: boolean },
        RoleResponse
      >(`/roles/${role.id}`, {
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        active: false,
      })
      .pipe(finalize(() => this.vmSubject.next({ ...this.vmSubject.value, loading: false })))
      .subscribe({
        next: (updatedRole) => {
          this.vmSubject.next({
            ...this.vmSubject.value,
            roles: this.vmSubject.value.roles.map((candidate) =>
              candidate.id === updatedRole.id ? updatedRole : candidate,
            ),
          });
          this.notifications.showInfo('Role deactivated.');
        },
        error: () => this.notifications.showError('Unable to deactivate role.'),
      });
  }

  private replaceUser(user: UserAccessResponse): void {
    this.vmSubject.next({
      ...this.vmSubject.value,
      users: this.vmSubject.value.users.map((candidate) =>
        candidate.id === user.id ? user : candidate,
      ),
    });
  }
}
