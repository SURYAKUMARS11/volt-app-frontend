import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from '../../supabase.service';
import { environment } from '../../../environments/environment.development';


@Component({
  selector: 'app-gift',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gift.component.html',
  styleUrls: ['./gift.component.css']
})
export class GiftComponent {
  giftCode = '';
  isLoading = false;
  message = '';
  isSuccess = false;
  giftCodeFocused = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private supabaseService: SupabaseService
  ) {}

  async redeemGiftCode() {
    if (!this.giftCode.trim()) {
      this.showMessage('Please enter a gift code', false);
      return;
    }

    this.isLoading = true;
    this.message = '';

    try {
      const session = await this.supabaseService.getSession();
      const user = await this.supabaseService.getUser();

      if (!session || !user) {
        this.showMessage('You must be logged in to redeem a gift code.', false);
        this.isLoading = false;
        return;
      }

      const userId = user.id;
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      });

      const body = {
        userId: userId,
        giftCode: this.giftCode.trim()
      };

      const response = await firstValueFrom(
        this.http.post<any>(`${environment.backendApiUrl}/gift-code/redeem`, body, { headers })
      );

      if (response.success) {
        this.showMessage(response.message, true);
        this.giftCode = '';
      } else {
        this.showMessage(response.message, false);
      }
    } catch (error: any) {
      console.error('API Error:', error);
      const errorMessage = error.error?.message || 'Failed to redeem gift code. Please try again.';
      this.showMessage(errorMessage, false);
    } finally {
      this.isLoading = false;
    }
  }

  showMessage(text: string, success: boolean) {
    this.message = text;
    this.isSuccess = success;
    setTimeout(() => {
      this.message = '';
    }, 3000);
  }

  goToTelegram() {
    const telegramUrl = 'https://t.me/Volt_support_care?start=gift_codes';
    window.open(telegramUrl, '_blank');
  }

  goBack() { this.router.navigate(['/home']); }
}
