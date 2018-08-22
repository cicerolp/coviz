import { Injectable } from '@angular/core';

import * as moment from 'moment';

@Injectable()
export class TimezoneService {

  private offset = 3600 * 3 * 1000;

  constructor() { }

  getDate(timestamp) {
    // Multiply by 1000 because JS works in milliseconds instead of the UNIX seconds
    const date = new Date(timestamp * 1000);

    const year = date.getUTCFullYear();
    let month = date.getUTCMonth() + 1; // getMonth() is zero-indexed, so we'll increment to get the correct month number
    let day = date.getUTCDate();
    let hours = date.getUTCHours();
    let minutes = date.getUTCMinutes();
    let seconds = date.getUTCSeconds();

    month = (month < 10) ? 0 + month : month;
    day = (day < 10) ? 0 + day : day;
    hours = (hours < 10) ? 0 + hours : hours;
    minutes = (minutes < 10) ? 0 + minutes : minutes;
    seconds = (seconds < 10) ? 0 + seconds : seconds;

    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes;
  }

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
