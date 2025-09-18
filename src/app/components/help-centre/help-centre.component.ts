import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-help-centre',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './help-centre.component.html',
  styleUrls: ['./help-centre.component.css']
})
export class HelpCentreComponent {

  ngOnInit() {
    window.scrollTo(0, 0);

  }

  faqItems = [
    {
      question: 'How do I start earning with Volt?',
      answer: 'Simply sign up, choose an investment plan, and start earning daily returns. Your earnings will be credited to your wallet automatically.',
      isOpen: false
    },
    {
      question: 'What is the minimum investment amount?',
      answer: 'The minimum investment amount is ₹500 for VIP 1 plan. You can choose from various plans based on your budget.',
      isOpen: false
    },
    {
      question: 'How long does withdrawal take?',
      answer: 'Withdrawals are processed within 24-48 hours. Make sure your bank details are verified for faster processing.',
      isOpen: false
    },
    {
      question: 'How does the referral system work?',
      answer: 'Earn ₹10 for each friend who signs up using your referral code. get 10% commission when they activate their accounts.',
      isOpen: false
    },
    {
      question: 'Is my money safe with Volt?',
      answer: 'Yes, we use advanced security measures and encryption to protect your funds and personal information.',
      isOpen: false
    }
  ];

  supportChannels = [
    {
      name: 'Telegram Channel',
      description: 'Instant updates and news',
      icon: 'fab fa-telegram-plane',
      action: 'Join Channel',
      link: 'https://t.me/voltearning'
    },
    {
      name: 'Telegram Support',
      description: 'Get instant help ',
      icon: 'fab fa-telegram-plane',
      action: 'Contact Support',
      link: 'https://t.me/voltsupport'
    }
  ];

  constructor(private router: Router) {}

  toggleFaq(index: number) {
    this.faqItems[index].isOpen = !this.faqItems[index].isOpen;
  }

  openSupportChannel(link: string) {
    window.open(link, '_blank');
  }

  goBack() {
    this.router.navigate(['/settings']);
  }

  navigateToHome(): void { this.router.navigate(['/home']); }
  navigateToInvest(): void { this.router.navigate(['/invest']); }
  navigateToTeam(): void { this.router.navigate(['/team']); }
  navigateToSettings(): void { this.router.navigate(['/settings']); }
  openCustomerService(): void { window.open('https://t.me/Volt_support_care', '_blank'); }
}