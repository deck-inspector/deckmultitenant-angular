import { NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { BrowserModule } from '@angular/platform-browser';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

//Material Design
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule,ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { environment } from '../environments/environment';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideDatabase, getDatabase } from '@angular/fire/database';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { UsersService } from './users.service';
import { MatExpansionModule } from '@angular/material/expansion';

import { MatMenuModule } from '@angular/material/menu';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

//Hot Toast
import { HotToastModule } from '@ngneat/hot-toast';

//components
import { AppComponent } from './app.component';
import { UserDetailComponent } from './user-detail/user-detail.component';
import { DialogEditDataComponent } from './dialog-edit-data/dialog-edit-data.component';
import { DialogDeleteClientComponent } from './dialog-delete-client/dialog-delete-client.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { UserComponent } from './user/user.component';
import { DialogAddUserComponent } from './dialog-add-user/dialog-add-user.component';
import { CalendarComponentComponent } from './calendar-component/calendar-component.component';

//calendar
import { CommonModule } from '@angular/common';
import { FlatpickrModule } from 'angularx-flatpickr';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { DialogUploadFileComponent } from './dialog-upload-file/dialog-upload-file.component';
import { DialogCalendarComponent } from './dialog-calendar/dialog-calendar.component';
import { LoginComponent } from './login/login.component';
import { DialogNotepadComponent } from './dialog-notepad/dialog-notepad.component';
import { DialogAddProjectComponent } from './dialog-add-project/dialog-add-project.component';
import { DialogEditProjectComponent } from './dialog-edit-project/dialog-edit-project.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
// import { InfoComponent } from './info/info.component';
// import { NewsComponent } from './news/news.component';
// import { LegalNoticeComponent } from './legal-notice/legal-notice.component';
import { DialogWalkthroughComponent } from './dialog-walkthrough/dialog-walkthrough.component';
import { TenantsService } from './tenants.service';
import { LoginService, AuthInterceptor } from './login.service';
import { DialogEditDescriptionComponent } from './dialog-edit-description/dialog-edit-description.component';
import { DialogEditDiskSpaceComponent } from './dialog-edit-disk-space/dialog-edit-disk-space.component';
import { DialogEditValidityComponent } from './dialog-edit-validity/dialog-edit-validity.component';
import { DialogEditAllowedUserComponent } from './dialog-edit-allowed-user/dialog-edit-allowed-user.component';
import { DialogEditExpensesComponent } from './dialog-edit-expenses/dialog-edit-expenses.component';
import { DialogEditWebsiteComponent } from './dialog-edit-website/dialog-edit-website.component';
import { AdminSignupComponent } from './admin-signup/admin-signup.component';
import { ExpensesComponent } from './expenses/expenses.component';
import { TenantDetailComponent } from './tenant-detail/tenant-detail.component';
import { CustomFormsComponent } from './custom-forms/custom-forms.component';
import { DialogAddFormComponent } from './dialog-add-form/dialog-add-form.component';
import { DialogEditCustomFormComponent } from './dialog-edit-custom-form/dialog-edit-custom-form.component';
import { TenantUsersComponent } from './tenant-users/tenant-users.component';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    UserComponent,
    DialogAddUserComponent,
    UserDetailComponent,
    DialogEditDataComponent,
    DialogDeleteClientComponent,
    DialogUploadFileComponent,
    CalendarComponentComponent,
    DialogCalendarComponent,
    LoginComponent,
    DialogNotepadComponent,
    DialogAddProjectComponent,
    DialogEditProjectComponent,
    // InfoComponent,
    // NewsComponent,
    // LegalNoticeComponent,
    DialogWalkthroughComponent,
    DialogEditDescriptionComponent,
    DialogEditDiskSpaceComponent,
    DialogEditValidityComponent,
    DialogEditAllowedUserComponent,
    DialogEditExpensesComponent,
    DialogEditWebsiteComponent,
    AdminSignupComponent,
    ExpensesComponent,
    TenantDetailComponent,
    CustomFormsComponent,
    DialogAddFormComponent,
    DialogEditCustomFormComponent,
    TenantUsersComponent,
  ],
  imports: [
    BrowserModule,
    MatExpansionModule,
    CommonModule,
    FlatpickrModule.forRoot(),
    CalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: adapterFactory,
    }),
    NgbModalModule,
    HotToastModule.forRoot(),
    AppRoutingModule,
    BrowserAnimationsModule,
    MatToolbarModule,
    MatIconModule,
    MatSidenavModule,
    MatButtonModule,
    MatSelectModule,
    MatTooltipModule,
    MatDialogModule,
    MatCheckboxModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressBarModule,
    MatCardModule,
    MatMenuModule,
    HttpClientModule,
    DragDropModule,
    MatProgressSpinnerModule,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideDatabase(() => getDatabase()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    FontAwesomeModule,
  ],
  providers: [
    UsersService,
    TenantsService,
    LoginService,
    // Sep 24 2026 - current token on every request; 401/403 -> back to login.
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
