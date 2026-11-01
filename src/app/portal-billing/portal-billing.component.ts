import { Component, OnInit } from '@angular/core';
import { HotToastService } from '@ngneat/hot-toast';
import { PortalBillingService } from '../portal-billing.service';

/**
 * CLIENT PORTAL BILLING (David, Nov 1 2026: "is there a section in E3-Multi-Tennant where
 * I can make these pricing changes").
 *
 *   Settings - prices, intro, trial, yearly, volume discount. Nothing is saved until the
 *              admin reviews the list of changes and presses Confirm.
 *   Switches - billing on/off and "restart trials" (used once, after live Stripe keys are in).
 *   Accounts - every client portal login: state, plan, properties, next charge; per client:
 *              waive / remove waiver, recount properties, start invoice billing, history.
 *
 * Prices are typed in DOLLARS here and sent to the server in CENTS.
 */

interface Form {
  monthly: number | null;
  intro: number | null;
  introMonths: number | null;
  trialDays: number | null;
  annual: number | null;          // blank = automatic (monthly x (12 - free months))
  freeMonths: number | null;
  volumeMin: number | null;
  volumePercent: number | null;
}

interface Change { label: string; from: string; to: string; }

@Component({
  selector: 'app-portal-billing',
  templateUrl: './portal-billing.component.html',
  styleUrls: ['./portal-billing.component.scss'],
})
export class PortalBillingComponent implements OnInit {
  loading = true;
  saving = false;
  loadError = '';
  cfg: any = null;        // server config (cents)
  stripe: any = null;     // { configured, testMode, webhookSecretSet }
  priceLine = '';
  form: Form = this.blankForm();
  review: { patch: any; changes: Change[] } | null = null;
  confirmSwitch: 'on' | 'off' | 'restart' | null = null;

  accounts: any[] = [];
  accountsLoading = false;
  filter = '';
  open: string | null = null;           // email of the expanded row
  detail: any = null;
  detailLoading = false;
  waiveNote = '';
  waiveUntil = '';
  invoiceInterval: 'month' | 'year' = 'month';
  invoiceDays = 15;
  confirmAction: 'waive' | 'unwaive' | 'invoice' | null = null;
  busy = false;

  constructor(private api: PortalBillingService, private toast: HotToastService) {}

  ngOnInit(): void {
    this.load();
    this.loadAccounts();
  }

  // ------------------------------------------------------------------ settings
  private blankForm(): Form {
    return { monthly: null, intro: null, introMonths: null, trialDays: null, annual: null, freeMonths: null, volumeMin: null, volumePercent: null };
  }

  load(): void {
    this.loading = true; this.loadError = '';
    this.api.getConfig().subscribe({
      next: (r) => { this.apply(r); this.loading = false; },
      error: (e) => { this.loading = false; this.loadError = this.err(e); },
    });
  }

  private apply(r: any): void {
    this.cfg = r.config;
    if (r.stripe) this.stripe = r.stripe;
    this.priceLine = r.priceLine || '';
    const c = this.cfg;
    this.form = {
      monthly: c.monthlyCents / 100,
      intro: (c.introMonthlyCents || 0) / 100,
      introMonths: c.introMonths,
      trialDays: c.trialDays,
      annual: c.annualCents ? c.annualCents / 100 : null,
      freeMonths: c.annualDiscountMonths || 0,
      volumeMin: c.volumeMinProperties ?? 25,
      volumePercent: c.volumePercent ?? 25,
    };
    this.review = null;
  }

  private cents(v: number | null): number { return Math.round(Number(v || 0) * 100); }
  money(c: number): string { return '$' + (Number(c || 0) / 100).toFixed(2).replace(/\.00$/, ''); }

  // What the form would charge (same rules as the server's pricing()).
  get preview() {
    const f = this.form;
    const monthly = this.cents(f.monthly);
    const intro = this.cents(f.intro);
    const annual = f.annual ? this.cents(f.annual) : Math.max(1, monthly * Math.max(1, 12 - Number(f.freeMonths || 0)));
    const ip = intro > 0 && intro < monthly ? Math.round((1 - intro / monthly) * 10000) / 100 : 0;
    const vmin = Number(f.volumeMin || 0), vpct = Number(f.volumePercent || 0);
    const off = (c: number, p: number) => (p ? Math.max(1, Math.round((c * (100 - p)) / 100)) : c);
    const row = (label: string, vol: number) => {
      const m = off(monthly, vol);
      return { label, monthly: m, intro: ip ? off(m, ip) : 0, annual: off(annual, vol) };
    };
    const rows = [row(vmin > 1 && vpct ? `1–${vmin - 1} properties` : 'Every account', 0)];
    if (vmin > 0 && vpct) rows.push(row(`${vmin} or more properties`, vpct));
    let line = `Your first ${f.trialDays} days are free. After that the portal is ${this.money(monthly)} per property per month`;
    if (ip) line += `, with an introductory rate of ${this.money(intro)} per property per month for your first ${f.introMonths} months`;
    line += '.';
    if (vmin && vpct) line += ` Accounts with ${vmin} or more properties get ${vpct}% off.`;
    return { rows, line, introIgnored: intro > 0 && !ip, annualAuto: !f.annual, yearlyBeatsIntro: ip ? off(annual, 0) > off(monthly, ip) * 12 : false };
  }

  // Builds the list of changes; nothing is sent until Confirm.
  startReview(): void {
    if (!this.cfg) return;
    const c = this.cfg, f = this.form, patch: any = {}, changes: Change[] = [];
    const num = (label: string, key: string, cur: number, next: number, fmt: (n: number) => string) => {
      if (cur !== next) { patch[key] = next; changes.push({ label, from: fmt(cur), to: fmt(next) }); }
    };
    const $ = (n: number) => this.money(n);
    const n = (x: number) => String(x);
    num('List price per property per month', 'monthlyCents', c.monthlyCents, this.cents(f.monthly), $);
    num('Introductory price per property per month', 'introMonthlyCents', c.introMonthlyCents || 0, this.cents(f.intro), (x) => (x ? $(x) : 'none'));
    num('Introductory months', 'introMonths', c.introMonths, Number(f.introMonths), n);
    num('Free trial days', 'trialDays', c.trialDays, Number(f.trialDays), n);
    num('Yearly: months free (automatic yearly price)', 'annualDiscountMonths', c.annualDiscountMonths || 0, Number(f.freeMonths || 0), n);
    const curA = c.annualCents || null, nextA = f.annual ? this.cents(f.annual) : null;
    if (curA !== nextA) {
      patch.annualCents = nextA;
      changes.push({ label: 'Yearly price per property', from: curA ? $(curA) : 'automatic', to: nextA ? $(nextA) : 'automatic' });
    }
    num('Volume discount starts at (properties)', 'volumeMinProperties', c.volumeMinProperties ?? 25, Number(f.volumeMin || 0), (x) => (x ? n(x) : 'off'));
    num('Volume discount (%)', 'volumePercent', c.volumePercent ?? 25, Number(f.volumePercent || 0), (x) => (x ? x + '%' : 'off'));
    if (!changes.length) { this.toast.info('Nothing has changed.'); return; }
    this.review = { patch, changes };
  }

  confirmSave(): void {
    if (!this.review) return;
    this.saving = true;
    this.api.saveConfig(this.review.patch).subscribe({
      next: (r) => { this.saving = false; this.apply(r); this.toast.success('Prices saved. Clients see them on their next page load.'); },
      error: (e) => { this.saving = false; this.toast.error(this.err(e)); },
    });
  }

  resetForm(): void { if (this.cfg) this.apply({ config: this.cfg, priceLine: this.priceLine }); }

  // ------------------------------------------------------------------ switches
  doSwitch(): void {
    const which = this.confirmSwitch;
    if (!which) return;
    const patch = which === 'restart' ? { restartTrials: true } : { enabled: which === 'on' };
    this.saving = true;
    this.api.saveConfig(patch).subscribe({
      next: (r) => {
        this.saving = false; this.confirmSwitch = null; this.apply(r);
        this.toast.success(which === 'restart' ? 'Trials restarted from today.' : which === 'on' ? 'Billing is ON.' : 'Billing is OFF. The portal is free for everyone.');
        this.loadAccounts();
      },
      error: (e) => { this.saving = false; this.toast.error(this.err(e)); },
    });
  }

  // ------------------------------------------------------------------ accounts
  loadAccounts(): void {
    this.accountsLoading = true;
    this.api.accounts().subscribe({
      next: (r) => { this.accounts = r.accounts || []; this.accountsLoading = false; },
      error: (e) => { this.accountsLoading = false; this.toast.error(this.err(e)); },
    });
  }

  get shown(): any[] {
    const q = this.filter.trim().toLowerCase();
    return q ? this.accounts.filter((a) => a.email.includes(q) || (a.state || '').includes(q)) : this.accounts;
  }

  get counts() {
    const c: any = { trial: 0, active: 0, past_due: 0, locked: 0, complimentary: 0 };
    this.accounts.forEach((a) => { if (c[a.state] !== undefined) c[a.state]++; });
    return c;
  }

  stateLabel(a: any): string {
    return ({ trial: 'Free trial', active: 'Subscribed', past_due: 'Payment failed', locked: 'Locked', complimentary: 'Complimentary', idle: 'No properties', off: 'Billing off' } as any)[a.state] || a.state;
  }
  stateClass(a: any): string {
    return ({ active: 'ok', complimentary: 'ok', trial: 'info', past_due: 'warn', locked: 'bad' } as any)[a.state] || '';
  }
  plan(a: any): string {
    if (!a.status) return '—';
    const i = a.interval === 'year' ? 'Yearly' : a.interval === 'month' ? 'Monthly' : '';
    return [i, a.collection === 'send_invoice' ? 'invoice' : 'card'].filter(Boolean).join(' · ');
  }

  toggle(a: any): void {
    if (this.open === a.email) { this.open = null; this.detail = null; return; }
    this.open = a.email; this.detail = null; this.confirmAction = null;
    this.waiveNote = a.waivedNote || ''; this.waiveUntil = a.waivedUntil ? String(a.waivedUntil).slice(0, 10) : '';
    this.loadDetail(a.email);
  }

  loadDetail(email: string): void {
    this.detailLoading = true;
    this.api.account(email).subscribe({
      next: (r) => { this.detail = r.account; this.detailLoading = false; },
      error: (e) => { this.detailLoading = false; this.toast.error(this.err(e)); },
    });
  }

  private after(r: any, msg: string): void {
    this.busy = false; this.confirmAction = null;
    this.toast.success(msg);
    const i = this.accounts.findIndex((x) => x.email === r.account.email);
    if (i >= 0) this.accounts[i] = r.account;
    this.loadDetail(r.account.email);
  }

  doAction(): void {
    const email = this.open;
    if (!email || !this.confirmAction) return;
    this.busy = true;
    const fail = (e: any) => { this.busy = false; this.toast.error(this.err(e)); };
    if (this.confirmAction === 'waive') {
      this.api.waive(email, true, this.waiveNote, this.waiveUntil || null).subscribe({ next: (r) => this.after(r, 'Fees waived.'), error: fail });
    } else if (this.confirmAction === 'unwaive') {
      this.api.waive(email, false, '', null).subscribe({ next: (r) => this.after(r, 'Waiver removed.'), error: fail });
    } else {
      this.api.invoice(email, this.invoiceInterval, this.invoiceDays).subscribe({ next: (r) => this.after(r, 'Invoice billing started. Stripe will email the invoice.'), error: fail });
    }
  }

  recount(): void {
    if (!this.open) return;
    this.busy = true;
    this.api.recount(this.open).subscribe({
      next: (r) => this.after(r, 'Properties recounted.'),
      error: (e) => { this.busy = false; this.toast.error(this.err(e)); },
    });
  }

  private err(e: any): string {
    if (e && e.status === 401 || e && e.status === 403) return 'Only the E3 Admin login can open client portal billing. Sign out and back in.';
    return (e && e.error && (e.error.message || e.error.error)) || (e && e.message) || 'Something went wrong.';
  }
}
