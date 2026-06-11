import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { AdminShellComponent } from './admin-shell.component';

describe('AdminShellComponent', () => {
  const authService = {
    currentUser$: of({ displayName: 'Admin User', email: 'admin@example.com' }),
    logout: jest.fn(),
  };
  const breakpointObserver = {
    observe: jest.fn(() => of({ matches: false, breakpoints: {} } satisfies BreakpointState)),
    isMatched: jest.fn(() => false),
  };

  beforeEach(async () => {
    authService.logout.mockReset();
    breakpointObserver.observe.mockClear();
    breakpointObserver.isMatched.mockClear();

    await TestBed.configureTestingModule({
      imports: [AdminShellComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: BreakpointObserver, useValue: breakpointObserver },
      ],
    }).compileComponents();
  });

  it('should create the responsive shell', () => {
    const fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Device Management Admin');
  });

  it('should delegate logout to AuthService', () => {
    const fixture = TestBed.createComponent(AdminShellComponent);

    fixture.componentInstance.logout();

    expect(authService.logout).toHaveBeenCalled();
  });
});
