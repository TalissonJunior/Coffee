import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Authenticate } from '../models/authenticate';
import { User } from '../models/user';
import { UserToken } from '../models/userToken';
import { Provider } from '../enums/provider';
import { UserRoles } from '../enums/role';
import { BaseFilterResponse } from '../models/baseFilterResponse';
import { Pager } from '../models/pager';
import { UtilsService } from './utils/utils.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  baseEndPoint = environment.apiBaseUrl + '/user';

  constructor(
    private router: Router,
    private httpClient: HttpClient,
    private utilsService: UtilsService
  ) {}

  getInfo(): Observable<User> {
    return this.httpClient
      .get<User>(`${this.baseEndPoint}/loggeduserinfo`)
      .pipe(map(data => new User(data)));
  }

  getById(userId: string): Observable<User> {
    return this.httpClient
      .get<User>(`${this.baseEndPoint}/${userId}`)
      .pipe(map(data => new User(data)));
  }

  getAll(
    pageSize?: number,
    currenPage?: number,
    search?: string,
    userRole?: string
  ): Observable<BaseFilterResponse<User>> {
    let url = `${this.baseEndPoint}`;
    let params = [];
    let filters = [];

    if (pageSize) {
      params.push(`pageSize=${pageSize}`);
    }
    if (currenPage) {
      params.push(`page=${currenPage}`);
    }
    if (search) {
      filters.push(`firstName@=*${search}`);
    }
    if (userRole && userRole != 'null') {
      filters.push(`role@=${userRole}`);
    }

    if (filters.length) {
      params.push('filters=' + filters.join(','));
    }

    url = url + '?' + params.join('&');

    return this.httpClient.get<BaseFilterResponse<User>>(url).pipe(
      map(data => {
        let values = data.data.map(user => new User(user));
        let pager = new Pager(data.pager);
        return new BaseFilterResponse(values, pager);
      })
    );
  }

  create(user: User): Observable<User> {
    if (!user.provider) {
      user.provider = Provider.LoginPassword;
    }

    return this.httpClient
      .post<UserToken>(`${this.baseEndPoint}/register`, user)
      .pipe(
        map(data => {
          return new User(data.user);
        })
      );
  }

  update(userId: string, user: any): Observable<User> {
    return this.httpClient
      .put<User>(
        `${this.baseEndPoint}/${userId}`,
        this.utilsService.convertModelToFormData(user)
      )
      .pipe(map(data => new User(data)));
  }

  sendResetLogin(login: string): Observable<string> {
    return this.httpClient.get<string>(
      `${this.baseEndPoint}/send/email/recoverpassword/${login}`,
      { responseType: 'text' as 'json' }
    );
  }

  getTokenFromTemporaryToken(code: string): Observable<any> {
    return this.httpClient
      .get<any>(`${this.baseEndPoint}/authenticate/code/${code}`)
      .pipe(
        map(data => {
          this.saveToken(data.token);
          return new User(data.user);
        })
      );
  }

  resetPassword(password: string): Observable<any> {
    return this.httpClient
      .post<any>(`${this.baseEndPoint}/ChangePassword/${password}`, null)
      .pipe(map(response => response));
  }

  authenticate(model: Authenticate): Observable<User> {
    return this.httpClient
      .post<UserToken>(`${this.baseEndPoint}/authenticate`, model)
      .pipe(
        map(data => {
          this.saveToken(data.token);
          return new User(data.user);
        })
      );
  }

  isAuthenticated(): Observable<boolean> {
    let hasToken = this.getToken() != null ? true : false;

    return Observable.create(observer => {
      if (!hasToken) {
        observer.next(false);
        observer.complete();
        return;
      }

      this.getInfo().subscribe(
        user => {
          if (!user) {
            observer.next(false);
          } else {
            observer.next(true);
          }
          observer.complete();
        },
        () => {
          observer.next(false);
          observer.complete();
        }
      );
    });
  }

  hasPermission(userRoles: UserRoles | UserRoles[]): Observable<boolean> {
    return this.getInfo().pipe(
      map(user => {
        user = new User(user);

        if (Array.isArray(userRoles)) {
          return userRoles.find(role => role == user.role) == null
            ? false
            : true;
        } else if (user.role == userRoles) {
          return true;
        }

        return false;
      })
    );
  }

  saveToken(token: string): void {
    localStorage.setItem(environment.keys.storage, token);
  }

  getToken(): string {
    return localStorage.getItem(environment.keys.storage);
  }
  logout(): void {
    localStorage.removeItem(environment.keys.storage);
    this.router.navigate(['']);
  }
}
