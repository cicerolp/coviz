import { Injectable, ElementRef } from '@angular/core';

import { Http } from '@angular/http';
import { HttpClient } from '@angular/common/http';

import * as d3 from 'd3';
import * as L from 'leaflet';

import { Mercator } from '../mercator';
import { Location } from '../location';

@Injectable()
export class MapService {
  public map: L.Map;
  private status = 'online';

  constructor(private http: HttpClient) { }

  load() {
    this.map = L.map('map', {
      worldCopyJump: true
    }).setView([0, 0], 1);

    L.tileLayer('https://api.mapbox.com/styles/v1/cicerolp/cjc0c1nafgzqu2sru25nufh5r/tiles/256/{z}/{x}/{y}?access_token={accessToken}', {
      attribution: 'QDS Authors',
      maxZoom: 18,
      id: 'mapbox.streets',
      accessToken: 'pk.eyJ1IjoiY2ljZXJvbHAiLCJhIjoia1IxYmtfMCJ9.3EMmwKCCFN-hmsrQY4_wUQ'
    }).addTo(this.map);

    const CanvasLayer = new L.GridLayer({
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 0
    });

    CanvasLayer.createTile = (coords, done) => {
      const dataset = 'on_time_performance';
      const mapResolution = 8;
      const aggr = 'count';

      const dimension = 'origin_airport';

      const query = '/query' +
        '/dataset=' + dataset +
        '/aggr=' + aggr +
        '/const=' + dimension + '.tile.(' + coords.x + ':' + coords.y + ':' + coords.z + ':' + mapResolution + ')' +
        '/group=' + dimension;

      const tile = document.createElement('canvas');

      const tileSize = CanvasLayer.getTileSize();
      tile.setAttribute('width', tileSize.x.toString());
      tile.setAttribute('height', tileSize.y.toString());

      const ctx = tile.getContext('2d');
      ctx.globalCompositeOperation = 'darken';

      this.getData(query).subscribe(data => {
        ctx.clearRect(0, 0, tileSize.x, tileSize.y);

        for (const d of data[0]) {
          if (d[2] < coords.z + mapResolution) {
            d[0] = Mercator.lon2tilex(Mercator.tilex2lon(d[0] + 0.5, d[2]), coords.z + mapResolution);
            d[1] = Mercator.lat2tiley(Mercator.tiley2lat(d[1] + 0.5, d[2]), coords.z + mapResolution);
            d[2] = coords.z + mapResolution;
          }

          const lon0 = Mercator.tilex2lon(d[0], d[2]);
          const lat0 = Mercator.tiley2lat(d[1], d[2]);
          const lon1 = Mercator.tilex2lon(d[0] + 1, d[2]);
          const lat1 = Mercator.tiley2lat(d[1] + 1, d[2]);

          const x0 = (Mercator.lon2tilex(lon0, coords.z) - coords.x) * 256;
          const y0 = (Mercator.lat2tiley(lat0, coords.z) - coords.y) * 256;
          const x1 = (Mercator.lon2tilex(lon1, coords.z) - coords.x) * 256;
          const y1 = (Mercator.lat2tiley(lat1, coords.z) - coords.y) * 256;

          const config = () => {
            const colormaps = {
              ryw: function (count) {
                const lc = Math.log(count) / Math.log(100);

                const r = Math.floor(256 * Math.min(1, lc));
                const g = Math.floor(256 * Math.min(1, Math.max(0, lc - 1)));
                const b = Math.floor(256 * Math.min(1, Math.max(0, lc - 2)));

                return 'rgba(' + r + ',' + g + ',' + b + ',' + 1.0 + ')';
              },

              bbb: d3.scaleThreshold<number, string>()
                .domain([100, 200, 300, 400, 500, 600, 700, 800, 900])
                .range(['rgb(158,1,66, 1.0)', 'rgb(213,62,79, 1.0)',
                  'rgb(244,109,67, 1.0)', 'rgb(253,174,97, 1.0)',
                  'rgb(254,224,139, 1.0)', 'rgb(230,245,152, 1.0)',
                  'rgb(171,221,164, 1.0)', 'rgb(102,194,165, 1.0)',
                  'rgb(50,136,189, 1.0)', 'rgb(94,79,162, 1.0)']),

              debug: function (count) {
                return 'rgba(256,256,256,1.0)';
              },
            };

            const drawfuncs = {
              circle: function draw_circle() {
                const radius = 1.0 + coords.z;
                const midx = (x0 + x1) / 2;
                const midy = (y0 + y1) / 2;
                ctx.beginPath();
                ctx.arc(midx, midy, radius, 0, 2 * Math.PI);
                ctx.fill();
              },
              rect: function draw_rect() {
                const size_px = 5.0 + coords.z;
                const width = x1 - x0;
                const height = y1 - y0;
                ctx.fillRect(x0 - size_px, y0 - size_px, width + size_px, height + size_px);
              }
            };

            return {
              draw: drawfuncs['circle'],
              color: colormaps['ryw']
            };
          };

          ctx.fillStyle = config().color(d[3]);
          config().draw();
        }

        done(null, tile);
      });

      return tile;
    };

    const DebugLayer = L.GridLayer.extend({
      createTile: function (coords) {
        const tile = document.createElement('div');
        tile.innerHTML = [coords.x, coords.y, coords.z].join(', ');
        tile.style.outline = '1px solid darkgray';
        return tile;
      }
    });

    this.map.addLayer(CanvasLayer);
    this.map.addLayer(new DebugLayer());
  }

  flyTo(location: Location): void {
    // this.map.fitBounds(location.viewBounds, {});
    this.map.flyToBounds(location.viewBounds, {});
  }

  getData(query: string) {
    const baseUrl = 'http://localhost:7000/api';
    return this.http.get(baseUrl + query);
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
