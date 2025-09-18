import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-download-app',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './download-app.component.html',
  styleUrls: ['./download-app.component.css']
})
export class DownloadAppComponent {

   ngOnInit() {
    window.scrollTo(0, 0);
      this.checkIfInstalled();

  }
  deferredPrompt: any;
  isInstalled = false;


  checkIfInstalled() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    this.isInstalled = !!isStandalone;
  }

  // Capture install prompt when available
  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(event: Event) {
    event.preventDefault();
    this.deferredPrompt = event;
    console.log('PWA install prompt captured');
  }

  installPWA() {
    if (this.isInstalled) {
      alert('App is already installed.');
      return;
    }

    if (!this.deferredPrompt) {
      alert('Install option not available yet. Please try again later.');
      return;
    }

    this.deferredPrompt.prompt();

    this.deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted installation');
        this.isInstalled = true; // Mark as installed
      } else {
        console.log('User dismissed installation');
      }
      this.deferredPrompt = null;
    });
  }
  appFeatures = [
    {
      icon: 'fas fa-mobile-alt',
      title: 'Mobile Optimized',
      description: 'Designed specifically for mobile devices with smooth performance'
    },
    {
      icon: 'fas fa-bell',
      title: 'Push Notifications',
      description: 'Get instant notifications about earnings, withdrawals, and updates'
    },
    {
      icon: 'fas fa-shield-alt',
      title: 'Enhanced Security',
      description: 'Advanced security features including biometric authentication'
    },
    {
      icon: 'fas fa-bolt',
      title: 'Faster Performance',
      description: 'Lightning-fast app performance for better user experience'
    },
    {
      icon: 'fas fa-wifi',
      title: 'Offline Access',
      description: 'Access your account information even when offline'
    },
    {
      icon: 'fas fa-sync',
      title: 'Auto Updates',
      description: 'Automatic updates ensure you always have the latest features'
    }
  ];

  downloadStats = {
    downloads: '50K+',
    rating: '4.8',
    reviews: '2.5K+',
    size: '25MB'
  };

  constructor(private router: Router) {}

  downloadAndroidApp() {
    // Replace with actual Play Store link
    window.open('https://play.google.com/store/apps/details?id=com.voltpro.app', '_blank');
  }

  downloadIOSApp() {
    // Replace with actual App Store link
    window.open('https://apps.apple.com/app/voltpro/id123456789', '_blank');
  }

  shareApp() {
    const message = 'Download Volt Pro app and start earning daily! Get it now: https://voltpro.com/download';
    if (navigator.share) {
      navigator.share({
        title: 'Volt Pro - Earn Money Daily',
        text: message,
        url: 'https://voltpro.com/download'
      });
    } else {
      navigator.clipboard.writeText(message).then(() => {
        alert('Download link copied to clipboard!');
      });
    }
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