import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent} from './pages/register/register';
import { Summarize } from './pages/summarize/summarize';
import { History } from './pages/history/history';
import { AuthGuard } from './auth.guard';  // importe le guard

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent},
  { path: 'summarize', component: Summarize, canActivate: [AuthGuard] },  // protégé
  { path: 'history', component: History, canActivate: [AuthGuard] }       // protégé
];
