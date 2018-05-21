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
import { legendColor } from 'd3-svg-legend';

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
import { TemporalBandComponent } from '../temporal-band/temporal-band.component';

interface WidgetType {
  key: string;
  type: string;
  widget: Widget;
}

interface DimConstraints {
  [key: string]: string;
}

@Component({
  selector: 'app-demo3',
  templateUrl: './demo3.component.html',
  styleUrls: ['./demo3.component.scss']
})
export class Demo3Component implements OnInit, AfterViewInit {
  @ViewChild('sidenav') sidenav: MatSidenav;
  @ViewChild('mapwidgets') mapwidgets: ElementRef;

  private title = 'app';
  private marker: Marker;
  private CanvasLayer: L.GridLayer;

  // schema
  ///////////////////////////////////
  private aggr: string;
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

  bandQuantiles = '0.5';

  aggr_values = [
    { value: 'count', viewValue: 'Count' },
    // { value: 'mean', viewValue: 'Mean' },
    // { value: 'variance', viewValue: 'Variance' },
    // { value: 'quantile', viewValue: 'Quantile' },
    { value: 'cdf', viewValue: 'CDF' }
  ];

  aggr_map = {
    'count': {
      key: 'count',
      label: 'count',
      formatter: d3.format('.2s')
    },
    'mean': {
      key: 'average',
      sufix: '_g',
      label: 'value',
      formatter: d3.format('.2s')
    },
    'variance': {
      key: 'variance',
      sufix: '_g',
      label: 'value',
      formatter: d3.format('.2s')
    },
    'quantile': {
      key: 'quantile',
      sufix: '_t',
      label: 'value',
      formatter: d3.format('.2s')
    },
    'cdf': {
      key: 'inverse',
      sufix: '_t',
      label: 'quantile',
      formatter: d3.format('.2f')
    },
  };

  geometry_values = [
    { value: 'rect', viewValue: 'Rectangle' },
    { value: 'circle', viewValue: 'Circle' }
  ];

  composition_values = [
    { value: 'lighter', viewValue: 'Lighter' },
    { value: 'color', viewValue: 'Color' }
  ];

  dataset_values = [
    { value: 'on_time_performance_2014', viewValue: 'Flights' }
    // { value: 'green_tripdata', viewValue: 'Green Taxis' }
  ];

  color: any;

  payload_range = [
    'rgba(103,  0, 31, 0.75)',
    'rgba(178, 24, 43, 0.75)',
    'rgba(214, 96, 77, 0.75)',
    'rgba(244,165,130, 0.75)',
    'rgba(253,219,199, 0.75)',
    'rgba(209,229,240, 0.75)',
    'rgba(146,197,222, 0.75)',
    'rgba( 67,147,195, 0.75)',
    'rgba( 33,102,172, 0.75)',
    'rgba(  5, 48, 97, 0.75)'
  ];

  color_map = {
    'count': (count) => {
      const lc = Math.log(count) / Math.log(100);

      const r = Math.floor(256 * Math.min(1, lc));
      const g = Math.floor(256 * Math.min(1, Math.max(0, lc - 1)));
      const b = Math.floor(256 * Math.min(1, Math.max(0, lc - 2)));

      return 'rgba(' + r + ',' + g + ',' + b + ',' + 0.75 + ')';
    },
    'payload': (count) => d3.scaleQuantize<string>()
      .domain([parseFloat(this.getPayloadInfo('min_value')), parseFloat(this.getPayloadInfo('max_value'))])
      .range(this.payload_range)(count),
  };

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

  loadLegend() {
    const svg = d3.select('#svg-color-quant');
    svg.selectAll('*').remove();

    if (this.options.get('aggr').value !== 'count') {
      svg.append('g')
        .attr('class', 'legendQuant')
        .attr('transform', 'translate(0, 0)');

      const domain: [number, number] = [parseFloat(this.getPayloadInfo('min_value')), parseFloat(this.getPayloadInfo('max_value'))];

      const colorLegend = legendColor()
        .ascending(true)
        .labelFormat(d3.format('.2'))
        .scale(d3.scaleQuantize<string>().domain(domain).range(this.payload_range));

      svg.select('.legendQuant')
        .call(colorLegend);
    }
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
        this.getAggr() +
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
              color: this.color
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
        ref.widget.setYLabel(this.aggr_map[this.options.get('aggr').value].label);
        ref.widget.setFormatter(this.aggr_map[this.options.get('aggr').value].formatter);
        ref.widget.setNextTerm(
          '/query/dataset=' + this.dataset.datasetName +
          this.getAggr() +
          this.getCategoricalConst(ref.key) +
          this.getTemporalConst() +
          this.getRegionConst() +
          '/group=' + ref.key
        );
      } else if (ref.type === 'temporal') {
        ref.widget.setYLabel(this.aggr_map[this.options.get('aggr').value].label);
        ref.widget.setFormatter(this.aggr_map[this.options.get('aggr').value].formatter);
        (<TemporalBandComponent>ref.widget).setNumCurves(this.getAggrTemporalBands());

        ref.widget.setNextTerm(
          '/query/dataset=' + this.dataset.datasetName +
          this.getAggrTemporalBand() +
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
    const link = ['/demo2', this.options.get('dataset').value];
    this.router.navigate(link);
  }

  setMapData() {
    this.CanvasLayer.redraw();
  }

  setAggr() {
    const type = this.options.get('aggr').value;

    if (type === 'count') {
      this.color = this.color_map['count'];
    } else {
      this.color = this.color_map['payload'];
    }

    this.aggr = '/aggr=' + this.aggr_map[type].key;

    if (this.aggr_map[type].sufix !== undefined) {
      this.aggr += '.' + this.options.get('payload').value + this.aggr_map[type].sufix;
    }

    if (type === 'cdf' || type === 'quantile') {
      this.aggr += '.(' + this.getPayloadInfo('value') + ')';
    }

    this.loadWidgetsData();
    this.setMapData();
    this.loadLegend();
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

  setRegionData = (latlng: any, zoom: number): void => {
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

  getAggrTemporalBands() {
    const type = this.options.get('aggr').value;

    if (type === 'count') {
      return 1;
    } else {
      const values = this.bandQuantiles.split(':');
      return values.length;
    }
  }

  setAggrTemporalBand() {
    this.loadWidgetsData();
  }

  getAggrTemporalBand(): string {
    if (this.options.get('aggr').value === 'count') {
      return this.getAggr();
    }

    const type = 'quantile';
    const payload = this.options.get('payload').value;

    let aggr = '/aggr=' + this.aggr_map[type].key;

    aggr += '.' + payload + this.aggr_map[type].sufix;

    aggr += '.(' + this.bandQuantiles + ')';
    return aggr;
  }

  getAggr() {
    return this.aggr;
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

    this.dataset = this.schemaService.get(this.dataset_values[0].value);

    this.initialize();
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
      geometry: new FormControl(this.dataset.geometry),
      geom_size: new FormControl(this.dataset.geometry_size),
      resolution: new FormControl(this.dataset.resolution),
      composition: new FormControl(this.dataset.composition),

      aggr: new FormControl('count'),
      payload: new FormControl(this.dataset.payloads[0]),

      dataset: new FormControl(this.dataset.datasetName)
    });

    this.color = this.color_map['count'];
    this.aggr = '/aggr=count';

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

    for (const dim of Object.keys(this.dataset.temporalDimension)) {
      const component = this.componentFactory.resolveComponentFactory(TemporalBandComponent);

      const componentRef = viewContainerRef.createComponent(component);
      const componentInstance = <TemporalBandComponent>componentRef.instance;

      this.renderer2.addClass(componentRef.location.nativeElement, 'app-footer-item');

      const lower = this.dataset.temporalDimension[dim].lower;
      const upper = this.dataset.temporalDimension[dim].upper;
      this.temporal[dim] = '/const=' + dim + '.interval.(' + lower + ':' + upper + ')';

      componentInstance.setXLabel(dim);
      componentInstance.register(dim, this.setTemporalData);
      this.widgets.push({ key: dim, type: 'temporal', widget: componentInstance });
    }

    // refresh input data
    this.loadWidgetsData();
    this.loadMapCard();
  }

  getPayloadInfo(key: string, payload?, type?) {
    if (payload === undefined) {
      payload = this.options.get('payload').value;
    }

    if (type === undefined) {
      type = this.options.get('aggr').value;
    }

    return d3.format('.2f')(this.dataset.payloadValues[payload][type][key]);
  }

  setPayloadInfo(key: string, value: number) {
    this.dataset.payloadValues[this.options.get('payload').value][this.options.get('aggr').value][key] = value;

    this.setAggr();
  }
}
