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


  if (this.loginPhoneNumber.length !== 10 || !this.loginPassword) {
    this.isLoading = false;

    await Swal.fire({
      icon: 'error',
      title: 'Invalid Input',
      text: 'Please enter a valid phone number and password.',
      showConfirmButton: false,
      timer: 2500,
      customClass: {
        popup: 'custom-swal-popup',
        title: 'custom-swal-title',
        htmlContainer: 'custom-swal-content',
        icon: 'custom-swal-icon'
      }
    });
    return;
  }

  try {
    Swal.fire({
      title: 'Signing in...',
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
      customClass: {
        popup: 'custom-swal-popup',
        title: 'custom-swal-title',
        icon: 'custom-swal-icon'
      }
    });

    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
      phone: `+91${this.loginPhoneNumber}`,
      password: this.loginPassword
    });

    Swal.close();
    this.isLoading = false;


    if (error) throw error;

    await Swal.fire({
      icon: 'success',
      title: 'Signed in successfully!',
      showConfirmButton: false,
      timer: 2000,
      customClass: {
        popup: 'custom-swal-popup',
        title: 'custom-swal-title',
        htmlContainer: 'custom-swal-content',
        icon: 'custom-swal-icon'
      }
    });

    console.log('User logged in:', data.user);
    this.router.navigate(['/home']);

  } catch (error: any) {
    Swal.close();
    this.isLoading = false;

    await Swal.fire({
      icon: 'error',
      title: 'Login Failed',
      text: error.message,
      showConfirmButton: false,
      timer: 10000,
      customClass: {
        popup: 'custom-swal-popup',
        title: 'custom-swal-title',
        htmlContainer: 'custom-swal-content',
        icon: 'custom-swal-icon'
      }
    });

    console.error('Login error:', error);
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
  goToSignup() {
    this.router.navigate(['/signup']);
  }
}