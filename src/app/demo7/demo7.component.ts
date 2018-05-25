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

import { HttpErrorResponse } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';

import { GeocodingService } from '../services/geocoding.service';
import { DataService } from '../services/data.service';
import { MapService } from '../services/map.service';

import * as d3 from 'd3';

import * as L from 'leaflet';
import 'leaflet-hotline';

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
import { DensityChartComponent } from '../density-chart/density-chart.component';
import { DensityWidget } from '../density-widget';

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
    { value: 'hurdat2', viewValue: 'hurdat2' },
    { value: 'hurdat2_resample', viewValue: 'hurdat2_resample' }
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

  geojson_data: any;
  hotline_data = new Map<number, any>();
  geojson_color = new Map<number, number>();
  cluster_map = [];

  fields_map = {
    'direction': 'sector',
    'speed': 'ks',
    'x': 'ksw',
    'y': 'ksw'
  };

  constructor(
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
    let self = this;

    let scale = d3.scaleSequential(d3.interpolateWarm)
      .domain([0, this.options.get('clusters').value - 1]);

    let filter = (id) => {
      if (self.geojson_color.size === 0) {
        return true;
      } else if (self.geojson_color.has(id)) {
        if (self.options.get('show_all_clusters').value) {
          return true;
        } else if (self.options.get('cluster').value - 1 === self.geojson_color.get(id)) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    }

    if (this.options.get('hotline').value) {
      var coords = [];
      this.hotline_data.forEach((value, key, map) => {
        if (filter(Number(key))) {
          coords.push(value);
        }
      });

      this.CanvasLayer = L.hotline(coords, {
        outlineWidth: 0,
        weight: 1.0,
        palette: {
          0.0: 'blue',
          1.0: 'gold'
        }
      });
    } else {
      this.CanvasLayer = L.geoJSON(this.geojson_data, {
        style: function (feature) {
          let id = Number(feature.properties.id);

          if (self.geojson_color.has(id)) {
            return { color: scale(self.geojson_color.get(id)), weight: 0.90, opacity: 0.85, };
          } else {
            return { color: scale(0), weight: 0.90, opacity: 1.0 };
          }
        },
        filter: function (feature, layer) {
          return filter(Number(feature.properties.id));
        }
      });
    }

    this.mapService.map.addLayer(this.CanvasLayer);
    this.mapService.map.on('zoomend', this.onMapZoomEnd, this);

    return;
  }

  onMapZoomEnd() {
    this.currentZoom = Math.round(this.mapService.map.getZoom());
  }

  loadWidgetsData() {
    for (const ref of this.widgets) {
      if (ref.type === 'density') {
        this.dataService.query('/query/dataset=' + this.dataset.datasetName +
          '/aggr=quantile.' + ref.key + '_t.(0.0:1.0)' +
          this.getCategoricalConst() +
          this.getClusterConst() +
          this.getTemporalConst() +
          this.getRegionConst())
          .subscribe(response => {
            const min = response[0][0][0];
            const max = response[0][1][0];

            let values: number[] = [];

            values.push(min);

            let inverse_values = '';
            const shift = (max - min) / 10.0;

            for (let value = min + shift; value < max; value += shift) {
              inverse_values += value + ":";
              values.push(value);
            }
            inverse_values = inverse_values.substring(0, inverse_values.length - 1);

            values.push(max);

            (<DensityWidget>ref.widget).setValues(values);

            ref.widget.setNextTerm(
              '/query/dataset=' + this.dataset.datasetName +
              '/aggr=inverse.' + ref.key + '_t.(' + inverse_values + ')' +
              this.getCategoricalConst() +
              this.getClusterConst() +
              this.getTemporalConst() +
              this.getRegionConst()
            );
          });


        /* ref.widget.setYLabel(this.aggr_map[this.options.get('aggr').value].label);
        ref.widget.setFormatter(this.aggr_map[this.options.get('aggr').value].formatter);
        ref.widget.setNextTerm(
          '/query/dataset=' + this.dataset.datasetName +
          this.getAggr() +
          this.getCategoricalConst(ref.key) +
          this.getClusterConst() +
          this.getTemporalConst() +
          this.getRegionConst() +
          '/group=' + ref.key
        ); */
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
    const link = ['/demo6', this.options.get('dataset').value];
    this.router.navigate(link);
  }

  setMapData() {
    this.mapService.map.removeLayer(this.CanvasLayer);
    this.loadLayer();

    // this.CanvasLayer.redraw();
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

      this.geojson_color.clear();

      for (let i in this.cluster_map) {
        for (let elt of this.cluster_map[i]) {
          this.geojson_color.set(elt, Number(i));
        }
      }

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

    if (cluster === undefined && this.options.get('show_all_clusters').value) {

      for (const cluster of this.cluster_map) {
        for (const elt of cluster) {
          values += elt + ':';
        }
      }

      values = values.substr(0, values.length - 1);

    } else {
      if (cluster === undefined) {
        cluster = this.options.get('cluster').value - 1;
      }

      for (const elt of this.cluster_map[cluster]) {
        values += elt + ':';
      }

      if (this.cluster_map[cluster].length > 0) {
        values = values.substr(0, values.length - 1);
      }
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
      group_by_array[0].push(new FormControl(false));
      group_by_array[1].push(new FormControl(8));
    }

    this.options = this.formBuilder.group({
      // visualization setup
      geometry: new FormControl(this.dataset.geometry),
      geom_size: new FormControl(this.dataset.geometry_size),
      resolution: new FormControl(this.dataset.resolution),
      composition: new FormControl(this.dataset.composition),

      clusters: new FormControl(8),
      hotline: new FormControl(false),
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

    for (const dim of this.dataset.payloads) {
      const component = this.componentFactory.resolveComponentFactory(DensityChartComponent);

      const componentRef = viewContainerRef.createComponent(component);
      const componentInstance = <DensityChartComponent>componentRef.instance;

      this.renderer2.addClass(componentRef.location.nativeElement, 'app-footer-item');

      componentInstance.setXLabel(dim);
      // componentInstance.register(dim, this.setTemporalData);
      this.widgets.push({ key: dim, type: 'density', widget: componentInstance });
    }

    // refresh input data
    this.loadWidgetsData();

    this.httpService.get('./assets/geojson/' + this.dataset.datasetName + '.geojson').subscribe(response => {
      this.geojson_data = response;

      const data: any = response;
      for (let feature of data.features) {
        let coordinates = feature.geometry.coordinates;

        let array = new Array();

        for (let elt in coordinates) {
          array.push([
            coordinates[elt][1],
            coordinates[elt][0],

            Number(elt) / (coordinates.length - 1)
          ]);
        }

        this.hotline_data.set(feature.properties.id, array);
      }

      // load map
      this.loadLayer();
      this.loadMapCard();
    },
      (err: HttpErrorResponse) => {
        console.log(err.message);
      }
    );
  }

  getPayloadInfo(key: string) {
    return d3.format('.2f')(this.dataset.payloadValues[this.options.get('payload').value][this.options.get('aggr').value][key]);
  }

  setPayloadInfo(key: string, value: number) {
    this.dataset.payloadValues[this.options.get('payload').value][this.options.get('aggr').value][key] = value;

    this.setAggr();
  }
}
