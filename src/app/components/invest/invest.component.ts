// src/app/components/invest/invest.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Subscription } from 'rxjs';

import {
  SupabaseService,
  InvestmentPlan,
  NewInvestment,
  Order,
  transaction_type,
  transaction_status,
  investment_status_type,
  UserWallet
} from '../../supabase.service';
import { HttpClient } from '@angular/common/http';
import { WalletService } from '../../wallet.service';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';


@Component({
  selector: 'app-invest',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './invest.component.html',
  styleUrls: ['./invest.component.css']
})
export class InvestComponent implements OnInit, OnDestroy {
  dailyPlans: InvestmentPlan[] = [];
  advancedPlans: InvestmentPlan[] = [];
  activePlanType: 'daily' | 'advanced' = 'daily';
  isLoading: boolean = true;
  isLoadingUserData: boolean = true;
  errorMessage: string | null = null;

  showInvestmentPopup: boolean = false;
  selectedPlan: InvestmentPlan | null = null;
  investmentQuantity: number = 1;
  investmentErrorMessage: string = '';
  investmentSuccessMessage: string = '';

  showSuccessPopup = false;

  private userId: string | null = null;
  public purchasedPlans: { [planId: number]: number } = {};
  private userOrders: Order[] = [];

  public userWallet: UserWallet | null = null;
  private walletSubscription?: Subscription;

  private walletChannel: RealtimeChannel | undefined;
  private investmentsChannel: RealtimeChannel | undefined;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private walletService: WalletService
  ) {}

  get currentBalance(): number {
    if (!this.userWallet) {
      return 0;
    }
    return this.userWallet.recharged_amount;
  }

  get calculatedTotalIncome(): number {
    if (!this.userWallet) {
      return 0;
    }
    return this.userWallet.order_income + this.userWallet.invite_commission;
  }

  async ngOnInit(): Promise<void> {
    this.isLoadingUserData = true;
    this.isLoading = true;
    try {
      const user = await this.supabaseService.getUser();
      if (!user) {
        console.log('No user logged in. Redirecting to login from InvestComponent.');
        this.router.navigate(['/login']);
        this.isLoading = false;
        this.isLoadingUserData = false;
        return;
      }
      this.userId = user.id;

      // The service will now handle fetching and updating the wallet data itself.
      // We just need to subscribe to its stream.
      if (this.walletService) {
        this.walletSubscription = this.walletService.userWallet$.subscribe(wallet => {
          this.userWallet = wallet;
          // Only stop loading once the initial wallet data is received
          if (wallet) {
            this.isLoadingUserData = false;
          }
        });
      } else {
        console.error('WalletService is not available.');
        this.errorMessage = 'Failed to load user data. Please try again.';
        this.isLoadingUserData = false;
      }

      await this.loadInitialData();

      this.setupRealtimeSubscriptions();

    } catch (error) {
      console.error('Error in InvestComponent ngOnInit:', error);
      this.errorMessage = 'Failed.';
    } finally {
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    if (this.walletChannel) {
      this.supabaseService.client.removeChannel(this.walletChannel);
    }
    if (this.investmentsChannel) {
      this.supabaseService.client.removeChannel(this.investmentsChannel);
    }
    this.walletSubscription?.unsubscribe();
  }

  private async loadInitialData(): Promise<void> {
    await this.loadInvestments();
    await this.loadInvestmentPlans();
    this.checkPlanUnlockStatus();
  }

  private async loadInvestments(): Promise<void> {
    if (!this.userId) return;
    const orders = await this.supabaseService.getUserInvestments(this.userId);
    if (orders) {
      this.userOrders = orders;
      this.purchasedPlans = {};
      this.userOrders.forEach(order => {
        if (order.plan_id) {
          this.purchasedPlans[order.plan_id] = (this.purchasedPlans[order.plan_id] || 0) + (order.purchased_quantity || 0);
        }
      });
      this.checkPlanUnlockStatus();
    }
  }

  // --- Realtime subscription setup ---
  private setupRealtimeSubscriptions(): void {
    if (!this.userId) return;

    this.walletChannel = this.supabaseService.client
      .channel('public:user_wallets')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_wallets',
        filter: `user_id=eq.${this.userId}`
      }, (payload) => {
        console.log('Wallet Realtime update received:', payload);
        this.walletService.fetchUserWallet(this.userId!);
      })
      .subscribe();

    this.investmentsChannel = this.supabaseService.client
      .channel('public:user_investments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_investments',
        filter: `user_id=eq.${this.userId}`
      }, (payload) => {
        console.log('Investments Realtime update received:', payload);
        this.loadInvestments();
      })
      .subscribe();
  }

  async loadInvestmentPlans(): Promise<void> {
    this.errorMessage = null;
    try {
      const daily = await this.supabaseService.getInvestmentPlans('daily');
      if (daily) {
        this.dailyPlans = daily;
      }

      const advanced = await this.supabaseService.getInvestmentPlans('advanced');
      if (advanced) {
        this.advancedPlans = advanced;
      }
    } catch (error) {
      console.error('Error loading investment plans:', error);
      this.errorMessage = 'Failed.';
    }
  }

  switchPlanType(type: 'daily' | 'advanced'): void {
    this.activePlanType = type;
  }

  getCurrentPlans(): InvestmentPlan[] {
    if (this.activePlanType === 'daily') {
      return [...this.dailyPlans, ...this.presalePlans];
    } else if (this.activePlanType === 'advanced') {
      return this.advancedPlans;
    }
    return [];
  }
  checkPlanUnlockStatus(): void {
    console.log('--- checkPlanUnlockStatus START (InvestComponent) ---');
    console.log('--- Current purchasedPlans map for checkPlanUnlockStatus ---', this.purchasedPlans);

    const isPlanPurchased = (type: 'daily' | 'advanced', tier: number): boolean => {
      const plan = [...this.dailyPlans, ...this.advancedPlans].find(p => p.plan_type === type && p.tier === tier);
      let isFound = false;
      let purchasedQuantityForLog = 'N/A';

      if (plan) {
        purchasedQuantityForLog = this.purchasedPlans[plan.id] !== undefined ? this.purchasedPlans[plan.id].toString() : '0';
        isFound = this.purchasedPlans[plan.id] > 0;
      } else {
        console.error(`ERROR: isPlanPurchased(${type}, ${tier}): Plan not found!`);
      }
      console.log(`DEBUG: isPlanPurchased(${type}, ${tier}): Found plan ID ${plan?.id}, Purchased Quantity: ${purchasedQuantityForLog}, Result: ${isFound}`);
      return isFound;
    };

    this.dailyPlans.forEach(plan => {
      console.log(`Processing Daily Plan: ${plan.title} (ID: ${plan.id}, Tier: ${plan.tier}, Initial isActive: ${plan.is_active})`);
      let shouldBeActive = plan.is_active;

      if (typeof plan.tier !== 'number') {
        console.warn(`-> Daily Plan ${plan.title} has undefined/invalid tier. Setting inactive.`);
        shouldBeActive = false;
      } else {
        if (plan.tier === 1) {
          shouldBeActive = plan.is_active;
          console.log(`-> Daily VIP 1 (Tier 1) special logic: retains DB active status (${plan.is_active}).`);
        } else {
          const previousDailyTierPurchased = isPlanPurchased('daily', plan.tier - 1);
          const previousAdvancedTierPurchased = isPlanPurchased('advanced', plan.tier - 1);

          shouldBeActive = Boolean(
            plan.is_active &&
            previousDailyTierPurchased &&
            previousAdvancedTierPurchased
          );
          console.log(`-> Daily VIP ${plan.tier} Logic: (Prev Daily Purchased: ${previousDailyTierPurchased}, Prev Advanced Purchased: ${previousAdvancedTierPurchased}, Initial Active: ${plan.is_active}) -> Result: ${shouldBeActive}`);
        }
      }

      if (plan.is_purchasable_once && this.purchasedPlans[plan.id] > 0) {
        console.log(`-> Purchasable Once check: Plan ${plan.id} already purchased (${this.purchasedPlans[plan.id]} times), setting is_active to false.`);
        shouldBeActive = false;
      }
      plan.is_active = shouldBeActive;
      console.log(`Final status for Daily Plan ${plan.title}: is_active = ${plan.is_active}`);
    });

    this.advancedPlans.forEach(plan => {
      console.log(`Processing Advanced Plan: ${plan.title} (ID: ${plan.id}, Tier: ${plan.tier}, Initial isActive: ${plan.is_active})`);
      let shouldBeActive = plan.is_active;

      if (typeof plan.tier !== 'number') {
        console.warn(`-> Advanced Plan ${plan.title} has undefined/invalid tier. Setting inactive.`);
        shouldBeActive = false;
      } else {
        const correspondingDailyTierPurchased = isPlanPurchased('daily', plan.tier);

        shouldBeActive = Boolean(
          plan.is_active &&
          correspondingDailyTierPurchased
        );
        console.log(`-> Advanced VIP ${plan.tier} Logic: (Corresponding Daily Purchased: ${correspondingDailyTierPurchased}, Initial Active: ${plan.is_active}) -> Result: ${shouldBeActive}`);
      }

      if (plan.is_purchasable_once && this.purchasedPlans[plan.id] > 0) {
        console.log(`-> Purchasable Once check: Plan ${plan.id} already purchased (${this.purchasedPlans[plan.id]} times), setting is_active to false.`);
        shouldBeActive = false;
      }
      plan.is_active = shouldBeActive;
      console.log(`Final status for Advanced Plan ${plan.title}: is_active = ${plan.is_active}`);
    });
    console.log('--- checkPlanUnlockStatus END (InvestComponent) ---');
  }

  goToInvestmentDetail(plan: InvestmentPlan): void {
    console.log('--- goToInvestmentDetail ---');
    console.log('Plan passed to goToInvestmentDetail:', plan);
    console.log('Is plan active (from plan object):', plan.is_active);
    console.log('Selected Plan Active Status:', plan.is_active);

    if (!this.userWallet) {
      this.investmentErrorMessage = 'Wallet data is still loading. Please wait.';
      setTimeout(() => this.investmentErrorMessage = '', 3000);
      console.warn('Attempted to open popup before userWallet was loaded.');
      return;
    }

    if (!plan.is_active) {
      this.investmentErrorMessage = 'This plan is currently locked or already purchased.';
      setTimeout(() => this.investmentErrorMessage = '', 3000);
      return;
    }
    this.selectedPlan = plan;
    this.investmentQuantity = plan.is_purchasable_once ? 1 : 1;
    this.investmentErrorMessage = '';
    this.investmentSuccessMessage = '';
    this.showInvestmentPopup = true;

    console.log('DEBUG (Popup Open): currentBalance =', this.currentBalance);
    console.log('DEBUG (Popup Open): selectedPlan.investment =', this.selectedPlan.investment);
    console.log('DEBUG (Popup Open): investmentQuantity =', this.investmentQuantity);
    console.log('DEBUG (Popup Open): getTotalInvestment() =', this.getTotalInvestment());
    console.log('DEBUG (Popup Open): canAffordInvestment() =', this.canAffordInvestment());
    console.log('DEBUG (Popup Open): isLoading =', this.isLoading);
    console.log('DEBUG (Popup Open): isLoadingUserData =', this.isLoadingUserData);
  }

  closeInvestmentPopup(): void {
    this.showInvestmentPopup = false;
    this.selectedPlan = null;
    this.investmentQuantity = 1;
    this.investmentErrorMessage = '';
    this.investmentSuccessMessage = '';
  }

  increaseQuantity(): void {
    if (this.selectedPlan && !this.selectedPlan.is_purchasable_once) {
      this.investmentQuantity++;
    }
  }

  decreaseQuantity(): void {
    if (this.selectedPlan && !this.selectedPlan.is_purchasable_once && this.investmentQuantity > 1) {
      this.investmentQuantity--;
    }
  }

  getTotalInvestment(): number {
    return this.selectedPlan ? this.selectedPlan.investment * this.investmentQuantity : 0;
  }

  canAffordInvestment(): boolean {
    const totalCost = Number(this.getTotalInvestment());
    console.log(`DEBUG (canAffordInvestment): Checking ${this.currentBalance} >= ${totalCost}`);
    return this.currentBalance >= totalCost;
  }
closeSuccessPopup() {
  this.showSuccessPopup = false;
}
  async confirmInvestment() {
  console.log('Attempting investment...');
  if (!this.userId || !this.selectedPlan || !this.userWallet) {
    this.investmentErrorMessage = 'User not logged in, no plan selected, or wallet not loaded.';
    return;
  }

  const totalCost = this.getTotalInvestment();
  if (!this.canAffordInvestment()) {
    this.investmentErrorMessage = 'Insufficient balance. Please recharge.';
    return;
  }
  if (!this.selectedPlan.is_active) {
    this.investmentErrorMessage = 'This plan is no longer available or already purchased.';
    return;
  }

  this.isLoading = true;
  this.investmentErrorMessage = '';
  this.investmentSuccessMessage = '';

  try {
    // 💰 Deduct wallet balance
    let newRechargedAmount = this.userWallet.recharged_amount;
    let newOrderIncome = this.userWallet.order_income;
    let newInviteCommission = this.userWallet.invite_commission;

    if (newRechargedAmount >= totalCost) {
      newRechargedAmount -= totalCost;
    } else {
      const remainingCost = totalCost - newRechargedAmount;
      newRechargedAmount = 0;
      if (newOrderIncome >= remainingCost) {
        newOrderIncome -= remainingCost;
      } else {
        const finalRemainingCost = remainingCost - newOrderIncome;
        newOrderIncome = 0;
        newInviteCommission -= finalRemainingCost;
      }
    }

    const { data: updatedWallet, error: walletError } =
      await this.supabaseService.updateWalletBalance(
        this.userId,
        newRechargedAmount,
        newOrderIncome,
        newInviteCommission
      );

    if (walletError || !updatedWallet) throw new Error('Failed to update wallet balance.');

    this.userWallet = updatedWallet;

    // 🗓 Create investment record
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (this.selectedPlan.days || 0));

    const newInvestmentData: NewInvestment = {
      user_id: this.userId,
      plan_id: this.selectedPlan.id,
      quantity: this.investmentQuantity,
      invested_amount: totalCost,
      daily_return_amount: this.selectedPlan.daily_income * this.investmentQuantity,
      end_date: endDate.toISOString(),
      start_date: startDate.toISOString(),
      current_status: 'active',
      last_daily_payout_date: null,
      current_earnings: 0
    };

    const { data: createdInvestmentRecord, error: investmentError } =
      await this.supabaseService.createInvestment(newInvestmentData);

    if (investmentError || !createdInvestmentRecord) {
      throw new Error('Failed to create investment record.');
    }

    // 📜 Log transaction
    await this.supabaseService.createTransaction({
      user_id: this.userId,
      type: transaction_type.Investment,
      amount: totalCost,
      status: transaction_status.Completed,
      related_entity_id: createdInvestmentRecord.id,
      description: `Investment in ${this.selectedPlan.title} x${this.investmentQuantity}`
    });

    // 🎉 Success
    this.investmentSuccessMessage = `Successfully invested ₹${totalCost} in ${this.selectedPlan.title}!`;

    // Hide main popup & show success popup

    setTimeout(() => {
    this.router.navigate(['/orders']);
}, 500);
this.showInvestmentPopup = false;
    this.showSuccessPopup = true;

    // Update purchased plans
    this.purchasedPlans[this.selectedPlan.id] =
      (this.purchasedPlans[this.selectedPlan.id] || 0) + this.investmentQuantity;

    this.checkPlanUnlockStatus();
    this.isLoading = false;

  } catch (error) {
    console.error('Investment failed:', error);
    this.investmentErrorMessage = `Investment failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
    this.isLoading = false;
  }
}


  formatNumber(value: number, decimals: number = 2): string {
    return value.toFixed(decimals);
  }

  getPlanLockStatus(plan: InvestmentPlan): string {
    if (plan.is_active) return 'Unlocked';
    if (plan.is_purchasable_once && this.purchasedPlans[plan.id] > 0) {
      return 'Purchased';
    }
    return 'Locked';
  }

  navigateToRecharge(): void { this.router.navigate(['/recharge']); }
  navigateToHome(): void { this.router.navigate(['/home']); }
  navigateToInvite(): void { this.router.navigate(['/invite']); }
  navigateToAbout(): void { this.router.navigate(['/about']); }
  navigateToSettings(): void { this.router.navigate(['/settings']); }
  openCustomerService(): void { window.open('https://t.me/Volt_support_care', '_blank'); }
  navigateToInvest() {
    this.router.navigate(['/invest']);
  }
  navigateToTeam() {
    this.router.navigate(['/team']);
  }
  presalePlans: InvestmentPlan[] = [
  // {
  //   id: 101,
  //   title: 'Pre-sale Daily Plan A',
  //   image_url: 'https://img.freepik.com/free-photo/view-electric-car-that-is-being-charged_23-2150972407.jpg?t=st=1720693341~exp=1720696941~hmac=15e59a7093909935142314613598694182ca89a059d5108831a2552862123858&w=1380',
  //   is_active: false,
  //   is_presale: true,
  //   investment: 5000,
  //   daily_income: 1500,
  //   days: 30,
  //   total: 45000,
  //   plan_type: 'daily',
  //   tier: 1,
  //   is_purchasable_once: false
  // },
  // {
  //   id: 102,
  //   title: 'Pre-sale Daily Plan B',
  //   image_url: 'https://img.freepik.com/free-photo/electric-car-charging-station-night_23-2150972412.jpg?t=st=1720693364~exp=1720696964~hmac=3330303805a33a43548b9a4a03a4586043d651c2923f8b92d44d0b941f9f3dfc&w=1380',
  //   is_active: false,
  //   is_presale: true,
  //   investment: 10000,
  //   daily_income: 2500,
  //   days: 35,
  //   total: 87500,
  //   plan_type: 'daily',
  //   tier: 2,
  //   is_purchasable_once: false
  // },
];
}
