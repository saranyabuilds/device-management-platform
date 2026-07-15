import { AsyncPipe, DatePipe, NgForOf, NgIf } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/http/api.service';
import { MaterialModule } from '../../shared/material/material.module';

interface CampaignDetail {
  id: string;
  name: string;
  description?: string;
  firmwareId: string;
  status: string;
  scheduleAt?: string;
  targetModelIds: string[];
  targetRules: Array<{ ruleType: string; operator: string; value: string }>;
  stages: Array<{ stageNumber: number; stageName: string; devicePercentage: number; pauseCondition: string }>;
}

@Component({
  imports: [AsyncPipe, DatePipe, MaterialModule, RouterLink],
  selector: 'app-ota-update-detail-page',
  template: `
    <section class="page-header">
      <h1>Campaign details</h1>
      <p>Review and control rollout campaign execution.</p>
    </section>

    <section class="surface-panel" *ngIf="loading">
      <div class="state-panel">
        <mat-spinner diameter="32"></mat-spinner>
        <span>Loading campaign details...</span>
      </div>
    </section>

    <section class="surface-panel" *ngIf="!loading && error">
      <div class="state-panel">
        <span>Unable to load campaign details.</span>
        <button mat-button color="primary" (click)="loadCampaign()">Retry</button>
      </div>
    </section>

    <section class="surface-panel" *ngIf="!loading && campaign">
      <div class="campaign-grid">
        <div>
          <h2>{{ campaign.name }}</h2>
          <p>{{ campaign.description || 'No description provided.' }}</p>
        </div>
        <div class="campaign-actions">
          <button mat-flat-button color="primary" (click)="pause()" [disabled]="campaign.status !== 'ACTIVE'">
            <mat-icon>pause</mat-icon>
            Pause
          </button>
          <button mat-flat-button color="primary" (click)="resume()" [disabled]="campaign.status !== 'PAUSED'">
            <mat-icon>play_arrow</mat-icon>
            Resume
          </button>
          <button mat-flat-button color="primary" (click)="retry()">
            <mat-icon>refresh</mat-icon>
            Retry failed devices
          </button>
        </div>
      </div>

      <div class="campaign-summary">
        <div><strong>Status:</strong> {{ campaign.status }}</div>
        <div><strong>Firmware:</strong> {{ campaign.firmwareId }}</div>
        <div><strong>Scheduled:</strong> {{ campaign.scheduleAt || 'Immediate' }}</div>
      </div>

      <section>
        <h3>Targeting rules</h3>
        <table class="detail-table">
          <thead>
            <tr>
              <th>Rule type</th>
              <th>Operator</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let rule of campaign.targetRules">
              <td>{{ rule.ruleType }}</td>
              <td>{{ rule.operator }}</td>
              <td>{{ rule.value }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h3>Rollout stages</h3>
        <table class="detail-table">
          <thead>
            <tr>
              <th>Stage</th>
              <th>Name</th>
              <th>Percentage</th>
              <th>Pause condition</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let stage of campaign.stages">
              <td>{{ stage.stageNumber }}</td>
              <td>{{ stage.stageName }}</td>
              <td>{{ stage.devicePercentage }}%</td>
              <td>{{ stage.pauseCondition }}</td>
            </tr>
          </tbody>
        </table>
      </section>
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
      .campaign-grid {
        align-items: flex-start;
        display: grid;
        gap: 16px;
        grid-template-columns: 1fr auto;
      }
      .campaign-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .campaign-summary {
        display: grid;
        gap: 8px;
        margin: 16px 0;
      }
      .detail-table {
        border-collapse: collapse;
        width: 100%;
      }
      .detail-table th,
      .detail-table td {
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        padding: 8px 12px;
        text-align: left;
      }
      .detail-table th {
        text-transform: uppercase;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.62);
      }
    `,
  ],
})
export class OtaUpdateDetailPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);

  campaign: CampaignDetail | null = null;
  loading = false;
  error = false;

  ngOnInit(): void {
    this.loadCampaign();
  }

  loadCampaign(): void {
    const campaignId = this.route.snapshot.paramMap.get('id');
    if (!campaignId) {
      this.error = true;
      return;
    }

    this.loading = true;
    this.error = false;
    this.api.get<CampaignDetail>(`campaigns/${campaignId}`).subscribe({
      next: (campaign) => {
        this.campaign = campaign;
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  pause(): void {
    if (!this.campaign) return;
    this.api.post<unknown, CampaignDetail>(`campaigns/${this.campaign.id}/pause`, {}).subscribe({
      next: (campaign) => (this.campaign = campaign),
    });
  }

  resume(): void {
    if (!this.campaign) return;
    this.api.post<unknown, CampaignDetail>(`campaigns/${this.campaign.id}/resume`, {}).subscribe({
      next: (campaign) => (this.campaign = campaign),
    });
  }

  retry(): void {
    if (!this.campaign) return;
    this.api
      .post<{
        deviceIds: string[];
        resetRetryCounter?: boolean;
        batchSize?: number;
        delaySeconds?: number;
      }, { campaignId: string; retriedDeviceIds: string[] }>(`campaigns/${this.campaign.id}/retry`, {
        deviceIds: [],
      })
      .subscribe({
        next: () => {
          window.alert('Retry requested for failed devices.');
        },
      });
  }
}
