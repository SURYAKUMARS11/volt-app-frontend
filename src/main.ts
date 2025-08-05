import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter} from '@angular/router'; // ✅ Add this
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { routes } from './app/app.routes';
import { ScrollTopService } from './app/scroll-top.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="app-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app-container {
      font-family: 'Eina04-Bold.ttf', sans-serif;
      margin: 0;
      padding: 0;
    }
    * {
      box-sizing: border-box;
    }
  `]
})
export class App {}

bootstrapApplication(App, {
  providers: [
    provideRouter(routes),
    ScrollTopService
  ]
});
