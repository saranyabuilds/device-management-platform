import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';
import { apiErrorInterceptor } from './error.interceptor';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../notifications/notification.service';

describe('apiErrorInterceptor', () => {
  const authService = {
    logout: jest.fn(),
  };
  const notifications = {
    showError: jest.fn(),
  };

  let apiService: ApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    authService.logout.mockReset();
    notifications.showError.mockReset();

    TestBed.configureTestingModule({
      providers: [
        ApiService,
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: NotificationService, useValue: notifications },
      ],
    });

    apiService = TestBed.inject(ApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should notify and rethrow server errors', (done) => {
    apiService.get('devices').subscribe({
      error: (error: unknown) => {
        expect(error).toBeTruthy();
        expect(notifications.showError).toHaveBeenCalledWith(
          'The server encountered an error. Please try again later.',
        );
        done();
      },
    });

    httpTesting
      .expectOne('http://localhost:8080/api/v1/devices')
      .flush({ message: 'failed' }, { status: 500, statusText: 'Server Error' });
  });

  it('should logout on unauthorized errors', (done) => {
    apiService.get('devices').subscribe({
      error: () => {
        expect(notifications.showError).toHaveBeenCalledWith(
          'Your session has expired. Please sign in again.',
        );
        expect(authService.logout).toHaveBeenCalled();
        done();
      },
    });

    httpTesting
      .expectOne('http://localhost:8080/api/v1/devices')
      .flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });
  });
});
