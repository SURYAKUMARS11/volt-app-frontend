// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { SplashComponent } from './components/splash/splash.component';
import { SigninComponent } from './components/auth/signin/signin.component';
import { SignupComponent } from './components/auth/signup/signup.component';
import { HomeComponent } from './components/home/home.component';
import { RechargeComponent } from './components/recharge/recharge.component';
import { WithdrawalComponent } from './components/withdrawal/withdrawal.component';
import { TeamComponent } from './components/team/team.component';
import { OrdersComponent } from './components/orders/orders.component';
import { AboutComponent } from './components/about/about.component';
import { SettingsComponent } from './components/settings/settings.component';
import { InviteComponent } from './components/invite/invite.component';
import { InvestComponent } from './components/invest/invest.component';
import { AddBankCardComponent } from './components/add-bank-card/add-bank-card.component';
import { SetTradePasswordComponent } from './components/set-trade-password/set-trade-password.component';
import { MissionComponent } from './components/mission/mission.component';
import { GiftComponent } from './components/gift/gift.component';
import { WithdrawalRecordComponent } from './components/withdrawal-record/withdrawal-record.component';
import { DepositRecordComponent } from './components/deposit-record/deposit-record.component';



export const routes = [
  { path: '', component: SplashComponent },
  { path: 'signin', component: SigninComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'home', component: HomeComponent },
  { path: 'recharge', component: RechargeComponent },
  { path: 'withdrawal', component: WithdrawalComponent },
  { path: 'team', component: TeamComponent },
  { path: 'orders', component: OrdersComponent },
  { path: 'about', component: AboutComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'invite', component: InviteComponent },
  { path: 'invest', component: InvestComponent },
  { path: 'add-bank-card', component: AddBankCardComponent },
  { path: 'set-trade-password', component: SetTradePasswordComponent },
  { path: 'mission', component: MissionComponent },
  { path: 'gift', component: GiftComponent },
  { path: 'withdrawal-record', component: WithdrawalRecordComponent },
  { path: 'deposit-record', component: DepositRecordComponent },
  { path: '**', redirectTo: '' }
];
