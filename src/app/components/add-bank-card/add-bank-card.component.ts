import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { SupabaseService } from '../../supabase.service'; // Adjust path as needed
import { environment } from '../../../environments/environment.development';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

// Define an interface for bank details for better type safety
export interface BankDetails {
  id?: string; // Supabase ID for the bank card
  user_id: string;
  account_number: string;
  bank_name: string;
  ifsc_code: string;
  account_holder_name: string;
  is_verified?: boolean; // Optional, if you plan to verify bank accounts
  created_at?: string;
}

@Component({
  selector: 'app-add-bank-card',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, LoadingSpinnerComponent],
  templateUrl: './add-bank-card.component.html',
  styleUrls: ['./add-bank-card.component.css']
})
export class AddBankCardComponent implements OnInit {
  bankDetails: BankDetails = {
    user_id: '',
    account_number: '',
    bank_name: '',
    ifsc_code: '',
    account_holder_name: ''
  };

  isLoading: boolean = false;
  addCardMessage: { type: 'success' | 'error' | 'info'; text: string } | null = null;

 private flaskApiBaseUrl = environment.backendApiUrl; // Your Flask backend URL

  constructor(
    private router: Router,
    private http: HttpClient,
    private supabaseService: SupabaseService
  ) { }

  async ngOnInit() {
    this.isLoading = true;
    this.addCardMessage = { type: 'info', text: 'Loading user information...' };
    try {
      const user = await this.supabaseService.getUser();
      if (user) {
        this.bankDetails.user_id = user.id;
        this.addCardMessage = null;
      } else {
        this.addCardMessage = { type: 'error', text: 'User not logged in. Redirecting to login.' };
        setTimeout(() => this.router.navigate(['/login']), 2000);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      this.addCardMessage = { type: 'error', text: 'Failed to load user information.' };
    } finally {
      this.isLoading = false;
    }
  }

  async saveBankCard() {
    this.addCardMessage = null; // Clear previous messages
    this.isLoading = true;
    this.addCardMessage = { type: 'info', text: 'Saving bank details...' };

    if (!this.bankDetails.user_id) {
      this.addCardMessage = { type: 'error', text: 'User ID is missing. Please log in again.' };
      this.isLoading = false;
      return;
    }

    if (!this.validateBankDetails()) {
      this.isLoading = false;
      return;
    }

    try {
      // Call your Flask backend to save bank details to Supabase
      const response = await this.http.post<{ success: boolean; message: string; bank_card_id?: string }>(
        `${this.flaskApiBaseUrl}/user/add-bank-card`,
        this.bankDetails
      ).toPromise();

      if (response && response.success) {
        this.addCardMessage = { type: 'success', text: response.message || 'Bank card added successfully!' };
        // Optionally, clear the form or navigate back after success
        this.bankDetails = { // Clear form
          user_id: this.bankDetails.user_id, // Keep user_id
          account_number: '', bank_name: '', ifsc_code: '', account_holder_name: ''
        };
        setTimeout(() => {
          this.addCardMessage = null; // Clear success message
          this.router.navigate(['/withdrawal']); // Go back to withdrawal page
        }, 2000);
      } else {
        this.addCardMessage = { type: 'error', text: response?.message || 'Failed to save bank card.' };
      }
    } catch (error) {
      console.error('Error saving bank card:', error);
      this.addCardMessage = { type: 'error', text: 'An unexpected error occurred while saving bank card.' };
    } finally {
      this.isLoading = false;
    }
  }

  validateBankDetails(): boolean {
    if (!this.bankDetails.account_number || !this.bankDetails.bank_name || !this.bankDetails.ifsc_code || !this.bankDetails.account_holder_name) {
      this.addCardMessage = { type: 'error', text: 'All fields are required.' };
      return false;
    }
    // Basic format validation (you might want more robust regex)
    if (this.bankDetails.ifsc_code.length !== 11 || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(this.bankDetails.ifsc_code)) {
      this.addCardMessage = { type: 'error', text: 'Invalid IFSC Code format.' };
      return false;
    }
    // You can add more specific validations for account number, etc.
    return true;
  }

  goBack() {
    this.router.navigate(['/withdrawal']); // Or wherever appropriate
  }
}