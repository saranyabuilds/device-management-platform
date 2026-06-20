import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ApiService } from '../../core/http/api.service';
import { NotificationService } from '../../core/notifications/notification.service';
import { DeviceProfilePageComponent } from './device-profile-page.component';

describe('DeviceProfilePageComponent', () => {
  const api = {
    get: jest.fn(),
  };
  const notifications = {
    showError: jest.fn(),
  };

  beforeEach(async () => {
    api.get.mockReset();
    notifications.showError.mockReset();

    await TestBed.configureTestingModule({
      imports: [DeviceProfilePageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ serialNumber: 'SN-PROFILE-001' }),
            },
          },
        },
        { provide: ApiService, useValue: api },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();
  });

  it('should load and render device profile details', () => {
    api.get.mockReturnValue(of(profileResponse()));

    const fixture = createComponent();
    fixture.detectChanges();

    expect(api.get).toHaveBeenCalledWith('/devices/SN-PROFILE-001/profile');
    expect(text(fixture)).toContain('SN-PROFILE-001');
    expect(text(fixture)).toContain('Gateway-1000');
    expect(text(fixture)).toContain('Firmware Compliance');
    expect(text(fixture)).toContain('DEVICE_REGISTERED');
    expect(text(fixture)).toContain('4.0.0');
  });

  it('should show loading state while the profile request is pending', () => {
    api.get.mockReturnValue(new Subject().asObservable());

    const fixture = createComponent();
    fixture.detectChanges();

    expect(text(fixture)).toContain('Loading profile');
  });

  it('should show error state when profile loading fails', () => {
    api.get.mockReturnValue(throwError(() => new Error('failed')));

    const fixture = createComponent();
    fixture.detectChanges();

    expect(text(fixture)).toContain('Unable to load device profile.');
    expect(notifications.showError).toHaveBeenCalledWith('Unable to load device profile.');
  });

  function createComponent(): ComponentFixture<DeviceProfilePageComponent> {
    return TestBed.createComponent(DeviceProfilePageComponent);
  }

  function text(fixture: ComponentFixture<DeviceProfilePageComponent>): string {
    return fixture.nativeElement.textContent.replace(/\s+/g, ' ').trim();
  }

  function profileResponse() {
    return {
      device: {
        id: 'device-1',
        serialNumber: 'SN-PROFILE-001',
        deviceModel: 'Gateway-1000',
        firmwareVersion: '4.0.0',
        customerId: 'customer-001',
        status: 'ACTIVE',
        registrationStatus: 'REGISTERED',
        onboardingStatus: 'PENDING_ACTIVATION',
        certificateStatus: 'ISSUED',
        connectivityStatus: 'ONLINE',
        createdAt: '2026-06-19T12:00:00',
        updatedAt: '2026-06-19T12:00:00',
      },
      lastSeenAt: '2026-06-19T12:05:00',
      healthIndicators: [
        { name: 'Connectivity', state: 'HEALTHY', summary: 'Last heartbeat received' },
        { name: 'Firmware Compliance', state: 'HEALTHY', summary: 'Firmware version is reported' },
      ],
      firmwareHistory: [
        {
          firmwareVersion: '4.0.0',
          updatedAt: '2026-06-19T12:00:00',
          updateSource: 'REGISTRATION',
          status: 'SUCCESS',
          failureReason: null,
        },
      ],
      eventTimeline: [
        {
          timestamp: '2026-06-19T12:05:00',
          eventType: 'HEARTBEAT',
          severity: 'INFO',
          source: 'device-api',
          message: 'Device heartbeat observed',
          correlationId: null,
          traceId: null,
        },
        {
          timestamp: '2026-06-19T12:00:00',
          eventType: 'DEVICE_REGISTERED',
          severity: 'INFO',
          source: 'device-api',
          message: 'Device registered for customer customer-001',
          correlationId: null,
          traceId: null,
        },
      ],
    };
  }
});
