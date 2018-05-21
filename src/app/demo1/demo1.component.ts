
import {
  Component,
  ViewChild,
  OnInit,
  ElementRef,
  AfterViewInit,
  ComponentFactoryResolver,
  ViewContainerRef,
  Renderer2
} from '@angular/core';

import { FormBuilder, FormGroup, FormControl, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';


import { GeocodingService } from '../services/geocoding.service';
import { DataService } from '../services/data.service';
import { MapService } from '../services/map.service';

import * as d3 from 'd3';
import * as L from 'leaflet';
import * as moment from 'moment';

import { Marker } from '../marker';
import { Mercator } from '../mercator';
import { Location } from '../location';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import { SchemaService } from '../services/schema.service';

// widgets
import { Widget } from '../widget';
import { BarChartComponent } from '../bar-chart/bar-chart.component';
import { LineChartComponent } from '../line-chart/line-chart.component';
import { WidgetHostDirective } from '../widget-host.directive';
import { CalendarComponent } from '../calendar/calendar.component';
import { ConfigurationService } from '../services/configuration.service';
import { MatSidenav } from '@angular/material';

interface WidgetType {
  key: string;
  type: string;
  widget: Widget;
}

interface DimConstraints {
  [key: string]: string;
}

@Component({
  selector: 'app-demo1',
  templateUrl: './demo1.component.html',
  styleUrls: ['./demo1.component.scss']
})
export class Demo1Component implements OnInit, AfterViewInit {
  @ViewChild('sidenav') sidenav: MatSidenav;
  @ViewChild('mapwidgets') mapwidgets: ElementRef;

  private title = 'app';
  private marker: Marker;
  private CanvasLayer: L.GridLayer;

  // schema
  ///////////////////////////////////
  aggr = 'count';
  dataset: any;

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
  private widgets: Array<WidgetType> = [];

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

  dataset_values = [
    { value: 'on_time_performance', viewValue: 'Flights' },
    { value: 'green_tripdata', viewValue: 'Green Taxis' },
    { value: 'yellow_tripdata', viewValue: 'Yellow Taxis' },
    { value: 'health', viewValue: 'Health' }
  ];

  color_map = {
    'ryw': (count) => {
      const lc = Math.log(count) / Math.log(100);

      const r = Math.floor(256 * Math.min(1, lc));
      const g = Math.floor(256 * Math.min(1, Math.max(0, lc - 1)));
      const b = Math.floor(256 * Math.min(1, Math.max(0, lc - 2)));

      return 'rgba(' + r + ',' + g + ',' + b + ',' + 0.75 + ')';
    },
    'threshold': d3.scaleThreshold<number, string>()
      .domain([100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000])
      .range(['rgb(158,1,66, 1.0)', 'rgb(213,62,79, 0.75)',
        'rgb(244,109,67, 1.0)', 'rgb(253,174,97, 0.75)',
        'rgb(254,224,139, 1.0)', 'rgb(230,245,152, 0.75)',
        'rgb(171,221,164, 1.0)', 'rgb(102,194,165, 0.75)',
        'rgb(50,136,189, 1.0)', 'rgb(94,79,162, 0.75)']),

    'quantize': d3.scaleQuantize<string>()
      .domain([0, 100000])
      .range(['rgb(158,1,66, 1.0)', 'rgb(213,62,79, 0.75)',
        'rgb(244,109,67, 1.0)', 'rgb(253,174,97, 0.75)',
        'rgb(254,224,139, 1.0)', 'rgb(230,245,152, 0.75)',
        'rgb(171,221,164, 1.0)', 'rgb(102,194,165, 0.75)',
        'rgb(50,136,189, 1.0)', 'rgb(94,79,162, 0.75)'])
  };

  color_values = [
    { value: 'ryw', viewValue: 'Red-Yellow-White', },
    { value: 'threshold', viewValue: 'Threshold', }
  ];

  constructor(
    private configService: ConfigurationService,
    private schemaService: SchemaService,

    private mapService: MapService,
    private dataService: DataService,
    private geocodingService: GeocodingService,

    private router: Router,
    private activatedRoute: ActivatedRoute,

    private renderer2: Renderer2,
    private componentFactory: ComponentFactoryResolver,

    private formBuilder: FormBuilder
  ) { }

  loadMapCard() {
    this.currentZoom = this.mapService.map.getZoom();
    this.maximumZoom = this.mapService.map.getMaxZoom();

    this.dataService.query('/query/dataset=' + this.dataset.datasetName + '/aggr=count').subscribe(data => {
      this.currentCount = data[0];
      this.maximumCount = data[0];
    });
  }

  loadLayer() {
    this.CanvasLayer = new L.GridLayer({
      updateWhenIdle: false,
      updateWhenZooming: false,
      keepBuffer: 2,
      updateInterval: 1000
    });

    this.CanvasLayer.createTile = (coords, done) => {
      const query = '/query' +
        '/dataset=' + this.dataset.datasetName +
        '/aggr=' + this.aggr +
        this.getCategoricalConst() +
        this.getTemporalConst() +
        '/const=' + this.dataset.spatialDimension[0] +
        '.tile.(' + coords.x + ':' + coords.y + ':' + coords.z + ':' + this.options.get('resolution').value + ')' +
        '/group=' + this.dataset.spatialDimension[0];

      const tile = document.createElement('canvas');

      const tileSize = this.CanvasLayer.getTileSize();
      tile.setAttribute('width', tileSize.x.toString());
      tile.setAttribute('height', tileSize.y.toString());

      const ctx = tile.getContext('2d');
      ctx.globalCompositeOperation = this.options.get('composition').value;
      ctx.clearRect(0, 0, tileSize.x, tileSize.y);

      this.dataService.query(query).subscribe(data => {
        if (data[0] === undefined) {
          return tile;
        }

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
            const drawfuncs = {
              circle: (geom_size) => {
                const radius = ((x1 - x0) / 2) + geom_size;
                ctx.beginPath();
                ctx.arc((x0 + x1) / 2, (y0 + y1) / 2, radius, 0, 2 * Math.PI);
                ctx.fill();
              },
              rect: (geom_size) => {
                ctx.fillRect(x0 - geom_size, y0 - geom_size, (x1 - x0) + geom_size, (y1 - y0) + geom_size);
              }
            };

            return {
              draw: drawfuncs[this.options.get('geometry').value],
              color: this.color_map[this.options.get('color').value]
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
    this.currentZoom = Math.round(this.mapService.map.getZoom());
  }

  loadWidgetsData() {
    for (const ref of this.widgets) {
      if (ref.type === 'categorical') {
        ref.widget.setYLabel(this.getAggrLabel());
        ref.widget.setNextTerm(
          '/query/dataset=' + this.dataset.datasetName +
          '/aggr=' + this.aggr +
          this.getCategoricalConst(ref.key) +
          this.getTemporalConst() +
          this.getRegionConst() +
          '/group=' + ref.key
        );
      } else if (ref.type === 'temporal') {
        ref.widget.setYLabel(this.getAggrLabel());
        ref.widget.setNextTerm(
          '/query/dataset=' + this.dataset.datasetName +
          '/aggr=' + this.aggr +
          this.getCategoricalConst() +
          this.getTemporalConst() +
          this.getRegionConst() +
          '/group=' + ref.key
        );
      }
    }

    // update count
    this.dataService.query('/query/dataset=' + this.dataset.datasetName + '/aggr=count' +
      this.getCategoricalConst() + this.getTemporalConst() + this.getRegionConst())
      .subscribe(data => {
        this.currentCount = data[0];
      });
  }

  setDataset(evnt: any) {
    this.sidenav.toggle();
    const link = ['/demo1', this.options.get('dataset').value];
    this.router.navigate(link);
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
      this.region[this.dataset.spatialDimension[0]] = '';
      this.currentCount = this.maximumCount;
    } else {
      const z = zoom + 8;
      const region = this.mapService.get_coords_bounds(latlng, z);

      this.region[this.dataset.spatialDimension[0]] = '/const=' + this.dataset.spatialDimension[0] +
        '.region.(' + region.x0 + ':' + region.y0 + ':' + region.x1 + ':' + region.y1 + ':' + z + ')';
    }

    this.loadWidgetsData();
  }

  getAggrLabel() {
    return 'count';
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
    this.mapService.load_CRSEPSG3857();

    this.activatedRoute.params.subscribe(params => {
      const param = params['dataset'];
      if (param !== undefined) {
        this.dataset = this.schemaService.get(param);
      } else {
        this.dataset = this.schemaService.get(this.configService.defaultDataset);
      }

      this.initialize();
    });
  }

  ngAfterViewInit() {
    this.marker = new Marker(this.mapService);
    this.marker.register(this.setRegionData);

    this.mapService.disableEvent(this.mapwidgets);

    // load visualizations
    this.loadLayer();
  }

  initialize() {
    this.options = this.formBuilder.group({
      // visualization setup
      color: new FormControl(this.dataset.color),
      geometry: new FormControl(this.dataset.geometry),
      geom_size: new FormControl(this.dataset.geometry_size),
      resolution: new FormControl(this.dataset.resolution),
      composition: new FormControl(this.dataset.composition),

      dataset: new FormControl(this.dataset.datasetName)
    });

    this.geocodingService.geocode(this.dataset.local)
      .subscribe(location => {
        this.mapService.flyTo(location);
      }, error => console.error(error));

    const viewContainerRef = this.container;

    // clear widgets
    for (let i = 0; i < this.widgets.length; ++i) {
      viewContainerRef.remove(i);
    }

    this.widgets = [];

    for (const dim of this.dataset.categoricalDimension) {
      const component = this.componentFactory.resolveComponentFactory(BarChartComponent);

      const componentRef = viewContainerRef.createComponent(component);
      const componentInstance = <BarChartComponent>componentRef.instance;

      this.renderer2.addClass(componentRef.location.nativeElement, 'app-footer-item');

      componentInstance.setFormatter(d3.format('.2s'));
      componentInstance.setXLabel(dim);
      componentInstance.register(dim, this.setCategoricalData);
      this.widgets.push({ key: dim, type: 'categorical', widget: componentInstance });
    }

    for (const dim of Object.keys(this.dataset.temporalDimension)) {
      const component = this.componentFactory.resolveComponentFactory(LineChartComponent);

      const componentRef = viewContainerRef.createComponent(component);
      const componentInstance = <LineChartComponent>componentRef.instance;

      this.renderer2.addClass(componentRef.location.nativeElement, 'app-footer-item');

      const lower = this.dataset.temporalDimension[dim].lower;
      const upper = this.dataset.temporalDimension[dim].upper;
      this.temporal[dim] = '/const=' + dim + '.interval.(' + lower + ':' + upper + ')';

      componentInstance.setFormatter(d3.format('.2s'));
      componentInstance.setXLabel(dim);
      componentInstance.register(dim, this.setTemporalData);
      this.widgets.push({ key: dim, type: 'temporal', widget: componentInstance });
    }

    // refresh input data
    this.loadWidgetsData();
    this.loadMapCard();
  }
}
