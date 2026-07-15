export const CampaignStatus = {
  Draft: 'DRAFT',
  PendingApproval: 'PENDING_APPROVAL',
  Scheduled: 'SCHEDULED',
  Active: 'ACTIVE',
  Paused: 'PAUSED',
  Completed: 'COMPLETED',
  Cancelled: 'CANCELLED',
} as const;

export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export type CampaignStagePauseCondition =
  | 'none'
  | 'error_rate'
  | 'success_rate'
  | 'duration'
  | 'manual';

export type CampaignStagePauseThresholdUnit = 'percent' | 'hours';

export const CampaignDeviceStatus = {
  Pending: 'PENDING',
  Scheduled: 'SCHEDULED',
  InProgress: 'IN_PROGRESS',
  Success: 'SUCCESS',
  Failed: 'FAILED',
  Paused: 'PAUSED',
  Retrying: 'RETRYING',
  Excluded: 'EXCLUDED',
  PermanentlyFailed: 'PERMANENTLY_FAILED',
} as const;

export type CampaignDeviceStatus = (typeof CampaignDeviceStatus)[keyof typeof CampaignDeviceStatus];

export type CampaignTargetOperator =
  | '='
  | '<'
  | '>'
  | '<='
  | '>='
  | 'contains'
  | 'in';

export type CampaignRetryBackoffStrategy = 'linear' | 'exponential';

export interface CampaignTargetRule {
  ruleType:
    | 'model'
    | 'version'
    | 'location'
    | 'group'
    | 'last_reported'
    | 'tags';
  operator: CampaignTargetOperator;
  value: string;
  logicalOperator?: 'AND' | 'OR';
}

export interface CampaignStage {
  id: string;
  stageNumber: number;
  stageName: string;
  devicePercentage: number;
  pauseCondition: CampaignStagePauseCondition;
  pauseThreshold?: number;
  pauseThresholdUnit?: CampaignStagePauseThresholdUnit;
  waitDurationSeconds: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface CampaignDevice {
  id: string;
  campaignId: string;
  deviceId: string;
  modelId: string;
  currentFirmwareVersion: string;
  stageId?: string;
  status: CampaignDeviceStatus;
  deploymentStartTime?: Date;
  deploymentEndTime?: Date;
  retryCount: number;
  lastRetryTime?: Date;
  excluded?: boolean;
  excludeReason?: string;
  failureReason?: string;
  errorCode?: string;
}

export interface CampaignAuditEntry {
  id: string;
  campaignId: string;
  eventType:
    | 'CREATED'
    | 'SCHEDULED'
    | 'STARTED'
    | 'PAUSED'
    | 'RESUMED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'UPDATED'
    | 'DEVICE_EXCLUDED'
    | 'DEVICE_RETRIED';
  actor: string;
  timestamp: Date;
  details: Record<string, unknown>;
  ipAddress?: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  firmwareId: string;
  targetModelIds: string[];
  targetRules: CampaignTargetRule[];
  startTime?: Date;
  scheduledAt?: Date;
  endTime?: Date;
  status: CampaignStatus;
  totalDurationSeconds: number;
  pauseOnErrorRate?: number;
  maxConcurrentDevices: number;
  enableAutoRetry: boolean;
  retryAttempts: number;
  retryDelaySeconds: number;
  retryBackoff: CampaignRetryBackoffStrategy;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  stages: CampaignStage[];
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  firmwareId: string;
  targetModelIds: string[];
  targetRules: CampaignTargetRule[];
  scheduleAt?: string;
  triggerOnApproval?: boolean;
  metadata?: Record<string, unknown>;
  totalDurationSeconds: number;
  pauseOnErrorRate?: number;
  maxConcurrentDevices?: number;
  enableAutoRetry?: boolean;
  retryAttempts?: number;
  retryDelaySeconds?: number;
  retryBackoff?: CampaignRetryBackoffStrategy;
  stages: Omit<CampaignStage, 'id' | 'startedAt' | 'completedAt'>[];
}

export interface UpdateCampaignRequest {
  description?: string;
  targetModelIds?: string[];
  targetRules?: CampaignTargetRule[];
  scheduleAt?: string;
  triggerOnApproval?: boolean;
  metadata?: Record<string, unknown>;
  totalDurationSeconds?: number;
  pauseOnErrorRate?: number;
  maxConcurrentDevices?: number;
  enableAutoRetry?: boolean;
  retryAttempts?: number;
  retryDelaySeconds?: number;
  retryBackoff?: CampaignRetryBackoffStrategy;
  stages?: Omit<CampaignStage, 'id' | 'startedAt' | 'completedAt'>[];
}

export interface ScheduleCampaignRequest {
  scheduledAt: string;
}

export interface PauseCampaignRequest {
  reason?: string;
  pauseDurationSeconds?: number;
}

export interface ExcludeDevicesRequest {
  deviceIds: string[];
  reason?: string;
}

export interface RetryDevicesRequest {
  deviceIds: string[];
  resetRetryCounter?: boolean;
  batchSize?: number;
  delaySeconds?: number;
}

export interface CampaignReport {
  campaignId: string;
  campaignName: string;
  status: CampaignStatus;
  targetDevices: number;
  successCount: number;
  failureCount: number;
  retryCount: number;
  permanentFailureCount: number;
  stages: {
    stageId: string;
    stageName: string;
    devicePercentage: number;
    status: CampaignStatus;
  }[];
}

export interface CampaignStats {
  campaignId: string;
  status: CampaignStatus;
  targetDevices: number;
  pending: number;
  inProgress: number;
  success: number;
  failed: number;
  paused: number;
  retrying: number;
  excluded: number;
  permanentlyFailed: number;
}
