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

import { FormBuilder, FormGroup, FormControl, FormsModule, FormArray } from '@angular/forms';
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

interface WidgetType {
  key: string;
  type: string;
  widget: Widget;
}

interface DimConstraints {
  [key: string]: string;
}

@Component({
  selector: 'app-demo6',
  templateUrl: './demo6.component.html',
  styleUrls: ['./demo6.component.scss']
})
export class Demo6Component implements OnInit, AfterViewInit {
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

  aggr_values = [
    { value: 'count', viewValue: 'Count' },
    { value: 'mean', viewValue: 'Mean' },
    // { value: 'variance', viewValue: 'Variance' },
    { value: 'quantile', viewValue: 'Quantile' },
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
    { value: 'circle', viewValue: 'Circle' },
    { value: 'direction_a', viewValue: 'Direction A' },
    { value: 'direction_b', viewValue: 'Direction B' },
    { value: 'stacked_circle', viewValue: 'Stacked Circle' }
  ];

  composition_values = [
    { value: 'lighter', viewValue: 'Lighter' },
    { value: 'color', viewValue: 'Color' }
  ];

  dataset_values = [
    { value: 'on_time_performance', viewValue: 'Flights' },
    { value: 'green_tripdata', viewValue: 'Green Taxis' },
    { value: 'yellow_tripdata', viewValue: 'Yellow Taxis' },
    { value: 'hurdat2', viewValue: 'hurdat2' },
    { value: 'health', viewValue: 'Health' }
  ];

  color: any;

  payload_range = [
    'rgba(158,  1, 66, 0.75)',
    'rgba(213, 62, 79, 0.75)',
    'rgba(244,109, 67, 0.75)',
    'rgba(253,174, 97, 0.75)',
    'rgba(254,224,139, 0.75)',
    'rgba(230,245,152, 0.75)',
    'rgba(171,221,164, 0.75)',
    'rgba(102,194,165, 0.75)',
    'rgba( 50,136,189, 0.75)',
    'rgba( 94, 79,162, 0.75)'
  ].reverse();

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

    'fixed': 'orange'
  };

  cluster_map = [];

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

      let sectors = 5;
      let inverse_values = '';
      for (let a = 0; a <= 2 * Math.PI; a += (2 * Math.PI) / (sectors - 1)) {
        inverse_values += a + ':';
      }

      inverse_values = inverse_values.substring(0, inverse_values.length - 1);

      const query = '/query' +
        '/dataset=' + this.dataset.datasetName +
        // '/aggr=quantile.direction_t.(0.25:0.5:0.75)' +
        '/aggr=inverse.direction_t.(' + inverse_values + ')' +
        // this.getCategoricalConst() +
        this.getClusterConst() +
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
        const config = () => {
          const drawfuncs = {
            circle: (datum, geom_size) => {
              const radius = ((datum.x1 - datum.x0) / 2) + geom_size;
              ctx.beginPath();
              ctx.arc((datum.x0 + datum.x1) / 2, (datum.y0 + datum.y1) / 2, radius, 0, 2 * Math.PI);
              ctx.fill();
            },
            rect: (datum, geom_size) => {
              ctx.fillRect(datum.x0 - geom_size, datum.y0 - geom_size, (datum.x1 - datum.x0) + geom_size, (datum.y1 - datum.y0) + geom_size);
            },
            direction_a: (datum, geom_size) => {
              const radius = ((datum.x1 - datum.x0) / 2);
              const mid_x = (datum.x0 + datum.x1) / 2;
              const mid_y = (datum.y0 + datum.y1) / 2;

              const cos_x = Math.cos(datum.q2);
              const sin_y = Math.sin(datum.q2);

              const x = cos_x * radius + mid_x;
              const y = sin_y * radius + mid_y;

              var gradient = ctx.createLinearGradient(cos_x + mid_x, sin_y + mid_y, x, y);

              gradient.addColorStop(0, 'orange');
              gradient.addColorStop(1, 'blue');

              ctx.beginPath();
              ctx.arc(mid_x, mid_y, radius, datum.q1, datum.q3, false);
              ctx.fillStyle = 'orange';
              ctx.fill();

              ctx.beginPath();
              ctx.lineWidth = geom_size;
              ctx.moveTo(mid_x, mid_y);
              ctx.lineTo(x, y);
              ctx.strokeStyle = gradient;
              ctx.stroke();
            },

            direction_b: (datum, geom_size) => {
              const radius = ((datum.x1 - datum.x0) / 2);
              const mid_x = (datum.x0 + datum.x1) / 2;
              const mid_y = (datum.y0 + datum.y1) / 2;

              const cos_x = Math.cos(datum.q2);
              const sin_y = Math.sin(datum.q2);

              const x = cos_x * radius + mid_x;
              const y = sin_y * radius + mid_y;

              var gradient = ctx.createLinearGradient(cos_x + mid_x, sin_y + mid_y, x, y);

              gradient.addColorStop(0, 'orange');
              gradient.addColorStop(1, 'blue');

              ctx.beginPath();
              ctx.arc(mid_x, mid_y, radius, datum.q1, datum.q3, false);
              ctx.strokeStyle = 'blue';
              ctx.stroke();

              ctx.beginPath();
              ctx.lineWidth = geom_size;
              ctx.moveTo(mid_x, mid_y);
              ctx.lineTo(x, y);
              ctx.strokeStyle = gradient;
              ctx.stroke();
            },

            stacked_circle: (datum, geom_size) => {
              const radius = ((datum.x1 - datum.x0) / 2);
              const mid_x = (datum.x0 + datum.x1) / 2;
              const mid_y = (datum.y0 + datum.y1) / 2;

              let extents: [number, number] = [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];

              let prev_value = 0;
              for (let v = 0; v < datum.values.length; ++v) {
                const diff = datum.values[v] - prev_value;
                extents[0] = Math.min(extents[0], diff);
                extents[1] = Math.max(extents[1], diff);

                prev_value = datum.values[v];
              }

              const scale = d3.scaleLinear<string, string>().
                // interpolate(d3.interpolateRgb).
                domain(extents).
                range(['orange', 'blue']);

              prev_value = 0;
              let colors = [];
              for (let v = 0; v < datum.values.length; ++v) {
                colors.push(scale(datum.values[v] - prev_value));

                prev_value = datum.values[v];
              }

              console.log(extents);
              console.log(colors);


              let prev_theta = 0;
              ctx.beginPath();
              for (let v = 0; v < datum.values.length; ++v) {


                let curr_theta = (2 * Math.PI) * datum.values[v];


                // console.log(prev_theta + ' : ' + curr_theta);

                ctx.arc(mid_x, mid_y, radius, prev_theta, curr_theta, false);
                ctx.fillStyle = colors[v];
                ctx.fill();


                prev_theta = curr_theta;


              }
            }
          };

          return {
            draw: drawfuncs[this.options.get('geometry').value],
            color: this.color
          };
        };

        if (data[0] === undefined) {
          return tile;
        }

        for (let i = 0; i < data[0].length; i += sectors) {
          let d = data[0][i];

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

          ctx.fillStyle = config().color(1000);

          /* const datum = {
            'x0': x0,
            'x1': x1,
            'y0': y0,
            'y1': y1,
            'values': [data[0][i + 0][3], data[0][i + 1][3], data[0][i + 2][3]]
          }; */

          let values = [];

          for (let s = 0; s < sectors; ++s) {
            values.push(data[0][i + s][3]);
          }

          const datum = {
            'x0': x0,
            'x1': x1,
            'y0': y0,
            'y1': y1,
            'values': values
          };

          config().draw(datum, this.options.get('geom_size').value);
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
          this.getClusterConst() +
          this.getTemporalConst() +
          this.getRegionConst() +
          '/group=' + ref.key
        );
      } else if (ref.type === 'temporal') {
        ref.widget.setYLabel(this.aggr_map[this.options.get('aggr').value].label);
        ref.widget.setFormatter(this.aggr_map[this.options.get('aggr').value].formatter);
        ref.widget.setNextTerm(
          '/query/dataset=' + this.dataset.datasetName +
          this.getAggr() +
          this.getCategoricalConst() +
          this.getClusterConst() +
          this.getTemporalConst() +
          this.getRegionConst() +
          '/group=' + ref.key
        );
      }
    }

    // update count
    this.dataService.query('/query/dataset=' + this.dataset.datasetName + '/aggr=count' +
      this.getCategoricalConst() +
      this.getClusterConst() +
      this.getTemporalConst() +
      this.getRegionConst())
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

  setClusters = (event) => {
    let fields = '';

    for (let i in this.getFieldsControls()) {
      if (this.getFieldsControls()[i].value) {
        fields += this.dataset.payloads[i] + ':';
      }
    }

    if (fields.length > 1) {
      fields = fields.substr(0, fields.length - 1);
    }

    const query = '/clustering' +
      '/dataset=' + this.dataset.datasetName +
      '/clusters=' + this.options.get('clusters').value +
      '/iterations=100' +
      '/cluster_by=' + this.dataset.identifier +
      '/fields=(' + fields + ')';

    this.dataService.query(query).subscribe(data => {
      this.cluster_map = data[0];

      this.loadWidgetsData();
      this.setMapData();
    });
  }

  getClusterConst() {
    if (this.cluster_map.length <= 1) {
      return '/const=' + this.dataset.identifier + '.values.(all)';
    }

    let cluster_id = this.options.get('cluster').value - 1;

    let values = '/const=' + this.dataset.identifier + '.values.(';
    for (const elt of this.cluster_map[cluster_id]) {
      values += elt + ':';
    }

    if (this.cluster_map[cluster_id].length > 0) {
      values = values.substr(0, values.length - 1);
    }

    values += ')';

    return values;
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
    this.mapService.load();

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

  getFieldsControls() {
    return (<FormArray>this.options.get('fields')).controls;
  }

  initialize() {
    let fields_array = [];
    for (let field of this.dataset.payloads) {
      fields_array.push(new FormControl(true));
    }

    this.options = this.formBuilder.group({
      // visualization setup
      geometry: new FormControl(this.dataset.geometry),
      geom_size: new FormControl(this.dataset.geometry_size),
      resolution: new FormControl(this.dataset.resolution),
      composition: new FormControl(this.dataset.composition),

      clusters: new FormControl(1),
      cluster: new FormControl(1),

      aggr: new FormControl('count'),
      payload: new FormControl(this.dataset.payloads[0]),

      dataset: new FormControl(this.dataset.datasetName),

      fields: new FormArray(fields_array)
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
      const component = this.componentFactory.resolveComponentFactory(LineChartComponent);

      const componentRef = viewContainerRef.createComponent(component);
      const componentInstance = <LineChartComponent>componentRef.instance;

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

  getPayloadInfo(key: string) {
    return d3.format('.2f')(this.dataset.payloadValues[this.options.get('payload').value][this.options.get('aggr').value][key]);
  }

  setPayloadInfo(key: string, value: number) {
    this.dataset.payloadValues[this.options.get('payload').value][this.options.get('aggr').value][key] = value;

    this.setAggr();
  }
}
