import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TenantsService } from '../tenants.service';
import { TenantUserService } from '../tenant-user.service';
import { FormsService } from '../forms.service';
import { HotToastService } from '@ngneat/hot-toast';
import { MatDialog } from '@angular/material/dialog';
import { UsersService } from '../users.service';
import { DialogEditCustomFormComponent } from '../dialog-edit-custom-form/dialog-edit-custom-form.component';
import { DialogEditDescriptionComponent } from '../dialog-edit-description/dialog-edit-description.component';
import { DialogEditDiskSpaceComponent } from '../dialog-edit-disk-space/dialog-edit-disk-space.component';
import { DialogEditValidityComponent } from '../dialog-edit-validity/dialog-edit-validity.component';
import { DialogEditAllowedUserComponent } from '../dialog-edit-allowed-user/dialog-edit-allowed-user.component';
import { DialogEditWebsiteComponent } from '../dialog-edit-website/dialog-edit-website.component';
import { DialogEditDataComponent } from '../dialog-edit-data/dialog-edit-data.component';
import { AdminSignupComponent } from '../admin-signup/admin-signup.component';
import { DialogDeleteClientComponent } from '../dialog-delete-client/dialog-delete-client.component';
import { DialogAddFormComponent } from '../dialog-add-form/dialog-add-form.component';

/**
 * CLIENT PAGE (David, Sep 24 2026: "the site is chopped up and has no flow").
 * One page per client with everything an admin does for that client, on tabs:
 *   Overview - details, limits, status (pencils open the SAME dialogs the
 *              Clients list used, so nothing about saving changed)
 *   Branding - logos / sizes / contact info (DialogEditData) + footer-logo switch
 *   People   - admins (+ Add Admin, password reset) and the client's users
 *              (reset device, activate / deactivate, delete)
 *   Inspection Forms - the question forms inspectors fill in on web + mobile
 *              (built with DialogAddForm, saved per client)
 *   Billing  - the Expenses calculator for THIS client; rates are remembered in
 *              this browser (global rate card + optional per-client override)
 * Nothing reloads the whole page any more - each action re-fetches the client.
 */
type Tab = 'overview' | 'branding' | 'people' | 'forms' | 'billing';

const RATE_DEFAULTS = {
  perGb: 5, perMobileUser: 1, perWebUser: 1, perBothUser: 2, perImage: 0.25, perReport: 2, perReportGb: 5,
};
const RATES_KEY = 'e3admin_rates';

@Component({
  selector: 'app-tenant-detail',
  templateUrl: './tenant-detail.component.html',
  styleUrls: ['./tenant-detail.component.scss'],
})
export class TenantDetailComponent implements OnInit {
  tab: Tab = 'overview';
  tenantDetails: any;
  tenantId: string = '';
  loading = false;
  busy = '';                 // which action is running (disables its button)
  confirmDelete = false;

  // People
  showPassword: boolean[] = [];
  resetIdx: number = -1;
  newPassword: string = '';
  resetting: boolean = false;
  users: any[] = [];
  usersLoading = false;

  // Inspection Forms
  forms: any[] = [];
  formsLoading = false;

  // Billing
  rates: any = { ...RATE_DEFAULTS };
  ratesScope: 'global' | 'client' = 'global';
  usage: any = { spaceGb: 0, reportGb: 0, images: 0, reports: 0, mobile: 0, web: 0, both: 0 };
  charges: any = {};
  total = 0;

  constructor(
    public usersService: UsersService,
    private route: ActivatedRoute,
    private router: Router,
    private tenantsService: TenantsService,
    private tenantUserService: TenantUserService,
    private formsService: FormsService,
    private toast: HotToastService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.tenantId = params['id'];
      this.load();
    });
    this.route.queryParams.subscribe((q) => {
      const t = q['tab'];
      if (t && ['overview', 'branding', 'people', 'forms', 'billing'].includes(t)) this.tab = t as Tab;
    });
  }

  // ---------- load ----------
  load(): void {
    this.loading = true;
    this.tenantsService.getTenantById(this.tenantId).subscribe(
      (res) => {
        this.tenantDetails = res.Tenant;
        this.loading = false;
        this.showPassword = Array((this.tenantDetails?.adminDetails || []).length).fill(false);
        this.loadRates();
        this.loadUsers();
        this.loadForms();
      },
      (error) => {
        this.loading = false;
        console.error('Error fetching tenant details:', error);
        this.toast.error('Could not load this client.');
      }
    );
  }

  setTab(t: Tab): void {
    this.tab = t;
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: t }, replaceUrl: true });
  }

  back(): void { this.router.navigateByUrl('/users'); }

  get t(): any { return this.tenantDetails || {}; }
  get isActive(): boolean { return !!this.t.isActive; }
  get isDeleted(): boolean { return !!this.t.isDeleted; }
  get validityPast(): boolean {
    const d = this.t.endDate ? new Date(this.t.endDate) : null;
    return !!(d && !isNaN(d.getTime()) && d.getTime() < Date.now());
  }
  get allowedUsers(): number {
    return (Number(this.t.mobileUserCount) || 0) + (Number(this.t.webUserCount) || 0) + (Number(this.t.bothUserCount) || 0);
  }

  formatBytesToGB(bytes: number): string {
    if (!bytes) return '0';
    return (bytes / 1024 ** 3).toFixed(2);
  }

  // ---------- Overview: the same edit dialogs the Clients list used ----------
  private openTenantDialog(cmp: any): void {
    const ref = this.dialog.open(cmp, { data: { ...this.tenantDetails, id: this.tenantId } });
    ref.afterClosed().subscribe(() => this.load());
  }
  editDescription(): void { this.openTenantDialog(DialogEditDescriptionComponent); }
  editDiskSpace(): void { this.openTenantDialog(DialogEditDiskSpaceComponent); }
  editValidity(): void { this.openTenantDialog(DialogEditValidityComponent); }
  editUserLimits(): void { this.openTenantDialog(DialogEditAllowedUserComponent); }
  editWebsite(): void { this.openTenantDialog(DialogEditWebsiteComponent); }
  editCustomFormCount(): void { this.openTenantDialog(DialogEditCustomFormComponent); }
  editBranding(): void { this.openTenantDialog(DialogEditDataComponent); }

  toggleActive(): void {
    this.busy = 'active';
    this.tenantsService.toggleAccessForTenant(this.tenantId, !this.isActive).subscribe(
      () => { this.busy = ''; this.toast.success(this.isActive ? 'Client deactivated' : 'Client activated'); this.load(); },
      () => { this.busy = ''; this.toast.error('Failed to change the client status'); }
    );
  }

  deleteTenant(): void {
    this.busy = 'delete';
    this.tenantsService.deleteTenantPermanently(this.tenantId).subscribe(
      () => { this.busy = ''; this.confirmDelete = false; this.toast.success('Client deleted - its users can no longer log in'); this.load(); },
      () => { this.busy = ''; this.toast.error('Failed to delete the client'); }
    );
  }

  restoreTenant(): void {
    this.busy = 'restore';
    this.tenantsService.restoreTenant(this.tenantId).subscribe(
      () => { this.busy = ''; this.toast.success('Client restored - its users can log in again'); this.load(); },
      () => { this.busy = ''; this.toast.error('Failed to restore the client'); }
    );
  }

  // ---------- Branding ----------
  toggleFooterLogo(): void {
    const current = !!this.t.showFooterlogo;
    this.busy = 'footer';
    this.tenantsService.toggleShowFooterLogo(this.tenantId, !current).subscribe(
      () => { this.busy = ''; this.tenantDetails.showFooterlogo = !current; this.toast.success('Footer logo ' + (!current ? 'shown' : 'hidden') + ' on reports'); },
      () => { this.busy = ''; this.toast.error('Failed to change the footer logo setting'); }
    );
  }

  // ---------- People ----------
  addAdmin(): void {
    const ref = this.dialog.open(AdminSignupComponent, {
      data: { companyIdentifier: this.t.companyIdentifier, id: this.tenantId },
    });
    ref.afterClosed().subscribe(() => this.load());
  }
  startReset(i: number): void { this.resetIdx = i; this.newPassword = ''; }
  cancelReset(): void { this.resetIdx = -1; this.newPassword = ''; }
  saveReset(admin: any): void {
    const pwd = (this.newPassword || '').trim();
    if (!pwd) { this.toast.error('Enter a new password'); return; }
    this.resetting = true;
    this.tenantsService.resetAdminPassword(this.tenantId, admin.username, pwd).subscribe(
      () => { this.resetting = false; this.toast.success('Password reset for ' + admin.username); this.cancelReset(); this.load(); },
      (error) => {
        this.resetting = false;
        const msg = (error && (error.error && typeof error.error === 'string' ? error.error : error.message)) || 'Reset failed';
        this.toast.error('Error: ' + msg);
      }
    );
  }
  togglePasswordVisibility(index: number): void { this.showPassword[index] = !this.showPassword[index]; }

  async loadUsers(): Promise<void> {
    if (!this.t.companyIdentifier) return;
    this.usersLoading = true;
    try { this.users = (await this.tenantUserService.getAllUsers(this.t.companyIdentifier)) || []; }
    catch (e) { this.users = []; }
    this.usersLoading = false;
    this.calc();
  }
  async resetDevice(u: any): Promise<void> {
    await this.tenantUserService.updateUserDeviceId(u.username);
  }
  async toggleUser(u: any): Promise<void> {
    const status = u.isActive === undefined ? false : !u.isActive;
    await this.tenantUserService.toggleUserStatus(u.username, status);
    this.loadUsers();
  }
  deleteUser(u: any): void {
    const ref = this.dialog.open(DialogDeleteClientComponent, { data: { username: u.username } });
    ref.afterClosed().subscribe(() => this.loadUsers());
  }
  accessLabel(u: any): string {
    const a = (u.access_type || '').toLowerCase();
    return a === 'both' ? 'Web + mobile' : a === 'web' ? 'Web' : a === 'mobile' ? 'Mobile' : (u.access_type || '');
  }

  // ---------- Inspection Forms ----------
  loadForms(): void {
    if (!this.t.companyIdentifier) return;
    this.formsLoading = true;
    this.formsService.getAllForms(this.t.companyIdentifier).subscribe(
      (data: any) => { this.forms = data.forms || []; this.formsLoading = false; },
      () => { this.forms = []; this.formsLoading = false; }
    );
  }
  openForm(form?: any): void {
    const ref = this.dialog.open(DialogAddFormComponent, {});
    ref.componentInstance.selectedTenantObj = this.tenantDetails || {};
    ref.componentInstance.selectedFormObj = form || {};
    ref.afterClosed().subscribe((saved) => {
      if (saved) this.toast.success('Inspection form saved');
      this.loadForms();
    });
  }
  deleteForm(form: any, index: number): void {
    this.formsService.deleteFormPermanently(form.id).subscribe(
      (result: any) => {
        if (result && result.success) { this.forms.splice(index, 1); this.toast.success('Inspection form deleted'); }
        else this.toast.error('Failed to delete the inspection form');
      },
      () => this.toast.error('Failed to delete the inspection form')
    );
  }
  questionCount(form: any): number { return (form && form.questions && form.questions.length) || 0; }

  // ---------- Billing ----------
  private ratesKey(scope: 'global' | 'client'): string {
    return scope === 'client' ? RATES_KEY + '_' + this.tenantId : RATES_KEY;
  }
  loadRates(): void {
    let scope: 'global' | 'client' = 'global';
    let stored: any = null;
    try {
      const c = localStorage.getItem(this.ratesKey('client'));
      if (c) { stored = JSON.parse(c); scope = 'client'; }
      else { const g = localStorage.getItem(this.ratesKey('global')); if (g) stored = JSON.parse(g); }
    } catch (e) { stored = null; }
    this.ratesScope = scope;
    this.rates = { ...RATE_DEFAULTS, ...(stored || {}) };
    this.calc();
  }
  saveRates(scope: 'global' | 'client'): void {
    try {
      localStorage.setItem(this.ratesKey(scope), JSON.stringify(this.rates));
      if (scope === 'global') localStorage.removeItem(this.ratesKey('client'));
      this.ratesScope = scope;
      this.toast.success(scope === 'global' ? 'Rates saved for all clients' : 'Rates saved for ' + (this.t.name || 'this client'));
    } catch (e) { this.toast.error('Could not save the rates in this browser'); }
  }
  clearClientRates(): void {
    try { localStorage.removeItem(this.ratesKey('client')); } catch (e) { /* ignore */ }
    this.loadRates();
  }
  private num(v: any): number { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
  calc(): void {
    const t = this.t;
    const gb = (b: any) => this.num(b) / Math.pow(1024, 3);   // same GB as the header and the Clients list
    this.usage = {
      spaceGb: gb(t.usedDiskSpace),
      reportGb: gb(t.usedReportSpace),
      images: this.num(t.imageCount),
      reports: this.num(t.reportsCount !== undefined ? t.reportsCount : t.reportCount),
      mobile: this.users.filter(u => u.access_type === 'mobile').length,
      web: this.users.filter(u => u.access_type === 'web').length,
      both: this.users.filter(u => u.access_type === 'both').length,
    };
    const r = this.rates;
    this.charges = {
      space: this.usage.spaceGb * this.num(r.perGb),
      reportSpace: this.usage.reportGb * this.num(r.perReportGb),
      images: this.usage.images * this.num(r.perImage),
      reports: this.usage.reports * this.num(r.perReport),
      mobile: this.usage.mobile * this.num(r.perMobileUser),
      web: this.usage.web * this.num(r.perWebUser),
      both: this.usage.both * this.num(r.perBothUser),
    };
    this.total = Object.values(this.charges).reduce((a: number, b: any) => a + (b as number), 0) as number;
  }
}
