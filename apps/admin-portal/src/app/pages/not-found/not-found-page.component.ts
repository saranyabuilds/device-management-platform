import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialModule } from '../../shared/material/material.module';

@Component({
  imports: [MaterialModule, RouterLink],
  selector: 'app-not-found-page',
  template: `
    <main class="not-found">
      <section class="surface-panel stack-md">
        <h1>Page not found</h1>
        <p>The page you requested does not exist.</p>
        <a mat-flat-button color="primary" routerLink="/dashboard">Return to dashboard</a>
      </section>
    </main>
  `,
  styles: [
    `
      .not-found {
        display: grid;
        min-height: 100vh;
        place-items: center;
        padding: 24px;
      }

      h1,
      p {
        margin: 0;
      }
    `,
  ],
})
export class NotFoundPageComponent {}
