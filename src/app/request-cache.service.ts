import { Injectable } from "@angular/core";
import { HttpResponse } from "@angular/common/http";


@Injectable()
export class RequestCacheService {
  private cache = new Map<string, [Date, HttpResponse<any>]>();

  get(key): HttpResponse<any> {
    const tuple = this.cache.get(key);
    if (!tuple) return null;

    const expires = tuple[0];
    const httpResponse = tuple[1];

    // Don't observe expired keys
    const now = new Date();
    if (expires && expires.getTime() < now.getTime()) {
      this.cache.delete(key);
      return null;
    }

    return httpResponse;
  }

  set(key, value, ttl = null) {
    if (ttl) {
      const expires = new Date();
      expires.setSeconds(expires.getSeconds() + ttl);
      this.cache.set(key, [expires, value]);
    } else {
      this.cache.set(key, [null, value]);
    }
  }
}
