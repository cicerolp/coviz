import { Component, OnInit, Renderer2, ComponentFactoryResolver, ViewContainerRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl, AbstractControl } from '@angular/forms';

import * as d3 from 'd3';

import { Widget } from '../widget';
import { BarChartComponent } from '../bar-chart/bar-chart.component';
import { SchemaService } from '../services/schema.service';
import { MatHorizontalStepper } from '@angular/material';
import { CalendarComponent } from '../calendar/calendar.component';
import { DataService } from '../services/data.service';
import { BoxPlotComponent } from '../box-plot/box-plot.component';
import { TimezoneService } from '../services/timezone.service';

interface WidgetType {
  key: string;
  type: string;
  widget: Widget;
}

interface DimConstraints {
  [key: string]: string;
}

@Component({
  selector: 'app-demo5',
  templateUrl: './demo5.component.html',
  styleUrls: ['./demo5.component.scss']
})
export class Demo5Component implements OnInit, AfterViewInit {
  formGroup: FormGroup;

  // stepper
  @ViewChild('stepper') stepper: MatHorizontalStepper;

  // schema
  ///////////////////////////////////
  dataset: any;

  // queries
  ///////////////////////////////////
  private categorical: DimConstraints = {};

  // widgets
  //////////////////////////////////
  @ViewChild('container', { read: ViewContainerRef }) container: ViewContainerRef;
  @ViewChild('calendarCtn', { read: ViewContainerRef }) calendarCtn: ViewContainerRef;
  @ViewChild('boxplotCtn', { read: ViewContainerRef }) boxplotCtn: ViewContainerRef;



  private calendarWidget: WidgetType;
  private boxplotWidget: WidgetType;
  private widgets: Array<WidgetType> = [];

  dataset_values = [
    // { value: 'on_time_performance_demo5', viewValue: 'Flights 2017' },
    { value: 'health', viewValue: 'Health' }
  ];

  group_values = [
    // { value: 'minute', viewValue: 'Minute' },
    // { value: 'hour', viewValue: 'Hour' },
    { value: 'day', viewValue: 'Day' },
    // { value: 'week', viewValue: 'Week' },
    // { value: 'month', viewValue: 'Month' },
    // { value: 'year', viewValue: 'Year' }
  ];

  group_map = {
    'minute': 60,
    'hour': 3600,
    'day': 86400,
    'week': 604800,
    'month': 2678400,
    'year': 32140800
  };

  aggr_map = {
    'count': {
      key: 'count'
    },
    'mean': {
      key: 'average',
      sufix: '_g'
    },
    'variance': {
      key: 'variance',
      sufix: '_g'
    },
    'quantile': {
      key: 'quantile',
      sufix: '_t'
    },
    'cdf': {
      key: 'inverse',
      sufix: '_t'
    }
  };

  spinner = false;
  result = false;

  /** Returns a FormArray with the name 'formArray'. */
  get formArray(): AbstractControl | null { return this.formGroup.get('formArray'); }

  constructor(
    private formBuilder: FormBuilder,

    private timezoneService: TimezoneService,
    private dataService: DataService,
    private schemaService: SchemaService,

    private renderer2: Renderer2,
    private componentFactory: ComponentFactoryResolver
  ) { }

  ngOnInit() {
    this.formGroup = this.formBuilder.group({
      formArray: this.formBuilder.array([
        this.formBuilder.group({
          dataset: ['health', Validators.required],
          payload: ['', Validators.required],
          spatial: ['', Validators.required],
          temporal: ['', Validators.required],
          resolution: [18, Validators.required]
        }),
        this.formBuilder.group({
          group: ['day', Validators.required],
          leftFrom: ['', Validators.required],
          leftTo: ['', Validators.required]
        }),
        this.formBuilder.group({
          rightFrom: ['', Validators.required],
          rightTo: ['', Validators.required]
        }),
        this.formBuilder.group({
        }),
        this.formBuilder.group({
          threshold: [100, Validators.required]
        })
      ])
    });

    this.selectedDataset();
  }

  ngAfterViewInit() {
  }

  getFormValue(index: number, key: string) {
    return this.formArray.get([index]).get(key).value;
  }

  getFormateDate(index: number, key: string): string {
    return this.timezoneService.getFormatedDate((<Date>this.getFormValue(index, key))).toString();
  }

  getSourcePipeline() {
    return '/source' +
      '/aggr=average.' + this.getFormValue(0, 'payload') + this.aggr_map['mean'].sufix +
      '/dataset=' + this.dataset.datasetName +
      // '/const=' + this.getFormValue(0, 'spatial') + '.tile.(0:0:0:' + this.getFormValue(0, 'resolution') + ')' +
      // '/group=' + this.getFormValue(0, 'spatial');
      '/const=user_id.values.(all)/group=user_id';
  }

  getDestinationPipeline() {
    return '/destination' +
      '/aggr=inverse.' + this.getFormValue(0, 'payload') + this.aggr_map['cdf'].sufix + '.($)' +
      '/dataset=' + this.dataset.datasetName +
      '/const=' + this.getFormValue(0, 'temporal') +
      '.interval.(' + this.getFormateDate(2, 'rightFrom') + ':' + this.getFormateDate(2, 'rightTo') + ')' +
      // '/const=' + this.getFormValue(0, 'spatial') + '.tile.(0:0:0:' + this.getFormValue(0, 'resolution') + ')' +
      // '/group=' + this.getFormValue(0, 'spatial') +
      '/const=user_id.values.(all)/group=user_id' +
      this.getCategoricalConst();
  }

  getTemporalKeys() {
    return Object.keys(this.dataset.temporalDimension);
  }

  getDateIntervalLength(from: Date, to: Date, group: string) {
    return Math.ceil(((to.valueOf() - from.valueOf()) / 1000) / this.group_map[group]);
  }

  reset() {
    this.spinner = false;
    this.result = false;
  }

  execute() {
    this.spinner = true;
    this.result = false;

    const query = '/augmented_series' +
      '/series=' + this.getFormValue(0, 'temporal') + '.(' +
      this.getFormateDate(1, 'leftFrom') + ':' +
      this.group_map[this.getFormValue(1, 'group')] + ':' +
      this.getDateIntervalLength(
        this.getFormValue(1, 'leftFrom'),
        this.getFormValue(1, 'leftTo'),
        this.getFormValue(1, 'group')
      ) + ':' +
      this.group_map[this.getFormValue(1, 'group')] + ')' +
      '/pipeline/' +
      'join=right_join' +
      '/threshold=' + this.getFormValue(4, 'threshold') +
      this.getSourcePipeline() +
      this.getDestinationPipeline();

    this.dataService.query(query).subscribe(data => {
      this.spinner = false;
      (<CalendarComponent>this.calendarWidget.widget).setData(data);
      this.result = true;
    });
  }

  createWidgets() {
    // clear widgets
    for (let i = 0; i < this.container.length; ++i) {
      this.container.remove(i);
    }

    for (let i = 0; i < this.boxplotCtn.length; ++i) {
      this.boxplotCtn.remove(i);
    }

    this.widgets = [];

    this.createHistograms(this.container);
    this.createBoxplots(this.boxplotCtn);
  }

  createHistograms(viewContainerRef) {
    for (const dim of this.dataset.categoricalDimension) {
      const component = this.componentFactory.resolveComponentFactory(BarChartComponent);

      const componentRef = viewContainerRef.createComponent(component);
      const componentInstance = <BarChartComponent>componentRef.instance;

      this.renderer2.addClass(componentRef.location.nativeElement, 'app-footer-item');

      componentInstance.setYLabel('count');
      componentInstance.setXLabel(dim);

      componentInstance.setDataset(this.getFormValue(0, 'dataset'));
      componentInstance.register(dim, this.setCategoricalData);
      this.widgets.push({ key: dim, type: 'categorical', widget: componentInstance });
    }
  }

  createBoxplots(viewContainerRef) {
    for (const dim of this.dataset.categoricalDimension) {
      const component = this.componentFactory.resolveComponentFactory(BoxPlotComponent);

      const componentRef = viewContainerRef.createComponent(component);
      const componentInstance = <BoxPlotComponent>componentRef.instance;

      this.renderer2.addClass(componentRef.location.nativeElement, 'app-footer-item');

      componentInstance.setYLabel('value');
      componentInstance.setXLabel(dim);

      componentInstance.setDataset(this.getFormValue(0, 'dataset'));
      componentInstance.register(dim, this.setBoxplotLine);
      this.widgets.push({ key: dim, type: 'boxplot', widget: componentInstance });
    }
  }

  createCalendarWidget() {
    // set calendar continer
    const viewContainerRef = this.calendarCtn;

    // clear calendar
    if (this.calendarWidget !== undefined) {
      viewContainerRef.remove(0);
    }

    const component = this.componentFactory.resolveComponentFactory(CalendarComponent);

    const componentRef = viewContainerRef.createComponent(component);
    const componentInstance = <CalendarComponent>componentRef.instance;

    this.renderer2.addClass(componentRef.location.nativeElement, 'app-footer-item');

    // componentInstance.register(dim, this.setCategoricalData);
    this.calendarWidget = {
      key: 'calendar',
      type: 'temporal',
      widget: componentInstance
    };
  }

  selectedDataset() {
    this.dataset = this.schemaService.get(this.getFormValue(0, 'dataset'));

    this.formArray.get([0]).patchValue({
      spatial: this.dataset.spatialDimension[0],
      temporal: this.getTemporalKeys()[0],
      payload: this.dataset.payloads[0]
    });

    this.seletectTemporalDim(null);

    this.createWidgets();
    this.createCalendarWidget();
  }

  seletectTemporalDim(event: any) {
    const temporalDim = this.dataset.temporalDimension[this.getFormValue(0, 'temporal')];
    this.formArray.get([1]).patchValue({
      leftFrom: this.timezoneService.getDateFromSeconds(temporalDim.lower),
      leftTo: this.timezoneService.getDateFromSeconds(temporalDim.upper)
    });

    this.formArray.get([2]).patchValue({
      rightFrom: this.timezoneService.getDateFromSeconds(temporalDim.lower),
      rightTo: this.timezoneService.getDateFromSeconds(temporalDim.upper)
    });
  }

  selectedStep(event: any) {
    if (event.selectedIndex === 3) {
      this.setWidgetsData();
    }
  }

  setWidgetsData() {
    for (const ref of this.widgets) {
      if (ref.type === 'categorical') {
        ref.widget.setNextTerm(
          '/query/dataset=' + this.dataset.datasetName +
          '/aggr=count' +
          this.getCategoricalConst(ref.key) +
          '/group=' + ref.key
        );
      } else if (ref.type === 'boxplot') {
        ref.widget.setNextTerm(
          '/query' + '/dataset=' + this.dataset.datasetName +
          '/aggr=quantile.' + this.getFormValue(0, 'payload') + this.aggr_map['quantile'].sufix + '.(0:0.25:0.5:0.75:1)' +
          // '/const=' + this.getFormValue(0, 'temporal') +
          // '.interval.(' + this.getFormateDate(2, 'rightFrom') + ':' + this.getFormateDate(2, 'rightTo') + ')' +
          this.getCategoricalConstNoExp(ref.key) +
          '/group=' + ref.key
        );
      }
    }
  }

  setBoxplotLine = (dim: string, value, self) => {
    this.dataService.query(
      '/query' + '/dataset=' + this.dataset.datasetName +
      '/aggr=inverse.' + this.getFormValue(0, 'payload') + this.aggr_map['cdf'].sufix + '.(' + value + ')' +
      // '/const=' + this.getFormValue(0, 'temporal') +
      // '.interval.(' + this.getFormateDate(2, 'rightFrom') + ':' + this.getFormateDate(2, 'rightTo') + ')' +
      this.getCategoricalConstNoExp(dim) +
      '/group=' + dim
    ).subscribe(data => {
      const extents = d3.extent(data[0], d => d[1] * 100);
      const scale = d3.scaleLinear<string, string>().
        // interpolate(d3.interpoateRgb).
        domain(extents as [number, number]).
        range(['rgb(240,240,240)', 'rgb(2,56,88)']);

      const colors = (<any[]>data[0]).map(d => scale(d[1] * 100));

      self.setColors(colors, scale);
    });
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

    this.setWidgetsData();
  }

  getCategoricalConstNoExp(filter: string) {
    let exp;
    let constrainsts = '';
    for (const key of Object.keys(this.categorical)) {
      if (key === filter) {
        exp = this.categorical[key];
      } else {
        constrainsts += this.categorical[key];
      }
    }

    if (exp === undefined) {
      constrainsts += '/const=' + filter + '.values.(all)';
    } else {
      constrainsts += exp;
    }
    return constrainsts;
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
}
