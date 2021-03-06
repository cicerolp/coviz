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

import { Options } from 'ng5-slider';

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
import { GeoDataService } from '../services/geo-data.service';
import { resolve } from 'dns';
import { reject } from 'q';

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

  private BottomRegionLayer: L.GridLayer;
  private MiddleRegionLayer: L.GridLayer;
  private TopRegionLayer: L.GridLayer;

  private BottomCanvasLayer: L.GridLayer;
  private TopCanvasLayer: L.GridLayer;

  private CanvasLayer: L.GridLayer;

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

  bandQuantiles = '0.25:0.5:0.70';

  currRegion = 0;
  region_map = ['region', 'department', 'arrondissement', /* 'canton', */ 'commune'];

  // région, département, arrondissement até cantons
  optionsRegions: Options = {
    floor: 0,
    ceil: 3,
    showTicks: true,
    showSelectionBar: true,
    translate: (value: number): string => {
      switch (value) {
        case 0:
          return 'Région';
        case 1:
          return 'Département';
        case 2:
          return 'Arrondissement';
        /* case 3:
          return 'Canton'; */
        case 3:
        default:
          return 'Commune';
      }
    },
    // ['#eff3ff','#bdd7e7','#6baed6','#3182bd','#08519c']
    getPointerColor: (value: number): string => {
      let scale = ['#bdd7e7', '#6baed6', '#3182bd', '#08519c'];
      return scale[value];
    }
  }

  agiradom = {
    visible: false
  }

  no2_scale = ['rgba(215,25,28,0.70)', 'rgba(253,174,97,0.70)', 'rgba(255,255,191,0.70)', 'rgba(166,217,106,0.70)', 'rgba(26,150,65,0.85)'].reverse();

  no2_window = {
    minValue: 0,
    maxValue: 59,

    bin: 2633760,
    lower: 1229385600,

    visible: false,

    scale_switcher: 1,

    scale: {
      0: d3.scaleThreshold<number, string>()
        .domain([5, 10, 15, 20, 30])
        .range(this.no2_scale),

      1: d3.scaleThreshold<number, string>()
        .domain([10, 20, 30, 40, 60])
        .range(this.no2_scale),

      2: d3.scaleThreshold<number, string>()
        .domain([50, 100, 150, 200, 300])
        .range(this.no2_scale)
    }
  }

  optionsNO2Scale: Options = {
    floor: 0,
    ceil: 2,
    showTicks: true,
    // showSelectionBar: true,
    /* selectionBarGradient: {
      from: 'white',
      to: '#FC0'
    }, */
    translate: (value: number): string => {
      switch (value) {
        case 0:
          return '[5,30]';
        case 1:
          return '[10,60]';
        case 2:
        default:
          return '[50,300]';
      }
    }
  }

  optionsNO2: Options = {
    floor: 0,
    ceil: 59,
    draggableRange: true,
    // showTicks: true,
    // showSelectionBar: true,
    /* selectionBarGradient: {
      from: 'white',
      to: '#FC0'
    }, */
    translate: (value: number): string => {
      let date = new Date((this.no2_window.lower + (this.no2_window.bin * value)) * 1000);
      return date.getUTCFullYear() + '/' + date.getUTCMonth();
    }
  }

  optionsTreatments: Options = {
    floor: 0,
    ceil: 6,
    showTicks: true,
    showSelectionBar: true,
    selectionBarGradient: {
      from: 'white',
      to: '#FC0'
    },
    translate: (value: number): string => {
      if (value === 0) {
        return '0';
      } else {
        return Math.pow(2, value - 1).toString();
      }
    }
  };

  treatments_duration = [
    { minValue: 0, maxValue: 6, viewValue: 'PPC', dimName: 'dur_ppc' },
    { minValue: 0, maxValue: 6, viewValue: 'OXY', dimName: 'dur_oxy' },
    { minValue: 0, maxValue: 6, viewValue: 'VEN', dimName: 'dur_ven' },
    { minValue: 0, maxValue: 6, viewValue: 'AERO', dimName: 'dur_aero' },
  ]

  marker_values = [
    { value: 0, viewValue: 'IAH' },
    { value: 1, viewValue: 'BMI' },
    { value: 2, viewValue: 'Epworth' },
    { value: 3, viewValue: 'All' },
  ]

  payload_values = [
    { value: 'value', viewValue: 'Value' },
    { value: 'value_delta', viewValue: 'Delta' },
  ]

  aggr_values = [
    { value: 'count', viewValue: 'Count' },
    { value: 'mean', viewValue: 'Mean' },
    { value: 'variance', viewValue: 'Variance' },
    { value: 'quantile', viewValue: 'Quantile' },
    { value: 'cdf', viewValue: 'Inverse Quantile' },
    { value: 'outlier', viewValue: 'Outlierness' }
  ];

  aggr_map = {
    'count': {
      key: 'count',
      sufix: undefined,
      label: 'count',
      formatter: {
        'value': d3.format('.2s'),
        'value_delta': d3.format('.2s')
      }
    },
    'mean': {
      key: 'average',
      sufix: '_g',
      label: 'mean',
      formatter: {
        'value': d3.format('.2f'),
        'value_delta': d3.format('.3f')
      }
    },
    'variance': {
      key: 'variance',
      sufix: '_g',
      label: 'variance',
      formatter: {
        'value': d3.format('.1f'),
        'value_delta': d3.format('.3f')
      }
    },
    'quantile': {
      key: 'quantile',
      sufix: '_t',
      label: 'quantile',
      formatter: {
        'value': d3.format('.2f'),
        'value_delta': d3.format('.3f')
      }
    },
    'cdf': {
      key: 'inverse',
      sufix: '_t',
      label: 'cdf',
      formatter: {
        'value': d3.format('.2f'),
        'value_delta': d3.format('.2f')
      }
    },
    'outlier': {
      key: 'pipeline',
      sufix: '',
      label: 'outlierness',
      formatter: {
        'value': d3.format('.2f'),
        'value_delta': d3.format('.2f')
      }
    }
  };

  dataset_values = [
    { value: 'health', viewValue: 'Health' },
  ];

  color: any;
  prev_dim = '';

  range_map = {
    'normal': ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837'].reverse(),

    'outlier': ['rgb(215,25,28)', 'rgb(253,174,97)', 'rgb(255,255,191)'].reverse()
  }

  color_map = {
    'normal': (dim) => d3.scaleQuantize<string>()
      .domain(this.geo.json_min_max.get(dim))
      .range(this.range_map.normal),

    'outlier': (dim) => d3.scaleThreshold<number, string>()
      .domain([0.5, 0.9, 1])
      .range(this.range_map.outlier),

    'ryw': (count) => {
      const lc = Math.log(count) / Math.log(100);

      const r = Math.floor(256 * Math.min(1, lc));
      const g = Math.floor(256 * Math.min(1, Math.max(0, lc - 1)));
      const b = Math.floor(256 * Math.min(1, Math.max(0, lc - 2)));

      return 'rgba(' + r + ',' + g + ',' + b + ',' + 0.70 + ')';
    }
  };

  info_name = '';
  info_users = [0, 0];
  info_events = [0, 0]

  ableToGetData = true;

  constructor(
    private geo: GeoDataService,
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
  getFormatter() {
    return this.aggr_map[this.options.get('aggr').value].formatter[this.options.get('payload').value];
  }

  updateInfo() {
    this.updateInfoName();
    this.updateInfoUsers();
    this.updateInfoEvents();
  }

  getCurrentFeature() {
    return this.geo.json_curr.get(this.getCurrRegion());
  }

  updateInfoName() {
    let feature = this.getCurrentFeature();
    if (feature) {
      this.info_name = '(' + feature.properties.code + ') ' + feature.properties.nom;
    } else {
      this.info_name = 'France';
    }
  }

  updateInfoUsers() {
    let query = '/query/dataset=' + this.dataset.datasetName + '/aggr=count' +
      this.getCategoricalConst() +
      this.getTemporalConst() +
      this.getRegionConst(this.getCurrentFeature()) +
      this.getMarker() +
      this.getTreatments() +
      '/const=user_id.values.(all)/group=user_id';

    this.dataService.query(query).subscribe(data => {
      this.info_users[0] = data[0].length;
    });

    query = '/query/dataset=' + this.dataset.datasetName + '/aggr=count' +
      this.getRegionConst() +
      this.getMarker() +
      this.getTreatments() +
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
      this.getTreatments() +
      this.getRegionConst(this.getCurrentFeature());

    this.dataService.query(query).subscribe(data => {
      this.info_events[0] = data[0];
    });

    query = '/query/dataset=' + this.dataset.datasetName + '/aggr=count' +
      this.getMarker() +
      this.getTreatments() +
      this.getRegionConst();

    this.dataService.query(query).subscribe(data => {
      this.info_events[1] = data[0];
    });
  }


  loadMapCard() {
    this.currentZoom = this.mapService.map.getZoom();
    this.maximumZoom = this.mapService.map.getMaxZoom();
  }

  loadNO2Legend() {
    const svg = d3.select('#svg-color-no2');
    svg.selectAll('*').remove();

    if (!this.no2_window.visible) {
      return;
    }

    svg.append('g')
      .attr('class', 'legendQuant')
      .attr('transform', 'translate(0, 0)');

    const colorLegend = legendColor()
      .ascending(true)
      // .labelFormat(this.getFormatter())
      .scale(this.no2_window.scale[this.no2_window.scale_switcher]);

    svg.select('.legendQuant')
      .call(colorLegend);
  }

  loadAgiradomLegend(dim) {
    const svg = d3.select('#svg-color-agiradom');
    svg.selectAll('*').remove();

    if (!this.agiradom.visible || this.geo.json_min_max.get(dim)[0] == Number.MAX_SAFE_INTEGER) {
      return;
    }

    svg.append('g')
      .attr('class', 'legendQuant')
      .attr('transform', 'translate(0, 0)');

    const colorLegend = legendColor()
      .ascending(true)
      .labelFormat(this.getFormatter())
      .scale(this.color(dim));

    svg.select('.legendQuant')
      .call(colorLegend);
  }

  getPrevRegion() {
    if (this.currRegion == 0) {
      return 'country';
    } else {
      return this.region_map[this.currRegion - 1];
    }
  }

  getCurrRegion() {
    return this.region_map[this.currRegion];
  }

  loadWorldLayer() {
    let self = this;

    let layerOnMouseOver = (feature, el, dim) => {
      if (self.geo.json_curr.get(self.getCurrRegion()) !== undefined) {
        self.geo.json_curr.set(self.getCurrRegion(), undefined);
        self.updateInfo();
      }
    };

    let getLayer = (dim) => {
      return L.geoJSON(this.geo.json.get(dim), {
        style: function (feature) {
          return { fillColor: 'black', color: 'black', weight: 0.0, opacity: 0.0, fillOpacity: 0.0 };;
        },
        onEachFeature: (feature, layer) => {
          layer.on({
            mouseover: (el) => layerOnMouseOver(feature, el, dim)
          });
        }
      });
    }

    this.MiddleRegionLayer = getLayer('world');
  }

  getPromiseGeojsonValid() {
    let query = '/query' +
      '/dataset=' + this.dataset.datasetName +
      '/aggr=count' +
      this.getCategoricalConst() +
      this.getTemporalConst() +
      this.getMarker() +
      this.getTreatments() +
      '/const=' + this.getCurrRegion() + '.values.(all)' +
      '/group=' + this.getCurrRegion();

    return new Promise((resolve, reject) => {
      this.dataService.query(query).subscribe(response => {
        this.geo.json_valid.set(this.getCurrRegion(), response[0]);
        resolve(true);

      }, (err: HttpErrorResponse) => {
        console.log(err.message);
      });
    })
  }

  getMapPromises = () => {
    let self = this;

    // reset values    
    this.geo.json_value.set(self.getPrevRegion(), new Map());
    this.geo.json_value.set(self.getCurrRegion(), new Map());

    const constrainsts = self.getCategoricalConst() +
      self.getTemporalConst() +
      self.getMarker() +
      this.getTreatments();

    let promises = [];

    let getPromise = (dim) => {
      return new Promise((resolve) => {
        let query = '';
        if (this.options.get('aggr').value === 'outlier') {
          query = '/pipeline' +
            '/join=right_join' +
            '/threshold=' + self.options.get('display_threshold').value +
            '/datset=' + self.dataset.datasetName +
            //left
            self.getLeftPipeline() +
            constrainsts +
            '/const=' + dim + '.values.(all)/group=' + dim +
            // right
            self.getRightPipeline() +
            constrainsts +
            '/const=' + dim + '.values.(all)/group=' + dim;
        } else {
          query = '/query' +
            '/dataset=' + self.dataset.datasetName +
            this.getAggr() +
            constrainsts +
            '/const=' + dim + '.values.(all)/group=' + dim;
        }

        // reset min_max values
        self.geo.json_min_max.set(dim, [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]);

        self.dataService.query(query).subscribe(response => {
          let value = response[0];

          if (value.length) {
            let curr_minmax = self.geo.json_min_max.get(dim);

            value.map((el) => {
              if (!isNaN(el[1])) {
                curr_minmax[0] = Math.min(curr_minmax[0], el[1]);
                curr_minmax[1] = Math.max(curr_minmax[1], el[1]);
              }
            });

            self.geo.json_min_max.set(dim, curr_minmax);
          }

          self.geo.json_value.set(dim, value);

          resolve(true);
        });
      });
    };

    // wait for all promises fineshes and then ...
    promises.push(getPromise(self.getCurrRegion()));
    promises.push(self.getPromiseGeojsonValid());

    return promises;
  }

  loadLayer() {
    let self = this;

    /////////////////////////////////////////////////////////////////////
    // load heat map
    /////////////////////////////////////////////////////////////////////

    const grid_query = '/query' +
      '/dataset=' + 'pollution' +
      '/aggr=' + 'average.no2-value' +
      '/group=' + 'coord';

    this.CanvasLayer = new L.GridLayer({
      keepBuffer: 2,
      updateInterval: 40,
      updateWhenIdle: true,
      updateWhenZooming: false,
    });

    const tile_size = this.CanvasLayer.getTileSize();

    this.CanvasLayer.createTile = (coords) => {
      let resolution = this.options.get('resolution').value;

      /* if (coords.z > 8) {
        resolution -= coords.z - 8;
      } */

      /* const tile = document.createElement('div');
      tile.style.outline = '1px solid green';
      tile.style.fontWeight = 'bold';
      tile.style.fontSize = '14pt';
      tile.innerHTML = [coords.z, coords.x, coords.y].join('/');
      return tile; */

      const tile = document.createElement('canvas');

      const query = grid_query +
        '/const=date.interval.(' +
        (this.no2_window.lower + this.no2_window.bin * this.no2_window.minValue) + ':' +
        (this.no2_window.lower + this.no2_window.bin * this.no2_window.maxValue) + ')' +
        '/const=' + 'coord.tile.(' + coords.x + ':' + coords.y + ':' + coords.z + ':' + resolution + ')';

      this.dataService.query(query).subscribe(data => {
        tile.setAttribute('width', tile_size.x.toString());
        tile.setAttribute('height', tile_size.y.toString());

        const ctx = tile.getContext('2d');
        // ctx.globalCompositeOperation = 'lighter';
        ctx.clearRect(0, 0, tile_size.x, tile_size.y);

        if (data[0] === undefined) {
          return tile;
        }

        for (const d of data[0]) {
          const lon0 = Mercator.tilex2lon(d[0], d[2]);
          const lat0 = Mercator.tiley2lat(d[1], d[2]);
          const lon1 = Mercator.tilex2lon(d[0] + 1, d[2]);
          const lat1 = Mercator.tiley2lat(d[1] + 1, d[2]);

          const x0 = (Mercator.lon2tilex(lon0, coords.z) - coords.x) * 256;
          const y0 = (Mercator.lat2tiley(lat0, coords.z) - coords.y) * 256;
          const x1 = (Mercator.lon2tilex(lon1, coords.z) - coords.x) * 256;
          const y1 = (Mercator.lat2tiley(lat1, coords.z) - coords.y) * 256;


          ctx.fillStyle = self.no2_window.scale[this.no2_window.scale_switcher](d[3]);
          ctx.fillRect(x0, y0, (x1 - x0), (y1 - y0));
        }
      });

      return tile;
    };

    this.CanvasLayer.on('add', this.onCanvasAdd, this);
    this.CanvasLayer.on('remove', this.onCanvasRemove, this);

    /////////////////////////////////////////////////////////////////////
    // load geojson
    /////////////////////////////////////////////////////////////////////

    let promises = self.getMapPromises();

    Promise.all(promises).then(() => {
      let getLayerColor = (feature, dim) => {
        let value = self.geo.json_value.get(dim).find((el) => el[0] === Number.parseInt(feature.properties.code))[1];
        let style = { fillColor: self.color(dim)(value), color: 'black', weight: 1.0, opacity: 0.70, fillOpacity: 0.70 };

        // selected layer
        if (self.geo.json_selected.get(dim).get(feature)) {
          style.weight = 4;
          style.fillColor = 'darkblue';
        }

        return style;
      };

      let layerOnMouseOver = (feature, el, dim) => {
        if (!self.geo.json_value || !self.geo.json_value.get(dim) || !self.ableToGetData) {
          return;
        }

        // already selected feature
        if (self.geo.json_curr.get(dim) !== feature) {
          // update info on mousemove
          self.geo.json_curr.set(dim, feature);
          self.updateInfo();
        }

        /* let code = Number.parseInt(feature.properties.code);
        let value = self.geo.json_value.get(dim).find((el) => el[0] === code)[1]; */

        let style = getLayerColor(feature, dim);
        style.weight = 4;

        el.target.setStyle(style);

        return style;
      };

      let heatOnMouseOver = (feature, el, dim) => {
        if (!self.geo.json_value || !self.geo.json_value.get(dim) || !self.ableToGetData) {
          return;
        }

        // already selected feature
        if (self.geo.json_curr.get(dim) !== feature) {
          // update info on mousemove
          self.geo.json_curr.set(dim, feature);
          self.updateInfo();
        }

        /* let code = Number.parseInt(feature.properties.code);
        let value = self.geo.json_value.get(dim).find((el) => el[0] === code)[1]; */

        let style = getLayerColor(feature, dim);

        el.target.setStyle({ fillColor: 'rgba(0,0,0,0)', color: 'black', weight: 4.0, opacity: 1.0, fillOpacity: 1.0 });

        return style;
      };

      let heatOnMouseOut = (feature, el, dim) => {
        if (!self.geo.json_value || !self.geo.json_value.get(dim) || !self.ableToGetData) {
          return;
        }
        let style = getLayerColor(feature, dim);
        el.target.setStyle({ fillColor: 'rgba(0,0,0,0)', color: 'black', weight: 1.0, opacity: 1.0, fillOpacity: 1.0 });

        return style;
      };

      let layerOnMouseOut = (feature, el, dim) => {
        if (!self.geo.json_value || !self.geo.json_value.get(dim) || !self.ableToGetData) {
          return;
        }

        let code = Number.parseInt(feature.properties.code);
        let value = self.geo.json_value.get(dim).find((el) => el[0] === code)[1];

        let style = getLayerColor(feature, dim);

        // self.geo.json_curr.set(dim, undefined);

        el.target.setStyle(style);

        // update info on mouseout
        // self.updateInfo();

        return style;
      };

      let layerOnMouseClick = (feature, el, dim) => {
        if (!self.geo.json_value || !self.geo.json_value.get(dim)) {
          return;
        }

        let code = Number.parseInt(feature.properties.code);
        let value = self.geo.json_value.get(dim).find((el) => el[0] === code)[1];

        // swith selected
        if (self.geo.json_selected.get(dim).get(feature)) {
          self.geo.json_selected.get(dim).set(feature, false);
        } else {
          self.geo.json_selected.get(dim).set(feature, true);
        }

        let style = getLayerColor(feature, dim);

        style.weight = 4;

        el.target.setStyle(style);
        self.loadWidgetsData();

        return style;
      }

      self.updateAggr();
      self.loadAgiradomLegend(self.getCurrRegion());

      let getLayerByKey = (key) => {
        if (key == 'curr' || key == 'curr_heat') {
          return self.getCurrRegion();
        } else {
          return self.getPrevRegion();
        }
      }

      let getLayer = (key) => {
        return L.geoJSON(this.geo.json.get(getLayerByKey(key)), {
          keepBuffer: 2,
          updateInterval: 40,
          updateWhenIdle: true,
          updateWhenZooming: false,

          style: (feature) => {
            if (key == 'prev' || key == 'prev_heat') {
              return { fillColor: 'rgba(0,0,0,0)', color: 'black', weight: 3.0, opacity: 1.0, fillOpacity: 1.0 };
            } else if (key == 'curr_heat') {
              return { fillColor: 'rgba(0,0,0,0)', color: 'black', weight: 1.0, opacity: 1.0, fillOpacity: 1.0 };
            } else {
              return getLayerColor(feature, self.getCurrRegion());
            }
          },
          onEachFeature: (feature, layer) => {
            if (key == 'curr') {
              layer.on({
                mouseover: (el) => layerOnMouseOver(feature, el, self.getCurrRegion()),
                mouseout: (el) => layerOnMouseOut(feature, el, self.getCurrRegion()),
                click: (el) => layerOnMouseClick(feature, el, self.getCurrRegion())
              });
            } else if (key == 'curr_heat') {
              layer.on({
                mouseover: (el) => heatOnMouseOver(feature, el, self.getCurrRegion()),
                mouseout: (el) => heatOnMouseOut(feature, el, self.getCurrRegion())
              });
            }
          },
          filter: function (feature, layer) {
            if (key == 'prev' || key == 'prev_heat') {
              return true;
            } else {
              let code = Number.parseInt(feature.properties.code);
              let isValid = self.geo.json_valid.get(self.getCurrRegion()).find((el) => el[0] === code);

              if (isValid && isValid[1] >= self.options.get('display_threshold').value) {
                return true;
              } else {
                return false;
              }
            }
          }
        });
      }

      if (this.BottomRegionLayer) this.mapService.map.removeLayer(this.BottomRegionLayer);
      this.BottomRegionLayer = getLayer('prev');
      // this.mapService.map.addLayer(this.BottomRegionLayer);

      // add transparent layer
      if (this.MiddleRegionLayer) this.mapService.map.removeLayer(this.MiddleRegionLayer);
      // this.mapService.map.addLayer(this.MiddleRegionLayer);

      if (this.TopRegionLayer) this.mapService.map.removeLayer(this.TopRegionLayer);
      this.TopRegionLayer = getLayer('curr');
      // this.mapService.map.addLayer(this.TopRegionLayer);

      this.TopRegionLayer.on('add', this.onRegionAdd, this);
      this.TopRegionLayer.on('remove', this.onRegionRemove, this);

      let agiradom = L.layerGroup([this.BottomRegionLayer, this.MiddleRegionLayer, this.TopRegionLayer], {
        zIndex: 1000
      }).addTo(this.mapService.map);

      this.BottomCanvasLayer = getLayer('prev_heat');
      this.TopCanvasLayer = getLayer('curr_heat');

      let heatmap = L.layerGroup([this.BottomCanvasLayer, this.CanvasLayer, this.MiddleRegionLayer, this.TopCanvasLayer], {
        zIndex: 100
      });

      let overlay_maps = {
        'AGIRADOM': agiradom,
        'Average NO2': heatmap
      }

      L.control.layers(overlay_maps, null, {
        collapsed: false,
        hideSingleBase: true,
        position: 'topleft',
        autoZIndex: false
      }).addTo(this.mapService.map);

      this.mapService.map.on('move', this.onMapMoveStart, this);
      this.mapService.map.on('moveend', this.onMapMoveEnd, this);
    });
  }

  onRegionAdd() {
    this.agiradom.visible = true;
    this.loadAgiradomLegend(this.getCurrRegion());
  }

  onRegionRemove() {
    this.agiradom.visible = false;
    this.loadAgiradomLegend(this.getCurrRegion());
  }

  onCanvasAdd() {
    this.no2_window.visible = true;
    this.loadNO2Legend();
  }

  onCanvasRemove() {
    this.no2_window.visible = false;
    this.loadNO2Legend();
  }

  onMapMoveStart() {
    this.ableToGetData = false;
  }

  onMapMoveEnd() {
    this.ableToGetData = true;
  }

  clearCohorts() {
    localStorage.setItem('features', JSON.stringify([]));

    this.snackBar.open('Cohorts Cleaned!', 'Dismiss', {
      duration: 2000,
      viewContainerRef: this.footerCtnRef
    });
  }

  createCohort() {
    let dim = this.getCurrRegion();
    localStorage.setItem('dim', JSON.stringify(dim));

    let selected = this.geo.json_selected.get(dim);

    let features;
    let features_str = localStorage.getItem('features');

    if (!features_str || features_str.valueOf() === '"[]"') {
      features = new Array();
    } else {
      features = JSON.parse(features_str.valueOf());
    }

    let values = '';
    let keys = [];

    let valid = false;

    if (selected !== 0) {
      values = '/const=' + dim + '.values.(';

      selected.forEach((value, key, map) => {
        if (value) {
          valid = true;
          values += key.properties.code + ':'

          keys.push(key);
        }
      });

      if (valid) values = values.substr(0, values.length - 1);
      values += ')';
    }

    if (!valid) {
      keys.push({
        'properties': {
          'nom': 'France',
          'code': 0
        }
      });

      values = '';
    }

    features.push({
      'feature': keys,
      'constraints': '/query' +
        '/dataset=' + this.dataset.datasetName +
        this.getCategoricalConst(dim) +
        this.getTemporalConst() +
        this.getTreatments() +
        values
    });

    localStorage.setItem('features', JSON.stringify(features));

    this.snackBar.open('Cohort Created.', 'Dismiss', {
      duration: 2000,
      viewContainerRef: this.footerCtnRef
    });
  }

  loadWidgetsData() {
    // update info
    this.updateInfo();

    let color = 'normal';
    if (this.options.get('aggr').value == 'outlier') {
      color = 'outlier';
    }

    for (const ref of this.widgets) {
      if (ref.type === 'categorical') {
        ref.widget.setYLabel(this.aggr_map[this.options.get('aggr').value].label);
        ref.widget.setFormatter(this.getFormatter());

        (<BarChartComponent>ref.widget).setColorRange(color);

        const constrainsts = this.getCategoricalConst(ref.key) +
          this.getTemporalConst() +
          this.getRegionConst() +
          this.getMarker() +
          this.getTreatments();

        if (this.options.get('aggr').value === 'outlier') {
          ref.widget.setNextTerm(
            '/pipeline' +
            '/join=right_join' +
            '/threshold=' + this.options.get('display_threshold').value +
            '/datset=' + this.dataset.datasetName +
            //left
            this.getLeftPipeline() +
            constrainsts +
            '/group=' + ref.key +
            // right
            this.getRightPipeline() +
            constrainsts +
            '/group=' + ref.key
          );
        } else {
          ref.widget.setNextTerm(
            '/query/dataset=' + this.dataset.datasetName +
            this.getAggr() +
            this.getCategoricalConst(ref.key) +
            this.getTemporalConst() +
            this.getRegionConst() +
            this.getMarker() +
            this.getTreatments() +
            '/group=' + ref.key
          );
        }


      } else if (ref.type === 'temporal') {
        ref.widget.setYLabel(this.aggr_map[this.options.get('aggr').value].label);
        ref.widget.setFormatter(this.getFormatter());

        //(<TemporalBandComponent>ref.widget).setNumCurves(this.getAggrTemporalBands());
        (<LineChartComponent>ref.widget).setColorRange(color);

        const constrainsts = this.getCategoricalConst(ref.key) +
          this.getTemporalConst() +
          this.getRegionConst() +
          this.getMarker() +
          this.getTreatments();

        if (this.options.get('aggr').value === 'outlier') {
          ref.widget.setNextTerm(
            '/pipeline' +
            '/join=right_join' +
            '/threshold=' + this.options.get('display_threshold').value +
            '/datset=' + this.dataset.datasetName +
            //left
            this.getLeftPipeline() +
            constrainsts +
            '/group=' + ref.key +
            // right
            this.getRightPipeline() +
            constrainsts +
            '/group=' + ref.key
          );
        } else {
          ref.widget.setNextTerm(
            '/query/dataset=' + this.dataset.datasetName +
            this.getAggr() +
            this.getCategoricalConst(ref.key) +
            this.getTemporalConst() +
            this.getRegionConst() +
            this.getMarker() +
            this.getTreatments() +
            '/group=' + ref.key
          );
        }
      }
    }
  }

  setDataset(evnt: any) {
    this.sidenav.toggle();
    const link = ['/demo2', this.options.get('dataset').value];
    this.router.navigate(link);
  }

  setMapData() {
    let promises = this.getMapPromises();

    Promise.all(promises).then(() => {
      this.loadAgiradomLegend(this.getCurrRegion());

      let prev_data = this.geo.json.get(this.getPrevRegion());
      let curr_data = this.geo.json.get(this.getCurrRegion());

      this.BottomRegionLayer.clearLayers();
      this.BottomRegionLayer.addData(prev_data);

      this.BottomCanvasLayer.clearLayers();
      this.BottomCanvasLayer.addData(prev_data);

      this.TopRegionLayer.clearLayers();
      this.TopRegionLayer.addData(curr_data);

      this.TopCanvasLayer.clearLayers();
      this.TopCanvasLayer.addData(curr_data);
    });
  }

  updateAggr() {
    const type = this.options.get('aggr').value;

    if (type !== 'outlier') {
      this.color = this.color_map['normal'];
    } else {
      this.color = this.color_map['outlier'];
    }

    this.aggr = '/aggr=' + this.aggr_map[type].key;

    if (this.aggr_map[type].sufix !== undefined) {
      this.aggr += '.' + this.options.get('payload').value + this.aggr_map[type].sufix;
    }

    if (type === 'cdf' || type === 'quantile') {
      this.aggr += '.(' + this.getPayloadInfo('value') + ')';
    }
  }

  getLeftPipeline() {
    return '/source' +
      '/aggr=average.' + this.options.get('payload').value + '_g' +
      '/dataset=' + this.dataset.datasetName;
  }

  getRightPipeline() {
    return '/destination' +
      '/aggr=inverse.' + this.options.get('payload').value + '_t' +
      '/dataset=' + this.dataset.datasetName;
  }

  getMarker() {
    // all markers
    if (this.options.get('marker').value === 3) {
      return '';
    } else {
      return '/const=marker.values.(' + this.options.get('marker').value + ')';
    }
  }

  setMarker() {
    // this.updateAggr();
    this.loadWidgetsData();
    this.setMapData();
  }

  setMapRegion(event) {
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

  setNO2Scale() {
    this.loadNO2Legend();
    this.CanvasLayer.redraw();
  }

  setNO2Window(event) {
    // refresh map data
    this.CanvasLayer.redraw();
  }


  setTreatment(event, entry) {
    this.loadWidgetsData();
    this.setMapData();
  }

  getTreatments() {
    let constrainsts = '';
    this.treatments_duration.forEach((entry) => {
      let values = '';
      for (let i = entry.minValue; i <= entry.maxValue; ++i) {
        values += i + ':';
      }
      if (values !== '') {
        // remove last ':'
        values = values.substr(0, values.length - 1);
        constrainsts += '/const=' + entry.dimName + '.values.(' + values + ')'
      }
    });
    return constrainsts;
  }

  getRegionConst(feature?) {
    if (feature) {
      return '/const=' + this.getCurrRegion() + '.values.(' + feature.properties.code + ')';
    } else {
      let selected = this.geo.json_selected.get(this.getCurrRegion());

      if (!selected || selected.length === 0) {
        return '';
      } else {
        let valid = false;
        let values = '/const=' + this.getCurrRegion() + '.values.(';

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

    this.loadWidgetsData();
  }

  initialize() {
    this.options = this.formBuilder.group({
      // visualization setup
      display_threshold: new FormControl(0),
      aggr: new FormControl('count'),
      marker: new FormControl(3),

      color: new FormControl('ryw'),
      geometry: new FormControl('rect'),
      geom_size: new FormControl(0),
      resolution: new FormControl(8),

      payload: new FormControl(this.dataset.payloads[0]),
      dataset: new FormControl(this.dataset.datasetName)
    });

    this.updateAggr();

    this.geocodingService.geocode(this.dataset.local)
      .subscribe(location => {
        this.mapService.fitBounds(location.viewBounds);
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

    // load map
    this.loadWorldLayer();
    this.loadLayer();
    this.loadMapCard();

    // refresh input data
    this.loadWidgetsData();
  }

  getPayloadInfo(key: string) {
    return d3.format('.2f')(this.dataset.payloadValues[this.options.get('payload').value][this.options.get('aggr').value][key]);
  }

  setPayloadInfo(key: string, value: number) {
    this.dataset.payloadValues[this.options.get('payload').value][this.options.get('aggr').value][key] = value;

    this.setAggr();
  }
}
