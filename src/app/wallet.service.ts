// src/app/services/wallet.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment.development';
import { SupabaseService, UserWallet } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private flaskApiBaseUrl = environment.backendApiUrl;

  // Use a BehaviorSubject to hold and stream the current wallet data.
  // It starts with a default, empty state.
  private userWalletSubject = new BehaviorSubject<UserWallet | null>(null);
  public userWallet$ = this.userWalletSubject.asObservable();

  constructor(
    private http: HttpClient,
    private supabaseService: SupabaseService
  ) {}

  /**
   * Main method to fetch wallet data and apply daily payouts.
   * This should be called from HomeComponent when the app starts.
   */
  public async initializeWalletData() {
    try {
      const user = await this.supabaseService.getUser();
      if (user) {
        // Step 1: Trigger the daily payout logic on the backend
        // This makes sure the balance is updated *before* we fetch it.
        await this.runDailyPayout(user.id);

        // Step 2: Fetch the final, updated wallet and stream it to all subscribers
        await this.fetchUserWallet(user.id);
      } else {
        console.warn('WalletService: User not logged in, cannot initialize wallet data.');
        this.userWalletSubject.next(null);
      }
    } catch (error) {
      console.error('Error initializing wallet data:', error);
      // Ensure the state is cleared if there's an error.
      this.userWalletSubject.next(null);
    }
  }

  /**
   * *** NEW METHOD ***
   * Public method to force a refresh of the wallet data.
   * This is what home.component.ts will call after a successful claim.
   */
  public async refreshWalletData(): Promise<void> {
    const user = await this.supabaseService.getUser();
    if (user) {
      // Re-fetch the wallet for the current user and push it to the stream.
      await this.fetchUserWallet(user.id);
    } else {
      console.warn('Cannot refresh wallet: user not authenticated.');
      this.userWalletSubject.next(null);
    }
  }

  /**
   * Fetches the latest user wallet from Supabase and updates the BehaviorSubject.
   */
  public async fetchUserWallet(userId: string) {
    try {
      const fetchedWallet = await this.supabaseService.getUserWallet(userId);
      if (fetchedWallet) {
        this.userWalletSubject.next(fetchedWallet);
        console.log('WalletService: Fetched user wallet and updated stream.');
      } else {
        console.warn(`WalletService: No wallet found for user ID: ${userId}.`);
        this.userWalletSubject.next(null);
      }
    } catch (error) {
      console.error('API Error fetching user wallet:', error);
      this.userWalletSubject.next(null);
    }
  }

  /**
   * Triggers the daily payout logic on the backend via the Supabase RPC.
   */
  private async runDailyPayout(userId: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.client
        .rpc('process_daily_payouts', { p_user_id: userId });

      if (error) {
        console.error('WalletService: Error calling backend payout function:', error);
        throw new Error('Failed to process daily payouts.');
      } else {
        console.log('WalletService: Backend payout function executed successfully.');
      }
    } catch (e) {
      console.error('WalletService: An unexpected error occurred while calling the RPC:', e);
      throw e;
    }
  }
}
