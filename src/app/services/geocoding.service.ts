import { Http } from '@angular/http';
import { Injectable } from '@angular/core';

import { Location } from '../location';

import * as L from 'leaflet';

import 'rxjs/add/operator/map';

@Injectable()
export class GeocodingService {

  constructor(private http: Http) { }

  geocode(address: string) {
    return this.http
      .get('https://maps.googleapis.com/maps/api/geocode/json?address=' +
        encodeURIComponent(address) +
        '&key=AIzaSyARO5I2tavzKvAcfsfEyRke0z-GQRzddYA')
      .map(response => response.json())
      .map(response => {
        if (response.status !== 'OK') {
          throw new Error('unable to geocode address');
        }

        const location = new Location();
        location.address = response.results[0].formatted_address;
        location.latitude = response.results[0].geometry.location.lat;
        location.longitude = response.results[0].geometry.location.lng;

        const viewPort = response.results[0].geometry.viewport;
        location.viewBounds = L.latLngBounds(
          {
            lat: viewPort.southwest.lat,
            lng: viewPort.southwest.lng
          },
          {
            lat: viewPort.northeast.lat,
            lng: viewPort.northeast.lng
          });

        return location;
      });
  }
}
