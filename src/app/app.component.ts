import { Component, ViewChild, OnInit, ElementRef, AfterViewInit, ComponentFactoryResolver, ViewContainerRef, Renderer2 } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';

import { GeocodingService } from './services/geocoding.service';
import { DataService } from './services/data.service';
import { MapService } from './services/map.service';

import * as d3 from 'd3';
import * as L from 'leaflet';
import * as moment from 'moment';

import { Marker } from './marker';
import { Mercator } from './mercator';
import { Location } from './location';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import { SchemaService } from './services/schema.service';

// widgets
import { BarChartComponent } from './bar-chart/bar-chart.component';
import { LineChartComponent } from './line-chart/line-chart.component';
import { Widget } from './widget';
import { WidgetHostDirective } from './widget-host.directive';

interface WidgetType {
  [key: string]: { type: string, widget: Widget };
}

interface DimConstraints {
  [key: string]: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('mapwidgets') mapwidgets: ElementRef;

  private title = 'app';
  private marker: Marker;
  private CanvasLayer: L.GridLayer;

  // schema
  ///////////////////////////////////
  schema: any;
  aggr = 'count';

  // map card
  ///////////////////////////////////
  currentZoom = 0;
  maximumZoom = 0;

  currentCount = 0;
  maximumCount = 0;

  // queries
  ///////////////////////////////////
  private region: DimConstraints = {};
  private temporal: DimConstraints = {};
  private categorical: DimConstraints = {};

  // widgets
  //////////////////////////////////
  @ViewChild('container', { read: ViewContainerRef }) container: ViewContainerRef;
  private widgets: WidgetType = {};

  mode = new FormControl('over');
  options: FormGroup;

  geometry_values = [
    { value: 'rect', viewValue: 'Rectangle' },
    { value: 'circle', viewValue: 'Circle' }
  ];

  composition_values = [
    { value: 'lighter', viewValue: 'Lighter' },
    { value: 'color', viewValue: 'Color' }
  ];

  constructor(
    private renderer: Renderer2,
    private componentFactory: ComponentFactoryResolver,
    private schemaService: SchemaService,
    private mapService: MapService,
    private dataService: DataService,
    private geocodingService: GeocodingService,
    fb: FormBuilder
  ) {
    this.schema = this.schemaService.get('on_time_performance');

    this.options = fb.group({
      geometry: new FormControl('rect'),
      composition: new FormControl('color'),
      resolution: new FormControl(8),
      geom_size: new FormControl(1)
    });
  }

  loadMapCard() {
    this.currentZoom = this.mapService.map.getZoom();
    this.maximumZoom = this.mapService.map.getMaxZoom();

    this.dataService.query('/query/dataset=' + this.schema.datasetName + '/aggr=count').subscribe(data => {
      this.currentCount = data[0];
      this.maximumCount = data[0];
    });
  }

  loadLayer() {
    this.CanvasLayer = new L.GridLayer({
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 0
    });

    this.CanvasLayer.createTile = (coords, done) => {
      const query = '/query' +
        '/dataset=' + this.schema.datasetName +
        '/aggr=' + this.aggr +
        this.getCategoricalConst() +
        this.getTemporalConst() +
        '/const=' + this.schema.spatialDimension[0] +
        '.tile.(' + coords.x + ':' + coords.y + ':' + coords.z + ':' + this.options.get('resolution').value + ')' +
        '/group=' + this.schema.spatialDimension[0];

      const tile = document.createElement('canvas');

      const tileSize = this.CanvasLayer.getTileSize();
      tile.setAttribute('width', tileSize.x.toString());
      tile.setAttribute('height', tileSize.y.toString());

      const ctx = tile.getContext('2d');
      ctx.globalCompositeOperation = this.options.get('composition').value;


      this.dataService.query(query).subscribe(data => {
        ctx.clearRect(0, 0, tileSize.x, tileSize.y);

        for (const d of data[0]) {
          if (d[2] < coords.z + this.options.get('resolution').value) {
            d[0] = Mercator.lon2tilex(Mercator.tilex2lon(d[0] + 0.5, d[2]), coords.z + this.options.get('resolution').value);
            d[1] = Mercator.lat2tiley(Mercator.tiley2lat(d[1] + 0.5, d[2]), coords.z + this.options.get('resolution').value);
            d[2] = coords.z + this.options.get('resolution').value;
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
              circle: function draw_circle(geom_size) {
                const radius = geom_size * coords.z;
                const midx = (x0 + x1) / 2;
                const midy = (y0 + y1) / 2;
                ctx.beginPath();
                ctx.arc(midx, midy, radius, 0, 2 * Math.PI);
                ctx.fill();
              },
              rect: function draw_rect(geom_size) {
                const size_px = geom_size * coords.z;
                const width = x1 - x0;
                const height = y1 - y0;
                ctx.fillRect(x0 - size_px, y0 - size_px, width + size_px, height + size_px);
              }
            };

            return {
              draw: drawfuncs[this.options.get('geometry').value],
              color: colormaps['ryw']
            };
          };

          ctx.fillStyle = config().color(d[3]);
          config().draw(this.options.get('geom_size').value);
        }

        done(null, tile);
      });

      return tile;
    };

    this.mapService.map.addLayer(this.CanvasLayer);
    this.mapService.map.on('zoomend', this.onMapZoomEnd, this);
  }

  onMapZoomEnd() {
    this.currentZoom = this.mapService.map.getZoom();
  }

  loadWidgetsData() {
    for (const key of Object.keys(this.widgets)) {
      const ref = this.widgets[key];

      if (ref.type === 'categorical') {
        ref.widget.setNextTerm(
          '/query/dataset=' + this.schema.datasetName +
          '/aggr=' + this.aggr +
          this.getCategoricalConst(key) +
          this.getTemporalConst() +
          this.getRegionConst() +
          '/group=' + key
        );
      } else if (ref.type === 'temporal') {
        ref.widget.setNextTerm(
          '/query/dataset=' + this.schema.datasetName +
          '/aggr=' + this.aggr +
          this.getCategoricalConst() +
          this.getTemporalConst() +
          this.getRegionConst() +
          '/group=' + key
        );
      }
    }

    // update count
    this.dataService.query('/query/dataset=' + this.schema.datasetName + '/aggr=count' +
      this.getCategoricalConst() + this.getTemporalConst() + this.getRegionConst())
      .subscribe(data => {
        this.currentCount = data[0];
      });
  }

  setMapData() {
    this.CanvasLayer.redraw();
  }

  setCategoricalData = (dim: string, selected: Array<string>) => {
    if (selected.length === 0) {
      this.categorical[dim] = '';
    } else {
      let values = '/const=' + dim + '.values.(';
      for (const elt of selected) {
        values += elt + ':';
      }
      values = values.substr(0, values.length - 1);
      values += ')';

      this.categorical[dim] = values;
    }

    this.loadWidgetsData();
    this.setMapData();
  }

  setTemporalData = (dim: string, interval: Array<string>) => {
    const values = '/const=' + dim + '.interval.(' + interval[0] + ':' + interval[1] + ')';
    this.temporal[dim] = values;

    this.loadWidgetsData();
    this.setMapData();
  }

  public setRegionData = (latlng: any, zoom: number): void => {
    if (latlng.getNorthEast().lat === latlng.getSouthWest().lat && latlng.getSouthWest().lng === latlng.getNorthEast().lng) {
      this.region[this.schema.spatialDimension[0]] = '';
      this.currentCount = this.maximumCount;
    } else {
      const z = zoom + 8;
      const region = this.mapService.get_coords_bounds(latlng, z);

      this.region[this.schema.spatialDimension[0]] = '/const=' + this.schema.spatialDimension[0] +
        '.region.(' + region.x0 + ':' + region.y0 + ':' + region.x1 + ':' + region.y1 + ':' + z + ')';
    }

    this.loadWidgetsData();
  }

  getCategoricalConst(filter?: string) {
    let constrainsts = '';
    for (const key of Object.keys(this.categorical)) {
      if (filter && key === filter) {
        continue;
      } else {
        constrainsts += this.categorical[key];
      }
    }

    if (filter !== undefined) {
      constrainsts += '/const=' + filter + '.values.(all)';
    }
    return constrainsts;
  }

  getTemporalConst() {
    let constrainsts = '';
    for (const key of Object.keys(this.temporal)) {
      constrainsts += this.temporal[key];
    }

    return constrainsts;
  }

  getRegionConst() {
    let constrainsts = '';
    for (const key of Object.keys(this.region)) {
      constrainsts += this.region[key];
    }
    return constrainsts;
  }

  ngOnInit() {
    this.mapService.load();
    this.loadMapCard();

    const viewContainerRef = this.container;

    for (const dim of this.schema.categoricalDimension) {
      const component = this.componentFactory.resolveComponentFactory(BarChartComponent);

      const componentRef = viewContainerRef.createComponent(component);
      const componentInstance = <BarChartComponent>componentRef.instance;

      this.renderer.addClass(componentRef.location.nativeElement, 'app-footer-item');

      componentInstance.register(dim, this.setCategoricalData);
      this.widgets[dim] = { type: 'categorical', widget: componentInstance };
    }

    for (const key of Object.keys(this.schema.temporalDimension)) {
      const component = this.componentFactory.resolveComponentFactory(LineChartComponent);

      const componentRef = viewContainerRef.createComponent(component);
      const componentInstance = <LineChartComponent>componentRef.instance;

      this.renderer.addClass(componentRef.location.nativeElement, 'app-footer-item');

      const lower = this.schema.temporalDimension[key].lower;
      const upper = this.schema.temporalDimension[key].upper;
      this.temporal[key] = '/const=' + key + '.interval.(' +
        lower + ':' + upper + ')';

      componentInstance.setBound(lower, upper);
      componentInstance.register(key, this.setTemporalData);
      this.widgets[key] = { type: 'temporal', widget: componentInstance };
    }
  }

  ngAfterViewInit() {
    this.marker = new Marker(this.mapService);
    this.marker.register(this.setRegionData);

    this.mapService.disableEvent(this.mapwidgets);

    this.geocodingService.geocode(this.schema.local)
      .subscribe(location => {
        this.mapService.flyTo(location);
      }, error => console.error(error));

    // load visualizations
    this.loadLayer();
    // refresh input data
    this.loadWidgetsData();

  }
}
