import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Form, Question } from './models/form';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FormsService {
  constructor(private httpClient: HttpClient) {}

  // Read the token on EVERY request (Sep 24 2026) - see TenantsService.
  get options(): any {
    return { headers: new HttpHeaders({ 'Authorization': localStorage.getItem('authorization') || '' }) };
  }

  addForm(data: Form): Observable<any> {
    return this.httpClient.post<any>(`${environment.apiUrl}/locationforms/add`, data, this.options);
  }

  getAllForms(tenant:string): Observable<any> {
    return this.httpClient.post<any>(`${environment.apiUrl}/locationforms/getalllocationforms`,
      {'companyIdentifier':tenant}, this.options);
  }

  getFormById(FormId: string): Observable<any> {
    return this.httpClient.get<any>(`${environment.apiUrl}/locationforms/${FormId}`, this.options);
  }

  editForm(FormId: string, updatedData: Partial<Form>): Observable<any> {
    const url = `${environment.apiUrl}/locationforms/${FormId}`;
    return this.httpClient.put<any>(url, updatedData, this.options);
  }

  deleteFormPermanently(FormId: string): Observable<any> {
    const url = `${environment.apiUrl}/locationforms/${FormId}`;
    return this.httpClient.delete<any>(url, this.options);
  }

  addQuestionsToForm(FormId:string,questions:Question []):Observable<any>{
    const url = `${environment.apiUrl}/locationforms/${FormId}/addquestions`;
    return this.httpClient.post<any>(url,questions, this.options);
  }

  addQuestionToForm(FormId: string, questionObj: Question):Observable<any>{
    const url = `${environment.apiUrl}/locationforms/${FormId}/addquestion`;
    return this.httpClient.post<any>(url, questionObj, this.options);
  }

  deleteQuestionToForm(FormId:string,QuestionId:string):Observable<any>{
    const url = `${environment.apiUrl}/locationforms/${FormId}/questions/${QuestionId}`;
    return this.httpClient.delete<any>(url, this.options);
  }
  updateQuestionToForm(FormId:string,QuestionId:string,Question:Question):Observable<any>{
    const url = `${environment.apiUrl}/locationforms/${FormId}/questions/${QuestionId}`;
    return this.httpClient.post<any>(url,Question, this.options);
  }
}
