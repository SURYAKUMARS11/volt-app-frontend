// src/app/home/home.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, interval, lastValueFrom } from 'rxjs';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';

// Import the updated UserWallet type
import type { UserProfile, UserWallet } from '../../supabase.service';

import {
  SupabaseService,
} from '../../supabase.service';
import { environment } from '../../../environments/environment.development';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule,HttpClientModule,LoadingSpinnerComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  userName: string = '';
  userPhone: string = '';

  // Display properties for the UI
  rechargedBalance: number = 0; // This will show 'Your Balance'
  totalEarnedIncome: number = 0; // This will show 'Your Income'

  // Internal properties to hold granular data from the wallet
  private _orderIncome: number = 0;
  private _inviteCommission: number = 0;

  notifications = [
    { name: 'Rajesh', amount: 2500, action: 'Withdrawn', image: 'https://images.pexels.com/photos/3483098/pexels-photo-3483098.jpeg?auto=compress&cs=tinysrgb&w=100' },
    { name: 'Priya', amount: 1500, action: 'Withdrawn', image: 'https://images.pexels.com/photos/3760067/pexels-photo-3760067.jpeg?auto=compress&cs=tinysrgb&w=100' },
    { name: 'Varun', amount: 3000, action: 'Withdrawn', image: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=100' }
  ];
  currentNotificationIndex: number = 0;
  private notificationInterval?: any;

  isLoading: boolean = true;
  errorMessage: string | null = null;

  showTelegramPopup: boolean = false;

  private userId: string | null = null;

  // Referral data (now primarily managed in InviteComponent, but kept for clarity if needed)
  // These should ideally be fetched from a dedicated invite/referral API endpoint if not directly from wallet
  currentInvites: number = 0;
  totalReferrals: number = 0;
  referralEarnings: number = 0; // This specific earnings part should flow into _inviteCommission
  pendingBonus: number = 0;
  canClaimBonus: boolean = false;
  referralCode: string = '';
  invitationLink: string = '';
  activePlanType: string = 'daily';
  isLoadingSpinner: boolean = true;
  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private http: HttpClient
  ) {
    console.log('HomeComponent constructor called.');
  }

  async ngOnInit() {
    this.isLoadingSpinner = true;
    try {
      const user = await this.supabaseService.getUser();

      if (user) {
        this.userId = user.id;

        const userProfile = await this.supabaseService.getUserProfile(user.id);
        if (userProfile) {
          this.userName = userProfile.nickname || user.email || 'User';
          this.userPhone = userProfile.phone_number || 'N/A';
        } else {
          console.warn(`User profile not found for user ID: ${user.id}.`);
          this.userName = user.email || 'User';
          this.userPhone = 'N/A';
        }

        // Fetch wallet with new granular fields
        const userWallet = await this.supabaseService.getUserWallet(user.id);
        if (userWallet) {
          this.rechargedBalance = userWallet.recharged_amount;
          this._orderIncome = userWallet.order_income;
          this._inviteCommission = userWallet.invite_commission;
          this.totalEarnedIncome = this._orderIncome + this._inviteCommission;
        } else {
          console.warn(`User wallet not found for user ID: ${user.id}. Attempting to create one.`);
          // Create wallet will now initialize with new fields
          const newWallet = await this.supabaseService.createWalletForUser(user.id);
          if (newWallet) {
            this.rechargedBalance = newWallet.recharged_amount;
            this._orderIncome = newWallet.order_income;
            this._inviteCommission = newWallet.invite_commission;
            this.totalEarnedIncome = this._orderIncome + this._inviteCommission;
          } else {
            console.error('Failed to create wallet for user.');
            this.rechargedBalance = 0;
            this.totalEarnedIncome = 0;
          }
        }
        // If referral data is separate, fetch it here:
        // await this.fetchReferralData(); // (If you have a separate API for it)

      } else {
        console.log('No user logged in. Redirecting to login.');
        this.router.navigate(['/login']);
        return;
      }
    } catch (error) {
      console.error('Error in ngOnInit (loading user data):', error);
      this.errorMessage = 'Failed to load user data. Please try again.';
    } finally {
      this.isLoadingSpinner = false;
    }

    this.loadNotifications();
    this.startNotificationSlider();

    setTimeout(() => {
      this.showTelegramPopup = true;
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
    }
  }

  getHiddenPhone(): string {
    if (this.userPhone && this.userPhone.length > 4) {
      return this.userPhone.slice(0, 6) + '*******' + this.userPhone.slice(-3);
    }
    return this.userPhone;
  }

  // --- Navigation methods ---
  navigateToRecharge(): void { this.router.navigate(['/recharge']); }
  // Withdrawal: User can only withdraw `totalEarnedIncome`
  navigateToWithdrawal(): void { this.router.navigate(['/withdrawal']); }
  navigateToTeam(): void { this.router.navigate(['/team']); }
  navigateToOrders(): void { this.router.navigate(['/orders']); }
  navigateToHome(): void { this.router.navigate(['/home']); }
  navigateToInvite(): void { this.router.navigate(['/invite']); }
  navigateToAbout(): void { this.router.navigate(['/about']); }
  navigateToSettings(): void { this.router.navigate(['/settings']); }
  openCustomerService(): void { window.open('https://t.me/voltearning', '_blank'); }
  navigateToInvest() {
    this.router.navigate(['/invest']);
  }
  viewMissions() {
    this.router.navigate(['/mission']);
  } 
  redeemGiftCode() {
    this.router.navigate(['/gift']);
  }
  // --- Notification Banner Logic ---
  loadNotifications(): void {
    this.notifications = [
      { name: 'Rajesh', amount: 2500, action: 'withdrawn', image: 'https://images.pexels.com/photos/3483098/pexels-photo-3483098.jpeg?auto=compress&cs=tinysrgb&w=100' },
      { name: 'Priya', amount: 1500, action: 'withdrawn', image: 'https://images.pexels.com/photos/3760067/pexels-photo-3760067.jpeg?auto=compress&cs=tinysrgb&w=100' },
      { name: 'Amit', amount: 3000, action: 'withdrawn', image: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=100' }
    ];
  }

  getCurrentNotification(): any {
    return this.notifications[this.currentNotificationIndex] || {};
  }

  startNotificationSlider(): void {
    if (this.notifications.length > 1) {
      this.notificationInterval = setInterval(() => {
        this.currentNotificationIndex = (this.currentNotificationIndex + 1) % this.notifications.length;
      }, 4000);
    }
  }

  // --- Telegram Popup Logic ---
  joinTelegram(): void {
    window.open('https://t.me/voltearning', '_blank');
    this.closeTelegramPopup();
  }

  closeTelegramPopup(): void {
    this.showTelegramPopup = false;
  }

  formatNumber(value: number, decimals: number = 2): string {
    return value.toFixed(decimals);
  }

  // This `claimReferralBonus` should ideally be moved to InviteComponent.
  // If it must remain here, its state (pendingBonus, canClaimBonus)
  // should be regularly updated from a backend source.
  // For now, it will pessimistically rely on the InviteComponent's logic or a backend API.
  async fetchInviteData(userId: string): Promise<void> {
    const session = await this.supabaseService.getSession();
    const token = session?.access_token;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    });

    try {
    const response = await lastValueFrom(
      this.http.get<any>(`${environment.backendApiUrl}/user/invite-data/${userId}`, { headers })
    );

      if (response.success) {
        this.referralCode = response.referralCode;
        this.invitationLink = response.invitationLink;
        this.totalReferrals = response.totalReferrals;
        this.referralEarnings = response.referralEarnings;
        this.pendingBonus = response.pendingBonus;
        this.canClaimBonus = response.canClaimBonus || this.pendingBonus > 0;
        console.log('Invite data fetched successfully:', response);
      } else {
        console.error('Failed to fetch invite data:', response.message);
        this.errorMessage = 'Error: ' + response.message;
      }
    } catch (error) {
      console.error('API Error (fetchInviteData):', error);
      this.errorMessage = 'Failed to fetch invite data. Please try again later.';
    }
  }
  
  async claimReferralBonus(): Promise<void> {
    if (!this.userId) {
      alert("User not logged in.");
      return;
    }
    if (!this.canClaimBonus || this.pendingBonus <= 0) {
      alert("No bonus to claim or already claimed.");
      return;
    }

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    try {
      const response = await lastValueFrom(
  this.http.post<any>(
    `${environment.backendApiUrl}/user/claim-referral-bonus`,
    { userId: this.userId, amount: this.pendingBonus },
    { headers }
  )
);

      if (response.success) {
        alert(response.message);
        this.referralEarnings = response.new_total_referral_earnings;
        this.pendingBonus = response.new_pending_bonus;
        this.canClaimBonus = this.pendingBonus > 0;
        await this.fetchInviteData(this.userId);
      } else {
        alert('Failed to claim bonus: ' + response.message);
      }
    } catch (error) {
      console.error('API Error (claimReferralBonus):', error);
      alert('Error claiming bonus. Please try again.');
    }
  }
  openYouTube() {
  window.open('https://youtube.com/yourchannel', '_blank');
}





openTelegram() {
  window.open('https://t.me/yourchannel', '_blank');
}
}