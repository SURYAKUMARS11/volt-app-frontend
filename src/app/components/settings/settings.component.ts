// src/app/components/settings/settings.component.ts

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

// Import the UserWallet interface and SupabaseService
import { SupabaseService, UserProfile, UserWallet } from '../../supabase.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  userName: string = '';
  userPhone: string = '';

  // --- UPDATED: Properties to display in the UI ---
  balance: number = 0; // This will hold the recharged_amount
  withdrawableIncome: number = 0; // This will hold the order_income

  constructor(
    private router: Router,
    private supabaseService: SupabaseService
  ) {}

  async ngOnInit() {
    window.scrollTo(0, 0);
    try {
      const user = await this.supabaseService.getUser();

      if (user) {
        // Fetch user profile
        const userProfile = await this.supabaseService.getUserProfile(user.id);
        if (userProfile) {
          this.userName = userProfile.nickname || user.email || 'User';
          this.userPhone = userProfile.phone_number || 'N/A';
        } else {
          this.userName = user.email || 'User';
          this.userPhone = 'N/A';
        }

        // --- UPDATED: Fetch user wallet to get balance and withdrawable income ---
        const userWallet: UserWallet | null = await this.supabaseService.getUserWallet(user.id);
        if (userWallet) {
            this.balance = userWallet.recharged_amount;
            this.withdrawableIncome = userWallet.order_income;
        } else {
            console.warn(`User wallet not found for user ID: ${user.id}.`);
        }

      }
    } catch (error) {
        console.error('Error in ngOnInit (SettingsComponent):', error);
    }
  }

  getHiddenPhone(): string {
    if (this.userPhone && this.userPhone.length > 4) {
      return this.userPhone.slice(0, 6) + '*******' + this.userPhone.slice(-3);
    }
    return this.userPhone;
  }

  // --- Navigation Methods ---
  navigateToRecharge() {
    this.router.navigate(['/recharge']);
  }

  navigateToWithdrawal() {
    this.router.navigate(['/withdrawal']);
  }

  navigateToOrders() {
    this.router.navigate(['/orders']);
  }

  navigateToDepositRecord() {
    this.router.navigate(['/deposit-record']);
  }

  navigateToWithdrawalRecord() {
    this.router.navigate(['/withdrawal-record']);
  }

  navigateToIncomeRecord() {
    alert('Income Record coming soon!');
  }

  navigateToTeam() {
    this.router.navigate(['/team']);
  }

  navigateToVip() {
    alert('VIP section coming soon!');
  }

  navigateToBankCard() {
    this.router.navigate(['/add-bank-card']);
  }

  navigateToHelpCentre() {
    this.router.navigate(['/help-centre']);
  }

  navigateToInfo() {
    alert('Info section coming soon!');
  }

  navigateToTradePassword() {
    this.router.navigate(['/set-trade-password']);
  }

  navigateToPassword() {
    this.router.navigate(['/set-password']);
  }

navigateToDownload() {
  // your logic to route to download page
  this.router.navigate(['/download-app']);
}

  async logout() {
    const confirmed = confirm('Are you sure you want to logout?');
    if (confirmed) {
      try {
        await this.supabaseService.client.auth.signOut();
        this.router.navigate(['/signin']);
      } catch (error) {
        console.error('Logout error:', error);
        alert('Error logging out. Please try again.');
      }
    }
  }

  goBack() {
    this.router.navigate(['/home']);
  }
  navigateToHome(): void { this.router.navigate(['/home']); }
  navigateToInvite(): void { this.router.navigate(['/invite']); }
  navigateToAbout(): void { this.router.navigate(['/about']); }
  navigateToSettings(): void { this.router.navigate(['/settings']); }
  openCustomerService(): void { window.open('https://t.me/Volt_support_care', '_blank'); }
    navigateToInvest() {
    this.router.navigate(['/invest']);
  }

}