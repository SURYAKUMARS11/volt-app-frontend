import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.css']
})
export class BlogComponent implements OnInit, OnDestroy {
  selectedFile: File | null = null;
  userComment: string = '';
  isUploading: boolean = false;
  uploadMessage: { type: 'success' | 'error'; text: string } | null = null;

  canPostToday: boolean = true;
  timeLeftForNextPost: string = '';
  private countdownSubscription: Subscription | null = null;

  canClaimReward: boolean = false;
  isClaiming: boolean = false;
  claimMessage: { type: 'success' | 'error'; text: string } | null = null;

  // Simulate backend data
  private lastPostDate: string | null = null; // YYYY-MM-DD format
  private hasClaimedToday: boolean = false;

  recentProofs = [
    { imageUrl: 'assets/images/qr.jpg', comment: 'Got my withdrawal instantly! Volt is amazing!', username: 'User123' },
    { imageUrl: 'assets/images/qr.jpg', comment: 'Fastest withdrawals ever. Highly recommend!', username: 'EarnBig' },
  ];

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.checkDailyPostStatus();
    this.checkRewardClaimStatus();
  }

  ngOnDestroy(): void {
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
  }

  private checkDailyPostStatus() {
    // In a real app, fetch lastPostDate from user data (backend)
    // For simulation, use localStorage
    this.lastPostDate = localStorage.getItem('lastPostDate');

    const today = new Date().toISOString().slice(0, 10);

    if (this.lastPostDate === today) {
      this.canPostToday = false;
      this.startCountdown();
    } else {
      this.canPostToday = true;
      localStorage.removeItem('lastPostDate'); // Clear for new day
    }
  }

  private startCountdown() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Set to midnight of next day

    this.countdownSubscription = interval(1000).subscribe(() => {
      const remainingTime = tomorrow.getTime() - new Date().getTime();
      if (remainingTime <= 0) {
        this.canPostToday = true;
        this.timeLeftForNextPost = '';
        this.countdownSubscription?.unsubscribe();
        localStorage.removeItem('lastPostDate');
      } else {
        const hours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
        this.timeLeftForNextPost = `${hours}h ${minutes}m ${seconds}s`;
      }
    });
  }

  private checkRewardClaimStatus() {
    // In a real app, fetch hasClaimedToday from user data (backend)
    this.hasClaimedToday = localStorage.getItem('hasClaimedToday') === 'true';
    this.canClaimReward = !this.hasClaimedToday;
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadMessage = null;
    }
  }

  uploadProof() {
    if (!this.selectedFile || !this.userComment) {
      this.uploadMessage = { type: 'error', text: 'Please select an image and add a comment.' };
      return;
    }
    if (!this.canPostToday) {
      this.uploadMessage = { type: 'error', text: 'You can only upload one proof per day.' };
      return;
    }

    this.isUploading = true;
    this.uploadMessage = null;

    // Simulate upload process
    setTimeout(() => {
      // In a real application, send this to a backend service
      console.log('Uploading:', this.selectedFile?.name, 'Comment:', this.userComment);

      // Simulate successful upload
      this.recentProofs.unshift({
        imageUrl: URL.createObjectURL(this.selectedFile!),
        comment: this.userComment,
        username: 'You' // Replace with actual username
      });

      this.uploadMessage = { type: 'success', text: 'Proof uploaded successfully! Now claim your bonus.' };
      this.selectedFile = null;
      this.userComment = '';
      (document.getElementById('proofImage') as HTMLInputElement).value = ''; // Clear file input
      this.isUploading = false;

      // Update daily post status
      localStorage.setItem('lastPostDate', new Date().toISOString().slice(0, 10));
      this.canPostToday = false;
      this.startCountdown();
      this.canClaimReward = true; // User can claim after successful upload
      localStorage.setItem('hasClaimedToday', 'false'); // Reset claim status for new post

    }, 2000);
  }

  claimReward() {
    if (!this.canClaimReward) {
      this.claimMessage = { type: 'error', text: 'No reward to claim or already claimed today.' };
      return;
    }

    this.isClaiming = true;
    this.claimMessage = null;

    // Simulate reward claiming
    setTimeout(() => {
      const rewardAmount = Math.floor(Math.random() * (10 - 5 + 1)) + 5; // Random between 5 and 10
      this.claimMessage = { type: 'success', text: `Successfully claimed ₹${rewardAmount}! Added to your balance.` };
      this.canClaimReward = false;
      this.hasClaimedToday = true;
      localStorage.setItem('hasClaimedToday', 'true');
      this.isClaiming = false;
    }, 1500);
  }

  // Navigation methods for bottom nav
  navigateToHome(): void { this.router.navigate(['/home']); }
  navigateToInvest(): void { this.router.navigate(['/invest']); }
  navigateToTeam(): void { this.router.navigate(['/team']); }
  navigateToSettings(): void { this.router.navigate(['/settings']); }
  openCustomerService(): void { window.open('https://t.me/Volt_support_care', '_blank'); }
}
