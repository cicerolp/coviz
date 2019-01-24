import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class DataSharingService {
  private data = new Map();

  private messageSource = new BehaviorSubject('default message');
  currentMessage = this.messageSource.asObservable();

  constructor() { }

  initializeObservable(key) {
    if (!this.data.has(key)) {
      this.data.set(key, new BehaviorSubject(undefined));
    }
  }

  getObservable(key) {
    this.initializeObservable(key);

    return this.data.get(key).asObservable();
  }
  
  setObservable(key, data) {
    this.initializeObservable(key);

    this.data.get(key).next(data);
  }
}
