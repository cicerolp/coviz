import { Injectable } from '@angular/core';
import { Http } from '@angular/http';

import * as L from 'leaflet';

@Injectable()
export class MapService {
  public map: L.Map;

  constructor(private http: Http) { }

  load() {
    console.log(L);
    this.map = L.map('map').setView([51.505, -0.09], 13);

    L.tileLayer('https://api.mapbox.com/styles/v1/cicerolp/cjc0c1nafgzqu2sru25nufh5r/tiles/256/{z}/{x}/{y}?access_token={accessToken}', {
      attribution: 'QDS Authors',
      maxZoom: 18,
      id: 'mapbox.streets',
      accessToken: 'pk.eyJ1IjoiY2ljZXJvbHAiLCJhIjoia1IxYmtfMCJ9.3EMmwKCCFN-hmsrQY4_wUQ'
    }).addTo(this.map);
  }
}
