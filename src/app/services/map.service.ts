import { Injectable, ElementRef } from '@angular/core';

import { Http } from '@angular/http';
import { HttpClient } from '@angular/common/http';

import * as d3 from 'd3';
import * as L from 'leaflet';

import { Mercator } from '../mercator';
import { Location } from '../location';
import { LatLngBounds } from 'leaflet';

@Injectable()
export class MapService {
  public map: L.Map;
  private status = 'online';

  private lastPosition = {
    'center': [0, 0],
    'zoom': 2
  };

  constructor(private http: HttpClient) { }

  load_CRSSimple() {
    this.map = L.map('map', {
      crs: L.CRS.Simple
    });

    var bounds = [[-512, -512], [512, 512]];
    this.map.fitBounds(bounds);

    this.addDebugLayer();

    this.map.on('moveend', () => {
      this.lastPosition.center = this.map.getCenter();
      this.lastPosition.zoom = this.map.getZoom();
    });
  }

  load_CRSEPSG3857() {
    this.map = L.map('map', {
      worldCopyJump: true
    }).setView(this.lastPosition.center, this.lastPosition.zoom);

    // L.tileLayer('https://api.mapbox.com/styles/v1/calpahins/cjmrqq48d06jo2ss24jxpa5ge/tiles/256/{z}/{x}/{y}?access_token={accessToken}', {

    // L.tileLayer('https://api.mapbox.com/styles/v1/calpahins/cjmq57scw05m72ro7wldn6nam/tiles/256/{z}/{x}/{y}?access_token={accessToken}', {

    L.tileLayer('https://api.mapbox.com/styles/v1/calpahins/cjh7nizdb615e2rk3btgrklul/tiles/256/{z}/{x}/{y}?access_token={accessToken}', {
      attribution: '',
      maxZoom: 18,
      id: 'mapbox.streets',
      accessToken: 'pk.eyJ1IjoiY2FscGFoaW5zIiwiYSI6ImNqaDduaGVtdDBhM28zM21qN2hoOTh1d2IifQ.JyQl2tr6nStL5271bNz7FA'
    }).addTo(this.map);

    // this.addDebugLayer();

    this.map.on('moveend', () => {
      this.lastPosition.center = this.map.getCenter();
      this.lastPosition.zoom = this.map.getZoom();
    });
  }

  private addDebugLayer() {
    const DebugLayer = L.GridLayer.extend({
      createTile: function (coords) {
        const tile = document.createElement('div');
        // tile.innerHTML = ;
        tile.innerHTML = '<span style=\'color: darkgrey;\'>' + [coords.x, coords.y, coords.z].join(', ') + '</span>'
        tile.style.outline = '1px solid black';
        return tile;
      }
    });

    this.map.addLayer(new DebugLayer());
  }

  flyTo(location: Location): void {
    this.map.flyToBounds(location.viewBounds, { duration: 3.0 });
  }

  fitBounds(bounds): void {
    this.map.fitBounds(bounds, { duration: 0.0 });
  }

  get_coords_bounds(bound?: any, zoom?: number) {
    const b = bound || this.map.getBounds();
    let z = zoom || this.map.getZoom();

    z = Math.min(z, 24);

    let lat0 = b.getNorthEast().lat;
    let lon0 = b.getSouthWest().lng;
    let lat1 = b.getSouthWest().lat;
    let lon1 = b.getNorthEast().lng;

    // out of bounds check
    if (lon0 < -180) { lon0 = -180; }
    if (lon1 < -180) { lon1 = -180; }

    if (lon0 > 179) { lon0 = 179.9; }
    if (lon1 > 179) { lon1 = 179.9; }

    if (lat0 < -85) { lat0 = -85; }
    if (lat1 < -85) { lat1 = -85; }

    if (lat0 > 85) { lat0 = 85; }
    if (lat1 > 85) { lat1 = 85; }

    const x0 = Math.floor(Mercator.lon2tilex(lon0, z));
    const x1 = Math.ceil(Mercator.lon2tilex(lon1, z));

    const y0 = Math.floor(Mercator.lat2tiley(lat0, z));
    const y1 = Math.ceil(Mercator.lat2tiley(lat1, z));

    return { x0: x0, y0: y0, x1: x1, y1: y1, z: z };
  }

  disableEvent(el: ElementRef): void {
    L.DomEvent.disableClickPropagation(el.nativeElement);
    L.DomEvent.disableScrollPropagation(el.nativeElement);
  }
}
