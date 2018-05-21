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
  selector: 'app-demo7',
  templateUrl: './demo7.component.html',
  styleUrls: ['./demo7.component.scss']
})
export class Demo7Component implements OnInit, AfterViewInit {
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
    { value: 'circle', viewValue: 'Stacked Circle' }
  ];

  composition_values = [
    { value: 'color', viewValue: 'Color' }
  ];

  dataset_values = [
    { value: 'cvrr-cross', viewValue: 'CVRR-CROSS' },
    { value: 'cvrr-i5sim', viewValue: 'CVRR-I5SIM' },
    { value: 'cvrr-i5sim3', viewValue: 'CVRR-I5SIM3' }
  ];

  color: any;

  color_map = {
    'count': (count) => {
      const lc = Math.log(count) / Math.log(100);

      const r = Math.floor(256 * Math.min(1, lc));
      const g = Math.floor(256 * Math.min(1, Math.max(0, lc - 1)));
      const b = Math.floor(256 * Math.min(1, Math.max(0, lc - 2)));

      return 'rgba(' + r + ',' + g + ',' + b + ',' + 0.75 + ')';
    }
  };

  cluster_map = [];

  fields_map = {
    'direction': 'sector',
    'speed': 'ks'
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

  loadLayer() {
    this.CanvasLayer = new L.GridLayer({
      updateWhenIdle: false,
      updateWhenZooming: false,
      keepBuffer: 2,
      updateInterval: 33
    });

    this.CanvasLayer.createTile = (coords, done) => {
      const tile = document.createElement('canvas');

      const tileSize = this.CanvasLayer.getTileSize();
      tile.setAttribute('width', tileSize.x.toString());
      tile.setAttribute('height', tileSize.y.toString());

      const ctx = tile.getContext('2d');

      // ctx.globalCompositeOperation = this.options.get('composition').value;
      ctx.clearRect(0, 0, tileSize.x, tileSize.y);

      let scale = d3.scaleSequential(d3.interpolateRainbow)
      .domain([0, this.options.get('clusters').value - 1]);

      let draw = (datum, cluster: number) => {
        // drawing
        const mid_x = (datum.x0 + datum.x1) / 2;
        const mid_y = (datum.y0 + datum.y1) / 2;

        const radius = Math.min(datum.x1 - datum.x0, datum.y1 - datum.y0) / 2;

        const cos_x = Math.cos(datum.median);
        const sin_y = Math.sin(datum.median);

        const x = cos_x * radius + mid_x;
        const y = sin_y * radius + mid_y;

        ctx.beginPath();
        ctx.moveTo(mid_x, mid_y);
        ctx.lineTo(x, y);

        ctx.lineWidth = 2.0 + this.options.get('geom_size').value;
        ctx.strokeStyle = scale(cluster);
        ctx.stroke();
      }

      let data = [];
      const promises = [];

      let getPromise = (cluster: number) => {
        return new Promise((resolve, reject) => {
          let query = '/query' +
            '/dataset=' + this.dataset.datasetName +
            '/aggr=sector.direction_t' +
            this.getClusterConst(cluster) +
            this.getTemporalConst() +
            '/const=' + this.dataset.spatialDimension[0] +
            '.tile.(' + coords.x + ':' + coords.y + ':' + coords.z + ':' + this.options.get('resolution').value + ')' +
            '/group=' + this.dataset.spatialDimension[0];

          this.dataService.query(query).subscribe(response => {
            data.push({
              'cluster': cluster,
              'data': response[0]
            });
            resolve(true);
          });
        });
      };

      if (this.options.get('show_all_clusters').value && this.cluster_map.length !== 0) {
        for (const cluster in this.cluster_map) {
          promises.push(getPromise(Number(cluster)));
        }        
      } else {        
        promises.push(getPromise(this.options.get('cluster').value - 1));
      }

      Promise.all(promises).then(() => {
        for (let v of data) {
          
          let cluster: number = v.cluster;

          for (let d of v.data) {
            // pre-process
            let n = 1 << (d[2] - coords.z);

            let xmin = (coords.x) * n;
            let xmax = (coords.x + 1) * n;

            let ymin = (coords.y) * n;
            let ymax = (coords.y + 1) * n;

            const x0 = ((d[0] - xmin) / (xmax - xmin)) * 256;
            const x1 = ((d[0] - xmin + 1) / (xmax - xmin)) * 256;

            const y0 = ((d[1] - ymin) / (ymax - ymin)) * 256;
            const y1 = ((d[1] - ymin + 1) / (ymax - ymin)) * 256;

            const datum = {
              'x0': x0,
              'x1': x1,
              'y0': y0,
              'y1': y1,
              'median': d[3]
            };

            draw(datum, cluster);
          }
        }

        done(null, tile);
      });

      return tile;

      /* const config = () => {
        const query_func = {
          circle: () => {
            const incre = (2 * Math.PI) / this.options.get('sectors').value;

            let inverse_values = '';
            for (let a = incre; a < 2 * Math.PI; a += incre) {
              inverse_values += a + ':';
            }

            inverse_values = inverse_values.substring(0, inverse_values.length - 1);

            return '/query' +
              '/dataset=' + this.dataset.datasetName +

              '/aggr=inverse.direction_t.(' + inverse_values + ')' +
              // '/aggr=quantile.direction_t.(0.5)' +
              '/aggr=sector.direction_t' +

              this.getClusterConst() +
              this.getTemporalConst() +

              '/const=' + this.dataset.spatialDimension[0] +
              '.tile.(' + coords.x + ':' + coords.y + ':' + coords.z + ':' + this.options.get('resolution').value + ')' +
              '/group=' + this.dataset.spatialDimension[0];
          },

          rect: () => {
            return '/query' +
              '/dataset=' + this.dataset.datasetName +

              '/aggr=count' +

              this.getClusterConst() +
              this.getTemporalConst() +

              '/const=' + this.dataset.spatialDimension[0] +
              '.tile.(' + coords.x + ':' + coords.y + ':' + coords.z + ':' + this.options.get('resolution').value + ')' +
              '/group=' + this.dataset.spatialDimension[0];
          }
        };


        const execute_func = {
          circle: (data) => {
            for (let i = 0; i < data[0].length; i += (this.options.get('sectors').value - 1)) {
              const d = data[0][i];

              let n = 1 << (d[2] - coords.z);

              let xmin = (coords.x) * n;
              let xmax = (coords.x + 1) * n;

              let ymin = (coords.y) * n;
              let ymax = (coords.y + 1) * n;

              const x0 = ((d[0] - xmin) / (xmax - xmin)) * 256;
              const x1 = ((d[0] - xmin + 1) / (xmax - xmin)) * 256;

              const y0 = ((d[1] - ymin) / (ymax - ymin)) * 256;
              const y1 = ((d[1] - ymin + 1) / (ymax - ymin)) * 256;

              const values = [];
              for (let s = 0; s < this.options.get('sectors').value - 1; ++s) {
                values.push(data[0][i + s][3]);
              }

              const datum = {
                'x0': x0,
                'x1': x1,
                'y0': y0,
                'y1': y1,
                'values': values,
                'median': data[1][i / (this.options.get('sectors').value - 1)][3]

              };

              config().draw(datum, this.options.get('geom_size').value);
            }
          },

          rect: (data) => {
            for (let i = 0; i < data[0].length; ++i) {
              const d = data[0][i];

              let n = 1 << (d[2] - coords.z);

              let xmin = (coords.x) * n;
              let xmax = (coords.x + 1) * n;

              let ymin = (coords.y) * n;
              let ymax = (coords.y + 1) * n;

              const x0 = ((d[0] - xmin) / (xmax - xmin)) * 256;
              const x1 = ((d[0] - xmin + 1) / (xmax - xmin)) * 256;

              const y0 = ((d[1] - ymin) / (ymax - ymin)) * 256;
              const y1 = ((d[1] - ymin + 1) / (ymax - ymin)) * 256;

              const datum = {
                'x0': x0,
                'x1': x1,
                'y0': y0,
                'y1': y1,
                'count': d[3]
              };

              config().draw(datum, this.options.get('geom_size').value);
            }
          }
        };

        const draw_func = {
          circle: (datum, geom_size) => {
            const mid_x = (datum.x0 + datum.x1) / 2;
            const mid_y = (datum.y0 + datum.y1) / 2;

            const radius = Math.min(datum.x1 - datum.x0, datum.y1 - datum.y0) / 2;

            // const values: number[] = [];
            // let prev_value = 0;
            // for (let v = 0; v < datum.values.length; ++v) {
            //   values.push(datum.values[v] - prev_value);
            //   prev_value = datum.values[v];

            // }
            // values.push(1.0 - prev_value);

            // const extents: [number, number] = d3.extent(values);

            // const scale = d3.scaleQuantize<string>()
            //   .domain([0, 1])
            //   // .range(['rgba(0, 0, 255, 0.5)', 'rgba(255, 165, 0, 1.0)']);
            //   // .range(['rgba(255,237,160, 0.5)','rgba(254,178,76, 0.95)','rgba(240,59,32, 1.0)'])
            //   // .range(['rgba(215,25,28, 0.75)','rgba(253,174,97, 0.75)','rgba(171,217,233, 1.0)','rgba(44,123,182, 1.0)']);
            //   // .range(['rgba(241,238,246, 1.0)', 'rgba(189,201,225, 1.0)', 'rgba(116,169,207, 1.0)', 'rgba(5,112,176, 1.0)']);
            //   .range(['rgb(241,238,246)', 'rgb(189,201,225)', 'rgb(116,169,207)', 'rgb(43,140,190)', 'rgb(4,90,141)']);


            // var beginAngle = 0;
            // var endAngle = 0;
            // var angle = (2 * Math.PI) / this.options.get('sectors').value;

            // for (var i = 0; i < values.length; ++i) {
            //   beginAngle = endAngle;
            //   endAngle = endAngle + angle;

            //   ctx.beginPath();
            //   ctx.moveTo(mid_x, mid_y);
            //   ctx.arc(mid_x, mid_y, radius, beginAngle, endAngle);
            //   ctx.lineTo(mid_x, mid_y);

            //   ctx.fillStyle = scale(values[i]);
            //   ctx.fill();
            // }

            const cos_x = Math.cos(datum.median);
            const sin_y = Math.sin(datum.median);

            const x = cos_x * radius + mid_x;
            const y = sin_y * radius + mid_y;

            ctx.beginPath();
            ctx.moveTo(mid_x, mid_y);
            ctx.lineTo(x, y);

            ctx.lineWidth = 2.0 + geom_size;
            ctx.strokeStyle = 'red';
            ctx.stroke();
          },

          rect: (datum, geom_size) => {
            ctx.fillStyle = this.color(datum.count);
            ctx.fillRect(datum.x0 - geom_size, datum.y0 - geom_size, (datum.x1 - datum.x0) + geom_size, (datum.y1 - datum.y0) + geom_size);
          }
        };

        return {
          draw: draw_func[this.options.get('geometry').value],
          query: query_func[this.options.get('geometry').value],
          execute: execute_func[this.options.get('geometry').value],
        };
      }; */
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
    const link = ['/demo7', this.options.get('dataset').value];
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
  }

  executeClustering() {
    let aggr = '';

    for (const i in this.getFieldsControls()) {
      if (this.getFieldsControls()[i].value) {
        let field = this.dataset.payloads[i];
        aggr += '/aggr=' + this.fields_map[field] + '.(' + field + ')'
      }
    }

    let group_by = '';
    for (const i in this.getGroupByControls()) {
      if (this.getGroupByControls()[i].value) {
        group_by += '/group_by=' + this.dataset.spatialDimension[i] + '.tile.(0:0:0:' + this.getGroupByResolutionControls()[i].value + ')';
      }
    }

    const query = '/clustering' +
      '/dataset=' + this.dataset.datasetName +
      '/clusters=' + this.options.get('clusters').value +
      '/iterations=' + this.options.get('iterations').value +
      '/cluster_by=' + this.dataset.identifier +
      aggr +
      group_by;

    this.dataService.query(query).subscribe(data => {
      this.cluster_map = data[0];
      this.setClusters();

    });
  }

  setClusters = () => {
    this.loadWidgetsData();
    this.setMapData();
  }

  getClusterConst(cluster?: number) {
    if (this.cluster_map.length === 0) {
      return '/const=' + this.dataset.identifier + '.values.(all)';
    }

    let values = '/const=' + this.dataset.identifier + '.values.(';

    if (cluster === undefined) {
      cluster = this.options.get('cluster').value - 1;
    }

    for (const elt of this.cluster_map[cluster]) {
      values += elt + ':';
    }

    if (this.cluster_map[cluster].length > 0) {
      values = values.substr(0, values.length - 1);
    }

    values += ')';

    /* let values = '/const=' + this.dataset.identifier + '.values.(';

    if (this.options.get('show_all_clusters').value) {
      for (let cluster of this.cluster_map) {
        for (const elt of cluster) {
          values += elt + ':';
        }
      }

      values = values.substr(0, values.length - 1);
    } else {
      const cluster_id = this.options.get('cluster').value - 1;

      for (const elt of this.cluster_map[cluster_id]) {
        values += elt + ':';
      }

      if (this.cluster_map[cluster_id].length > 0) {
        values = values.substr(0, values.length - 1);
      }
    }

    values += ')'; */

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
    this.mapService.load_CRSSimple();

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

  getGroupByControls() {
    return (<FormArray>this.options.get('group_by')).controls;
  }

  getGroupByResolutionControls() {
    return (<FormArray>this.options.get('group_by_resolution')).controls;
  }

  initialize() {
    const fields_array = [];
    for (const field of this.dataset.payloads) {
      fields_array.push(new FormControl(true));
    }

    const group_by_array = [[], []];
    for (const field of this.dataset.spatialDimension) {
      group_by_array[0].push(new FormControl(true));
      group_by_array[1].push(new FormControl(8));
    }

    this.options = this.formBuilder.group({
      // visualization setup
      geometry: new FormControl(this.dataset.geometry),
      geom_size: new FormControl(this.dataset.geometry_size),
      resolution: new FormControl(this.dataset.resolution),
      composition: new FormControl(this.dataset.composition),

      clusters: new FormControl(8),
      cluster: new FormControl(1),
      show_all_clusters: new FormControl(true),

      sectors: new FormControl(35),
      iterations: new FormControl(0),

      aggr: new FormControl('count'),
      payload: new FormControl(this.dataset.payloads[0]),

      dataset: new FormControl(this.dataset.datasetName),

      fields: new FormArray(fields_array),

      group_by: new FormArray(group_by_array[0]),
      group_by_resolution: new FormArray(group_by_array[1])
    });

    this.color = this.color_map['count'];
    this.aggr = '/aggr=count';

    /* this.geocodingService.geocode(this.dataset.local)
      .subscribe(location => {
        this.mapService.flyTo(location);
      }, error => console.error(error)); */

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
