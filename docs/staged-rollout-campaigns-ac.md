# Staged Rollout Campaigns - Detailed Requirements & Acceptance Criteria

**Epic**: OTA Update Distribution & Rollout Management  
**User Story**: As an operations engineer, I want staged rollout campaigns, So that updates are deployed safely.

**Story Points**: 21 | **Priority**: High | **Complexity**: High

---

## Overview

This feature enables operations engineers to safely deploy firmware updates to IoT devices using a phased, controlled approach. Instead of pushing updates to all devices simultaneously, campaigns allow staged rollout with device targeting, pause/resume capabilities, and automatic retry mechanisms.

### Business Value
- **Risk Mitigation**: Detect issues before rolling out to all devices
- **Safety**: Pause and investigate if problems detected
- **Efficiency**: Automatically retry failed devices
- **Control**: Schedule rollouts for optimal windows
- **Observability**: Real-time monitoring of deployment progress

### Integration Points
- **Firmware Management**: Uses existing firmware artifacts from `firmware-api`
- **Device Registry**: Targets devices via model, location, version criteria
- **Notification Service**: Sends OTA update notifications via MQTT
- **Telemetry API**: Collects deployment success/failure metrics
- **Admin Portal**: Operations dashboard for campaign management

---

## Task 1: Campaign Creation UI

### Description
Operations engineers need a web interface to define and launch rollout campaigns without writing code.

### Acceptance Criteria

#### AC 1.1: Campaign Creation Form
- **Given** an operations engineer is on the Campaigns page
- **When** they click "Create Campaign"
- **Then** a form displays with the following fields:
  - **Campaign Name** (required, text, max 255 chars, unique)
  - **Description** (optional, textarea, max 2000 chars)
  - **Firmware Version** (required, dropdown, lists approved firmware)
  - **Target Model IDs** (required, multi-select)
  - **Start Date/Time** (required, datetime picker, min: now, max: 90 days from now)
  - **Rollout Duration** (required, duration selector: 1-24 hours, 1-30 days)
  - **Pause on Error Rate** (optional, %, range 0-100, default 10%)
  - **Max Concurrent Devices** (optional, number, range 1-10000, default 100)
  - **Enable Auto-Retry** (optional, checkbox, default checked)
  - **Retry Attempts** (optional, number, range 1-5, default 3, enabled only if auto-retry checked)

#### AC 1.2: Campaign Preview
- **Given** a user has filled in the campaign form
- **When** they click "Preview Campaign"
- **Then** a modal shows:
  - Target device count (from device registry)
  - Estimated deployment timeline
  - Estimated success rate (based on device health)
  - Estimated data usage
  - Staged breakdown visualization

#### AC 1.3: Form Validation
- **Given** a user submits the campaign form
- **When** any required field is empty
- **Then** validation errors display inline with specific messages:
  - "Campaign name is required"
  - "Select at least one firmware version"
  - "Select at least one device model"
  - "Start date must be in the future"
  - "Rollout duration must be between 1 hour and 30 days"

#### AC 1.4: Campaign Confirmation
- **Given** all form validation passes
- **When** user clicks "Create Campaign"
- **Then**:
  - A confirmation dialog shows campaign details
  - Estimated impact summary displays
  - User must confirm before campaign creation
  - On confirmation, campaign is created in DRAFT status
  - Success toast notification appears

#### AC 1.5: Campaign Listing
- **Given** a user views the Campaigns page
- **Then** a table displays all campaigns with columns:
  - Campaign Name (clickable, leads to detail page)
  - Status (DRAFT, SCHEDULED, ACTIVE, PAUSED, COMPLETED, CANCELLED)
  - Firmware Version (model-specific)
  - Target Devices / Completed Devices
  - Start Time / Progress %
  - Success Rate
  - Actions (Edit, Schedule, Cancel, View Details)
- **And** filters available:
  - By Status (dropdown, multi-select)
  - By Model (dropdown, multi-select)
  - By Date Range (date picker)
  - By Search (campaign name or description)
- **And** sorting by: Name, Status, Start Time, Progress, Success Rate

#### AC 1.6: Campaign Detail View
- **Given** a user clicks on a campaign
- **When** detail view opens
- **Then** displays:
  - Campaign header: Name, Status, Created By, Created At
  - Summary stats: Target Devices, Completed, Succeeded, Failed, Paused
  - Configuration panel (read-only): All form fields from creation
  - Rollout stages visual (see Task 3)
  - Device list with filters (see Task 2)
  - Action buttons based on status:
    - DRAFT: Edit, Schedule, Delete
    - SCHEDULED: Edit, Cancel, View Execution Plan
    - ACTIVE: Pause, View Details
    - PAUSED: Resume, Cancel, View Details
    - COMPLETED: View Report, Archive, Retry Failed
    - CANCELLED: View Report, Delete

#### AC 1.7: Edit Campaign (Draft Only)
- **Given** a campaign is in DRAFT status
- **When** user clicks "Edit"
- **Then**:
  - Form pre-populates with existing values
  - User can modify all fields except Firmware Version (immutable once created)
  - On save, campaign updates and returns to detail view
  - Edit timestamp and user are recorded

#### AC 1.8: Campaign Schedule
- **Given** a campaign is in DRAFT status
- **When** user clicks "Schedule"
- **Then**:
  - Campaign transitions to SCHEDULED status
  - Displays "Scheduled for [Date/Time]"
  - Campaign cannot be edited in SCHEDULED status
  - System records scheduled time and operator who scheduled it

---

## Task 2: Device Targeting Rules

### Description
Define sophisticated targeting rules to select which devices receive updates in each rollout stage.

### Acceptance Criteria

#### AC 2.1: Targeting Rule Types
Campaigns support the following rule types (must support combinations):
1. **Device Model** - Exact model match (e.g., "model-x1")
2. **Firmware Version** - Current firmware version (e.g., "< 1.0.0", "= 0.5.0")
3. **Location** - Geographic region/facility (e.g., "region:us-west", "location:warehouse-1")
4. **Device Group** - Manually assigned device groups
5. **Last Reported** - Device health (e.g., "within last 24 hours")
6. **Device Tags** - Custom key-value tags (e.g., "env:staging")

#### AC 2.2: Rule Builder Interface
- **Given** user is in campaign creation or editing
- **When** they access the "Target Devices" section
- **Then** a rule builder displays with:
  - Operator dropdown: AND / OR
  - Rule rows with: [Rule Type] [Operator] [Value]
  - Add Rule button to add additional rules
  - Remove Rule button (X) for each row
  - Clear All button to remove all rules

Example:
```
Device Model    =    device-x1
AND Location    =    us-west
AND Firmware Version < 1.0.0
OR Device Tags  contains env:staging
```

#### AC 2.3: Device Count Preview
- **Given** a user configures targeting rules
- **When** they click "Check Matching Devices"
- **Then**:
  - System queries device registry with rules
  - Displays: "X devices match criteria"
  - Breakdown by model shown in tooltip
  - Updates in real-time as rules are modified
  - Shows warning if > 50% of all devices match

#### AC 2.4: Device List View
- **Given** a campaign detail view is open
- **When** user views the "Target Devices" tab
- **Then** displays paginated table (100 rows per page) with:
  - Device ID (clickable, links to device details)
  - Model
  - Current Firmware Version
  - Last Reported (timestamp)
  - Deployment Status (PENDING, SCHEDULED, IN_PROGRESS, SUCCESS, FAILED, PAUSED)
  - Deployment Progress (if in progress: %, ETA)
  - Error Details (if failed)
- **And** columns are sortable
- **And** filters available:
  - By Deployment Status
  - By Model
  - By Search (device ID)

#### AC 2.5: Exclude Devices
- **Given** a campaign is active
- **When** user wants to exclude specific devices
- **Then** system supports:
  - Individual device exclusion: Checkbox on device list, "Exclude Device"
  - Bulk exclusion: Multi-select devices, "Exclude Selected"
  - Exclusion reason field (optional, text)
  - Excluded devices appear in separate list
  - Cannot re-target excluded devices in same campaign
  - Audit log records exclusion with reason

#### AC 2.6: Target Validation
- **Given** campaign targeting rules are configured
- **When** user attempts to schedule
- **Then** system validates:
  - At least 1 device matches rules (warning if 0)
  - Not more than total devices in system (error if impossible)
  - No circular dependencies or conflicting rules
  - Device registry is reachable (error if unavailable)
  - Shows detailed validation report before proceeding

---

## Task 3: Rollout Stages

### Description
Break the deployment into logical stages, each with specific targets, timing, and success criteria.

### Acceptance Criteria

#### AC 3.1: Stage Creation
- **Given** a campaign is in DRAFT status
- **When** user navigates to "Rollout Stages" section
- **Then** default single stage is created with:
  - Stage Name: "Stage 1"
  - Stage Number: 1
  - Percentage of Devices: 100%
  - Duration: (based on total rollout duration)
  - Pause Condition: None
  - Wait Duration Before Next: 0 hours

#### AC 3.2: Stage Editor
- **Given** user is configuring rollout stages
- **When** they interact with stage editor
- **Then** system supports:
  - **Add Stage**: Creates new stage after current
  - **Remove Stage**: Deletes stage (if > 1 stage exists)
  - **Reorder Stages**: Drag-and-drop to reorder
  - **Stage Name**: Text field, auto-generated: "Stage 1", "Stage 2", etc.
  - **% of Target Devices**: Number 1-100, sum validation (1-100%)
  - **Pause Condition**: Dropdown options:
    - "None" (proceed to next stage immediately)
    - "Error Rate > X%" (with threshold input)
    - "Success Rate < X%" (with threshold input)
    - "Duration > X hours" (with duration input)
    - "Manual" (operator must approve)
  - **Wait Duration**: Hours input, 0-168 hours (7 days)

#### AC 3.3: Stage Visualization
- **Given** a user views campaign stages
- **When** on the campaign detail page
- **Then** displays visual timeline:
  - Horizontal timeline with stage boxes
  - Each box shows: Stage Name, % of devices, duration
  - Arrows between stages showing wait duration
  - Pause conditions displayed on each stage
  - Color coding: DRAFT (gray), SCHEDULED (blue), ACTIVE (green), PAUSED (yellow), COMPLETED (checkmark)
  - Current stage highlighted
  - On hover: Shows detailed stage info tooltip

Example:
```
[Stage 1: 10%]  ─┬─ (0h wait)
                  │
                [Stage 2: 30%]  ─┬─ (24h wait, if error rate < 5%)
                                  │
                                [Stage 3: 60%]
```

#### AC 3.4: Stage Validation
- **Given** user configures multiple stages
- **When** they save or schedule
- **Then** system validates:
  - Sum of stage percentages = 100%
  - At least 1 device per stage
  - Each stage has 1+ device minimum
  - Pause conditions are logically sound
  - Total rollout duration matches campaign duration
  - Shows error/warning messages for violations

#### AC 3.5: Dynamic Stage Adjustment
- **Given** a campaign is ACTIVE in Stage 1
- **When** error rate exceeds pause condition threshold
- **Then**:
  - Stage automatically pauses
  - Alert notification sent to operations team
  - Displays "Stage 1 Paused - Error Rate Exceeded (12%)"
  - Manual approval required to proceed to Stage 2
  - Operator can choose to: Resume, Retry, Rollback, or Cancel

#### AC 3.6: Stage Metrics
- **Given** a stage is active or completed
- **When** user views stage details
- **Then** displays:
  - Devices Targeted
  - Devices Completed
  - Devices Succeeded
  - Devices Failed
  - Devices In Progress
  - Success Rate %
  - Average Deployment Time
  - Time to First Error
  - Current Status
  - Start/End Time

---

## Task 4: Scheduling

### Description
Campaigns can be scheduled to start at specific times with granular scheduling options.

### Acceptance Criteria

#### AC 4.1: Schedule Selection
- **Given** a campaign is in DRAFT status
- **When** user clicks "Schedule" button
- **Then** scheduling options dialog displays:
  - **Start Immediately**: Radio button
  - **Start at Specific Time**: Radio button with datetime picker
    - Minimum: Current time + 5 minutes
    - Maximum: 90 days from now
    - Timezone selector (system default or user preference)
  - **Recurring**: Checkbox (future feature placeholder)

#### AC 4.2: Timezone Handling
- **Given** user selects a schedule time
- **When** they choose from timezone dropdown
- **Then**:
  - Default timezone is user's browser timezone
  - All timestamps displayed in selected timezone
  - Campaign creation records both local time and UTC
  - Database stores all times in UTC
  - Alerts and notifications use user's timezone

#### AC 4.3: Campaign Scheduling
- **Given** all campaign details are configured
- **When** user confirms scheduling
- **Then**:
  - Campaign transitions from DRAFT → SCHEDULED
  - Campaign status shows scheduled start time
  - System sends confirmation email to operations team
  - Scheduled campaign appears in dashboard timeline
  - Campaign cannot be edited once SCHEDULED
  - Manual "Start Now" button available if scheduled in future

#### AC 4.4: Scheduled Campaign Automatic Start
- **Given** a campaign has SCHEDULED status
- **When** the scheduled start time arrives
- **Then**:
  - System automatically transitions campaign to ACTIVE
  - First stage begins execution
  - Initial device target list is generated
  - MQTT notifications are sent to target devices
  - Campaign detail shows "Active - Stage 1" status
  - Telemetry events published: `campaign.started`

#### AC 4.5: Schedule Modification
- **Given** a campaign is SCHEDULED
- **When** user attempts to modify schedule
- **Then**:
  - Edit schedule button available only in SCHEDULED status
  - Allows changing start time to any future time
  - Changes require operator confirmation
  - Audit log records schedule changes with timestamps
  - Cannot schedule past current time

#### AC 4.6: Campaign Delay Handling
- **Given** a campaign is SCHEDULED for a specific time
- **When** the scheduled start time arrives but system is unavailable
- **Then**:
  - Campaign automatically starts as soon as system recovers
  - Catch-up mechanism spreads devices across compressed timeline
  - Alert notification sent: "Campaign [X] started [Y] minutes late"
  - Metrics adjusted for delay (not counted as deployment error)

---

## Task 5: Pause/Resume Rollout

### Description
Operations engineers can pause campaigns to investigate issues, then resume when ready.

### Acceptance Criteria

#### AC 5.1: Manual Pause
- **Given** a campaign is ACTIVE
- **When** user clicks "Pause Campaign"
- **Then**:
  - A confirmation dialog shows:
    - "Are you sure you want to pause?"
    - Current stage and progress
    - Affected devices count
  - On confirmation:
    - Campaign transitions to PAUSED status
    - No new deployment commands sent
    - In-progress deployments continue (graceful)
    - Pause timestamp recorded
    - Operator name and reason (optional text) recorded
    - Alert sent: "Campaign [X] paused by [user]"

#### AC 5.2: Automatic Pause on Condition
- **Given** a stage has pause condition configured
- **When** condition is triggered (e.g., error rate > 5%)
- **Then**:
  - Campaign automatically transitions to PAUSED
  - No operator intervention required
  - Status displays: "Paused - Error Rate (12%) Exceeded Threshold (5%)"
  - Alert notification with pause reason and threshold
  - Detailed error report displayed for investigation
  - Manual approval required to continue (see AC 5.4)

#### AC 5.3: Pause Window Behavior
- **Given** a campaign is PAUSED
- **When** devices check for updates during pause
- **Then**:
  - MQTT notifications not sent to waiting devices
  - Devices continue checking via heartbeat (remain online)
  - Pause duration shown on campaign detail: "Paused for 2h 34m"
  - No automatic rollback to previous version

#### AC 5.4: Resume from Pause
- **Given** a campaign is PAUSED
- **When** user clicks "Resume Campaign"
- **Then**:
  - Optional confirmation dialog shows:
    - Reason for resuming (optional text field)
    - Current error rate / metrics
  - On confirmation:
    - Campaign transitions back to ACTIVE
    - Resumes from current stage (not restarted)
    - Continues with remaining devices
    - Resume timestamp and operator recorded
    - Alert sent: "Campaign [X] resumed"
    - Telemetry event: `campaign.resumed`

#### AC 5.5: Resume with Adjustment
- **Given** a campaign is PAUSED due to error rate
- **When** user clicks "Resume with Adjustments"
- **Then** options dialog shows:
  - **Reduce Stage Percentage**: Slider 10-100%, default current value
  - **Increase Retry Attempts**: Checkbox to enable additional retries
  - **Extend Pause Duration**: Hours input for wait between stages
  - **Exclude Failed Devices**: Option to skip previously failed devices
- **And** on confirmation:
  - Campaign resumes with adjusted parameters
  - Only selected devices proceed
  - Adjustment log recorded
  - Summary email sent with changes

#### AC 5.6: Pause Expiry
- **Given** a campaign is PAUSED
- **When** operator sets a pause duration (e.g., 24 hours)
- **Then**:
  - Pause automatically expires after duration
  - Campaign resumes without operator action
  - Alert sent: "Campaign [X] auto-resumed after 24h pause"
  - Expiry timestamp visible in campaign status
  - Operator can cancel expiry if needed

#### AC 5.7: Pause Metrics
- **Given** a paused campaign
- **When** user views campaign metrics
- **Then** displays:
  - Pause duration
  - Total pause time (sum of all pauses)
  - Reason for pause
  - Devices awaiting continuation
  - Estimated resume time
  - Impact on overall deployment timeline

---

## Task 6: Retry Failed Devices

### Description
Automatically or manually retry firmware deployment on devices that failed.

### Acceptance Criteria

#### AC 6.1: Automatic Retry Configuration
- **Given** a campaign is created
- **When** user configures retry settings
- **Then** form shows:
  - **Enable Auto-Retry**: Checkbox, default checked
  - **Max Retry Attempts**: Number field, 1-5, default 3
  - **Retry Delay**: Duration, 5 mins - 24 hours, default 1 hour
  - **Retry Backoff**: Exponential (1x, 2x, 4x) / Linear (1x) dropdown
  - **Permanent Failure Threshold**: Number of retries before marking as permanent failure

#### AC 6.2: Automatic Retry Execution
- **Given** a device fails initial deployment
- **When** auto-retry is enabled
- **Then**:
  - Device status changes to "FAILED - Retrying"
  - First retry triggered immediately (or after delay)
  - Device moved to retry queue
  - Retry counter incremented
  - Retry timestamp recorded
  - Alert sent after max retries exceeded: "Device [X] failed after 3 attempts"

#### AC 6.3: Retry Status Tracking
- **Given** a device has been retried
- **When** viewing device details
- **Then** displays:
  - Deployment Status: "FAILED - Retry 2/3"
  - Last Attempt: Timestamp and failure reason
  - Next Retry: Scheduled time
  - Retry History: Clickable log of all attempts with errors
  - Estimated Next Attempt: "In 45 minutes"

#### AC 6.4: Manual Retry - Individual Device
- **Given** a campaign shows failed devices
- **When** user selects a device and clicks "Retry"
- **Then**:
  - Confirmation dialog shows device details and last error
  - On confirmation:
    - Device transitions to "RETRYING" status
    - Manual retry counter incremented separately
    - Deployment command sent immediately
    - Notification sent: "Manually retrying device [X]"
    - Operator name recorded as retry initiator

#### AC 6.5: Manual Retry - Bulk
- **Given** a campaign has multiple failed devices
- **When** user multi-selects failed devices and clicks "Retry Selected"
- **Then**:
  - Confirmation dialog shows count and preview
  - Options dialog:
    - **Retry All Selected**: Immediate retry for all
    - **Retry in Batch**: Groups devices, retries with delay between groups
    - **Reset Retry Counter**: Option to start fresh (back to attempt 1/3)
  - On confirmation:
    - All selected devices moved to retry queue
    - Batch retry spreads load (default: 10 devices per 5 minutes)
    - Progress bar shows retry progress
    - Summary email sent with retry details

#### AC 6.6: Failure Analysis
- **Given** devices have failed deployment
- **When** user clicks "View Failure Analysis"
- **Then** displays:
  - **Failure Reasons** (grouped):
    - "Network Timeout": 5 devices
    - "Insufficient Storage": 3 devices
    - "Signature Verification Failed": 2 devices
    - "Device Offline": 1 device
  - **Failure Timeline**: Graph showing when failures occurred
  - **Pattern Detection**: "5 devices failed during upload stage"
  - **Recommendations**: 
    - "Consider reducing concurrent deployments"
    - "Extend timeout threshold"
    - "Check network connectivity in region [X]"
  - **Export Report**: PDF/CSV export option

#### AC 6.7: Permanent Failure Handling
- **Given** a device has failed max retry attempts
- **When** permanent failure threshold is reached
- **Then**:
  - Device status changes to "PERMANENTLY FAILED"
  - Device removed from auto-retry queue
  - Alert sent: "Device [X] permanently failed - manual intervention required"
  - Device appears in "Failed Devices" section
  - Cannot be retried automatically, manual only
  - Incident ticket auto-generated (if integration available)

#### AC 6.8: Successful Retry
- **Given** a device is being retried
- **When** retry deployment succeeds
- **Then**:
  - Device status changes to "SUCCESS"
  - Retry queue entry cleared
  - Success notification sent to operations
  - Metrics updated: Retry success rate recorded
  - Device appears in completed devices list

#### AC 6.9: Retry Limits
- **Given** retry configuration is set
- **When** evaluating retry logic
- **Then** system enforces:
  - Maximum 5 automatic retries per device
  - Maximum 10 manual retries per device (no auto-limit, operator controlled)
  - Retry cannot exceed total campaign duration
  - Total campaign time = original duration + (failed devices × retry attempts × delay)
  - Warning shown if retry strategy extends campaign > 30 days

#### AC 6.10: Retry Reporting
- **Given** a campaign completes
- **When** user views final report
- **Then** displays:
  - **Deployment Summary**:
    - Devices Targeted: X
    - Devices Succeeded: Y (without retry)
    - Devices Succeeded (with retry): Z
    - Devices Failed: W
  - **Retry Statistics**:
    - Total Retry Attempts: N
    - Successful Retries: M
    - Successful Retry Rate: M/N %
    - Average Attempts per Device: X.X
  - **Failure Categories**: Bar chart of failure reasons
  - **Timeline**: Gantt chart showing stages and retries

---

## Database Schema

### Campaign Table
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  firmware_id UUID NOT NULL REFERENCES firmware(id),
  status VARCHAR(50) NOT NULL, -- DRAFT, SCHEDULED, ACTIVE, PAUSED, COMPLETED, CANCELLED
  target_models TEXT[], -- Array of model IDs
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  total_duration_seconds INT,
  pause_on_error_rate FLOAT,
  max_concurrent_devices INT DEFAULT 100,
  enable_auto_retry BOOLEAN DEFAULT TRUE,
  retry_attempts INT DEFAULT 3,
  retry_delay_seconds INT DEFAULT 3600,
  retry_backoff VARCHAR(20), -- 'exponential' or 'linear'
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255),
  UNIQUE(name)
);

CREATE TABLE campaign_targeting_rules (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  rule_type VARCHAR(50) NOT NULL, -- 'model', 'version', 'location', 'group', 'last_reported', 'tags'
  operator VARCHAR(20), -- '=', '<', '>', '<=', '>=', 'contains', 'in'
  value VARCHAR(255) NOT NULL,
  logical_operator VARCHAR(10), -- 'AND', 'OR'
  order_index INT,
  UNIQUE(campaign_id, order_index)
);

CREATE TABLE campaign_stages (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  stage_number INT NOT NULL,
  stage_name VARCHAR(255) NOT NULL,
  device_percentage FLOAT NOT NULL,
  pause_condition VARCHAR(50), -- 'none', 'error_rate', 'success_rate', 'duration', 'manual'
  pause_threshold FLOAT, -- For error_rate/success_rate
  pause_threshold_unit VARCHAR(20), -- 'percent', 'hours'
  wait_duration_seconds INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL,
  UNIQUE(campaign_id, stage_number)
);

CREATE TABLE campaign_devices (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  stage_id UUID REFERENCES campaign_stages(id),
  status VARCHAR(50) NOT NULL, -- PENDING, SCHEDULED, IN_PROGRESS, SUCCESS, FAILED, PAUSED, RETRYING
  deployment_start_time TIMESTAMP,
  deployment_end_time TIMESTAMP,
  retry_count INT DEFAULT 0,
  last_retry_time TIMESTAMP,
  error_message TEXT,
  error_code VARCHAR(50),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(campaign_id, device_id)
);

CREATE TABLE campaign_deployments (
  id UUID PRIMARY KEY,
  campaign_device_id UUID NOT NULL REFERENCES campaign_devices(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL,
  status VARCHAR(50) NOT NULL, -- IN_PROGRESS, SUCCESS, FAILED
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  error_message TEXT,
  error_code VARCHAR(50),
  duration_seconds INT,
  device_log_url VARCHAR(1024) -- S3 URL to device logs
);

CREATE TABLE campaign_audit (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  event_type VARCHAR(50) NOT NULL, -- CREATED, SCHEDULED, STARTED, PAUSED, RESUMED, COMPLETED, CANCELLED
  actor VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  details JSONB,
  ip_address VARCHAR(50)
);
```

---

## API Endpoints

### Campaign Management

```
POST   /api/v1/campaigns                 -- Create campaign
GET    /api/v1/campaigns                 -- List campaigns (with filters)
GET    /api/v1/campaigns/:id             -- Get campaign details
PATCH  /api/v1/campaigns/:id             -- Update campaign (DRAFT only)
DELETE /api/v1/campaigns/:id             -- Delete campaign (DRAFT only)

PATCH  /api/v1/campaigns/:id/schedule    -- Schedule campaign
POST   /api/v1/campaigns/:id/start       -- Start now (if SCHEDULED)
POST   /api/v1/campaigns/:id/pause       -- Pause campaign
POST   /api/v1/campaigns/:id/resume      -- Resume campaign
POST   /api/v1/campaigns/:id/cancel      -- Cancel campaign

GET    /api/v1/campaigns/:id/devices     -- List target devices with filters
POST   /api/v1/campaigns/:id/devices/exclude -- Exclude device(s)
GET    /api/v1/campaigns/:id/devices/:deviceId/history -- Device deployment history

POST   /api/v1/campaigns/:id/retry       -- Bulk retry failed devices
POST   /api/v1/campaigns/:id/devices/:deviceId/retry -- Retry single device

GET    /api/v1/campaigns/:id/report      -- Generate campaign report
GET    /api/v1/campaigns/:id/audit-logs  -- Campaign audit trail

GET    /api/v1/campaigns/:id/stats       -- Real-time campaign stats
GET    /api/v1/campaigns/:id/stages      -- Get stage details
```

---

## Integration Points

### Device Registry Service
- **Query**: Get devices matching targeting rules
- **Endpoint**: `GET /api/v1/devices/search`
- **Request**: `{ rules: [{ type, operator, value }] }`
- **Response**: `{ count: int, devices: [{ id, model, location, version, ... }] }`

### Notification Service
- **Publish**: OTA update notifications via MQTT
- **Topic**: `devices/{deviceId}/ota/update`
- **Payload**: `{ campaign_id, firmware_id, firmware_version, download_url, signature, ... }`

### Telemetry API
- **Events**:
  - `campaign.created`
  - `campaign.scheduled`
  - `campaign.started`
  - `campaign.paused`
  - `campaign.resumed`
  - `campaign.completed`
  - `campaign.device.started`
  - `campaign.device.succeeded`
  - `campaign.device.failed`
  - `campaign.device.retried`

### Firmware API
- **Query**: Get firmware details for campaign
- **Endpoint**: `GET /api/v1/firmware/{id}`
- **Used for**: Validation, version checking, signature details

### Admin Portal Dashboard
- **Display**: Campaign list, real-time progress, alerts
- **Integration**: WebSocket for live updates

---

## User Interface Components

### Campaign List View
- Filterable table with status, model, progress
- Quick actions: View, Edit, Schedule, Cancel
- Search by name/description
- Date range filter

### Campaign Creation Wizard
- Step 1: Basic info (name, description, firmware)
- Step 2: Target devices (rules)
- Step 3: Rollout stages
- Step 4: Scheduling
- Step 5: Confirmation/Review

### Campaign Detail Dashboard
- Header: Status, timeline, key metrics
- Tabs:
  - Overview: Summary stats, timeline
  - Configuration: Readonly campaign settings
  - Stages: Visual timeline and stage metrics
  - Devices: Filterable device list with status
  - Metrics: Graphs (success rate, device count, timeline)
  - Audit: Event log with timestamps

### Real-time Monitoring
- Live device status updates via WebSocket
- Alerts for threshold breaches
- Auto-pause notifications
- Retry status updates

---

## Testing Requirements

### Unit Tests
- Campaign CRUD operations
- Targeting rule evaluation
- Stage validation logic
- Retry counter logic
- Pause/resume state transitions

### Integration Tests
- Device registry query with complex rules
- Database transaction atomicity
- Notification service publish
- Telemetry event recording

### E2E Tests
- Complete campaign lifecycle (create → schedule → active → complete)
- Stage progression with pause conditions
- Manual and automatic retries
- Device filtering and targeting

### Performance Tests
- Campaign creation with 10k+ target devices
- Stage progression with 1000 concurrent devices
- Retry queue processing
- Bulk device operations

---

## Acceptance Metrics

- ✅ All 6 tasks have detailed AC with 40+ acceptance criteria
- ✅ Database schema defined with relationships
- ✅ API endpoints specified
- ✅ Integration points documented
- ✅ UI/UX components detailed
- ✅ Testing requirements outlined
- ✅ Rollout stages visualization clear
- ✅ Retry logic comprehensive (auto + manual)
- ✅ Pause/resume behavior well-defined
- ✅ Targeting rules flexible and powerful

---

## Definition of Done

- [ ] All AC from Tasks 1-6 implemented
- [ ] Database schema created and migrated
- [ ] All API endpoints functional
- [ ] Campaign UI complete (creation, listing, detail)
- [ ] Targeting rules engine functional
- [ ] Automatic stage progression working
- [ ] Pause/resume operations tested
- [ ] Retry logic (auto + manual) verified
- [ ] Scheduling with timezone support functional
- [ ] Real-time metrics displayed
- [ ] Audit logging complete
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] API documentation updated
- [ ] UI design reviewed and approved
- [ ] Performance tested (1000+ concurrent devices)
- [ ] Security review completed
- [ ] DevOps/deployment plan finalized

---

## Related User Stories (Backlog)

- **Campaign Rollback** - Ability to rollback active campaign to previous firmware version
- **Advanced Targeting** - A/B testing groups, canary deployments, percentage-based rollout
- **Device Health Dashboard** - Monitor device health metrics during campaigns
- **Campaign Templates** - Save campaign configurations as reusable templates
- **Multi-region Campaigns** - Coordinate campaigns across multiple regions
- **Automated Rollout Rules** - Define rules for automatic stage progression
- **Campaign Analytics** - Detailed analysis and reporting
- **Webhook Integration** - Send webhook notifications for campaign events
