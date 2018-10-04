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
import { MatSidenav, MatSnackBar, MatSnackBarConfig } from '@angular/material';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TemporalBandComponent } from '../temporal-band/temporal-band.component';
import { DataSharingService } from '../services/data-sharing.service';
import { resolve } from 'q';

interface WidgetType {
  key: string;
  type: string;
  widget: Widget;
}

interface DimConstraints {
  [key: string]: string;
}

@Component({
  selector: 'app-demo2',
  templateUrl: './demo2.component.html',
  styleUrls: ['./demo2.component.scss']
})
export class Demo2Component implements OnInit, AfterViewInit {
  @ViewChild('sidenav') sidenav: MatSidenav;
  @ViewChild('mapwidgets') mapwidgets: ElementRef;

  private title = 'app';
  private marker: Marker;

  private CommuneLayer: L.GridLayer;
  private DepartmentLayer: L.GridLayer;

  // schema
  ///////////////////////////////////
  private aggr: string;
  dataset: any;

  // map card
  ///////////////////////////////////
  currentZoom = 0;
  maximumZoom = 0;

  // queries
  ///////////////////////////////////
  private region: DimConstraints = {};
  private temporal: DimConstraints = {};
  private categorical: DimConstraints = {};

  // widgets
  //////////////////////////////////
  @ViewChild('container', { read: ViewContainerRef }) container: ViewContainerRef;
  @ViewChild('map', { read: ViewContainerRef }) footerCtnRef: ViewContainerRef;

  private widgets: Array<WidgetType> = [];

  mode = new FormControl('over');
  options: FormGroup;

  bandQuantiles = '0.25:0.5:0.75';

  marker_values = [
    { value: 0, viewValue: 'Iah' },
    { value: 1, viewValue: 'Bmi' },
    { value: 2, viewValue: 'Epworth' }
  ]

  aggr_values = [
    { value: 'count', viewValue: 'Count' },
    { value: 'mean', viewValue: 'Mean' },
    { value: 'variance', viewValue: 'Variance' },
    { value: 'quantile', viewValue: 'Quantile' },
    { value: 'cdf', viewValue: 'CDF' }
  ];

  aggr_map = {
    'count': {
      key: 'count',
      sufix: undefined,
      label: 'count',
      formatter: d3.format('.2s')
    },
    'mean': {
      key: 'average',
      sufix: '_g',
      label: 'average',
      formatter: d3.format('.2s')
    },
    'variance': {
      key: 'variance',
      sufix: '_g',
      label: 'variance',
      formatter: d3.format('.2s')
    },
    'quantile': {
      key: 'quantile',
      sufix: '_t',
      label: 'quantile',
      formatter: d3.format('.2s')
    },
    'cdf': {
      key: 'inverse',
      sufix: '_t',
      label: 'cdf',
      formatter: d3.format('.2f')
    },
  };

  dataset_values = [
    { value: 'health', viewValue: 'Health' },
  ];

  color: any;

  color_range = ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee090', '#ffffbf', '#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695'].reverse();

  prev_dim = '';
  geojson = new Map();
  geojson_curr = new Map();
  geojson_valid = new Map();
  geojson_value = new Map();
  geojson_min_max = new Map();
  geojson_selected = new Map();

  color_map = {
    'count': (value, dim) => d3.scaleQuantize<string>()
      .domain(this.geojson_min_max.get(dim))
      .range(this.color_range)(value),

    'payload': (value, dim) => d3.scaleQuantize<string>()
      .domain(this.geojson_min_max.get(dim))
      .range(this.color_range)(value)
  };

  info_name = '';
  info_users = [0, 0];
  info_events = [0, 0]

  constructor(
    private sharing: DataSharingService,

    private httpService: HttpClient,

    private configService: ConfigurationService,
    private schemaService: SchemaService,

    private mapService: MapService,
    private dataService: DataService,
    private geocodingService: GeocodingService,

    private router: Router,
    private activatedRoute: ActivatedRoute,

    private renderer2: Renderer2,
    private componentFactory: ComponentFactoryResolver,

    private formBuilder: FormBuilder,

    public snackBar: MatSnackBar
  ) { }

  // getters
  /////////////////////////////////////////////////////////////////////////
  updateInfo() {
    this.updateInfoName();
    this.updateInfoUsers();
    this.updateInfoEvents();
  }

  getCurrentFeature() {
    return this.geojson_curr.get(this.getCurrentMapDim());
  }

  updateInfoName() {
    let feature = this.getCurrentFeature();
    if (feature) {
      this.info_name = '(' + feature.properties.code + ') ' + feature.properties.nom;
    } else {
      this.info_name = 'none';
    }
  }

  updateInfoUsers() {
    let query = '/query/dataset=' + this.dataset.datasetName + '/aggr=count' +
      this.getCategoricalConst() +
      this.getTemporalConst() +
      this.getRegionConst(this.getCurrentFeature()) +
      this.getMarker() +
      '/const=user_id.values.(all)/group=user_id';

    this.dataService.query(query).subscribe(data => {
      this.info_users[0] = data[0].length;
    });

    query = '/query/dataset=' + this.dataset.datasetName + '/aggr=count' +
      this.getRegionConst() +
      this.getMarker() +
      '/const=user_id.values.(all)/group=user_id';

    this.dataService.query(query).subscribe(data => {
      this.info_users[1] = data[0].length;
    });
  }

  updateInfoEvents() {
    let query = '/query/dataset=' + this.dataset.datasetName + '/aggr=count' +
      this.getCategoricalConst() +
      this.getTemporalConst() +
      this.getMarker() +
      this.getRegionConst(this.getCurrentFeature());

    this.dataService.query(query).subscribe(data => {
      this.info_events[0] = data[0];
    });

    query = '/query/dataset=' + this.dataset.datasetName + '/aggr=count' +
      this.getMarker() +
      this.getRegionConst();

    this.dataService.query(query).subscribe(data => {
      this.info_events[1] = data[0];
    });
  }


  loadMapCard() {
    this.currentZoom = this.mapService.map.getZoom();
    this.maximumZoom = this.mapService.map.getMaxZoom();
  }

  loadLegend(dim) {
    const svg = d3.select('#svg-color-quant');
    svg.selectAll('*').remove();

    svg.append('g')
      .attr('class', 'legendQuant')
      .attr('transform', 'translate(0, 0)');

    const colorLegend = legendColor()
      .ascending(true)
      .labelFormat(this.aggr_map[this.options.get('aggr').value].formatter)
      .scale(d3.scaleQuantize<string>()
        .domain(this.geojson_min_max.get(dim))
        .range(this.color_range)
      );

    svg.select('.legendQuant')
      .call(colorLegend);
  }

  getCurrentMapDim() {
    return (this.mapService.map.getZoom() >= 8) ? 'commune' : 'department';
  }

  loadRegionLayer() {
    let self = this;

    // reset values    
    this.geojson_value.set('region', new Map());


    let layerOnMouseOver = (feature, el, dim) => {
      self.geojson_curr.set(self.getCurrentMapDim(), undefined);
      self.loadWidgetsData();
    };

    let getLayer = (dim) => {
      return L.geoJSON(this.geojson.get(dim), {
        style: function (feature) {
          return { fillColor: 'rgb(0, 0, 0)', color: 'black', weight: 100000.0, opacity: 0.0, fillOpacity: 0.0 };;
        },
        onEachFeature: (feature, layer) => {
          layer.on({
            mouseover: (el) => layerOnMouseOver(feature, el, dim)
          });
        }
      });
    }

    this.mapService.map.addLayer(getLayer('region'));
  }

  getPromiseGeojsonValid() {
    let query = '/query' +
      '/dataset=' + this.dataset.datasetName +
      '/aggr=count' +
      this.getCategoricalConst() +
      this.getTemporalConst() +
      this.getMarker() + 
      '/const=' + this.getCurrentMapDim() + '.values.(all)' +
      '/group=' + this.getCurrentMapDim();

    return new Promise((resolve, reject) => {
      this.dataService.query(query).subscribe(response => {
        this.geojson_valid.set(this.getCurrentMapDim(), response[0]);
        resolve(true);
  
      }, (err: HttpErrorResponse) => {
        console.log(err.message);
      });
    })
  }

  loadLayer() {
    let self = this;

    // reset values    
    this.geojson_value.set('department', new Map());
    this.geojson_value.set('commune', new Map());

    let getLayerColor = (feature, dim) => {
      let value = self.geojson_value.get(dim).find((el) => el[0] === Number.parseInt(feature.properties.code))[1];
      let style;

      if (dim === 'department' && dim !== self.getCurrentMapDim()) {
        style = { fillColor: 'rgb(0, 0, 0)', color: 'black', weight: 1.0, opacity: 1.0, fillOpacity: 0.0 };
      } else {
        style = { fillColor: self.color(value, dim), color: 'black', weight: 1.0, opacity: 0.75, fillOpacity: 0.75 };
      }

      // selected layer
      if (self.geojson_selected.get(dim).get(feature)) {
        style.weight = 4;
        style.fillColor = 'darkgreen';
      }

      return style;
    };

    let layerOnMouseOver = (feature, el, dim) => {
      let code = Number.parseInt(feature.properties.code);
      let value = self.geojson_value.get(dim).find((el) => el[0] === code)[1];

      let style = getLayerColor(feature, dim);

      style.weight = 4;

      self.geojson_curr.set(dim, feature);

      el.target.setStyle(style);
      self.loadWidgetsData();

      return style;
    };

    let layerOnMouseOut = (feature, el, dim) => {
      let code = Number.parseInt(feature.properties.code);
      let value = self.geojson_value.get(dim).find((el) => el[0] === code)[1];

      let style = getLayerColor(feature, dim);

      // self.geojson_curr.set(dim, undefined);

      el.target.setStyle(style);
      self.loadWidgetsData();

      return style;
    };

    let layerOnMouseClick = (feature, el, dim) => {
      let code = Number.parseInt(feature.properties.code);
      let value = self.geojson_value.get(dim).find((el) => el[0] === code)[1];

      // swith selected
      if (self.geojson_selected.get(dim).get(feature)) {
        self.geojson_selected.get(dim).set(feature, false);
      } else {
        self.geojson_selected.get(dim).set(feature, true);
      }

      let style = getLayerColor(feature, dim);

      style.weight = 4;

      el.target.setStyle(style);
      self.loadWidgetsData();

      return style;
    }

    // wait for all promises fineshes and then ...
    const query = '/query' +
      '/dataset=' + self.dataset.datasetName +
      this.getAggr() +
      self.getCategoricalConst() +
      self.getTemporalConst() +
      self.getMarker();

    let promises = [];

    let getPromise = (dim) => {
      return new Promise((resolve) => {
        let currQuery = query + '/const=' + dim + '.values.(all)/group=' + dim;

        // reset min_max values
        self.geojson_min_max.set(dim, [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]);

        self.dataService.query(currQuery).subscribe(response => {
          let value = response[0];

          if (value.length) {
            let curr_minmax = self.geojson_min_max.get(dim);

            value.map((el) => {
              if (!isNaN(el[1])) {
                curr_minmax[0] = Math.min(curr_minmax[0], el[1]);
                curr_minmax[1] = Math.max(curr_minmax[1], el[1]);
              }
            });

            self.geojson_min_max.set(dim, curr_minmax);
          }

          self.geojson_value.set(dim, value);

          resolve(true);
        });
      });
    };

    promises.push(getPromise('commune'));
    promises.push(getPromise('department'));
    promises.push(self.getPromiseGeojsonValid());

    Promise.all(promises).then(() => {
      self.updateAggr();

      self.loadLegend(self.getCurrentMapDim());

      let getLayer = (dim) => {
        return L.geoJSON(this.geojson.get(dim), {
          style: function (feature) {
            return getLayerColor(feature, dim);
          },

          onEachFeature: (feature, layer) => {
            layer.on({
              mouseover: (el) => layerOnMouseOver(feature, el, dim),
              mouseout: (el) => layerOnMouseOut(feature, el, dim),
              click: (el) => layerOnMouseClick(feature, el, dim)
            });
          },

          filter: function (feature, layer) {
            let code = Number.parseInt(feature.properties.code);

            let isValid = self.geojson_valid.get(dim).find((el) => el[0] === code);

            if (isValid && isValid[1] >= self.options.get('display_threshold').value) {
              if (dim === 'commune') {
                if (self.getCurrentMapDim() === 'commune') {
                  return true;
                } else {
                  return false;
                }
              } else {
                return true;
              }
            } else {
              return false;
            }
          }
        });
      }


      if (this.DepartmentLayer) this.mapService.map.removeLayer(this.DepartmentLayer);
      this.DepartmentLayer = getLayer('department');
      this.mapService.map.addLayer(this.DepartmentLayer);


      if (this.CommuneLayer) this.mapService.map.removeLayer(this.CommuneLayer);
      this.CommuneLayer = getLayer('commune');
      this.mapService.map.addLayer(this.CommuneLayer);

      this.mapService.map.on('zoomend', this.onMapZoomEnd, this);
    });
  }

  createCohort() {
    let dim = this.getCurrentMapDim();
    localStorage.setItem('dim', JSON.stringify(dim));

    let selected = this.geojson_selected.get(dim);

    let features = [];
    selected.forEach((value, key, map) => {
      if (value) {
        features.push({
          'feature': key,
          'constraints': '/query' +
            '/dataset=' + this.dataset.datasetName +
            this.getCategoricalConst(dim) +
            this.getTemporalConst() +
            '/const=' + dim + '.vales.(' + Number.parseInt(key.properties.code) + ')'
        });
      }
    });
    localStorage.setItem('features', JSON.stringify(features));

    this.snackBar.open('Cohort Created.', 'Dismiss', {
      duration: 2000,
      viewContainerRef: this.footerCtnRef
    });
  }

  onMapZoomEnd() {
    this.currentZoom = Math.round(this.mapService.map.getZoom());
    if (this.prev_dim !== this.getCurrentMapDim()) {
      this.prev_dim = this.getCurrentMapDim();
      this.setMapData();
    }
  }

  loadWidgetsData() {
    // update info
    this.updateInfo();

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
          this.getMarker() +
          '/group=' + ref.key
        );
      } else if (ref.type === 'temporal') {
        ref.widget.setYLabel(this.aggr_map[this.options.get('aggr').value].label);
        ref.widget.setFormatter(this.aggr_map[this.options.get('aggr').value].formatter);

        //(<TemporalBandComponent>ref.widget).setNumCurves(this.getAggrTemporalBands());

        ref.widget.setNextTerm(
          '/query/dataset=' + this.dataset.datasetName +
          // this.getAggrTemporalBand() +
          this.getAggr() +
          this.getCategoricalConst() +
          this.getTemporalConst() +
          this.getRegionConst() +
          this.getMarker() +
          '/group=' + ref.key
        );
      }
    }
  }

  setDataset(evnt: any) {
    this.sidenav.toggle();
    const link = ['/demo2', this.options.get('dataset').value];
    this.router.navigate(link);
  }

  setMapData() {
    this.loadLayer();
  }

  updateAggr() {
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
  }

  getMarker() {
    return '/const=marker.values.(' + this.options.get('marker').value + ')';
  }

  setMarker() {
    this.updateAggr();

    this.loadWidgetsData();
    this.setMapData();
  }

  setAggr() {
    this.updateAggr();

    this.loadWidgetsData();
    this.setMapData();
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

  }

  getAggrTemporalBands() {
    const type = this.options.get('aggr').value;

    if (type !== 'cdf') {
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
    if (this.options.get('aggr').value !== 'cdf') {
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

  getRegionConst(feature?) {
    if (feature) {
      return '/const=' + this.getCurrentMapDim() + '.values.(' + feature.properties.code + ')';
    } else {
      let selected = this.geojson_selected.get(this.getCurrentMapDim());

      if (!selected || selected.length === 0) {
        return '';
      } else {
        let valid = false;
        let values = '/const=' + this.getCurrentMapDim() + '.values.(';

        selected.forEach((value, key, map) => {
          if (value) {
            valid = true;
            values += + key.properties.code + ':';
          }
        });

        values = values.substr(0, values.length - 1);
        values += ')';

        return valid ? values : '';
      }
    }
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
  }

  initialize() {
    this.options = this.formBuilder.group({
      // visualization setup
      display_threshold: new FormControl(0),
      aggr: new FormControl('mean'),
      marker: new FormControl(1),
      payload: new FormControl(this.dataset.payloads[0]),
      dataset: new FormControl(this.dataset.datasetName)
    });

    this.updateAggr();

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

      componentInstance.setXLabel(dim);
      componentInstance.register(dim, this.setTemporalData);
      this.widgets.push({ key: dim, type: 'temporal', widget: componentInstance });
    }

    // initialize maps
    this.geojson_selected.set('commune', new Map());
    this.geojson_selected.set('department', new Map());

    this.geojson_min_max.set('commune', [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]);
    this.geojson_min_max.set('department', [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]);

    let getRegionPromise = (dim, file) => {
      return new Promise((resolve, reject) => {
        this.httpService.get(file)
          .subscribe(response => {
            this.geojson.set(dim, response);
            resolve(true);
          }, (err: HttpErrorResponse) => {
            console.log(err.message);
          });
      })
    };

    let getCodePromise = (dim, file) => {
      return new Promise((resolve, reject) => {
        this.httpService.get(file)
          .subscribe(response => {
            this.geojson.set(dim, response);

            const query = '/query' +
              '/dataset=' + this.dataset.datasetName +
              '/aggr=count' +
              '/const=' + dim + '.values.(all)' +
              '/group=' + dim;

            this.dataService.query(query).subscribe(response => {
              this.geojson_valid.set(dim, response[0]);
              resolve(true);

            }, (err: HttpErrorResponse) => {
              console.log(err.message);
            });

          }, (err: HttpErrorResponse) => {
            console.log(err.message);
          });
      })
    };

    let promises = [];

    promises.push(getCodePromise('department', './assets/geojson/france-departements.geojson'));
    promises.push(getCodePromise('commune', './assets/geojson/france-communes.geojson'));
    promises.push(getRegionPromise('region', './assets/geojson/france-regions.geojson'));

    Promise.all(promises).then(() => {
      // load map
      this.loadRegionLayer();
      this.loadLayer();
      this.loadMapCard();

      // refresh input data
      this.loadWidgetsData();
    });
  }

  getPayloadInfo(key: string) {
    return d3.format('.2f')(this.dataset.payloadValues[this.options.get('payload').value][this.options.get('aggr').value][key]);
  }

  setPayloadInfo(key: string, value: number) {
    this.dataset.payloadValues[this.options.get('payload').value][this.options.get('aggr').value][key] = value;

    this.setAggr();
  }
}
