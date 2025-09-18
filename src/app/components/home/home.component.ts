// src/app/home/home.component.ts

import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, interval, lastValueFrom } from 'rxjs';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';

// Import the new WalletService
import type { UserProfile, UserWallet } from '../../supabase.service';
import { SupabaseService } from '../../supabase.service';
import { environment } from '../../../environments/environment.development';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { WalletService } from '../../wallet.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HttpClientModule, LoadingSpinnerComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  userName: string = '';
  userPhone: string = '';
  deferredPrompt: any;
  isInstalled = false;
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

  todayBonus: number = 5;
  canClaimToday: boolean = false;
  totalDailyEarnings: number = 0;

  // A variable to store the date of the last claim
  lastClaimDate: string | null = null;

  // Properties for user feedback messages
  isLoading: boolean = false; // Initialized to false

  showTelegramPopup: boolean = false;

  private userId: string | null = null;
  private walletSubscription?: Subscription; // Add a subscription for the wallet service

  // Referral data
  currentInvites: number = 0;
  totalReferrals: number = 0;
  referralEarnings: number = 0;
  pendingBonus: number = 0;
  canClaimBonus: boolean = false;
  referralCode: string = '';
  invitationLink: string = '';
  activePlanType: string = 'daily';
  isLoadingSpinner: boolean = true;

  // NEW: A flag to prevent the subscription from overwriting the UI state
  private isClaimingBonus: boolean = false;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private http: HttpClient,
    private walletService: WalletService,
    // <-- Inject the new WalletService
  ) {
    console.log('HomeComponent constructor called.');
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: Event) {
    event.preventDefault();
    this.deferredPrompt = event;
    console.log('PWA install prompt captured');
  }

  installPWA() {
    if (this.isInstalled) {
      console.log('App is already installed.');
      return;
    }

    if (!this.deferredPrompt) {
      console.log('Install option not available yet. Please try again later.');
      return;
    }

    this.deferredPrompt.prompt();

    this.deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted installation');
        this.isInstalled = true; // Mark as installed
      } else {
        console.log('User dismissed installation');
      }
      this.deferredPrompt = null;
    });
  }

  checkIfInstalled() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    this.isInstalled = !!isStandalone;
  }

  async ngOnInit() {
    this.checkIfInstalled();
    this.isLoadingSpinner = true;
    try {
      const user = await this.supabaseService.getUser();

      if (!user) {
        console.log('No user logged in. Redirecting to login.');
        this.router.navigate(['/login']);
        this.isLoadingSpinner = false;
        return;
      }
      this.userId = user.id;

      // CRITICAL FIX: Trigger the initial data fetch and wait for it to complete.
      // This ensures that when we subscribe, we get the most recent data.
      await this.walletService.initializeWalletData();

      // Now, subscribe to the wallet service's stream.
      this.walletSubscription = this.walletService.userWallet$.subscribe(wallet => {
        if (wallet) {
          this.rechargedBalance = wallet.recharged_amount;
          this._orderIncome = wallet.order_income;
          this._inviteCommission = wallet.invite_commission;
          this.totalEarnedIncome = this._orderIncome + this._inviteCommission;
          this.totalDailyEarnings = wallet.total_daily_earnings || 0;

          // Only update the claim state if we are not in the middle of a claim process
          if (!this.isClaimingBonus) {
            this.canClaimToday = this.isBonusClaimable(wallet.last_daily_bonus_claim_date);
          }

        } else {
          // Reset balances if the wallet is null
          this.rechargedBalance = 0;
          this.totalEarnedIncome = 0;
          this._orderIncome = 0;
          this._inviteCommission = 0;
          this.totalDailyEarnings = 0;
          this.canClaimToday = false;
        }
      });


      // Fetch user profile and other data
      const userProfile = await this.supabaseService.getUserProfile(user.id);
      if (userProfile) {
        this.userName = userProfile.nickname || user.email || 'User';
        this.userPhone = userProfile.phone_number || 'N/A';
      } else {
        console.warn(`User profile not found for user ID: ${user.id}.`);
        this.userName = user.email || 'User';
        this.userPhone = 'N/A';
      }

      await this.fetchInviteData(this.userId);

    } catch (error) {
      console.error('Error in ngOnInit (loading user data):', error);
    } finally {
      this.isLoadingSpinner = false;
    }

    this.loadNotifications();
    this.startNotificationSlider();

    setTimeout(() => {
      this.showTelegramPopup = true;
    }, 1000);
  }

  private isBonusClaimable(lastClaimDate: string | null): boolean {
    if (!lastClaimDate) {
      return true; // No previous claim, so it's claimable
    }
    const lastClaim = new Date(lastClaimDate).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    return today !== lastClaim;
  }

  // --- Daily Bonus Logic ---
  async claimDailyBonus(): Promise<void> {
    if (!this.userId) {
      console.log("User not logged in.");
      return;
    }
    if (!this.canClaimToday) {
      console.log("Bonus has already been claimed for today.");
      return;
    }

    this.isLoading = true;
    this.isClaimingBonus = true; // NEW: Set flag to true

    try {
      const session = await this.supabaseService.getSession();
      const user = await this.supabaseService.getUser();

      if (!session || !user) {
        console.log('You must be logged in to claim the bonus.');
        this.isLoading = false;
        this.isClaimingBonus = false; // NEW: Reset flag on failure
        return;
      }

      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      });

      const body = { userId: user.id };

      const response = await lastValueFrom(
        this.http.post<any>(`${environment.backendApiUrl}/user/claim-daily-bonus`, body, { headers })
      );

      if (response.success) {
        console.log(response.message);
        this.canClaimToday = false; // NEW: Optimistically update UI
        // Trigger the wallet service to get the latest data
        await this.walletService.refreshWalletData();
      } else {
        console.log(response.message);
        this.canClaimToday = true; // Re-enable if the claim failed
      }
    } catch (error: any) {
      console.error('API Error (claimDailyBonus):', error);
      this.canClaimToday = true; // Re-enable on API error
    } finally {
      this.isLoading = false;
      this.isClaimingBonus = false; // NEW: Reset flag after process is complete
    }
  }

  ngOnDestroy(): void {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
    }
    // Unsubscribe from the wallet service stream to prevent memory leaks
    this.walletSubscription?.unsubscribe();
  }

  getHiddenPhone(): string {
    if (this.userPhone && this.userPhone.length > 4) {
      return this.userPhone.slice(0, 6) + '*******' + this.userPhone.slice(-3);
    }
    return this.userPhone;
  }

  // --- Navigation methods ---
  navigateToRecharge(): void { this.router.navigate(['/recharge']); }
  navigateToWithdrawal(): void { this.router.navigate(['/withdrawal']); }
  navigateToTeam(): void { this.router.navigate(['/team']); }
  navigateToOrders(): void { this.router.navigate(['/orders']); }
  navigateToHome(): void { this.router.navigate(['/home']); }
  navigateToInvite(): void { this.router.navigate(['/invite']); }
  navigateToAbout(): void { this.router.navigate(['/about']); }
  navigateToSettings(): void { this.router.navigate(['/settings']); }
  openCustomerService(): void { window.open('https://t.me/Volt_support_care', '_blank'); }
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
      }
    } catch (error) {
      console.error('API Error (fetchInviteData):', error);
    }
  }

  async claimReferralBonus(): Promise<void> {
    if (!this.userId) {
      console.log("User not logged in.");
      return;
    }
    if (!this.canClaimBonus || this.pendingBonus <= 0) {
      console.log("No bonus to claim or already claimed.");
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
        console.log(response.message);
        this.referralEarnings = response.new_total_referral_earnings;
        this.pendingBonus = response.new_pending_bonus;
        this.canClaimBonus = this.pendingBonus > 0;
        await this.fetchInviteData(this.userId);
      } else {
        console.log('Failed to claim bonus: ' + response.message);
      }
    } catch (error) {
      console.error('API Error (claimReferralBonus):', error);
      console.log('Error claiming bonus. Please try again.');
    }
  }

  openYouTube() {
    window.open('https://youtube.com/yourchannel', '_blank');
  }

  openTelegram() {
    window.open('https://t.me/voltearning', '_blank');
  }

  navigateToBlog(): void {
    this.router.navigate(['/blog']);
  }
}
