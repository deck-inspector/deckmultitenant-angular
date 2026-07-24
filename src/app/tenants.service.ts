import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tenant } from './models/tenant';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TenantsService {
  options: any;

  constructor(private httpClient: HttpClient) {
    const headers = new HttpHeaders({
      'Authorization': localStorage.getItem('authorization')!
    });
  
    // Include the headers in the request
    this.options = { headers: headers };
  }

  addTenant(data: Tenant): Observable<any> {
    return this.httpClient.post<any>(`${environment.apiUrl}/tenants/add`, data, this.options);
  }

  getAllTenants(): Observable<any> {
    return this.httpClient.get<any>(`${environment.apiUrl}/tenants/alltenants`, this.options);
  }

  getTenantById(tenantId: string): Observable<any> {
    return this.httpClient.get<any>(`${environment.apiUrl}/tenants/${tenantId}`, this.options);
  }

  editTenant(tenantId: string, updatedData: Partial<Tenant>): Observable<any> {
    const url = `${environment.apiUrl}/tenants/${tenantId}`;
    return this.httpClient.put<any>(url, updatedData, this.options);
  }

  deleteTenantPermanently(tenantId: string): Observable<any> {
    const url = `${environment.apiUrl}/tenants/${tenantId}`;
    return this.httpClient.delete<any>(url, this.options);
  }

  toggleAccessForTenant(tenantId: string, state: boolean): Observable<any> {
    const url = `${environment.apiUrl}/tenants/${tenantId}/toggletenantstatus/${state ? 1 : 0}`;
    return this.httpClient.post<any>(url, {}, this.options);
  }

  toggleShowFooterLogo(tenantId: string, state: boolean): Observable<any> {
    const url = `${environment.apiUrl}/tenants/${tenantId}/toggleShowFooterLogoStatus/${state ? 1 : 0}`;
    return this.httpClient.post<any>(url, {}, this.options);
  }

  updateValidityDate(tenantId: string, endDate: any): Observable<any> {
    const url = `${environment.apiUrl}/tenants/${tenantId}/updatevaliditydate`;
    return this.httpClient.post<any>(url, endDate, this.options);
  }

  addDiskSpace(tenantId: string, diskspace: any): Observable<any> {
    const url = `${environment.apiUrl}/tenants/${tenantId}/adddiskspace/${diskspace}`;
    return this.httpClient.post<any>(url, {}, this.options);
  }

  increaseTenantUsers(tenantId: string, count: any): Observable<any> {
    const url = `${environment.apiUrl}/tenants/${tenantId}/increasetenantusers/${count}`;
    return this.httpClient.post<any>(url, {}, this.options);
  }

  upsertIcons(tenantId: string, iconsData: any): Observable<any> {
    const url = `${environment.apiUrl}/tenants/${tenantId}/upserticons`;
    return this.httpClient.post<any>(url, iconsData, this.options);
  }

  updateStorageDataDetails(tenantId: string, azureStorageDetails: any): Observable<any> {
    const url = `${environment.apiUrl}/tenants/${tenantId}/updatestoragedatadetails`;
    return this.httpClient.post<any>(url, azureStorageDetails, this.options);
  }

  updateLogo(tenantId: string, url: any): Observable<any> {
    const apiUrl = `${environment.apiUrl}/tenants/${tenantId}/updatelogo`;
    return this.httpClient.post<any>(apiUrl, { url }, this.options);
  }

  updateWebsite(tenantId: string, website: any): Observable<any> {
    const apiUrl = `${environment.apiUrl}/tenants/${tenantId}/updatewebsite`;
    return this.httpClient.post<any>(apiUrl, { website }, this.options);
  }

  updatePhone(tenantId: string, phone: any): Observable<any> {
    const apiUrl = `${environment.apiUrl}/tenants/${tenantId}/updatephone`;
    return this.httpClient.post<any>(apiUrl, { phone }, this.options);
  }

  updateExpenses(tenantId: string, expense: any): Observable<any> {
    const apiUrl = `${environment.apiUrl}/tenants/${tenantId}/updateexpenses`;
    return this.httpClient.post<any>(apiUrl, { expense }, this.options);
  }

  addUsedDiskSpace(tenantId: string, space: any): Observable<any> {
    const apiUrl = `${environment.apiUrl}/tenants/${tenantId}/addusedspace`;
    return this.httpClient.post<any>(apiUrl, { space }, this.options);
  }

  getDiskWarning(tenantId: string): Observable<any> {
    const apiUrl = `${environment.apiUrl}/tenants/${tenantId}/diskwarning`;
    return this.httpClient.get<any>(apiUrl, this.options);
  }

  registerAdmin(tenantId: string, adminDetails: any): Observable<any> {
    const apiUrl = `${environment.apiUrl}/tenants/${tenantId}/registerAdmin`;
    return this.httpClient.post<any>(apiUrl, adminDetails, this.options);
  }

  increaseCustomFormCount(tenantId: string, count: string): Observable<any> {
    const apiUrl = `${environment.apiUrl}/tenants/${tenantId}/increasecustomformcount/${count}`;
    return this.httpClient.post<any>(apiUrl, {}, this.options);
  }

  uploadFile(data: any): Observable<any> {
    const url = `${environment.apiUrl}/image/uploadlogos`;

    const formData = new FormData();
    formData.append('picture',data.picture, data.picture.name);
    // console.log(data)
    formData.append('containerName', data.containerName.replace(/\s+/g, '').toLowerCase());
    formData.append('uploader', 'deck');
    formData.append('entityName', data.entityName);
    return this.httpClient.post<any>(url, formData, this.options);
  }

  replaceFinalTemplate(companyName: string, file: File): Observable<any> {
    const url = `${environment.apiUrl}/project/replacefinalreporttemplate`;
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('companyName', companyName);
    return this.httpClient.post<any>(url, formData, this.options);
  }

  replaceProposalTemplate(companyName: string, file: File): Observable<any> {
    const url = `${environment.apiUrl}/project/replaceproposaltemplate`;
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('companyName', companyName);
    return this.httpClient.post<any>(url, formData, this.options);
  }

}
