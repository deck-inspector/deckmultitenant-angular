import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HotToastService } from '@ngneat/hot-toast';
import { environment } from 'src/environments/environment';

/**
 * E3 Admin: change my password (David, Nov 1 2026 - the admin site faces the internet).
 * The server checks the current password and needs at least 12 characters.
 * Passwords are typed here only; they are never stored in this browser.
 */
@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['../portal-billing/portal-billing.component.scss'],
})
export class ChangePasswordComponent {
  current = '';
  next = '';
  confirm = '';
  busy = false;
  done = false;
  error = '';

  constructor(private http: HttpClient, private toast: HotToastService) {}

  get problem(): string {
    if (!this.next) return '';
    if (this.next.length < 12) return 'At least 12 characters.';
    if (this.confirm && this.confirm !== this.next) return 'The two new passwords do not match.';
    if (this.current && this.next === this.current) return 'Must be different from the current password.';
    return '';
  }
  get ready(): boolean { return !!(this.current && this.next && this.confirm === this.next && !this.problem); }

  save(): void {
    if (!this.ready || this.busy) return;
    this.busy = true; this.error = '';
    const headers = new HttpHeaders({ Authorization: localStorage.getItem('authorization') || '' });
    this.http.post<any>(`${environment.apiUrl}/login/superUserPassword`, { currentPassword: this.current, newPassword: this.next }, { headers }).subscribe({
      next: () => { this.busy = false; this.done = true; this.current = this.next = this.confirm = ''; this.toast.success('Password changed.'); },
      error: (e) => { this.busy = false; this.error = (e && e.error && e.error.message) || 'Could not change the password.'; },
    });
  }
}
