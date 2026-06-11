import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should build typed GET requests from the environment base URL', () => {
    service.get<{ id: string }>('/devices', { page: 1, active: true }).subscribe((response) => {
      expect(response).toEqual({ id: 'device-1' });
    });

    const request = httpTesting.expectOne(
      'http://localhost:8080/api/v1/devices?page=1&active=true',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ id: 'device-1' });
  });

  it('should build typed POST requests', () => {
    service
      .post<{ serialNumber: string }, { id: string }>('devices', { serialNumber: 'SN-001' })
      .subscribe((response) => {
        expect(response.id).toBe('device-1');
      });

    const request = httpTesting.expectOne('http://localhost:8080/api/v1/devices');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ serialNumber: 'SN-001' });
    request.flush({ id: 'device-1' });
  });
});
