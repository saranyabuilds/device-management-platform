import { Component, inject } from '@angular/core';
import { MaterialModule } from '../../shared/material/material.module';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  imports: [MaterialModule],
  selector: 'app-login-page',
  styleUrl: './login-page.component.scss',
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);

  login(): void {
    this.authService.login();
  }
}
