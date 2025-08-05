import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { SupabaseService } from '../../supabase.service';
import { environment } from '../../../environments/environment.development';


// Define the interface for a deposit record to match your backend's transaction schema
interface DepositRecord {
  user_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string; // Supabase stores timestamps as a string
  payment_gateway_id: string;
}

@Component({
  selector: 'app-deposit-record',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './deposit-record.component.html',
  styleUrls: ['./deposit-record.component.css'],
  providers: [SupabaseService]
})
export class DepositRecordComponent implements OnInit {
  selectedFilter: string = 'all';
  records: DepositRecord[] = [];
  filteredRecords: DepositRecord[] = [];
  
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
    
const backendUrl = `${environment.backendApiUrl}/user/recharge-records/${userId}`;
    
    try {
      const response = await lastValueFrom(
        this.http.get<{success: boolean; records: DepositRecord[]}>(backendUrl)
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

  setFilter(filter: string) {
    this.selectedFilter = filter;
    this.applyFilter();
  }

  applyFilter() {
    if (this.selectedFilter === 'all') {
      this.filteredRecords = this.records;
    } else {
      this.filteredRecords = this.records.filter(record => record.status === this.selectedFilter);
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'Pending';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      default: return status;
    }
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}