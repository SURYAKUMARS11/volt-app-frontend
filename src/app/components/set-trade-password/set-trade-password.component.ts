import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router'; // Import Router for navigation
import { SupabaseService } from '../../supabase.service'; // Adjust path as needed
import { environment } from '../../../environments/environment.development';

@Component({
  selector: 'app-set-trade-password',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './set-trade-password.component.html',
  styleUrls: ['./set-trade-password.component.css']
})
export class SetTradePasswordComponent implements OnInit {
  newTradePassword: string = '';
  confirmTradePassword: string = '';
  userId: string | null = null;
  isLoading: boolean = false;
  message: { type: 'success' | 'error' | 'info'; text: string } | null = null;

  private flaskApiBaseUrl = environment.backendApiUrl; // Your Flask backend URL

  constructor(
    private http: HttpClient,
    private supabaseService: SupabaseService,
    private router: Router, // Inject Router
    private ngZone: NgZone // Inject NgZone for safe navigation
  ) {}

  async ngOnInit() {
    this.isLoading = true;
    this.message = { type: 'info', text: 'Loading user information...' };
    try {
      const user = await this.supabaseService.getUser();
      if (user) {
        this.userId = user.id;
        this.message = null; // Clear initial message
      } else {
        this.message = { type: 'error', text: 'User not logged in. Redirecting to login.' };
        setTimeout(() => {
          this.ngZone.run(() => {
            this.router.navigate(['/login']);
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Error in ngOnInit for SetTradePasswordComponent:', error);
      this.message = { type: 'error', text: 'Failed to load user data. Please try again.' };
    } finally {
      this.isLoading = false;
    }
  }

  async setTradePassword() {
    this.message = null; // Clear previous messages
    this.isLoading = true;

    if (!this.userId) {
      this.message = { type: 'error', text: 'User not identified. Please log in.' };
      this.isLoading = false;
      return;
    }

    if (!this.newTradePassword || !this.confirmTradePassword) {
      this.message = { type: 'error', text: 'Please fill in both password fields.' };
      this.isLoading = false;
      return;
    }

    if (this.newTradePassword !== this.confirmTradePassword) {
      this.message = { type: 'error', text: 'New trade password and confirmation do not match.' };
      this.isLoading = false;
      return;
    }

    // Basic client-side password strength validation (adjust as needed)
    if (this.newTradePassword.length < 6) {
      this.message = { type: 'error', text: 'Trade password must be at least 6 characters long.' };
      this.isLoading = false;
      return;
    }

    try {
      const response = await this.http.post<{ success: boolean; message?: string }>(
        `${this.flaskApiBaseUrl}/user/set-trade-password`,
        {
          user_id: this.userId,
          new_trade_password: this.newTradePassword
        }
      ).toPromise();

      if (response && response.success) {
        this.message = { type: 'success', text: response.message || 'Trade password set successfully!' };
        // Clear form fields
        this.newTradePassword = '';
        this.confirmTradePassword = '';
        // Optionally navigate away after success
        setTimeout(() => {
          this.ngZone.run(() => {
            this.router.navigate(['/withdrawal']); // Navigate back to withdrawal or home
          });
        }, 2000);
      } else {
        this.message = { type: 'error', text: response?.message || 'Failed to set trade password.' };
      }
    } catch (error) {
      console.error('Error setting trade password:', error);
      this.message = { type: 'error', text: 'An unexpected error occurred. Please try again.' };
    } finally {
      this.isLoading = false;
    }
  }

  goBack() {
    this.router.navigate(['/withdrawal']); // Go back to withdrawal page
  }
}