import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

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

  constructor(private route: ActivatedRoute, private router: Router) {}

  redeemGiftCode() {
    if (!this.giftCode.trim()) {
      this.showMessage('Please enter a gift code', false);
      return;
    }

    this.isLoading = true;
    this.message = '';

    // Simulate API call
    setTimeout(() => {
      this.isLoading = false;
      // You can implement actual redemption logic here
      this.showMessage('Gift code redeemed successfully!', true);
      this.giftCode = '';
    }, 2000);
  }

  showMessage(text: string, success: boolean) {
    this.message = text;
    this.isSuccess = success;
    setTimeout(() => {
      this.message = '';
    }, 3000);
  }

  goToTelegram() {
    const telegramUrl = 'https://t.me/your_bot_username?start=gift_codes';
    window.open(telegramUrl, '_blank');
  }

   goBack() { this.router.navigate(['/home']); }
}