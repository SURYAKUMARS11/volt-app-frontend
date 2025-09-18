// src/app/withdrawal-record/withdrawal-record.component.ts

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { lastValueFrom } from 'rxjs';
import { SupabaseService } from '../../supabase.service';
import { environment } from '../../../environments/environment.development';


// Define the interface for a withdrawal record to match your backend's transaction schema
interface WithdrawalRecord {
  id: string; // This will be the transaction ID from Supabase
  user_id: string;
  amount: number;
  status: 'processing' | 'completed' | 'failed' | 'rejected';
  created_at: string; // Supabase stores timestamps as a string
  fee: number;
  bank_card_id: string;
}

@Component({
  selector: 'app-withdrawal-record',
  standalone: true,
  imports: [CommonModule, HttpClientModule, DatePipe, LoadingSpinnerComponent],
  templateUrl: './withdrawal-record.component.html',
  styleUrls: ['./withdrawal-record.component.css'],
  providers: [SupabaseService]
})
export class WithdrawalRecordComponent implements OnInit {
  selectedFilter: string = 'all';
  records: WithdrawalRecord[] = [];
  filteredRecords: WithdrawalRecord[] = [];

  isLoading: boolean = true;
  errorMessage: string | null = null;

  constructor(
    private router: Router,
    private http: HttpClient,
    private supabaseService: SupabaseService
  ) {}

  async ngOnInit(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const user = await this.supabaseService.getUser();
      if (user) {
        await this.loadRecords(user.id);
      } else {
        console.error('No user logged in. Redirecting.');
        this.router.navigate(['/login']);
      }
    } catch (error) {
      this.errorMessage = 'Failed to load records. Please try again.';
      console.error('Failed to get user or load records:', error);
      this.isLoading = false;
    }
  }

  async loadRecords(userId: string) {
    const backendUrl = `${environment.backendApiUrl}/user/withdrawal-records/${userId}`;

    try {
      const response = await lastValueFrom(
        this.http.get<{success: boolean; records: WithdrawalRecord[]}>(backendUrl)
      );

      if (response.success) {
        this.records = response.records;
        this.applyFilter();
      } else {
        this.errorMessage = 'An error occurred on the server.';
      }
    } catch (error) {
      console.error('API call failed:', error);
      this.errorMessage = 'Failed to connect to the server.';
    } finally {
      this.isLoading = false;
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'processing': return 'processing';
      case 'completed': return 'completed';
      case 'failed': return 'failed';
      case 'rejected': return 'failed';
      default: return '';
    }
  }

  setFilter(filter: string) {
    this.selectedFilter = filter;
    this.applyFilter();
  }

  applyFilter() {
    if (this.selectedFilter === 'all') {
      this.filteredRecords = this.records;
    } else {
      // The status 'processing' is used in the filter button
      // But the database status for this is 'pending'
      const filterStatus = this.selectedFilter === 'processing' ? 'pending' : this.selectedFilter;
      this.filteredRecords = this.records.filter(record => record.status === filterStatus);
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'Processing';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      case 'rejected': return 'Failed'; // Map 'rejected' status to 'Failed' for display
      default: return status;
    }
  }

  goBack() {
    this.router.navigate(['/settings']);
  }

  navigateToHome(): void { this.router.navigate(['/home']); }
  navigateToInvest(): void { this.router.navigate(['/invest']); }
  navigateToTeam(): void { this.router.navigate(['/team']); }
  navigateToSettings(): void { this.router.navigate(['/settings']); }
  openCustomerService(): void { window.open('https://t.me/Volt_support_care', '_blank'); }
}