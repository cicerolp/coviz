import {
  Component,
  ViewChild,
  OnInit,
  ElementRef,
  AfterViewInit,
  ComponentFactoryResolver,
  ViewContainerRef,
  Renderer2,
  HostListener
} from '@angular/core';

import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';

import { FormBuilder, FormGroup, FormControl, FormsModule } from '@angular/forms';

import * as d3 from 'd3';
import * as pako from 'pako';

import { DataService } from '../services/data.service';
import { DataSharingService } from '../services/data-sharing.service';

import { Widget } from '../widget';

import { BarChartComponent } from '../bar-chart/bar-chart.component';
import { BoxPlotComponent } from '../box-plot/box-plot.component';
import { TemporalBandComponent } from '../temporal-band/temporal-band.component';
import { MatSnackBar } from '@angular/material';
import { GroupedBarChartComponent } from '../grouped-bar-chart/grouped-bar-chart.component';
import { GroupedBoxPlotComponent } from '../grouped-box-plot/grouped-box-plot.component';
import { CalendarComponent } from '../calendar/calendar.component';

import { Options } from 'ng5-slider';
import { CohortPlotComponent } from '../cohort-plot/cohort-plot.component';


// widgets
//////////////////////////////////
interface WidgetType {
  key: string;
  type: string;
  widget: Widget;
}

@Component({
  selector: 'app-compare',
  templateUrl: './compare.component.html',
  styleUrls: ['./compare.component.scss']
})
export class CompareComponent implements OnInit, AfterViewInit {

  dim = 'department';
  features = new Array();

  default_duration = {
    minValue: 2000, maxValue: 2017, currYear: 2017
  }

  payload_map = {
    value: {
      viewValue: 'value',
      formatter: d3.format('.2s')
    },
    value_delta: {
      viewValue: 'delta',
      formatter: d3.format('.3f')
    }
  }

  payload_values = [
    { value: 'value', viewValue: 'Value' },
    { value: 'value_delta', viewValue: 'Delta' },
  ]

  options: FormGroup;

  cohorts = new Array();

  durations = new Map<string, any[]>();
  default_pipeline_aggr = 'value';

  ctn = new Map<string, any[]>();

  // distribution
  @ViewChild('ctnBmiDistLeft', { read: ViewContainerRef }) ctnBmiDistLeft: ViewContainerRef;
  @ViewChild('ctnBmiDistDead', { read: ViewContainerRef }) ctnBmiDistDead: ViewContainerRef;
  @ViewChild('ctnBmiDistGender', { read: ViewContainerRef }) ctnBmiDistGender: ViewContainerRef;
  @ViewChild('ctnBmiDistAge', { read: ViewContainerRef }) ctnBmiDistAge: ViewContainerRef;

  // progression
  @ViewChild('ctnBmiPro', { read: ViewContainerRef }) ctnBmiPro: ViewContainerRef;

  // calendar
  @ViewChild('ctnBmiCalendar', { read: ViewContainerRef }) ctnBmiCalendar: ViewContainerRef;


  ////////////////////////////////

  // distribution
  @ViewChild('ctnIahDistLeft', { read: ViewContainerRef }) ctnIahDistLeft: ViewContainerRef;
  @ViewChild('ctnIahDistDead', { read: ViewContainerRef }) ctnIahDistDead: ViewContainerRef;
  @ViewChild('ctnIahDistGender', { read: ViewContainerRef }) ctnIahDistGender: ViewContainerRef;
  @ViewChild('ctnIahDistAge', { read: ViewContainerRef }) ctnIahDistAge: ViewContainerRef;

  // progression
  @ViewChild('ctnIahPro', { read: ViewContainerRef }) ctnIahPro: ViewContainerRef;


  // calendar
  @ViewChild('ctnIahCalendar', { read: ViewContainerRef }) ctnIahCalendar: ViewContainerRef;

  /////////////////////////////////

  // distribution
  @ViewChild('ctnEpworthDistLeft', { read: ViewContainerRef }) ctnEpworthDistLeft: ViewContainerRef;
  @ViewChild('ctnEpworthDistDead', { read: ViewContainerRef }) ctnEpworthDistDead: ViewContainerRef;
  @ViewChild('ctnEpworthDistGender', { read: ViewContainerRef }) ctnEpworthDistGender: ViewContainerRef;
  @ViewChild('ctnEpworthDistAge', { read: ViewContainerRef }) ctnEpworthDistAge: ViewContainerRef;

  // progression
  @ViewChild('ctnEpworthPro', { read: ViewContainerRef }) ctnEpworthPro: ViewContainerRef;

  // calendar
  @ViewChild('ctnEpworthCalendar', { read: ViewContainerRef }) ctnEpworthCalendar: ViewContainerRef;

  /////////////////////////////////

  // cohorts
  @ViewChild('ctnCohort', { read: ViewContainerRef }) ctnCohort: ViewContainerRef;

  constructor(
    private httpService: HttpClient,
    private dataService: DataService,
    private sharing: DataSharingService,

    private renderer2: Renderer2,
    private componentFactory: ComponentFactoryResolver,

    public snackBar: MatSnackBar,
    private formBuilder: FormBuilder,
  ) { }

  getCtn(ctn) {
    if (!this.ctn.has(ctn)) {
      this.ctn.set(ctn, []);
    }
    return this.ctn.get(ctn);
  }

  setCtn(ctn, any) {
    this.ctn.set(ctn, []);
  }

  getAgrrValue() {
    return 'value_t';
  }

  getCalendarAggr(ctn) {
    return this.options.get(ctn).value + '_t';
  }

  getCalenarAggrGaussian(ctn) {
    return this.options.get(ctn).value + '_g';
  }

  getFormatter(payload) {
    return this.payload_map[payload].formatter;
  }

  getViewValue(payload) {
    return this.payload_map[payload].viewValue;
  }

  updateCalendars() {
    // calendar
    this.updateCtnCalendar('ctnIahCalendar', this.ctnIahCalendar, '/const=marker.values.(0)', 'iah');
    this.updateCtnCalendar('ctnBmiCalendar', this.ctnBmiCalendar, '/const=marker.values.(1)', 'bmi');
    this.updateCtnCalendar('ctnEpworthCalendar', this.ctnEpworthCalendar, '/const=marker.values.(2)', 'epworth');
  }

  updateCohorts() {
    this.updateCtnCohort('ctnCohort', this.ctnCohort, 'query');
  }

  updateCtnCohort(ctn, ref, query) {
    let addToSql = (str, cons) => {
      if (str.length !== 0) {
        return str + ',' + cons;
      } else {
        return cons;
      }
    }

    // reset widgets
    let sql: [string] = [''];
    this.cohorts = [];

    let promises_qds = [];

    // get id_patient from QDS
    this.features.forEach((entry, index) => {
      sql[index] = '';
      promises_qds.push(new Promise((resolve, reject) => {
        this.dataService.query(entry.constraints + '/aggr=count/const=user_id.values.(all)/group=user_id').subscribe(response => {
          response[0].forEach(element => {
            sql[index] = addToSql(sql[index], element[0]);
          });

          if (sql[index].length !== 0) {
            sql[index] = 'id_patient in (' + sql[index] + ')';
          }

          resolve(true);
        });
      }));
    });

    // get id_patient from QDS
    Promise.all(promises_qds).then(() => {

      for (let i = 0; i < this.getCtn(ctn).length; ++i) {
        ref.remove(i);
      }

      // reset widgets
      this.setCtn(ctn, []);

      this.features.forEach((entry, index) => {
        const component = this.componentFactory.resolveComponentFactory(CohortPlotComponent);

        const componentRef = ref.createComponent(component);
        const componentInstance = <CohortPlotComponent>componentRef.instance;

        this.renderer2.addClass(componentRef.location.nativeElement, 'app-footer-item');

        // componentInstance.register(dim, this.callback);
        // componentInstance.setDataset('health');

        // componentInstance.setFormatter(d3.format('.2s'));

        // componentInstance.setYLabel('quantile');
        // componentInstance.setXLabel(dim);
        // componentInstance.setLabel('Cohort #' + index);

        let bin = btoa(pako.gzip(sql[index], { to: 'string' }));

        this.getCtn(ctn).push({ key: 'none', type: 'cohort', widget: componentInstance, 'bin': bin });

        // componentInstance.registerCtn(ctn, index, this.callbackCalendars);

        componentInstance.setNextTerm(bin);
      });
    });
  }

  updateDashboard() {
    this.updateInfo();
    this.updateCohorts();

    this.updateCtnValue('ctn2', '/aggr=count', d3.format(''));
    this.updateCtnValueFun('ctn3', '/aggr=count' + '/const=user_id.values.(all)/group=user_id', this.getUniqueUsers, d3.format(''));

    /////////////////////////////////////
    // BMI
    /////////////////////////////////////

    // distributions
    this.updateCtnGroupedBoxplots('ctnBmiDistLeft', this.ctnBmiDistLeft, 'has_left', '/aggr=quantile.' + this.getAgrrValue() + '.(0:0.25:0.5:0.75:1)/const=marker.values.(1)/const=has_left.values.(all)/group=has_left');
    this.updateCtnGroupedBoxplots('ctnBmiDistDead', this.ctnBmiDistDead, 'dead', '/aggr=quantile.' + this.getAgrrValue() + '.(0:0.25:0.5:0.75:1)/const=marker.values.(1)/const=dead.values.(all)/group=dead');
    this.updateCtnGroupedBoxplots('ctnBmiDistGender', this.ctnBmiDistGender, 'gender', '/aggr=quantile.' + this.getAgrrValue() + '.(0:0.25:0.5:0.75:1)/const=marker.values.(1)/const=gender.values.(all)/group=gender');
    this.updateCtnGroupedBoxplots('ctnBmiDistAge', this.ctnBmiDistAge, 'age',
      '/aggr=quantile.' + this.getAgrrValue() + '.(0:0.25:0.5:0.75:1)/const=marker.values.(1)/const=age.values.(all)/group=age');

    // progression
    this.updateCtnTemporalBands('ctnBmiPro', this.ctnBmiPro, 'event_date', '/aggr=quantile.' + this.getAgrrValue() + '.(0.25:0.5:0.75)/const=marker.values.(1)/const=has_left.values.(all)/group=event_date');

    /////////////////////////////////////
    // IAH
    /////////////////////////////////////

    // distributions
    this.updateCtnGroupedBoxplots('ctnIahDistLeft', this.ctnIahDistLeft, 'has_left', '/aggr=quantile.' + this.getAgrrValue() + '.(0:0.25:0.5:0.75:1)/const=marker.values.(0)/const=has_left.values.(all)/group=has_left');
    this.updateCtnGroupedBoxplots('ctnIahDistDead', this.ctnIahDistDead, 'dead', '/aggr=quantile.' + this.getAgrrValue() + '.(0:0.25:0.5:0.75:1)/const=marker.values.(0)/const=dead.values.(all)/group=dead');
    this.updateCtnGroupedBoxplots('ctnIahDistGender', this.ctnIahDistGender, 'gender', '/aggr=quantile.' + this.getAgrrValue() + '.(0:0.25:0.5:0.75:1)/const=marker.values.(0)/const=gender.values.(all)/group=gender');
    this.updateCtnGroupedBoxplots('ctnIahDistAge', this.ctnIahDistAge, 'age',
      '/aggr=quantile.' + this.getAgrrValue() + '.(0:0.25:0.5:0.75:1)/const=marker.values.(0)/const=age.values.(all)/group=age');

    // progression
    this.updateCtnTemporalBands('ctnIahPro', this.ctnIahPro, 'event_date', '/aggr=quantile.' + this.getAgrrValue() + '.(0.25:0.5:0.75)/const=marker.values.(0)/const=has_left.values.(all)/group=event_date');

    /////////////////////////////////////
    // Epworth
    /////////////////////////////////////

    // distributions
    this.updateCtnGroupedBoxplots('ctnEpworthDistLeft', this.ctnEpworthDistLeft, 'has_left', '/aggr=quantile.' + this.getAgrrValue() + '.(0:0.25:0.5:0.75:1)/const=marker.values.(2)/const=has_left.values.(all)/group=has_left');
    this.updateCtnGroupedBoxplots('ctnEpworthDistDead', this.ctnEpworthDistDead, 'dead', '/aggr=quantile.' + this.getAgrrValue() + '.(0:0.25:0.5:0.75:1)/const=marker.values.(2)/const=dead.values.(all)/group=dead');
    this.updateCtnGroupedBoxplots('ctnEpworthDistGender', this.ctnEpworthDistGender, 'gender', '/aggr=quantile.' + this.getAgrrValue() + '.(0:0.25:0.5:0.75:1)/const=marker.values.(2)/const=gender.values.(all)/group=gender');
    this.updateCtnGroupedBoxplots('ctnEpworthDistAge', this.ctnEpworthDistAge, 'age',
      '/aggr=quantile.' + this.getAgrrValue() + '.(0:0.25:0.5:0.75:1)/const=marker.values.(2)/const=age.values.(all)/group=age');

    // progression
    this.updateCtnTemporalBands('ctnEpworthPro', this.ctnEpworthPro, 'event_date', '/aggr=quantile.' + this.getAgrrValue() + '.(0.25:0.5:0.75)/const=marker.values.(2)/const=has_left.values.(all)/group=event_date');

    this.updateCalendars();
  }

  callback = () => { }

  getUniqueUsers = (data) => {
    return data[0].length;
  }

  replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
  }

  updateInfo() {
    // reset widgets
    this.setCtn('ctnInfo', []);
    this.setCtn('ctnConstraints', []);

    this.features.forEach((entry, index) => {
      let info = '';
      entry.feature.forEach(element => {
        info += '(' + element.properties.code + ') ' + element.properties.nom + ' ';
      });

      this.getCtn('ctnInfo')[index] = info;
      this.getCtn('ctnConstraints')[index] = this.replaceAll(entry.constraints, '/query/dataset=health-treatments', '');
    });
  }

  exportCohort(cohort) {
    // call Behrooz's code
    console.log(JSON.stringify(this.features[cohort]));

    this.snackBar.open('Cohort #' + cohort + ' Exported to Behrooz\'s Code.', 'Dismiss', {
      duration: 2000
    });
  }

  deleteCohort(cohort) {
    // reset widgets
    this.setCtn('ctnInfo', []);
    this.setCtn('ctnConstraints', []);

    this.features = this.features.filter((entry, index) => {
      return index !== cohort;
    });

    localStorage.setItem('features', JSON.stringify(this.features));

    this.updateDashboard();

    this.snackBar.open('Cohort #' + cohort + ' Deleted.', 'Dismiss', {
      duration: 2000
    });
  }

  getConstraints(index) {
    return this.features[index].constraints;
  }

  updateCtnValueFun(ctn, query, fun, formatter?) {
    if (!formatter) {
      formatter = d3.format('.2f');
    }

    // reset widgets
    this.setCtn(ctn, []);

    this.features.forEach((entry, index) => {
      this.dataService.query(this.getConstraints(index) + query).subscribe(result => {
        this.getCtn(ctn)[index] = formatter(fun(result));
      });
    });
  }

  updateCtnValue(ctn, query, formatter?) {
    if (!formatter) {
      formatter = d3.format('.2f');
    }

    // reset widgets
    this.setCtn(ctn, []);

    this.features.forEach((entry, index) => {
      this.dataService.query(this.getConstraints(index) + query).subscribe(result => {
        this.getCtn(ctn)[index] = formatter(result[0]);
      });
    });
  }

  updateCtnGroupedHistograms(ctn, ref, dim, query) {
    for (let i = 0; i < this.getCtn(ctn).length; ++i) {
      ref.remove(i);
    }

    // reset widgets
    this.setCtn(ctn, []);

    let data = [];
    let promises = [];

    this.features.forEach((entry, index) => {
      promises.push(
        new Promise((resolve, reject) => {
          this.dataService.query(this.getConstraints(index) + query).subscribe(response => {
            data[index] = response[0];
            resolve(true);
          });
        })
      );
    });

    Promise.all(promises).then(() => {
      const component = this.componentFactory.resolveComponentFactory(GroupedBarChartComponent);

      const componentRef = ref.createComponent(component);
      const componentInstance = <GroupedBarChartComponent>componentRef.instance;

      this.renderer2.addClass(componentRef.location.nativeElement, 'app-footer-item');

      componentInstance.register(dim, this.callback);
      componentInstance.setDataset('health');

      componentInstance.setFormatter(this.getFormatter('value'));
      componentInstance.setYLabel(this.getViewValue('value'));

      componentInstance.setXLabel('');

      componentInstance.setNextTerm(data);

      // componentInstance.register(dim, this.setCategoricalData);
      this.getCtn(ctn).push({ key: 'none', type: 'categorical', widget: componentInstance });
    });
  }

  updateCtnGroupedBoxplots(ctn, ref, dim, query) {
    for (let i = 0; i < this.getCtn(ctn).length; ++i) {
      ref.remove(i);
    }

    // reset widgets
    this.setCtn(ctn, []);

    let data = [];
    let promises = [];

    this.features.forEach((entry, index) => {
      promises.push(
        new Promise((resolve, reject) => {
          this.dataService.query(this.getConstraints(index) + query).subscribe(response => {
            data[index] = response[0];
            resolve(true);
          });
        })
      );
    });

    Promise.all(promises).then(() => {
      const component = this.componentFactory.resolveComponentFactory(GroupedBoxPlotComponent);

      const componentRef = ref.createComponent(component);
      const componentInstance = <GroupedBoxPlotComponent>componentRef.instance;

      this.renderer2.addClass(componentRef.location.nativeElement, 'app-footer-item');

      componentInstance.register(dim, this.callback);
      componentInstance.setDataset('health');

      componentInstance.setFormatter(this.getFormatter('value'));
      componentInstance.setYLabel(this.getViewValue('value'));

      componentInstance.setXLabel('');

      componentInstance.setNextTerm(data);

      // componentInstance.register(dim, this.setCategoricalData);
      this.getCtn(ctn).push({ key: 'none', type: 'boxplot', widget: componentInstance });
    });
  }

  updateCtnTemporalBands(ctn, ref, dim, query) {
    for (let i = 0; i < this.getCtn(ctn).length; ++i) {
      ref.remove(i);
    }

    // reset widgets
    this.setCtn(ctn, []);

    this.features.forEach((entry, index) => {
      const component = this.componentFactory.resolveComponentFactory(TemporalBandComponent);

      const componentRef = ref.createComponent(component);
      const componentInstance = <TemporalBandComponent>componentRef.instance;

      this.renderer2.addClass(componentRef.location.nativeElement, 'app-footer-item');

      // componentInstance.register(dim, this.callback);
      componentInstance.setDataset('health');

      componentInstance.setFormatter(this.getFormatter('value'));
      componentInstance.setYLabel(this.getViewValue('value'));

      componentInstance.setXLabel(dim);
      componentInstance.setNumCurves(3);
      componentInstance.setLabel('Cohort #' + index);

      componentInstance.setNextTerm(this.getConstraints(index) + query);

      this.getCtn(ctn).push({ key: 'none', type: 'boxplot', widget: componentInstance });
    });
  }

  callbackCalendars = (ctn, index, duration) => {
    this.durations.get(ctn)[index] = duration;
    this.refreshCalendar(ctn, index);
  }

  getAugmentedSeries(ctn, index) {
    if (!this.durations.has(ctn)) {
      // initialize duration ctn
      this.durations.set(ctn, []);
    }

    if (this.durations.get(ctn)[index] === undefined) {
      this.durations.get(ctn)[index] = this.default_duration;
    }

    let query = this.getCtn(ctn)[index].query;

    let currDuration = this.durations.get(ctn)[index];

    let initial = new Date('01/01/' + currDuration.currYear).valueOf() / 1000
    let intervals = 365;

    if (currDuration.currYear == 2017) {
      intervals = 202;
    }

    let compareFrom = new Date('01/01/' + currDuration.minValue).valueOf() / 1000;

    let compareTo = new Date('01/01/' + (currDuration.maxValue + 1)).valueOf() / 1000;

    let term = '/augmented_series' +
      '/series=event_date.(' + initial + ':86400:' + intervals + ':86400)' +
      '/pipeline/join=left_join/threshold=1' +
      '/source/aggr=average.' + this.getCalenarAggrGaussian(ctn) + '/dataset=health-durations' + this.getConstraints(index) + query +
      '/destination/aggr=inverse.' + this.getCalendarAggr(ctn) + '.($)/dataset=health-durations' + this.getConstraints(index) + query +
      '/const=event_date.interval.(' + compareFrom + ':' + compareTo + ')';

    return term;
  }

  refreshCalendarCtn(ctn) {
    for (let i = 0; i < this.getCtn(ctn).length; ++i) {
      let instance = <CalendarComponent>this.getCtn(ctn)[i].widget;
      instance.setNextTerm(this.getAugmentedSeries(ctn, i));
    }
  }

  refreshCalendar(ctn, index) {
    let instance = <CalendarComponent>this.getCtn(ctn)[index].widget;
    instance.setNextTerm(this.getAugmentedSeries(ctn, index));
  }

  updateCtnCalendar(ctn, ref, query, marker) {
    for (let i = 0; i < this.getCtn(ctn).length; ++i) {
      ref.remove(i);
    }

    // reset widgets
    this.setCtn(ctn, []);

    this.features.forEach((entry, index) => {
      const component = this.componentFactory.resolveComponentFactory(CalendarComponent);

      const componentRef = ref.createComponent(component);
      const componentInstance = <CalendarComponent>componentRef.instance;

      this.renderer2.addClass(componentRef.location.nativeElement, 'app-footer-item');

      // componentInstance.register(dim, this.callback);
      // componentInstance.setDataset('health');

      // componentInstance.setFormatter(d3.format('.2s'));

      // componentInstance.setYLabel('quantile');
      // componentInstance.setXLabel(dim);
      componentInstance.setLabel('Cohort #' + index);

      this.getCtn(ctn).push({ key: 'none', type: 'calendar', widget: componentInstance, 'query': query });

      componentInstance.registerCtn(ctn, index, this.callbackCalendars);
      componentInstance.setNextTerm(this.getAugmentedSeries(ctn, index));
    });
  }

  @HostListener('window:storage', ['$event'])
  onStorageChange(ev: StorageEvent) {
    if (ev.key === 'dim') {
      this.dim = JSON.parse(ev.newValue);
    } else if (ev.key === 'features') {
      this.features = JSON.parse(ev.newValue);
      this.updateDashboard();
    }
  }

  getData() {
    let storage_dim = localStorage.getItem('dim');
    let storage_features = localStorage.getItem('features');

    if (storage_dim) {
      this.dim = JSON.parse(storage_dim)
    } else {
      this.dim = '';
    }

    if (storage_features) {
      this.features = JSON.parse(storage_features);
    } else {
      this.features = [];
    }
  }

  ngOnInit() {
    this.options = this.formBuilder.group({
      ctnIahCalendar: new FormControl(this.default_pipeline_aggr),
      ctnBmiCalendar: new FormControl(this.default_pipeline_aggr),
      ctnEpworthCalendar: new FormControl(this.default_pipeline_aggr),
    });

    this.getData();
    this.updateDashboard();
  }
  ngAfterViewInit() {
    // this.updateDashboard();
  }
}