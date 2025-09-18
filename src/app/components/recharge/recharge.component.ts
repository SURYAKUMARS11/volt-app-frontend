// src/app/components/recharge/recharge.component.ts

import { Component, OnInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

// UserWallet interface is now updated in supabase.service.ts
import { SupabaseService, UserWallet, transaction_type, transaction_status } from '../../supabase.service';
import { environment } from '../../../environments/environment.development';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

declare var Razorpay: any;

@Component({
  selector: 'app-recharge',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, LoadingSpinnerComponent],
  templateUrl: './recharge.component.html',
  styleUrls: ['./recharge.component.css']
})
export class RechargeComponent implements OnInit {
  selectedAmount: number = 0;
  customAmount: string = '';
  selectedChannel: string = '';
  // This will now exclusively display the recharged_amount
  currentBalance: number = 0;
  userId: string | null = null;

  isLoading: boolean = false;
  rechargeMessage: { type: 'success' | 'error' | 'info'; text: string } | null = null;

  quickAmounts = [500, 1000, 1500, 2000, 3000, 4000, 6000, 8000];
  paymentChannels = [
    { id: 'channelA', name: 'UPI Gateway', icon: 'fas fa-money-check-alt' },
  ];
  rechargeRules = [
    'Deposit Timings: 8:00 AM to 8:00 PM.',
    'Recharge amount must be ₹500 or more.',
    'Payment channels: Razorpay UPI Gateway.',
    'All transactions are processed within 20 minutes.',
    'For any issues, contact customer support within 24 hours.'
  ];

  private flaskApiBaseUrl = environment.backendApiUrl;

  constructor(
    private router: Router,
    private http: HttpClient,
    private supabaseService: SupabaseService,
    private ngZone: NgZone // Inject NgZone here
  ) { }

  async ngOnInit() {
    this.isLoading = true;
    this.rechargeMessage = { type: 'info', text: 'Loading wallet...' };
    try {
      const user = await this.supabaseService.getUser();
      if (user) {
        this.userId = user.id;
        const userWallet: UserWallet | null = await this.supabaseService.getUserWallet(user.id);
        if (userWallet) {
          // Use recharged_amount for display balance
          this.currentBalance = userWallet.recharged_amount;
          this.rechargeMessage = null;
        } else {
          console.warn('User wallet not found. Attempting to create one.');
          const newWallet = await this.supabaseService.createWalletForUser(user.id);
          if (newWallet) {
            // Use recharged_amount for display balance
            this.currentBalance = newWallet.recharged_amount;
            this.rechargeMessage = null;
          } else {
            this.rechargeMessage = { type: 'error', text: 'Failed to load or create wallet.' };
          }
        }
      } else {
        console.log('No user logged in. Redirecting to login.');
        this.router.navigate(['/login']);
        this.rechargeMessage = { type: 'error', text: 'User not logged in.' };
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      this.rechargeMessage = { type: 'error', text: 'Failed to load balance. Please try again.' };
    } finally {
      this.isLoading = false;
    }
    this.loadRazorpayScript();
  }

  loadRazorpayScript() {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => console.log('Razorpay script loaded.');
    script.onerror = (error) => console.error('Error loading Razorpay script:', error);
    document.head.appendChild(script);
  }

  selectAmount(amount: number) {
    this.selectedAmount = amount;
    this.customAmount = '';
    this.rechargeMessage = null;
  }

  onCustomAmountChange() {
    if (this.customAmount) {
      const amount = parseInt(this.customAmount);
      if (!isNaN(amount) && amount >= 500) {
        this.selectedAmount = amount;
        this.rechargeMessage = null;
      } else if (amount < 500 && amount > 0) {
        this.rechargeMessage = { type: 'info', text: 'Minimum recharge amount is ₹500.' };
        this.selectedAmount = 0;
      } else {
        this.selectedAmount = 0;
      }
    } else {
      this.selectedAmount = 0;
    }
  }

  selectPaymentChannel(channel: string) {
    this.selectedChannel = channel;
    this.rechargeMessage = null;
  }

  async proceedToPayment() {
    this.rechargeMessage = null;
    this.isLoading = false; // Ensure it's false before validation starts

    if (!this.userId) {
      this.rechargeMessage = { type: 'error', text: 'User not logged in. Please log in again.' };
      this.router.navigate(['/login']);
      return;
    }

    if (this.selectedAmount < 500) {
      this.rechargeMessage = { type: 'error', text: 'Please select a valid amount (minimum ₹500).' };
      return;
    }
    if (!this.selectedChannel) {
      this.rechargeMessage = { type: 'error', text: 'Please select a payment channel.' };
      return;
    }

    this.isLoading = true;
    this.rechargeMessage = { type: 'info', text: 'Initiating payment...' };

    try {
      // 1. Call backend to create Razorpay Order
      const orderResponse = await this.http.post<{ order_id: string; currency: string; amount: number; key_id: string }>(
        `${this.flaskApiBaseUrl}/recharge/create-razorpay-order`,
        { amount: this.selectedAmount , currency: 'INR', userId: this.userId }
      ).toPromise();

      if (!orderResponse || !orderResponse.order_id) {
        throw new Error('Failed to create Razorpay order.');
      }

      const userPhone = await this.supabaseService.getUserPhone();
      const cleanedPhone = userPhone ? userPhone.replace(/\D/g, '') : '';

      // 2. Open Razorpay Checkout
      const options = {
        key: orderResponse.key_id,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: 'Volt Earning',
        description: `Recharge for Wallet (User: ${this.userId})`,
        order_id: orderResponse.order_id,
        prefill: {
          name: (await this.supabaseService.getUserName()) || '',
          email: (await this.supabaseService.getUserEmail()) || '',
          contact: cleanedPhone
        },
        handler: async (response: any) => {
          console.log('Razorpay success response:', response);
          // Use ngZone.run() to ensure Angular detects changes
          this.ngZone.run(async () => {
            this.isLoading = true; // Keep spinner on while verifying
            this.rechargeMessage = { type: 'info', text: 'Verifying payment...' };

            try {
              // 3. Call backend to verify payment and update wallet
              // IMPORTANT: Expect `new_recharged_amount` from backend instead of `new_balance`
              const verifyResponse = await this.http.post<{ success: boolean; message: string; new_recharged_amount?: number }>(
                `${this.flaskApiBaseUrl}/recharge/verify-razorpay-payment`,
                {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  amount: this.selectedAmount,
                  userId: this.userId
                }
              ).toPromise();

              if (verifyResponse && verifyResponse.success) {
                // Update currentBalance with the new recharged_amount from backend
                this.currentBalance = verifyResponse.new_recharged_amount || this.currentBalance;
                this.rechargeMessage = { type: 'success', text: verifyResponse.message || `Recharge of ₹${this.selectedAmount} successful!` };
                console.log('Frontend: Payment successful message set.');
                setTimeout(() => {
                  this.router.navigate(['/home']); // <--- Add this line to navigate
                }, 2000);

                setTimeout(() => {
                  this.ngZone.run(() => {
                    this.rechargeMessage = null;
                    this.selectedAmount = 0;
                    this.customAmount = '';
                    this.selectedChannel = '';
                  });
                }, 3000);

              } else {
                this.rechargeMessage = { type: 'error', text: verifyResponse?.message || 'Payment verification failed. Please contact support.' };
                console.error('Frontend: Payment verification failed:', verifyResponse);
              }
            } catch (verifyError) {
              console.error('Error verifying payment:', verifyError);
              this.rechargeMessage = { type: 'error', text: 'Payment verification failed due to an unexpected error. Please contact support.' };
            } finally {
              this.isLoading = false;
              console.log('Frontend: isLoading set to false after verification (inside handler).');
            }
          });
        },
        'modal.ondismiss': () => {
          this.ngZone.run(() => {
            console.log('Razorpay modal dismissed by user.');
            if (this.isLoading) {
              this.isLoading = false;
              this.rechargeMessage = { type: 'info', text: 'Payment initiation cancelled by user.' };
              setTimeout(() => this.ngZone.run(() => this.rechargeMessage = null), 3000);
            }
          });
        },
        theme: {
          color: '#673ab7'
        }
      };
      console.log("Razorpay options being passed:", options);
      const rzp = new Razorpay(options);

      rzp.on('payment.failed', (response: any) => {
        this.ngZone.run(() => {
          console.error('Razorpay payment failed:', response);
          this.rechargeMessage = { type: 'error', text: response.error.description || 'Payment failed. Please try again.' };
          this.isLoading = false;
          console.log('Frontend: isLoading set to false after payment.failed.');
        });
      });

      rzp.open();

    } catch (error) {
      console.error('Error creating Razorpay order or during payment:', error);
      this.rechargeMessage = { type: 'error', text: error instanceof Error ? error.message : 'Failed to initiate payment. Please try again.' };
      this.isLoading = false;
      console.log('Frontend: isLoading set to false after initial error.');
    }
  }

  goPayment() {
    // Get the current hour (0-23)
    const now = new Date();
    const currentHour = now.getHours();

    // Define the allowed time window (8 AM to 8 PM)
    const startHour = 8;
    const endHour = 20; // 20:00 in 24-hour format is 8 PM

    // Check if the current time is within the allowed range
    if (currentHour >= startHour && currentHour < endHour) {
        // If the time is valid, proceed with the amount check
        if (this.selectedAmount && this.selectedAmount >= 500) {
            this.router.navigate(['/payment'], { queryParams: { amount: this.selectedAmount } });
        } else {
            // Handle validation error for amount
            this.rechargeMessage = { type: 'error', text: 'Please select a valid amount (minimum ₹500).' };
        }
    } else {
        // If the time is outside the allowed range, show an error message
        this.rechargeMessage = { type: 'error', text: 'Deposit timing is from 8:00 AM to 8:00 PM.' };
    }
}

  goBack() {
    this.router.navigate(['/home']);
  }

  navigateToHome(): void { this.router.navigate(['/home']); }
  navigateToInvest(): void { this.router.navigate(['/invest']); }
  navigateToTeam(): void { this.router.navigate(['/team']); }
  navigateToSettings(): void { this.router.navigate(['/settings']); }
  openCustomerService(): void { window.open('https://t.me/Volt_support_care', '_blank'); }
}