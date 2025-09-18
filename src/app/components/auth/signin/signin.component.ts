import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../supabase.service';
import { LoadingComponent } from '../../loading/loading.component';
import Swal from 'sweetalert2';



@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [CommonModule, FormsModule,LoadingComponent],
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.css']
})
export class SigninComponent {
  loginPhoneNumber: string = '';
  loginPassword: string = '';
  message: string = '';
  isSuccess: boolean = false;
  isLoading: boolean = false;
  // isLoadingStatus: boolean = false;
  showLoginPassword: boolean = false;
  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
  ) {}

  private displayMessage(msg: string, success: boolean = false) {
    this.message = msg;
    this.isSuccess = success;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }
  toggleLoginPasswordVisibility() {
  this.showLoginPassword = !this.showLoginPassword;
}
  async signIn() {
  this.isLoading = true;
  this.isSuccess = false;
  this.message = ''; // clear old messages

  // Validation
  if (this.loginPhoneNumber.length !== 10 || !this.loginPassword) {
    this.isLoading = false;
    this.isSuccess = false;
    this.message = 'Please enter a valid phone number and password.';
    return;
  }

  try {
    // Show loading message in popup
    this.isSuccess = true;
    this.message = 'Signing in...';

    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
      phone: `+91${this.loginPhoneNumber}`,
      password: this.loginPassword
    });

    this.isLoading = false;

    if (error) {
      throw error;
    }

    // Success popup
    this.isSuccess = true;
    this.message = 'Signed in successfully!';

    setTimeout(() => {
      this.router.navigate(['/home']);
    }, 2000);

  } catch (error: any) {
    this.isLoading = false;
    this.isSuccess = false;
    this.message = error.message || 'Login failed. Please try again.';
  } finally {
    // Auto-hide popup after 5 sec
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }
}

//   async signIn() {
//   this.isLoading = true;

//   // TEMP: Bypass login validation and Supabase
//   this.displayMessage('Bypassing login... Redirecting to Home.', true);
//   console.log('Bypassing login. Redirecting to Home.');
//   await new Promise(resolve => setTimeout(resolve, 1000)); // Optional delay

//   this.router.navigate(['/home']);
//   this.isLoading = false;
// }
closePopup() {
  this.message = '';
}
  goToSignup() {
    this.router.navigate(['/signup']);
  }
}