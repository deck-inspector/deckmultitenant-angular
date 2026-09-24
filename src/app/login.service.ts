import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { jwtDecode } from 'jwt-decode';


@Injectable({
  providedIn: 'root',
})
export class LoginService {
  currentlyLoggedInUsername: string;
  constructor(private httpClient: HttpClient) {}

  login(data: any): Observable<any> {
    return this.httpClient.post<any>(`${environment.apiUrl}/login/loginSuperUser`, data);
  }

  isLoggedIn() {
    const token = localStorage.getItem('authorization');
    if (token !== null && token !== undefined){
      const tokenPayload = jwtDecode(token!) as { exp: number };
      const expirationTime = tokenPayload.exp * 1000;

      // Get the current time in milliseconds
      const currentTime = new Date().getTime();
      return currentTime < expirationTime && localStorage.getItem('authToken') !== null;
    }
    return localStorage.getItem('authToken') !== null;
}
}

/**
 * Sep 24 2026 - stale-token fix. The data services used to capture the
 * Authorization header ONCE in their constructor; after a token expired and the
 * user signed in again (no page reload) every request still carried the dead
 * token, so Clients / Users / master downloads failed until the site was closed
 * and reopened. This interceptor stamps the CURRENT token from localStorage on
 * every API request, and on 401 / 403 clears the login and returns to /login.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isApi = req.url.startsWith(environment.apiUrl);
    const isLogin = req.url.indexOf('/login/') >= 0;
    const token = localStorage.getItem('authorization');
    let request = req;
    if (isApi && !isLogin && token) {
      request = req.clone({ setHeaders: { Authorization: token } });
    }
    return next.handle(request).pipe(
      catchError((err: any) => {
        if (isApi && !isLogin && err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('authorization');
          this.router.navigateByUrl('/login');
        }
        return throwError(() => err);
      })
    );
  }
}
