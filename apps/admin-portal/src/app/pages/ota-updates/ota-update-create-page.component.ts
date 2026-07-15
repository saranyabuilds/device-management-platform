import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/http/api.service';
import { MaterialModule } from '../../shared/material/material.module';

interface TargetRule {
  ruleType: string;
  operator: string;
  value: string;
}

interface Stage {
  stageNumber: number;
  stageName: string;
  devicePercentage: number;
  pauseCondition: string;
}

@Component({
  imports: [FormsModule, MaterialModule, NgIf, NgForOf],
  selector: 'app-ota-update-create-page',
  template: `
    <section class="page-header">
      <h1>Create Campaign</h1>
      <p>Define a firmware rollout campaign with targeting, stages, and schedule.</p>
    </section>

    <section class="surface-panel">
      <form (ngSubmit)="submit()" #campaignForm="ngForm">
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Campaign name</mat-label>
            <input matInput name="name" [(ngModel)]="campaign.name" required />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Firmware ID</mat-label>
            <input matInput name="firmwareId" [(ngModel)]="campaign.firmwareId" required />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Description</mat-label>
            <input matInput name="description" [(ngModel)]="campaign.description" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Scheduled start (UTC)</mat-label>
            <input matInput name="scheduleAt" [(ngModel)]="campaign.scheduleAt" placeholder="2026-06-30T12:00:00Z" />
          </mat-form-field>
        </div>

        <mat-divider></mat-divider>

        <section class="section-block">
          <h3>Targeting rules</h3>
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Rule type</mat-label>
              <input matInput name="ruleType" [(ngModel)]="newRule.ruleType" required />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Operator</mat-label>
              <input matInput name="operator" [(ngModel)]="newRule.operator" required />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Value</mat-label>
              <input matInput name="value" [(ngModel)]="newRule.value" required />
            </mat-form-field>
            <div class="button-row">
              <button mat-flat-button color="primary" type="button" (click)="addRule()" [disabled]="!newRule.value">
                Add rule
              </button>
            </div>
          </div>

          <table class="detail-table" *ngIf="campaign.targetRules.length > 0">
            <thead>
              <tr>
                <th>Type</th>
                <th>Operator</th>
                <th>Value</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let rule of campaign.targetRules; let i = index">
                <td>{{ rule.ruleType }}</td>
                <td>{{ rule.operator }}</td>
                <td>{{ rule.value }}</td>
                <td>
                  <button mat-icon-button type="button" (click)="removeRule(i)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <mat-divider></mat-divider>

        <section class="section-block">
          <h3>Rollout stages</h3>
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Stage name</mat-label>
              <input matInput name="stageName" [(ngModel)]="newStage.stageName" required />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Device percentage</mat-label>
              <input
                matInput
                type="number"
                name="devicePercentage"
                [(ngModel)]="newStage.devicePercentage"
                min="1"
                max="100"
                required
              />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Pause condition</mat-label>
              <input matInput name="pauseCondition" [(ngModel)]="newStage.pauseCondition" required />
            </mat-form-field>
            <div class="button-row">
              <button mat-flat-button color="primary" type="button" (click)="addStage()" [disabled]="!newStage.stageName">
                Add stage
              </button>
            </div>
          </div>

          <table class="detail-table" *ngIf="campaign.stages.length > 0">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Percentage</th>
                <th>Pause condition</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let stage of campaign.stages; let i = index">
                <td>{{ stage.stageNumber }}</td>
                <td>{{ stage.stageName }}</td>
                <td>{{ stage.devicePercentage }}%</td>
                <td>{{ stage.pauseCondition }}</td>
                <td>
                  <button mat-icon-button type="button" (click)="removeStage(i)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <mat-divider></mat-divider>

        <section class="section-block">
          <h3>Retry settings</h3>
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Enable auto retry</mat-label>
              <mat-checkbox name="enableAutoRetry" [(ngModel)]="campaign.enableAutoRetry"></mat-checkbox>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Retry attempts</mat-label>
              <input
                matInput
                type="number"
                name="retryAttempts"
                [(ngModel)]="campaign.retryAttempts"
                min="1"
                max="5"
              />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Retry delay seconds</mat-label>
              <input matInput type="number" name="retryDelaySeconds" [(ngModel)]="campaign.retryDelaySeconds" min="60" />
            </mat-form-field>
          </div>
        </section>

        <div class="action-row">
          <button mat-flat-button color="primary" type="submit" [disabled]="campaignForm.invalid || submitting || !campaign.targetRules.length || !campaign.stages.length">
            {{ submitting ? 'Creating...' : 'Create campaign' }}
          </button>
          <button mat-button type="button" (click)="cancel()">Cancel</button>
        </div>
      </form>
    </section>
  `,
  styles: [
    `
      .surface-panel {
        padding: 16px;
      }
      .page-header {
        margin-bottom: 16px;
      }
      .form-grid {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(2, minmax(200px, 1fr));
        margin-bottom: 16px;
      }
      .form-grid.full-width {
        grid-column: 1 / -1;
      }
      .button-row {
        display: flex;
        align-items: end;
      }
      .action-row {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .section-block {
        margin: 24px 0;
      }
      .detail-table {
        border-collapse: collapse;
        width: 100%;
        margin-top: 12px;
      }
      .detail-table th,
      .detail-table td {
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        padding: 8px 12px;
        text-align: left;
      }
      .detail-table th {
        text-transform: uppercase;
        color: rgba(0, 0, 0, 0.62);
        font-size: 12px;
      }
    `,
  ],
})
export class OtaUpdateCreatePageComponent {
  campaign = {
    name: '',
    description: '',
    firmwareId: '',
    targetModelIds: [] as string[],
    targetRules: [] as TargetRule[],
    stages: [] as Stage[],
    scheduleAt: '',
    triggerOnApproval: false,
    enableAutoRetry: true,
    retryAttempts: 3,
    retryDelaySeconds: 3600,
    metadata: {},
  } as { name: string; description: string; firmwareId: string; targetModelIds: string[]; targetRules: TargetRule[]; stages: Stage[]; scheduleAt: string; triggerOnApproval: boolean; enableAutoRetry: boolean; retryAttempts: number; retryDelaySeconds: number; metadata: Record<string, unknown> };

  targetModelId = '';
  newRule: TargetRule = { ruleType: 'model', operator: '=', value: '' };
  newStage: Stage = { stageNumber: 1, stageName: 'Stage 1', devicePercentage: 10, pauseCondition: 'none' };
  submitting = false;

  constructor(private api: ApiService, private router: Router) {}

  addRule(): void {
    if (!this.newRule.ruleType || !this.newRule.operator || !this.newRule.value) {
      return;
    }
    this.campaign.targetRules.push({ ...this.newRule });
    this.newRule = { ruleType: 'model', operator: '=', value: '' };
  }

  removeRule(index: number): void {
    this.campaign.targetRules.splice(index, 1);
  }

  addStage(): void {
    if (!this.newStage.stageName || this.newStage.devicePercentage <= 0) {
      return;
    }
    this.campaign.stages.push({
      ...this.newStage,
      stageNumber: this.campaign.stages.length + 1,
    });
    this.newStage = { stageNumber: this.campaign.stages.length + 2, stageName: `Stage ${this.campaign.stages.length + 2}`, devicePercentage: 10, pauseCondition: 'none' };
  }

  removeStage(index: number): void {
    this.campaign.stages.splice(index, 1);
    this.campaign.stages = this.campaign.stages.map((stage, i) => ({ ...stage, stageNumber: i + 1 }));
  }

  submit(): void {
    if (!this.campaign.name || !this.campaign.firmwareId || !this.targetModelId || this.campaign.targetRules.length === 0 || this.campaign.stages.length === 0) {
      return;
    }

    this.campaign.targetModelIds = [this.targetModelId];
    this.submitting = true;

    const request = {
      name: this.campaign.name,
      description: this.campaign.description,
      firmwareId: this.campaign.firmwareId,
      targetModelIds: this.campaign.targetModelIds,
      targetRules: this.campaign.targetRules,
      stages: this.campaign.stages,
      scheduleAt: this.campaign.scheduleAt || undefined,
      triggerOnApproval: false,
      metadata: {
        enableAutoRetry: this.campaign.enableAutoRetry,
        retryAttempts: this.campaign.retryAttempts,
        retryDelaySeconds: this.campaign.retryDelaySeconds,
      },
    };

    this.api.post<typeof request, { id: string }>('campaigns', request).subscribe({
      next: (response) => {
        this.router.navigate(['/ota-updates', response.id]);
      },
      error: () => {
        this.submitting = false;
        window.alert('Unable to create campaign.');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/ota-updates']);
  }
}
