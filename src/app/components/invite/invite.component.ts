// src/app/invite/invite.component.ts

import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { SupabaseService } from '../../supabase.service';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-invite',
  standalone: true,
  imports: [CommonModule, HttpClientModule, LoadingSpinnerComponent],
  templateUrl: './invite.component.html',
  styleUrls: ['./invite.component.css']
})
export class InviteComponent implements OnInit {
  referralCode: string = '';
  invitationLink: string = '';

  totalReferrals: number = 0;
  referralEarnings: number = 0;
  pendingBonus: number = 0;
  canClaimBonus: boolean = false;
  isLoading: boolean = true;
  errorMessage: string | null = null;

  invitationRules = [
    'Earn 10% of commission on every activated referral.',
    'Referral earnings have no expiry date and can be withdrawn anytime after meeting minimum withdrawal criteria.',
    'Fraudulent activities or fake accounts will result in reward cancellation and account suspension.'
  ];

  userId: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private supabaseService: SupabaseService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const user = await this.supabaseService.getUser();

      if (user) {
        this.userId = user.id;
        console.log('User logged in:', this.userId);

        await this.fetchInviteData(this.userId);

      } else {
        console.log('No user logged in. Redirecting to login.');
        this.router.navigate(['/login']);
        this.isLoading = false;
        return;
      }
    } catch (error) {
      console.error('Error in ngOnInit (fetching user or invite data):', error);
      this.errorMessage = 'Failed to load invite data. Please try again.';
      this.router.navigate(['/login']);
    } finally {
      this.isLoading = false;
    }

    this.route.queryParams.subscribe(params => {
      const refCode = params['ref'];
      if (refCode) {
        console.log('Referral code from URL:', refCode);
        localStorage.setItem('referral_code_from_url', refCode);
      }
    });
  }

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

  copyInvitationLink() {
    navigator.clipboard.writeText(this.invitationLink).then(() => {
      alert('Invitation link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy text:', err);
      alert('Failed to copy link. Please try manually.');
    });
  }

  shareInvitationLink() {
    const message = `Join Volt and start earning daily! Use my referral code: ${this.referralCode}. Sign up now: ${this.invitationLink}`;
    if (navigator.share) {
      navigator.share({
        title: 'Join Volt - Earn Money Daily',
        text: message,
        url: this.invitationLink
      }).catch((error) => console.error('Error sharing:', error));
    } else {
      navigator.clipboard.writeText(message).then(() => {
        alert('Invitation message copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy text:', err);
        alert('Failed to copy message. Please try manually.');
      });
    }
  }

  navigateToTeam() {
    this.router.navigate(['/team']);
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

  goBack() { this.router.navigate(['/home']); }
  navigateToHome(): void { this.router.navigate(['/home']); }
  navigateToInvite(): void { this.router.navigate(['/invite']); }
  navigateToSettings(): void { this.router.navigate(['/settings']); }
  openCustomerService(): void { window.open('https://t.me/Volt_support_care', '_blank'); }
  navigateToInvest() { this.router.navigate(['/invest']); }
}