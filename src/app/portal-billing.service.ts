import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

/**
 * CLIENT PORTAL BILLING admin (David, Nov 1 2026).
 * Talks to /api/portalbilling/admin/* on deckmultitenantwebservices. The server only lets a
 * SuperUsers login (this site's E3 Admin login) through; inspecting members never can.
 * Every price is stored in CENTS on the server.
 */
@Injectable({ providedIn: 'root' })
export class PortalBillingService {
  private base = `${environment.apiUrl}/portalbilling/admin`;
  constructor(private http: HttpClient) {}

  // Read the token on EVERY request (same as the other services).
  private get options(): any {
    return { headers: new HttpHeaders({ 'Authorization': localStorage.getItem('authorization') || '' }) };
  }

  getConfig(): Observable<any> { return this.http.get<any>(`${this.base}/config`, this.options); }
  saveConfig(patch: any): Observable<any> { return this.http.post<any>(`${this.base}/config`, patch, this.options); }
  accounts(): Observable<any> { return this.http.get<any>(`${this.base}/accounts`, this.options); }
  account(email: string): Observable<any> {
    return this.http.get<any>(`${this.base}/account?email=${encodeURIComponent(email)}`, this.options);
  }
  waive(email: string, waived: boolean, note: string, until: string | null): Observable<any> {
    return this.http.post<any>(`${this.base}/waive`, { email, waived, note, until }, this.options);
  }
  recount(email: string): Observable<any> { return this.http.post<any>(`${this.base}/recount`, { email }, this.options); }
  invoice(email: string, interval: 'month' | 'year', daysUntilDue: number): Observable<any> {
    return this.http.post<any>(`${this.base}/invoice`, { email, interval, daysUntilDue }, this.options);
  }
}
