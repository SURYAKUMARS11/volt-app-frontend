import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'] // ✅ fixed typo: styleUrl → styleUrls
})
export class AppComponent implements OnInit {
  title = 'volt-pro';

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // ✅ Only run in browser, not during server-side rendering
    if (isPlatformBrowser(this.platformId)) {
      this.router.events
        .pipe(filter(e => e instanceof NavigationEnd))
        .subscribe(() => {
          // small timeout ensures the view has rendered before scrolling
          setTimeout(() => window.scrollTo(0, 0), 0);

          // If your app uses a scrollable container instead of window:
          // const main = document.querySelector('#mainContent') as HTMLElement;
          // if (main) main.scrollTop = 0;
        });
    }
  }
}
