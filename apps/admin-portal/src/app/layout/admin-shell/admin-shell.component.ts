import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenav } from '@angular/material/sidenav';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map, shareReplay } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { MaterialModule } from '../../shared/material/material.module';
import { ADMIN_NAV_ITEMS } from '../navigation/nav.config';

@Component({
  imports: [AsyncPipe, MaterialModule, RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-admin-shell',
  styleUrl: './admin-shell.component.scss',
  templateUrl: './admin-shell.component.html',
})
export class AdminShellComponent {
  private readonly authService = inject(AuthService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly navItems = ADMIN_NAV_ITEMS;
  readonly currentUser$ = this.authService.currentUser$;
  readonly isHandset$ = this.breakpointObserver
    .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
    .pipe(
      map((state) => state.matches),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  logout(): void {
    this.authService.logout();
  }

  hasPermission(permission?: string): boolean {
    return !permission || this.authService.hasPermission(permission);
  }

  closeNavigation(drawer: MatSidenav): void {
    if (this.breakpointObserver.isMatched([Breakpoints.Handset, Breakpoints.TabletPortrait])) {
      void drawer.close();
    }
  }
}
