// src/app/components/orders/orders.component.ts

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SupabaseService, Order, transaction_status, InvestmentPlan } from '../../supabase.service';

// Corrected type based on your Supabase schema
type PlanType = 'daily' | 'advanced';

// A new interface to combine data from the service's Order and InvestmentPlan
// This matches the properties your HTML template is trying to access.
export interface DisplayOrder {
  id: number;
  plan_id?: number;
  plan_title?: string;
  plan_type?: PlanType; // Added this property from InvestmentPlan
  type: 'investment';
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

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class OrdersComponent implements OnInit {
  activeTab: PlanType = 'daily'; 
  orders: DisplayOrder[] = [];
  isLoading: boolean = true;

  constructor(
    private router: Router,
    private supabaseService: SupabaseService
  ) { }

  async ngOnInit(): Promise<void> {
    await this.loadOrders();
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
  
  navigateToInvest(): void {
    this.router.navigate(['/invest']);
  }

  switchTab(tab: PlanType): void {
    this.activeTab = tab;
  }

  async loadOrders(): Promise<void> {
    this.isLoading = true;
    try {
      const user = await this.supabaseService.getUser();
      if (!user) {
        console.warn('User not logged in, cannot load orders.');
        this.orders = [];
        this.isLoading = false;
        return;
      }

      const userId = user.id;

      // 1. Fetch user investments
      const fetchedOrders = await this.supabaseService.getUserInvestments(userId);
      
      // 2. Fetch all investment plans to get the missing plan_type
      const dailyPlans = await this.supabaseService.getInvestmentPlans('daily');
      const advancedPlans = await this.supabaseService.getInvestmentPlans('advanced');
      const allPlans = [...(dailyPlans || []), ...(advancedPlans || [])];

      if (fetchedOrders) {
        this.orders = fetchedOrders.map(order => {
          const matchingPlan = allPlans.find(plan => plan.id === order.plan_id);

          // Calculate progress percentage
          const totalDurationMs = order.duration_days ? order.duration_days * 24 * 60 * 60 * 1000 : 0;
          const timeElapsedMs = new Date().getTime() - new Date(order.date).getTime();
          let progressPercentage = 0;
          if (totalDurationMs > 0) {
            progressPercentage = Math.min(100, (timeElapsedMs / totalDurationMs) * 100);
          }

          // Return the new combined object
          return {
            ...order,
            progress_percentage: progressPercentage,
            plan_type: matchingPlan?.plan_type // Assign the missing plan_type
          } as DisplayOrder;
        });
      }

    } catch (error) {
      console.error('Failed to load orders:', error);
      this.orders = [];
    } finally {
      this.isLoading = false;
    }
  }

  getFilteredOrders(): DisplayOrder[] {
    return this.orders.filter(order => order.plan_type === this.activeTab);
  }

  getOrderIcon(planType: PlanType | undefined): string {
    switch (planType) {
      case 'daily': return 'fas fa-calendar-day';
      case 'advanced': return 'fas fa-award';
      default: return 'fas fa-chart-line';
    }
  }

  getStatusColor(status: transaction_status): string {
    switch (status) {
      case transaction_status.Active: return 'status-active';
      case transaction_status.Completed: return 'status-completed';
      case transaction_status.Pending: return 'status-pending';
      case transaction_status.Failed: return 'status-failed';
      case transaction_status.Cancelled: return 'status-cancelled';
      default: return '';
    }
  }

  viewOrderDetails(order: DisplayOrder): void {
    console.log('Viewing details for order:', order);
  }

  floor(value: number): number {
    return Math.floor(value);
  }
}