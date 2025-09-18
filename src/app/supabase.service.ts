// src/app/supabase.service.ts

import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../environments/environment'; // Adjust path if needed

// --- INTERFACES: MUST MATCH YOUR SUPABASE TABLE SCHEMAS ---

export interface UserProfile {
  id: string; // auth.users.id
  nickname: string;
  phone_number: string;
  trade_password_hash?: string;
  // Add other profile fields here if you have them
}

// user_wallets table mapping - UPDATED to reflect new DB schema
export interface UserWallet {
  user_id: string;
  recharged_amount: number;   // NEW: This is the user's recharged principal
  order_income: number;       // NEW: Income from invested plans
  invite_commission: number;  // NEW: Income from referral commissions
  last_updated: string;       // Or Date if you parse it
  total_daily_earnings: number;
  last_daily_bonus_claim_date: string | null;
  pending_referral_bonus: number;
  total_referral_earnings: number;
  total_referrals: number;
}

export interface InvestmentPlan {
  id: number;
  plan_type: 'daily' | 'advanced';
  tier: number;
  title: string;
  investment: number;
  daily_income: number;
  days: number;
  total: number;
  image_url: string;
  is_active: boolean;
  is_purchasable_once?: boolean;

  is_presale?: boolean;
}

export type investment_status_type = 'active' | 'completed' | 'cancelled';

export interface UserInvestmentRecord {
  id: number;
  user_id: string;
  plan_id: number;
  quantity: number;
  invested_amount: number;
  daily_return_amount: number;
  start_date: string;
  end_date: string;
  current_status: investment_status_type;
  last_daily_payout_date: string | null;
  current_earnings: number;
}

export enum transaction_type {
  Recharge = 'recharge',
  Withdrawal = 'withdrawal',
  Investment = 'investment',
  DailyPayout = 'daily_payout',
  InviteCommission = 'invite_commission' // Added this enum value
}

export enum transaction_status {
  Pending = 'pending',
  Completed = 'completed',
  Failed = 'failed',
  Active = 'active',
  Cancelled = 'cancelled'
}

export interface Order { // UI-specific, no change needed here
  id: number;
  plan_id?: number;
  plan_title?: string;
  type: transaction_type;
  amount: number;
  date: string;
  status: transaction_status;
  daily_income?: number;
  duration_days?: number;
  progress_percentage?: number;
  purchased_quantity?: number;
  current_daily_earnings?: number;
  description?: string;
}

export interface NewInvestment {
  user_id: string;
  plan_id: number;
  quantity: number;
  invested_amount: number;
  daily_return_amount: number;
  start_date: string;
  end_date: string;
  current_status: investment_status_type;
  last_daily_payout_date: string | null;
  current_earnings: number;
}

export interface NewTransaction {
  user_id: string;
  type: transaction_type;
  amount: number;
  status: transaction_status;
  related_entity_id?: number | null;
  description?: string | null;
  payment_gateway_id?: string | null;
}

export interface BankDetails {
  id: string;
  user_id: string;
  account_number: string;
  bank_name: string;
  ifsc_code: string;
  account_holder_name: string;
  is_verified: boolean;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  async getSession() {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    return data.session;
  }

  async getUser(): Promise<User | null> {
    const { data: { user }, error } = await this.supabase.auth.getUser();
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    return user;
  }

  authChanges() {
    return this.supabase.auth.onAuthStateChange;
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error.message);
        return null;
      }
      return data as UserProfile | null;
    } catch (error) {
      console.error('Unexpected error fetching user profile:', error);
      return null;
    }
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>) {
    const { data, error } = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile:', error);
      return null;
    }
    return data;
  }

  // UPDATED: getUserWallet to fetch new granular wallet fields
  async getUserWallet(userId: string): Promise<UserWallet | null> {
    const { data, error } = await this.supabase
      .from('user_wallets')
      .select('recharged_amount, order_income, invite_commission, last_updated') // Select new columns
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user wallet:', error);
      return null;
    }
    return data as UserWallet;
  }

  // UPDATED: createWalletForUser to initialize new granular fields
  async createWalletForUser(userId: string): Promise<UserWallet | null> {
    const { data, error } = await this.supabase
      .from('user_wallets')
      .insert({
        user_id: userId,
        recharged_amount: 0,
        order_income: 0,
        invite_commission: 0,
        last_updated: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating wallet for user:', error);
      throw error;
    }
    return data as UserWallet;
  }

  async getInvestmentPlans(type: 'daily' | 'advanced'): Promise<InvestmentPlan[] | null> {
    const { data, error } = await this.supabase
      .from('investment_plans')
      .select('id, title, investment, daily_income, days, total, image_url, plan_type, is_active, tier, is_purchasable_once')
      .eq('plan_type', type)
      .order('investment', { ascending: true });

    if (error) {
      console.error(`Error fetching ${type} plans:`, error);
      return null;
    }
    return data as InvestmentPlan[]; // Cast directly
  }
  async updateWalletBalance(
    userId: string,
    newRechargedAmount: number,
    newOrderIncome: number,
    newInviteCommission: number
  ): Promise<{ data: UserWallet | null, error: any }> {
    const { data, error } = await this.supabase
      .from('user_wallets')
      .update({
        recharged_amount: newRechargedAmount,
        order_income: newOrderIncome,
        invite_commission: newInviteCommission,
        last_updated: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating wallet balance:', error);
    }
    return { data: data as UserWallet, error };
  }


  async getUserInvestments(userId: string): Promise<Order[] | null> {
    const { data, error } = await this.supabase
      .from('user_investments')
      .select(`
        id, user_id, plan_id, quantity, invested_amount, daily_return_amount,
        start_date, end_date, current_status, last_daily_payout_date, current_earnings,
        investment_plans!plan_id(id, title, days)
      `)
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching user investments:', error);
      return null;
    }

    const orders: Order[] = data.map((item: any) => ({
      id: item.id,
      plan_id: item.plan_id,
      plan_title: item.investment_plans?.title || 'Unknown Plan',
      type: transaction_type.Investment,
      amount: item.invested_amount,
      date: item.start_date,
      status: item.current_status as transaction_status,
      daily_income: item.daily_return_amount,
      duration_days: item.investment_plans?.days,
      purchased_quantity: item.quantity,
      current_daily_earnings: item.current_earnings,
      progress_percentage: 0,
      description: `Investment in ${item.investment_plans?.title || 'a plan'}`
    }));

    return orders;
  }

  async createInvestment(investmentData: NewInvestment): Promise<{ data: UserInvestmentRecord | null, error: any | null }> {
    const { data, error } = await this.supabase
      .from('user_investments')
      .insert([investmentData])
      .select()
      .single();

    if (error) {
      console.error('Error creating investment:', error);
    }
    return { data: data as UserInvestmentRecord | null, error };
  }

  async updateInvestment(investmentId: number, updates: Partial<NewInvestment>): Promise<{ data: UserInvestmentRecord | null, error: any | null }> {
    const { data, error } = await this.supabase
      .from('user_investments')
      .update(updates)
      .eq('id', investmentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating investment:', error);
    }
    return { data: data as UserInvestmentRecord | null, error };
  }

  async createTransaction(transactionData: NewTransaction): Promise<{ data: any | null, error: any | null }> {
    const { data, error } = await this.supabase
      .from('transactions')
      .insert([transactionData])
      .select();

    if (error) {
      console.error('Error creating transaction:', error);
    }
    return { data: data ? data[0] : null, error };
  }

  async getUserName(): Promise<string | null> {
    const user = await this.getUser();
    if (user) {
      const profile = await this.getUserProfile(user.id);
      return profile?.nickname || null;
    }
    return null;
  }

  async getUserEmail(): Promise<string | null> {
    const user = await this.getUser();
    return user?.email || null;
  }

  async getUserPhone(): Promise<string | null> {
    const user = await this.getUser();
    if (user) {
      return user.phone || null;
    }
    return null;
  }

  async getUserBankCards(userId: string): Promise<BankDetails[] | null> {
    try {
      const { data, error } = await this.supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user bank cards:', error.message);
        return null;
      }
      return data as BankDetails[];
    } catch (error) {
      console.error('Unexpected error fetching user bank cards:', error);
      return null;
    }
  }

  // --- NEW Helper methods for wallet updates (to be used by your Flask backend primarily) ---
  // These are examples of what your backend would call when a transaction happens.
  // The frontend calls Flask APIs, and Flask calls these (or similar) Supabase operations.

  // Backend calls this on successful recharge
  async incrementRechargedAmount(userId: string, amount: number): Promise<boolean> {
    const { error } = await this.supabase.rpc('increment_recharged_amount', {
      p_user_id: userId,
      p_amount: amount
    });
    if (error) {
      console.error('Error incrementing recharged amount:', error);
      return false;
    }
    return true;
  }

  // Backend calls this on daily payout from investments
  async incrementOrderIncome(userId: string, amount: number): Promise<boolean> {
    const { error } = await this.supabase.rpc('increment_order_income', {
      p_user_id: userId,
      p_amount: amount
    });
    if (error) {
      console.error('Error incrementing order income:', error);
      return false;
    }
    return true;
  }

  // Backend calls this when invite commission is earned/claimed
  async incrementInviteCommission(userId: string, amount: number): Promise<boolean> {
    const { error } = await this.supabase.rpc('increment_invite_commission', {
      p_user_id: userId,
      p_amount: amount
    });
    if (error) {
      console.error('Error incrementing invite commission:', error);
      return false;
    }
    return true;
  }

  // Backend calls this on successful withdrawal from total_income
  async decrementTotalIncome(userId: string, amount: number): Promise<boolean> {
    const { error } = await this.supabase.rpc('decrement_total_income', {
      p_user_id: userId,
      p_amount: amount
    });
    if (error) {
      console.error('Error decrementing total income:', error);
      return false;
    }
    return true;
  }
}