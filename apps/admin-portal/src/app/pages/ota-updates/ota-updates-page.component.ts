import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/http/api.service';
import { MaterialModule } from '../../shared/material/material.module';

interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  firmwareId: string;
  scheduleAt?: string;
}

@Component({
  imports: [AsyncPipe, MaterialModule, NgIf, NgForOf, RouterLink],
  selector: 'app-ota-updates-page',
  template: `
    <section class="page-header">
      <h1>OTA Updates</h1>
      <p>Define and manage rollout campaigns.</p>
    </section>

    <section class="surface-panel">
      <button mat-flat-button color="primary" (click)="createCampaign()">
        <mat-icon>add</mat-icon>
        <span>Create Campaign</span>
      </button>
    </section>

    <section class="surface-panel" *ngIf="loading">
      <div class="state-panel">
        <mat-spinner diameter="32"></mat-spinner>
        <span>Loading campaigns...</span>
      </div>
    </section>

    <section class="surface-panel" *ngIf="!loading && error">
      <div class="state-panel">
        <span>Unable to load campaigns.</span>
        <button mat-button color="primary" (click)="loadCampaigns()">Retry</button>
      </div>
    </section>

    <section class="surface-panel" *ngIf="!loading && !error">
      <ng-container *ngIf="campaigns.length > 0; else noCampaigns">
        <table class="inventory-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Status</th>
              <th>Firmware</th>
              <th>Scheduled start</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let campaign of campaigns">
              <td><a [routerLink]="['/ota-updates', campaign.id]">{{ campaign.name }}</a></td>
              <td>{{ campaign.status }}</td>
              <td>{{ campaign.firmwareId }}</td>
              <td>{{ campaign.scheduleAt || 'Immediate' }}</td>
            </tr>
          </tbody>
        </table>
      </ng-container>
      <ng-template #noCampaigns>
        <div class="state-panel">
          <span>No campaigns found.</span>
        </div>
      </ng-template>
    </section>
  `,
  styles: [
    `
      .surface-panel {
        margin-bottom: 16px;
        padding: 16px;
      }
      .state-panel {
        align-items: center;
        display: flex;
        gap: 12px;
        justify-content: center;
        min-height: 140px;
      }
      .inventory-table {
        border-collapse: collapse;
        width: 100%;
      }
      .inventory-table th,
      .inventory-table td {
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        padding: 12px;
        text-align: left;
      }
      .inventory-table th {
        text-transform: uppercase;
        color: rgba(0, 0, 0, 0.62);
        font-size: 12px;
      }
    `,
  ],
})
export class OtaUpdatesPageComponent implements OnInit {
  campaigns: CampaignSummary[] = [];
  loading = false;
  error = false;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.loadCampaigns();
  }

  loadCampaigns(): void {
    this.loading = true;
    this.error = false;
    this.api.get<CampaignSummary[]>('campaigns').subscribe({
      next: (campaigns) => {
        this.campaigns = campaigns;
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  createCampaign(): void {
    this.router.navigate(['/ota-updates/new']);
  }
}
