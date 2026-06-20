import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BehaviorSubject, finalize } from 'rxjs';
import { ApiService } from '../../core/http/api.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { MaterialModule } from '../../shared/material/material.module';

interface DeviceResponse {
  readonly id: string;
  readonly serialNumber: string;
  readonly deviceModel: string;
  readonly firmwareVersion: string;
  readonly customerId: string;
  readonly status: string;
  readonly registrationStatus: string;
  readonly onboardingStatus: string;
  readonly certificateStatus: string;
  readonly connectivityStatus: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface DeviceHealthIndicatorResponse {
  readonly name: string;
  readonly state: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  readonly summary: string;
}

interface DeviceFirmwareHistoryResponse {
  readonly firmwareVersion: string;
  readonly updatedAt: string;
  readonly updateSource: string;
  readonly status: string;
  readonly failureReason: string | null;
}

interface DeviceEventResponse {
  readonly timestamp: string;
  readonly eventType: string;
  readonly severity: string;
  readonly source: string;
  readonly message: string;
  readonly correlationId: string | null;
  readonly traceId: string | null;
}

interface DeviceProfileResponse {
  readonly device: DeviceResponse;
  readonly lastSeenAt: string | null;
  readonly healthIndicators: readonly DeviceHealthIndicatorResponse[];
  readonly firmwareHistory: readonly DeviceFirmwareHistoryResponse[];
  readonly eventTimeline: readonly DeviceEventResponse[];
}

interface DeviceProfileViewModel {
  readonly profile: DeviceProfileResponse | null;
  readonly loading: boolean;
  readonly error: boolean;
}

@Component({
  imports: [AsyncPipe, DatePipe, MaterialModule, RouterLink],
  selector: 'app-device-profile-page',
  styles: `
    .profile-actions {
      margin-bottom: 16px;
    }

    .profile-grid {
      display: grid;
      gap: 16px;
      grid-template-columns: minmax(0, 1fr) minmax(280px, 0.45fr);
    }

    .detail-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .detail-item {
      display: grid;
      gap: 4px;
    }

    .detail-label {
      color: rgba(0, 0, 0, 0.62);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .health-list,
    .timeline-list,
    .firmware-list {
      display: grid;
      gap: 12px;
    }

    .health-row,
    .timeline-row,
    .firmware-row {
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      display: grid;
      gap: 6px;
      padding: 12px 0;
    }

    .health-row:first-child,
    .timeline-row:first-child,
    .firmware-row:first-child {
      padding-top: 0;
    }

    .state {
      border-radius: 999px;
      display: inline-flex;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 8px;
      width: fit-content;
    }

    .state--healthy {
      background: #dff7e8;
      color: #0a6b35;
    }

    .state--warning {
      background: #fff3cd;
      color: #7a4d00;
    }

    .state--critical {
      background: #fde2e1;
      color: #9f1c14;
    }

    .state--unknown {
      background: #edf1f7;
      color: #4f5d75;
    }

    .muted {
      color: rgba(0, 0, 0, 0.62);
      margin: 0;
    }

    .state-panel {
      align-items: center;
      color: rgba(0, 0, 0, 0.62);
      display: flex;
      gap: 12px;
      justify-content: center;
      min-height: 220px;
      text-align: center;
    }

    @media (max-width: 900px) {
      .profile-grid,
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
  template: `
    <div class="profile-actions">
      <a mat-button routerLink="/devices">
        <mat-icon>arrow_back</mat-icon>
        <span>Devices</span>
      </a>
    </div>

    @if (vm$ | async; as vm) {
      @if (vm.loading) {
        <section class="surface-panel state-panel">
          <mat-spinner diameter="32" />
          <span>Loading profile</span>
        </section>
      } @else if (vm.error || !vm.profile) {
        <section class="surface-panel state-panel">
          <span>Unable to load device profile.</span>
          <button mat-button type="button" (click)="loadProfile()">Retry</button>
        </section>
      } @else {
        <section class="page-header">
          <h1>{{ vm.profile.device.serialNumber }}</h1>
          <p>{{ vm.profile.device.deviceModel }} · {{ vm.profile.device.customerId }}</p>
        </section>

        <section class="profile-grid">
          <div class="surface-panel">
            <h2>Device Details</h2>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Device ID</span>
                <span>{{ vm.profile.device.id }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Firmware</span>
                <span>{{ vm.profile.device.firmwareVersion }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Owner</span>
                <span>{{ vm.profile.device.customerId }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Device status</span>
                <span>{{ vm.profile.device.status }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Connectivity</span>
                <span>{{ vm.profile.device.connectivityStatus }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Registration</span>
                <span>{{ vm.profile.device.registrationStatus }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Onboarding</span>
                <span>{{ vm.profile.device.onboardingStatus }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Certificate</span>
                <span>{{ vm.profile.device.certificateStatus }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Last seen</span>
                <span>{{ vm.profile.lastSeenAt | date: 'medium' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Created</span>
                <span>{{ vm.profile.device.createdAt | date: 'medium' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Updated</span>
                <span>{{ vm.profile.device.updatedAt | date: 'medium' }}</span>
              </div>
            </div>
          </div>

          <aside class="surface-panel">
            <h2>Health</h2>
            <div class="health-list">
              @for (indicator of vm.profile.healthIndicators; track indicator.name) {
                <div class="health-row">
                  <strong>{{ indicator.name }}</strong>
                  <span
                    class="state"
                    [class.state--healthy]="indicator.state === 'HEALTHY'"
                    [class.state--warning]="indicator.state === 'WARNING'"
                    [class.state--critical]="indicator.state === 'CRITICAL'"
                    [class.state--unknown]="indicator.state === 'UNKNOWN'"
                  >
                    {{ indicator.state }}
                  </span>
                  <p class="muted">{{ indicator.summary }}</p>
                </div>
              }
            </div>
          </aside>
        </section>

        <section class="profile-grid">
          <div class="surface-panel">
            <h2>Event Timeline</h2>
            <div class="timeline-list">
              @for (event of vm.profile.eventTimeline; track event.eventType + event.timestamp) {
                <article class="timeline-row">
                  <strong>{{ event.eventType }} · {{ event.severity }}</strong>
                  <span>{{ event.timestamp | date: 'medium' }}</span>
                  <p class="muted">{{ event.message }}</p>
                  <p class="muted">{{ event.source }}</p>
                  @if (event.correlationId || event.traceId) {
                    <p class="muted">{{ event.correlationId || event.traceId }}</p>
                  }
                </article>
              } @empty {
                <p class="muted">No device events found.</p>
              }
            </div>
          </div>

          <aside class="surface-panel">
            <h2>Firmware History</h2>
            <div class="firmware-list">
              @for (firmware of vm.profile.firmwareHistory; track firmware.firmwareVersion + firmware.updatedAt) {
                <article class="firmware-row">
                  <strong>{{ firmware.firmwareVersion }}</strong>
                  <span>{{ firmware.status }} · {{ firmware.updateSource }}</span>
                  <span>{{ firmware.updatedAt | date: 'medium' }}</span>
                  @if (firmware.failureReason) {
                    <p class="muted">{{ firmware.failureReason }}</p>
                  }
                </article>
              } @empty {
                <p class="muted">No firmware history found.</p>
              }
            </div>
          </aside>
        </section>
      }
    }
  `,
})
export class DeviceProfilePageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly vmSubject = new BehaviorSubject<DeviceProfileViewModel>({
    profile: null,
    loading: true,
    error: false,
  });

  readonly vm$ = this.vmSubject.asObservable();

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    const serialNumber = this.route.snapshot.paramMap.get('serialNumber');
    if (!serialNumber) {
      this.vmSubject.next({ profile: null, loading: false, error: true });
      return;
    }

    this.vmSubject.next({ ...this.vmSubject.value, loading: true, error: false });
    this.api
      .get<DeviceProfileResponse>(`/devices/${encodeURIComponent(serialNumber)}/profile`)
      .pipe(finalize(() => this.vmSubject.next({ ...this.vmSubject.value, loading: false })))
      .subscribe({
        next: (profile) => this.vmSubject.next({ profile, loading: false, error: false }),
        error: () => {
          this.vmSubject.next({ profile: null, loading: false, error: true });
          this.notifications.showError('Unable to load device profile.');
        },
      });
  }
}
