import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { LoadingComponent } from '../../loading/loading.component';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule,LoadingComponent],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnInit {
  nickname: string = '';
  phoneNumber: string = '';
  password_signup: string = '';
  confirmPassword_signup: string = '';
  message: string = '';
  isSuccess: boolean = false;
  isLoading: boolean = false;
  // isLoadingStatus: boolean = false;
  // Properties for focus states (added for updated HTML)
  nicknameFocused: boolean = false;
  phoneFocused: boolean = false;
  passwordFocused: boolean = false;
  confirmFocused: boolean = false;
  showPassword: boolean = false;
  // Property to toggle password visibility (added for updated HTML)


  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    console.log('ngOnInit: SignupComponent initialized. Checking for referral code in URL.');

    this.route.queryParams.subscribe(params => {
      const refCodeFromUrl = params['ref'];
      console.log('ngOnInit: Raw "ref" parameter from URL:', refCodeFromUrl);

      if (refCodeFromUrl) {
        localStorage.setItem('referral_code_from_url', refCodeFromUrl);
        console.log('✅ ngOnInit: Successfully stored referral code in localStorage:', refCodeFromUrl);
      } else {
        console.log('❌ ngOnInit: No "ref" query parameter found in the URL. localStorage will not be updated with a referral code.');
      }
      console.log('ngOnInit: Current value in localStorage after processing:', localStorage.getItem('referral_code_from_url'));
    });
  }

  // New methods added to support the updated HTML:

  /**
   * Calculates the progress of the form completion.
   * Used for the progress bar in the HTML.
   * @returns The completion percentage (0-100).
   */
  getFormProgress(): number {
    let completedFields = 0;
    const totalFields = 4; // nickname, phoneNumber, password_signup, confirmPassword_signup

    if (this.nickname.trim().length >= 2) {
      completedFields++;
    }
    if (this.phoneNumber.length === 10) {
      completedFields++;
    }
    if (this.password_signup.length >= 6) {
      completedFields++;
    }
    if (this.confirmPassword_signup.length > 0 && this.password_signup === this.confirmPassword_signup) {
      completedFields++;
    }

    return (completedFields / totalFields) * 100;
  }

  /**
   * Toggles the visibility of the password field.
   */
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
 togglePasswordVisibility() {
  this.showPassword = !this.showPassword;
}
  /**
   * Calculates the strength of the password.
   * @returns The password strength as a percentage (0-100).
   */
  getPasswordStrength(): number {
    let strength = 0;
    const password = this.password_signup;

    if (password.length >= 6) {
      strength += 25;
    }
    if (/[A-Z]/.test(password)) {
      strength += 20;
    }
    if (/[a-z]/.test(password)) {
      strength += 20;
    }
    if (/[0-9]/.test(password)) {
      strength += 20;
    }
    if (/[^A-Za-z0-9]/.test(password)) {
      strength += 15;
    }

    return Math.min(strength, 100);
  }

  /**
   * Returns a CSS class based on the password strength for styling.
   * @returns 'weak', 'medium', or 'strong'.
   */
  getStrengthClass(): string {
    const strength = this.getPasswordStrength();
    if (strength < 40) {
      return 'weak';
    } else if (strength < 75) {
      return 'medium';
    } else {
      return 'strong';
    }
  }

  /**
   * Returns a text description of the password strength.
   * @returns 'Weak', 'Medium', or 'Strong'.
   */
  getStrengthText(): string {
    const strength = this.getPasswordStrength();
    if (strength < 40) {
      return 'Weak';
    } else if (strength < 75) {
      return 'Medium';
    } else {
      return 'Strong';
    }
  }

  /**
   * Validates if the entire form is ready for submission.
   * @returns True if all fields are valid, false otherwise.
   */
  isFormValid(): boolean {
    return (
      this.nickname.trim().length >= 2 &&
      this.phoneNumber.length === 10 &&
      this.password_signup.length >= 6 &&
      this.password_signup === this.confirmPassword_signup &&
      !this.isLoading
    );
  }

  private displayMessage(msg: string, success: boolean = false) {
    this.message = msg;
    this.isSuccess = success;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

  async signup() {
  this.isLoading = true;
  this.isSuccess = false;


  // Validation checks with SweetAlert
  if (!this.nickname.trim() || this.nickname.trim().length < 2) {
    Swal.fire('Oops!', 'Nickname must be at least 2 characters long.', 'warning');
    this.isLoading = false;
    return;
  }
  if (this.phoneNumber.length !== 10) {
    Swal.fire('Invalid Phone', 'Please enter a valid 10-digit mobile number.', 'warning');
    this.isLoading = false;
    
    return;
  }
  if (this.password_signup.length < 6) {
    Swal.fire('Weak Password', 'Password must be at least 6 characters long.', 'warning');
    this.isLoading = false;
    
    return;
  }
  if (this.password_signup !== this.confirmPassword_signup) {
    Swal.fire('Mismatch', 'Passwords do not match!', 'error');
    this.isLoading = false;
    return;
  }

  const referralCode = localStorage.getItem('referral_code_from_url');
  console.log('✅ signup(): Value of referralCode retrieved from localStorage:', referralCode);

  try {
    Swal.fire({
      title: 'Please wait...',
      text: 'Creating your account',
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false
    });

    const backendResponse = await fetch(`${environment.backendApiUrl}/create-supabase-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname: this.nickname,
        phoneNumber: `+91${this.phoneNumber}`,
        password: this.password_signup,
        referral_code: referralCode
      })
    });

    const responseData = await backendResponse.json();

    Swal.close();

    if (!backendResponse.ok) {
      if (backendResponse.status === 409) {
        Swal.fire('Already Registered', responseData.error || 'This phone number is already registered.', 'info');
      } else {
        Swal.fire('Error', responseData.error || 'Failed to create account. Please try again.', 'error');
      }
      throw new Error(responseData.error || 'Backend error.');
    }

    Swal.fire('Success!', 'Account created successfully! You can now sign in.', 'success');

    this.router.navigate(['/signin']);
    localStorage.removeItem('referral_code_from_url');

  } catch (error: any) {
    if (!this.message) {
      Swal.fire('Error', `Error creating account: ${error.message || 'Network error.'}`, 'error');
    }
    console.error('Error creating account:', error);
  } finally {
    this.isLoading = false;

  }
}


  goToSignin() {
    this.router.navigate(['/signin']);
  }
}