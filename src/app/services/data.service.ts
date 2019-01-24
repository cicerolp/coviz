import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { ConfigurationService } from './configuration.service';


import { Observable } from 'rxjs/Observable';

@Injectable()
export class DataService {
  private actionUrl: string;

  private headers = new HttpHeaders({
    // 'Cache-Control': 'public, max-age=86400',
    // 'Content-Type': 'application/json',
    'Accept': 'application/json'
  });

  constructor(
    private httpService: HttpClient,
    private config: ConfigurationService
  ) { }

  private handleError(error: any): Observable<any> {
    console.error('An error occurred', error);
    return Observable.throw(error.json().error || 'Server error');
  }


  query(action: string): Observable<any> {
    return this.httpService
      .get(this.config.ServerWithApiUrl + action, { responseType: 'text', headers: this.headers })
      .map(response => JSON.parse(response));
  }

  schema(action: string): Observable<any> {
    return this.httpService
      .get(this.config.ServerWithApiUrl + '/schema' + action, { responseType: 'text', headers: this.headers })
      .map(response => JSON.parse(response));
  }
}
