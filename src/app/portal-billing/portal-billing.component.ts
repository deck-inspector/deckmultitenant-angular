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
 *   Client accounts moved to Portal Clients (Nov 1 2026).
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

  constructor(private api: PortalBillingService, private toast: HotToastService) {}

  ngOnInit(): void {
    this.load();
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
      },
      error: (e) => { this.saving = false; this.toast.error(this.err(e)); },
    });
  }

  private err(e: any): string {
    if (e && e.status === 401 || e && e.status === 403) return 'Only the E3 Admin login can open client portal billing. Sign out and back in.';
    return (e && e.error && (e.error.message || e.error.error)) || (e && e.message) || 'Something went wrong.';
  }
}
