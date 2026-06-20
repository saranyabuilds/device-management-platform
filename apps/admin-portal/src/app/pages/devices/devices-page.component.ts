import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, finalize } from 'rxjs';
import { ApiQueryParams, ApiService } from '../../core/http/api.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { MaterialModule } from '../../shared/material/material.module';

interface DeviceCertificateMetadata {
  readonly certificateId: string;
  readonly status: string;
}

interface DeviceResponse {
  readonly id: string;
  readonly serialNumber: string;
  readonly deviceModel: string;
  readonly firmwareVersion: string;
  readonly customerId: string;
  readonly status: string;
  readonly onboardingStatus: string;
  readonly certificate: DeviceCertificateMetadata | null;
  readonly lastSeenAt: string | null;
  readonly connectivityStatus: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface DeviceInventoryResponse {
  readonly items: readonly DeviceResponse[];
  readonly page: number;
  readonly size: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

interface DeviceFilters {
  readonly serialNumber: string;
  readonly firmwareVersion: string;
  readonly status: string;
}

interface DevicesViewModel {
  readonly items: readonly DeviceResponse[];
  readonly filters: DeviceFilters;
  readonly page: number;
  readonly size: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly loading: boolean;
  readonly error: boolean;
}

@Component({
  imports: [AsyncPipe, DatePipe, FormsModule, MaterialModule, RouterLink],
  selector: 'app-devices-page',
  styles: `
    .inventory-toolbar {
      align-items: end;
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(3, minmax(160px, 1fr)) auto auto;
      margin-bottom: 16px;
    }

    .inventory-table-wrap {
      overflow-x: auto;
    }

    .inventory-table {
      border-collapse: collapse;
      min-width: 960px;
      width: 100%;
    }

    .inventory-table th,
    .inventory-table td {
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      padding: 12px;
      text-align: left;
      white-space: nowrap;
    }

    .inventory-table th {
      color: rgba(0, 0, 0, 0.62);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .inventory-footer {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: space-between;
      margin-top: 16px;
    }

    .pagination-actions {
      align-items: center;
      display: flex;
      gap: 8px;
    }

    .page-size {
      width: 96px;
    }

    .state-panel {
      align-items: center;
      color: rgba(0, 0, 0, 0.62);
      display: flex;
      gap: 12px;
      justify-content: center;
      min-height: 160px;
      text-align: center;
    }

    @media (max-width: 1100px) {
      .inventory-toolbar {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 700px) {
      .inventory-toolbar {
        grid-template-columns: 1fr;
      }

      .inventory-footer {
        align-items: stretch;
        flex-direction: column;
      }
    }
  `,
  template: `
    <section class="page-header">
      <h1>Devices</h1>
      <p>Inventory, search, filtering, and export for registered devices.</p>
    </section>

    @if (vm$ | async; as vm) {
      <section class="surface-panel">
        <form class="inventory-toolbar" (ngSubmit)="applyFilters()">
          <mat-form-field appearance="outline">
            <mat-label>Serial number</mat-label>
            <input
              matInput
              name="serialNumber"
              [ngModel]="vm.filters.serialNumber"
              (ngModelChange)="updateFilters({ serialNumber: $event })"
            />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Firmware version</mat-label>
            <input
              matInput
              name="firmwareVersion"
              [ngModel]="vm.filters.firmwareVersion"
              (ngModelChange)="updateFilters({ firmwareVersion: $event })"
            />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Status</mat-label>
            <input
              matInput
              name="status"
              [ngModel]="vm.filters.status"
              (ngModelChange)="updateFilters({ status: $event })"
            />
          </mat-form-field>

          <button mat-flat-button color="primary" type="submit" [disabled]="vm.loading">
            <mat-icon>search</mat-icon>
            <span>Search</span>
          </button>

          <button mat-button type="button" (click)="exportCsv()" [disabled]="vm.loading">
            <mat-icon>download</mat-icon>
            <span>Export CSV</span>
          </button>
        </form>

        @if (vm.loading) {
          <div class="state-panel">
            <mat-spinner diameter="32" />
            <span>Loading devices</span>
          </div>
        } @else if (vm.error) {
          <div class="state-panel">
            <span>Unable to load devices.</span>
            <button mat-button type="button" (click)="loadDevices()">Retry</button>
          </div>
        } @else if (vm.items.length === 0) {
          <div class="state-panel">
            <span>No devices found.</span>
            <button mat-button type="button" (click)="resetFilters()">Reset filters</button>
          </div>
        } @else {
          <div class="inventory-table-wrap">
            <table class="inventory-table">
              <thead>
                <tr>
                  <th>Serial number</th>
                  <th>Model</th>
                  <th>Firmware</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Connectivity</th>
                  <th>Last seen</th>
                  <th>Onboarding</th>
                  <th>Certificate</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                @for (device of vm.items; track device.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/devices', device.serialNumber]">{{ device.serialNumber }}</a>
                    </td>
                    <td>{{ device.deviceModel }}</td>
                    <td>{{ device.firmwareVersion }}</td>
                    <td>{{ device.customerId }}</td>
                    <td>{{ device.status }}</td>
                    <td>{{ device.connectivityStatus }}</td>
                    <td>{{ device.lastSeenAt ? (device.lastSeenAt | date: 'medium') : 'Never' }}</td>
                    <td>{{ device.onboardingStatus }}</td>
                    <td>{{ device.certificate?.status ?? 'Not issued' }}</td>
                    <td>{{ device.createdAt | date: 'medium' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <div class="inventory-footer">
          <span>Showing {{ vm.items.length }} of {{ vm.totalItems }} devices</span>
          <div class="pagination-actions">
            <mat-form-field class="page-size" appearance="outline">
              <mat-label>Size</mat-label>
              <input
                matInput
                type="number"
                min="1"
                max="100"
                name="pageSize"
                [ngModel]="vm.size"
                (ngModelChange)="setPageSize($event)"
              />
            </mat-form-field>
            <button mat-icon-button type="button" (click)="previousPage()" [disabled]="vm.loading || vm.page === 0">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <span>Page {{ vm.page + 1 }} of {{ Math.max(vm.totalPages, 1) }}</span>
            <button
              mat-icon-button
              type="button"
              (click)="nextPage()"
              [disabled]="vm.loading || vm.page + 1 >= vm.totalPages"
            >
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>
        </div>
      </section>
    }
  `,
})
export class DevicesPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  protected readonly Math = Math;
  private readonly vmSubject = new BehaviorSubject<DevicesViewModel>({
    items: [],
    filters: { serialNumber: '', firmwareVersion: '', status: '' },
    page: 0,
    size: 20,
    totalItems: 0,
    totalPages: 0,
    loading: true,
    error: false,
  });

  readonly vm$ = this.vmSubject.asObservable();

  ngOnInit(): void {
    this.loadDevices();
  }

  loadDevices(page = this.vmSubject.value.page): void {
    const nextPage = Math.max(0, page);
    this.vmSubject.next({ ...this.vmSubject.value, page: nextPage, loading: true, error: false });
    this.api
      .get<DeviceInventoryResponse>('/devices', this.queryParams(nextPage, this.vmSubject.value.size))
      .pipe(finalize(() => this.vmSubject.next({ ...this.vmSubject.value, loading: false })))
      .subscribe({
        next: (response) =>
          this.vmSubject.next({
            ...this.vmSubject.value,
            items: response.items,
            page: response.page,
            size: response.size,
            totalItems: response.totalItems,
            totalPages: response.totalPages,
            error: false,
          }),
        error: () => {
          this.vmSubject.next({ ...this.vmSubject.value, error: true });
          this.notifications.showError('Unable to load devices.');
        },
      });
  }

  updateFilters(update: Partial<DeviceFilters>): void {
    this.vmSubject.next({
      ...this.vmSubject.value,
      filters: { ...this.vmSubject.value.filters, ...update },
    });
  }

  applyFilters(): void {
    this.loadDevices(0);
  }

  resetFilters(): void {
    this.vmSubject.next({
      ...this.vmSubject.value,
      filters: { serialNumber: '', firmwareVersion: '', status: '' },
    });
    this.loadDevices(0);
  }

  setPageSize(value: number | string): void {
    const size = Math.min(Math.max(Number(value) || 20, 1), 100);
    this.vmSubject.next({ ...this.vmSubject.value, size });
    this.loadDevices(0);
  }

  previousPage(): void {
    this.loadDevices(this.vmSubject.value.page - 1);
  }

  nextPage(): void {
    this.loadDevices(this.vmSubject.value.page + 1);
  }

  exportCsv(): void {
    this.api.download('/devices/export', this.filterParams()).subscribe({
      next: (blob) => this.saveCsv(blob),
      error: () => this.notifications.showError('Unable to export devices.'),
    });
  }

  private queryParams(page: number, size: number): ApiQueryParams {
    return { ...this.filterParams(), page, size };
  }

  private filterParams(): ApiQueryParams {
    const filters = this.vmSubject.value.filters;
    const params: ApiQueryParams = {};
    if (filters.serialNumber.trim()) {
      params['serialNumber'] = filters.serialNumber.trim();
    }
    if (filters.firmwareVersion.trim()) {
      params['firmwareVersion'] = filters.firmwareVersion.trim();
    }
    if (filters.status.trim()) {
      params['status'] = filters.status.trim();
    }
    return params;
  }

  private saveCsv(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'device-inventory.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
