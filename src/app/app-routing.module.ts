import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { UserComponent } from './user/user.component';
import { UserDetailComponent } from './user-detail/user-detail.component';
import { LoginComponent } from './login/login.component';
import { ExpensesComponent } from './expenses/expenses.component';
import { TenantDetailComponent } from './tenant-detail/tenant-detail.component';
import { CustomFormsComponent } from './custom-forms/custom-forms.component';
import { TenantUsersComponent } from './tenant-users/tenant-users.component';
import { PortalBillingComponent } from './portal-billing/portal-billing.component';
import { PortalClientsComponent } from './portal-clients/portal-clients.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
// import { InfoComponent } from './info/info.component';
// import { NewsComponent } from './news/news.component';
// import { LegalNoticeComponent } from './legal-notice/legal-notice.component';

const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'users', component: UserComponent },
  { path: 'expenses', component: ExpensesComponent },
  { path: 'custom-forms', component: CustomFormsComponent },
  { path: 'users/:id', component: UserDetailComponent },
  { path: 'login', component: LoginComponent },
  { path: 'details/:id', component: TenantDetailComponent },
  { path: 'tenant-users', component: TenantUsersComponent },
  { path: 'portal-billing', component: PortalBillingComponent },
  { path: 'portal-clients', component: PortalClientsComponent },
  { path: 'change-password', component: ChangePasswordComponent },
  // { path: 'info', component: InfoComponent },
  // { path: 'news', component: NewsComponent },
  // { path: 'legal', component: LegalNoticeComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
