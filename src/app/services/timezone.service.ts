import { Injectable } from '@angular/core';

@Injectable()
export class TimezoneService {

  private offset = 7.2e6;

  constructor() { }

  getDateFromMilliseconds(value: number): Date {
    return new Date(value + this.offset);
  }

  getDateFromSeconds(value: number): Date {
    return new Date((value * 1000) + this.offset);
  }

  getFormatedDate(date: Date): number {
    return (date.valueOf() - this.offset) / 1000;
  }
}
