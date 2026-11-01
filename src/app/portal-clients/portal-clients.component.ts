import { Component, OnInit } from '@angular/core';
import { HotToastService } from '@ngneat/hot-toast';
import { PortalBillingService } from '../portal-billing.service';

/**
 * PORTAL CLIENTS (David, Nov 1 2026): every property-owner login of the client
 * portal (www.e3-web.com), listed ONCE however many inspection companies share
 * properties with it. The login belongs to the owner: it stays when an inspector
 * ends the relationship, and its billing (one bill for all its properties) lives
 * here too. Only E3 Admin can waive fees, start invoice billing or turn a login off.
 */
@Component({
  selector: 'app-portal-clients',
  templateUrl: './portal-clients.component.html',
  styleUrls: ['../portal-billing/portal-billing.component.scss', './portal-clients.component.scss'],
})
export class PortalClientsComponent implements OnInit {
  loading = true;
  loadError = '';
  clients: any[] = [];
  search = '';
  inspectorFilter = '';
  stateFilter = '';

  open: string | null = null;     // id of the expanded row
  detail: any = null;
  detailLoading = false;
  waiveNote = '';
  waiveUntil = '';
  invoiceInterval: 'month' | 'year' = 'month';
  invoiceDays = 15;
  confirmAction: 'waive' | 'unwaive' | 'invoice' | 'login-off' | 'login-on' | null = null;
  busy = false;

  constructor(private api: PortalBillingService, private toast: HotToastService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true; this.loadError = '';
    this.api.clients().subscribe({
      next: (r) => { this.clients = r.clients || []; this.loading = false; },
      error: (e) => { this.loading = false; this.loadError = this.err(e); },
    });
  }

  // ------------------------------------------------------------------ list
  get inspectors(): string[] {
    const s = new Set<string>();
    this.clients.forEach((c) => (c.inspectors || []).forEach((i: any) => s.add(i.inspector)));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }

  state(c: any): string {
    if (!c.loginOn) return 'login-off';
    if (!c.activeInspectors) return 'no-inspector';
    return (c.billing && c.billing.state) || 'off';
  }

  get shown(): any[] {
    const q = this.search.trim().toLowerCase();
    return this.clients.filter((c) => {
      if (this.inspectorFilter && !(c.inspectors || []).some((i: any) => i.inspector === this.inspectorFilter)) return false;
      if (this.stateFilter && this.state(c) !== this.stateFilter) return false;
      if (!q) return true;
      const hay = [c.name, c.email, c.username, ...(c.inspectors || []).map((i: any) => i.inspector + ' ' + (i.clientName || ''))].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  get counts() {
    const c: any = { all: this.clients.length, active: 0, trial: 0, past_due: 0, locked: 0, complimentary: 0, 'no-inspector': 0, 'login-off': 0 };
    this.clients.forEach((x) => { const s = this.state(x); if (c[s] !== undefined) c[s]++; });
    return c;
  }

  label(s: string): string {
    return ({
      active: 'Subscribed', trial: 'Free trial', past_due: 'Payment failed', locked: 'Locked', complimentary: 'Complimentary',
      idle: 'No properties', 'not-started': 'Not opened yet', off: 'Billing off', 'no-inspector': 'No active inspector', 'login-off': 'Login off',
    } as any)[s] || s;
  }
  cls(s: string): string {
    return ({ active: 'ok', complimentary: 'ok', trial: 'info', past_due: 'warn', locked: 'bad', 'no-inspector': 'warn', 'login-off': 'bad' } as any)[s] || '';
  }
  plan(b: any): string {
    if (!b || !b.status) return '';
    const i = b.interval === 'year' ? 'Yearly' : b.interval === 'month' ? 'Monthly' : '';
    return [i, b.collection === 'send_invoice' ? 'invoice' : 'card'].filter(Boolean).join(' · ');
  }
  nextDate(b: any): string | null { return b ? (b.currentPeriodEnd || b.trialEndsAt || null) : null; }
  money(c: number): string { return '$' + (Number(c || 0) / 100).toFixed(2).replace(/\.00$/, ''); }

  // ------------------------------------------------------------------ detail
  toggle(c: any): void {
    if (this.open === c.id) { this.open = null; this.detail = null; return; }
    this.open = c.id; this.detail = null; this.confirmAction = null;
    this.loadDetail(c.id);
  }

  loadDetail(id: string): void {
    this.detailLoading = true;
    this.api.client(id).subscribe({
      next: (r) => {
        this.detail = r.client; this.detailLoading = false;
        const b = this.detail.billing || {};
        this.waiveNote = b.waivedNote || ''; this.waiveUntil = b.waivedUntil ? String(b.waivedUntil).slice(0, 10) : '';
        const i = this.clients.findIndex((x) => x.id === r.client.id);
        if (i >= 0) { const keep = Object.assign({}, r.client, { billing: Object.assign({}, r.client.billing) }); delete keep.billing.log; this.clients[i] = keep; }
      },
      error: (e) => { this.detailLoading = false; this.toast.error(this.err(e)); },
    });
  }

  get canBill(): boolean { return !!(this.detail && this.detail.loginOn && this.detail.email); }
  get canInvoice(): boolean {
    const b = this.detail && this.detail.billing;
    return this.canBill && !!b && b.enabled && (!b.status || b.status === 'canceled' || b.status === 'incomplete_expired');
  }

  doAction(): void {
    const d = this.detail;
    if (!d || !this.confirmAction) return;
    this.busy = true;
    const done = (msg: string) => () => { this.busy = false; this.confirmAction = null; this.toast.success(msg); this.loadDetail(d.id); };
    const fail = (e: any) => { this.busy = false; this.toast.error(this.err(e)); };
    switch (this.confirmAction) {
      case 'waive': this.api.waive(d.email, true, this.waiveNote, this.waiveUntil || null).subscribe({ next: done('Fees waived.'), error: fail }); break;
      case 'unwaive': this.api.waive(d.email, false, '', null).subscribe({ next: done('Waiver removed.'), error: fail }); break;
      case 'invoice': this.api.invoice(d.email, this.invoiceInterval, this.invoiceDays).subscribe({ next: done('Invoice billing started. Stripe will email the invoice.'), error: fail }); break;
      case 'login-off': this.api.setLogin(d.id, false).subscribe({ next: done('Login turned off.'), error: fail }); break;
      case 'login-on': this.api.setLogin(d.id, true).subscribe({ next: done('Login turned on.'), error: fail }); break;
    }
  }

  recount(): void {
    const d = this.detail; if (!d) return;
    this.busy = true;
    this.api.recount(d.email).subscribe({
      next: () => { this.busy = false; this.toast.success('Properties recounted.'); this.loadDetail(d.id); },
      error: (e) => { this.busy = false; this.toast.error(this.err(e)); },
    });
  }

  private err(e: any): string {
    if (e && (e.status === 401 || e.status === 403)) return 'Only the E3 Admin login can open Portal Clients. Sign out and back in.';
    return (e && e.error && (e.error.message || e.error.error)) || (e && e.message) || 'Something went wrong.';
  }
}
