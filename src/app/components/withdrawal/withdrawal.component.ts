// src/app/components/recharge/recharge.component.ts

import { Component, OnInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { SupabaseService, UserWallet, BankDetails, UserProfile } from '../../supabase.service';
import { environment } from '../../../environments/environment.development';

@Component({
  selector: 'app-withdrawal',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './withdrawal.component.html',
  styleUrls: ['./withdrawal.component.css']
})
export class WithdrawalComponent implements OnInit {
  withdrawalAmount: number = 0;
  tradePassword: string = '';
  selectedBankCardId: string | null = null;

  // Now represents the 'order_income' available for withdrawal
  availableBalance: number = 0;
  minimumWithdrawal: number = 300;
  userId: string | null = null;
  bankCards: BankDetails[] = [];
  userProfile: UserProfile | null = null;

  isLoading: boolean = false;
  withdrawalMessage: { type: 'success' | 'error' | 'info'; text: string } | null = null;

  withdrawalRules = [
    'Minimum withdrawal amount is ₹300. All withdrawals are processed within 24-48 hours.',
    'Withdrawals are only allowed between 5:00 PM and 11:00 PM.',
    'You need to invest first before you can withdraw.',
    'Trade password is required for security verification. Ensure you enter the correct password.',
    'Processing fees will apply 12% on your tier and withdrawal amount.'
  ];

  private flaskApiBaseUrl = environment.backendApiUrl;

  constructor(
    private router: Router,
    private http: HttpClient,
    private supabaseService: SupabaseService,
    private ngZone: NgZone
  ) { }

  async ngOnInit() {
    this.isLoading = true;
    this.withdrawalMessage = { type: 'info', text: 'Loading withdrawal information...' };
    try {
      const user = await this.supabaseService.getUser();
      if (user) {
        this.userId = user.id;

        // --- UPDATED: Fetch the UserWallet and use 'order_income' for availableBalance ---
        const userWallet: UserWallet | null = await this.supabaseService.getUserWallet(user.id);
        if (userWallet) {
          this.availableBalance = userWallet.order_income;
        } else {
          console.warn('User wallet not found or failed to retrieve.');
          this.withdrawalMessage = { type: 'error', text: 'Failed to load wallet balance.' };
          this.isLoading = false;
          return;
        }

        this.userProfile = await this.supabaseService.getUserProfile(user.id);
        if (!this.userProfile || !this.userProfile.trade_password_hash) {
            this.withdrawalMessage = { type: 'info', text: 'Please set your trade password first.' };
            this.isLoading = false;
            return;
        }

        const userBankCards: BankDetails[] | null = await this.supabaseService.getUserBankCards(user.id);
        if (userBankCards && userBankCards.length > 0) {
          this.bankCards = userBankCards;
          this.selectedBankCardId = userBankCards.find(card => card.is_verified)?.id || userBankCards[0].id;
          this.withdrawalMessage = null;
        } else {
          this.withdrawalMessage = { type: 'info', text: 'No bank cards found. Please add one to withdraw.' };
          setTimeout(() => {
            this.ngZone.run(() => {
              this.router.navigate(['/add-bank-card']);
            });
          }, 2000);
        }

      } else {
        this.withdrawalMessage = { type: 'error', text: 'User not logged in. Redirecting to login.' };
        setTimeout(() => this.router.navigate(['/login']), 2000);
      }
    } catch (error) {
      console.error('Error in ngOnInit for WithdrawalComponent:', error);
      this.withdrawalMessage = { type: 'error', text: 'Failed to load data. Please try again.' };
    } finally {
      this.isLoading = false;
    }
  }

  isTradePasswordSet(): boolean {
      return !!this.userProfile && !!this.userProfile.trade_password_hash;
  }

  async applyWithdrawal() {
  this.withdrawalMessage = null;
  this.isLoading = true;
  this.withdrawalMessage = { type: 'info', text: 'Processing withdrawal request...' };

  // --- Time Restriction Check ---
  const now = new Date();
  const currentHour = now.getHours();
  if (currentHour < 17 || currentHour >= 23) {
    this.withdrawalMessage = {
      type: 'error',
      text: 'Withdrawals are only allowed between 5:00 PM and 11:00 PM.',
    };
    this.isLoading = false;
    return;
  }

  if (!this.userId) {
    this.withdrawalMessage = { type: 'error', text: 'User not logged in.' };
    this.isLoading = false;
    return;
  }

  if (!this.isTradePasswordSet()) {
    this.withdrawalMessage = { type: 'error', text: 'Please set your trade password before withdrawing.' };
    this.isLoading = false;
    return;
  }

  if (this.withdrawalAmount <= 0) {
    this.withdrawalMessage = { type: 'error', text: 'Please enter a valid withdrawal amount.' };
    this.isLoading = false;
    return;
  }

  if (this.withdrawalAmount < this.minimumWithdrawal) {
    this.withdrawalMessage = { type: 'error', text: `Withdrawal amount must be at least ₹${this.minimumWithdrawal}.` };
    this.isLoading = false;
    return;
  }

  if (this.withdrawalAmount > this.availableBalance) {
    this.withdrawalMessage = { type: 'error', text: 'Insufficient available income for withdrawal.' };
    this.isLoading = false;
    return;
  }

  if (!this.tradePassword) {
    this.withdrawalMessage = { type: 'error', text: 'Trade password is required.' };
    this.isLoading = false;
    return;
  }

  if (!this.selectedBankCardId) {
    this.withdrawalMessage = { type: 'error', text: 'Please select a bank card.' };
    this.isLoading = false;
    return;
  }

  const selectedCard = this.bankCards.find(card => card.id === this.selectedBankCardId);
  if (!selectedCard) {
    this.withdrawalMessage = { type: 'error', text: 'Selected bank card not found. Please re-select.' };
    this.isLoading = false;
    return;
  }

  try {
    const passwordVerifyResponse = await this.http.post<{ success: boolean; message?: string }>(
      `${this.flaskApiBaseUrl}/user/verify-trade-password`,
      { userId: this.userId, password: this.tradePassword }
    ).toPromise();

    if (!passwordVerifyResponse || !passwordVerifyResponse.success) {
      this.withdrawalMessage = { type: 'error', text: passwordVerifyResponse?.message || 'Invalid trade password.' };
      this.isLoading = false;
      return;
    }

    const withdrawalRequestPayload = {
      userId: this.userId,
      amount: this.withdrawalAmount,
      bankCardId: this.selectedBankCardId,
      bankDetails: selectedCard,
    };

    const response = await this.http.post<{ success: boolean; message: string; new_order_income?: number }>(
      `${this.flaskApiBaseUrl}/withdrawal/request`,
      withdrawalRequestPayload
    ).toPromise();

    if (response && response.success) {
      this.availableBalance = response.new_order_income || 0;
      this.withdrawalMessage = {
        type: 'success',
        text: response.message || `Withdrawal of ₹${this.withdrawalAmount} requested successfully!`
      };

      this.withdrawalAmount = 0;
      this.tradePassword = '';
      this.selectedBankCardId = null;

      setTimeout(() => {
        this.ngZone.run(() => {
          this.withdrawalMessage = null;
        });
      }, 5000);

    } else {
      this.withdrawalMessage = { type: 'error', text: response?.message || 'Withdrawal request failed. Please try again.' };
    }

  } catch (error) {
    console.error('Error applying withdrawal:', error);
    this.withdrawalMessage = { type: 'error', text: 'An unexpected error occurred during withdrawal.' };
  } finally {
    this.isLoading = false;
  }
}

  goBack() {
    this.router.navigate(['/home']);
  }

  navigateToAddBankCard() {
    this.router.navigate(['/add-bank-card']);
  }

  navigateToSetTradePassword() {
    this.router.navigate(['/set-trade-password']);
  }

  navigateToWithdrawalRecords() {
    this.router.navigate(['/withdrawal-record']);
  }
}