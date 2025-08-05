// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes'; // Import routes from your routes file

import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http'; // <--- ADD THIS IMPORT
import { SupabaseService } from './supabase.service'; // <--- ADD THIS IMPORT (adjust path if needed)


export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(), // <--- ADD THIS LINE
    SupabaseService      // <--- ADD THIS LINE (even with providedIn: 'root', it's good to be explicit here)
  ]
};