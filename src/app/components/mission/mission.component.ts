import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Mission {
  id: number;
  target: string;
  reward: string;
  description: string;
}

@Component({
  selector: 'app-mission',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mission.component.html',
  styleUrls: ['./mission.component.css']
})
export class MissionComponent {

  constructor(private router: Router) {}
  missions: Mission[] = [
    {
      id: 1,
      target: '10,000',
      reward: '₹700',
      description: 'Team Recharge reaches ₹10,000'
    },
    {
      id: 2,
      target: '20,000',
      reward: '₹1,500',
      description: 'Team Recharge reaches ₹20,000'
    },
    {
      id: 3,
      target: '30,000',
      reward: '₹4,000',
      description: 'Team Recharge reaches ₹30,000'
    },
    {
      id: 4,
      target: '40,000',
      reward: '₹6,000',
      description: 'Team Recharge reaches ₹40,000'
    }
  ];

  claimReward(mission: Mission) {
    const telegramUrl = `https://t.me/Volt_support_care?start=claim_${mission.id}_${mission.reward.replace('₹', '').replace(',', '')}`;
    window.open(telegramUrl, '_blank');
  }
  goBack() { this.router.navigate(['/home']); }
}