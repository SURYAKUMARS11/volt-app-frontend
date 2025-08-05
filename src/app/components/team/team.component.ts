// src/app/components/team/team.component.ts

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, TitleCasePipe, DecimalPipe } from '@angular/common';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { SupabaseService } from '../../supabase.service';
import { environment } from '../../../environments/environment.development';

// Define interfaces for type safety
interface TeamMember {
  name: string;
  phone: string;
  status: 'active' | 'inactive';
}

interface TeamDataResponse {
  success: boolean;
  totalReferrals: number;
  totalEarnings: number;
  teamMembers: TeamMember[];
  message?: string;
}

@Component({
  selector: 'app-team',
  standalone: true,
  // Make sure you have all the necessary modules here
  imports: [CommonModule, HttpClientModule, TitleCasePipe, DecimalPipe],
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.css']
})
export class TeamComponent implements OnInit {
  // These are the properties your HTML template is looking for
  totalReferrals: number = 0;
  totalEarnings: number = 0;
  teamMembers: TeamMember[] = [];
  isLoading: boolean = true;
  errorMessage: string | null = null;
  userId: string | null = null;

  // You might still have other properties like referralBenefits
  referralBenefits = [
    'Earn ₹50 instant bonus when your friend joins',
    'Get 10% commission on all their investments',
    'Lifetime earnings from your referrals',
    'No limit on number of referrals',
    'Weekly bonus for active referrers'
  ];

  constructor(
    private router: Router,
    private http: HttpClient,
    private supabaseService: SupabaseService
  ) {}

  // The ngOnInit method is where the dynamic data fetching logic resides
  async ngOnInit(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const user = await this.supabaseService.getUser();

      if (user) {
        this.userId = user.id;
        await this.fetchTeamData(this.userId);
      } else {
        console.log('No user logged in. Redirecting to login.');
        this.router.navigate(['/login']);
      }
    } catch (error) {
      console.error('Authentication or data fetch error:', error);
      this.errorMessage = 'Failed to load team data. Please log in again.';
    } finally {
      this.isLoading = false;
    }
  }

  // This method makes the API call
  async fetchTeamData(userId: string): Promise<void> {
    try {
      const session = await this.supabaseService.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No session token found. User is not authenticated.');
      }

      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });

      const response = await lastValueFrom(
  this.http.get<TeamDataResponse>(`${environment.backendApiUrl}/user/team-data/${userId}`, { headers })
);

      if (response.success) {
        this.totalReferrals = response.totalReferrals;
        this.totalEarnings = response.totalEarnings;
        this.teamMembers = response.teamMembers;
        console.log('Team data fetched successfully:', response);
      } else {
        this.errorMessage = response.message || 'An error occurred on the server.';
        console.error('Backend error:', response.message);
      }
    } catch (error) {
      console.error('API Error (fetchTeamData):', error);
      this.errorMessage = 'Failed to fetch team data. Please try again later.';
    }
  }

  redirectToInvite(): void {
    this.router.navigate(['/invite']);
  }

  goBack() {
    this.router.navigate(['/home']);
  }
  navigateToHome(): void { this.router.navigate(['/home']); }
  navigateToTeam(): void { this.router.navigate(['/team']); }
  navigateToSettings(): void { this.router.navigate(['/settings']); }
  openCustomerService(): void { window.open('https://t.me/voltearning', '_blank'); }
  navigateToInvest() { this.router.navigate(['/invest']); }
}