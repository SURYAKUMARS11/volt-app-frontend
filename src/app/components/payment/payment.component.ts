import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router'; // <-- Added ActivatedRoute
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { Clipboard } from '@angular/cdk/clipboard';
import { provideAnimations } from '@angular/platform-browser/animations';
// Import necessary Angular modules for template features
import { CommonModule } from '@angular/common'; // For *ngIf and pipes like 'number'
import { FormsModule } from '@angular/forms'; // For [(ngModel)]

// Import all Lucide icons and the module for the <lucide-icon> component
import {
  LucideAngularModule,
  ArrowLeftIcon,
  ShieldIcon,
  ClockIcon,
  CreditCardIcon,
  QrCodeIcon,
  CheckCircleIcon,
  CopyIcon,
  AlertCircleIcon
} from 'lucide-angular';

import { SupabaseService } from '../../supabase.service'; // <-- Import SupabaseService
import { environment } from '../../../environments/environment.development';

@Component({
  selector: 'app-payment',
  standalone: true, // This is a standalone component
  // The 'imports' array must contain all modules needed for the component's template
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    HttpClientModule,
    ToastrModule,
  ],
  providers: [SupabaseService],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css']
})
export class PaymentComponent implements OnInit, OnDestroy {
  // Lucide Icons are made available to the template via these properties
  ArrowLeftIcon = ArrowLeftIcon;
  ShieldIcon = ShieldIcon;
  ClockIcon = ClockIcon;
  CreditCardIcon = CreditCardIcon;
  QrCodeIcon = QrCodeIcon;
  CheckCircleIcon = CheckCircleIcon;
  CopyIcon = CopyIcon;
  AlertCircleIcon = AlertCircleIcon;
  showPopup = false;
  // Payment State
  paymentAmount: number = 0; // <-- Initialized to 0, will be set from the route
  upiId: string = 'voltearning@pytes'; // Replace with your actual UPI ID
  activeTab: 'upi' | 'qr' = 'upi';
  upiCopied: boolean = false;
  amountCopied: boolean = false;

  // UTR/Mobile Number
  utrNumber: string = '';
  mobileNumber: string = '';
  userId: string | null = null; // <-- Add userId property

  // Timer
  timeLeft: number = 600; // 10 minutes in seconds
  timerInterval: any;

  // Loading State
  isVerifying: boolean = false;
  private flaskApiBaseUrl = environment.backendApiUrl; // <-- Correctly assign the base URL

  constructor(
    private router: Router,
    private route: ActivatedRoute, // <-- Inject ActivatedRoute here
    private http: HttpClient,
    private toastr: ToastrService,
    private clipboard: Clipboard,
    private supabaseService: SupabaseService // <-- Inject SupabaseService here
  ) {}

  ngOnInit() {
  window.scrollTo(0, 0);

  // 1. Get the payment amount from the route parameter
  this.route.queryParams.subscribe(params => {
      const amountParam = params['amount'];
      if (!amountParam) {
        console.log('PaymentComponent: No amount parameter found, redirecting to recharge');
        this.router.navigate(['/recharge']); // redirect or show error
        return;
      }

      this.paymentAmount = +amountParam; // convert to number
      console.log('PaymentComponent: Amount received:', this.paymentAmount);
    });

    this.initializeUser(); // Fetch user ID and start the timer
  }

async initializeUser() {
  try {
    const user = await this.supabaseService.getUser();

    if (user) {
      this.userId = user.id;
      console.log("PaymentComponent: Fetched user ID:", this.userId);
      this.startTimer(); // Start the timer only after we have a user and amount
    } else {
      console.warn('PaymentComponent: User not logged in, redirecting to recharge.');
      this.router.navigate(['/recharge']);
    }
  } catch (error) {
    console.error('PaymentComponent: Error fetching user:', error);
    this.toastr.error('Failed to get user details.', 'Error');
    this.router.navigate(['/recharge']);
  }
}

  ngOnDestroy(): void {
    // Clear the timer when the component is destroyed to prevent memory leaks
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  goBack() {
    // Navigate back to the previous page or a specific route
    this.router.navigate(['/recharge']);
  }

  switchTab(tab: 'upi' | 'qr') {
    this.activeTab = tab;
  }
  closePopup() {
  this.showPopup = false;
  this.router.navigate(['/deposit-record']);
}

  copyUpiId() {
    this.clipboard.copy(this.upiId);
    this.upiCopied = true;
    this.toastr.success('UPI ID copied to clipboard!', 'Copied!');
    setTimeout(() => {
      this.upiCopied = false;
    }, 2000);
  }

  copyAmount() {
    this.clipboard.copy(this.paymentAmount.toString());
    this.amountCopied = true;
    this.toastr.success('Amount copied to clipboard!', 'Copied!');
    setTimeout(() => {
      this.amountCopied = false;
    }, 2000);
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        clearInterval(this.timerInterval);
        // Handle session expiration
        this.toastr.error('Payment session expired. Please start a new transaction.', 'Session Expired');
        this.router.navigate(['/recharge']);
      }
    }, 1000);
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
  }

  // --- NEW: Method to handle payment verification ---
  verifyPayment() {
    if (!this.utrNumber || this.utrNumber.length !== 12) {
      this.toastr.error('Please enter a valid UTR/Transaction ID.', 'Invalid UTR');
      return;
    }

    // Check if the userId is available before proceeding
    if (!this.userId) {
      this.toastr.error('User not authenticated. Please log in again.', 'Error');
      this.router.navigate(['/login']);
      return;
    }

    this.isVerifying = true;

    // Use the fetched user ID
    const paymentData = {
      userId: this.userId, // <-- Use this.userId here
      amount: this.paymentAmount,
      utrNumber: this.utrNumber,
      mobileNumber: this.mobileNumber || '',
      paymentMethod: 'upi_manual'
    };

    // Use the environment variable for the backend URL
    this.http.post(`${this.flaskApiBaseUrl}/manual-payment/confirm`, paymentData)
      .subscribe({
        next: (response: any) => {
          this.isVerifying = false;
          if (response.success) {
            this.showPopup = true;
            // this.router.navigate(['/deposit-record']);
          } else {
            this.toastr.error(response.message || 'Failed to submit payment details.', 'Error');
          }
        },
        error: (error) => {
          this.isVerifying = false;
          console.error('Error submitting payment:', error);
          if (error.status === 200 && error.error instanceof SyntaxError) {
             this.toastr.error('An error occurred with the server response. Check the backend server log for details.', 'Server Response Error');
          } else {
            this.toastr.error('An error occurred. Please try again.', 'Error');
          }
        }
      });
  }
}
