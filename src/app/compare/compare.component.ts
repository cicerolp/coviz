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

import * as d3 from 'd3';

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
    minValue: 1989, maxValue: 2017, currYear: 2017
  }

  durations = new Map<string, any[]>();

  ctn = new Map<string, any[]>();
  // minimum
  @ViewChild('ctnBmiMinLeft', { read: ViewContainerRef }) ctnBmiMinLeft: ViewContainerRef;
  @ViewChild('ctnBmiMinDead', { read: ViewContainerRef }) ctnBmiMinDead: ViewContainerRef;
  @ViewChild('ctnBmiMinGender', { read: ViewContainerRef }) ctnBmiMinGender: ViewContainerRef;
  @ViewChild('ctnBmiMinAge', { read: ViewContainerRef }) ctnBmiMinAge: ViewContainerRef;

  // maximum
  @ViewChild('ctnBmiMaxLeft', { read: ViewContainerRef }) ctnBmiMaxLeft: ViewContainerRef;
  @ViewChild('ctnBmiMaxDead', { read: ViewContainerRef }) ctnBmiMaxDead: ViewContainerRef;
  @ViewChild('ctnBmiMaxGender', { read: ViewContainerRef }) ctnBmiMaxGender: ViewContainerRef;
  @ViewChild('ctnBmiMaxAge', { read: ViewContainerRef }) ctnBmiMaxAge: ViewContainerRef;

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


  // minimum
  @ViewChild('ctnIahMinLeft', { read: ViewContainerRef }) ctnIahMinLeft: ViewContainerRef;
  @ViewChild('ctnIahMinDead', { read: ViewContainerRef }) ctnIahMinDead: ViewContainerRef;
  @ViewChild('ctnIahMinGender', { read: ViewContainerRef }) ctnIahMinGender: ViewContainerRef;
  @ViewChild('ctnIahMinAge', { read: ViewContainerRef }) ctnIahMinAge: ViewContainerRef;

  // maximum
  @ViewChild('ctnIahMaxLeft', { read: ViewContainerRef }) ctnIahMaxLeft: ViewContainerRef;
  @ViewChild('ctnIahMaxDead', { read: ViewContainerRef }) ctnIahMaxDead: ViewContainerRef;
  @ViewChild('ctnIahMaxGender', { read: ViewContainerRef }) ctnIahMaxGender: ViewContainerRef;
  @ViewChild('ctnIahMaxAge', { read: ViewContainerRef }) ctnIahMaxAge: ViewContainerRef;

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


  // minimum
  @ViewChild('ctnEpworthMinLeft', { read: ViewContainerRef }) ctnEpworthMinLeft: ViewContainerRef;
  @ViewChild('ctnEpworthMinDead', { read: ViewContainerRef }) ctnEpworthMinDead: ViewContainerRef;
  @ViewChild('ctnEpworthMinGender', { read: ViewContainerRef }) ctnEpworthMinGender: ViewContainerRef;
  @ViewChild('ctnEpworthMinAge', { read: ViewContainerRef }) ctnEpworthMinAge: ViewContainerRef;

  // maximum
  @ViewChild('ctnEpworthMaxLeft', { read: ViewContainerRef }) ctnEpworthMaxLeft: ViewContainerRef;
  @ViewChild('ctnEpworthMaxDead', { read: ViewContainerRef }) ctnEpworthMaxDead: ViewContainerRef;
  @ViewChild('ctnEpworthMaxGender', { read: ViewContainerRef }) ctnEpworthMaxGender: ViewContainerRef;
  @ViewChild('ctnEpworthMaxAge', { read: ViewContainerRef }) ctnEpworthMaxAge: ViewContainerRef;

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

  constructor(
    private dataService: DataService,
    private sharing: DataSharingService,

    private renderer2: Renderer2,
    private componentFactory: ComponentFactoryResolver,

    public snackBar: MatSnackBar
  ) { }

  ngAfterViewInit() {
  }

  getCtn(ctn) {
    if (!this.ctn.has(ctn)) {
      this.ctn.set(ctn, []);
    }
    return this.ctn.get(ctn);
  }

  setCtn(ctn, any) {
    this.ctn.set(ctn, []);
  }

  updateCalendars() {
    // calendar
    this.updateCtnCalendar('ctnBmiCalendar', this.ctnBmiCalendar, '/const=marker.values.(0)/group=marker', 'iah');
    this.updateCtnCalendar('ctnIahCalendar', this.ctnIahCalendar, '/const=marker.values.(1)/group=marker', 'bmi');
    this.updateCtnCalendar('ctnEpworthCalendar', this.ctnEpworthCalendar, '/const=marker.values.(2)/group=marker', 'epworth');
  }

  updateDashboard() {
    this.updateInfo();

    this.updateCtnValue('ctn2', '/aggr=count', d3.format(''));
    this.updateCtnValueFun('ctn3', '/aggr=count' + '/const=user_id.values.(all)/group=user_id', this.getUniqueUsers, d3.format(''));

    /////////////////////////////////////
    // BMI
    /////////////////////////////////////

    // minimum
    this.updateCtnGroupedHistograms('ctnBmiMinLeft', this.ctnBmiMinLeft, 'has_left', '/aggr=quantile.value_t.(0)/const=marker.values.(1)/const=dead.values.(all)/group=has_left');
    this.updateCtnGroupedHistograms('ctnBmiMinDead', this.ctnBmiMinDead, 'dead', '/aggr=quantile.value_t.(0)/const=marker.values.(1)/const=dead.values.(all)/group=dead');
    this.updateCtnGroupedHistograms('ctnBmiMinGender', this.ctnBmiMinGender, 'gender', '/aggr=quantile.value_t.(0)/const=marker.values.(1)/const=gender.values.(all)/group=gender');
    this.updateCtnGroupedHistograms('ctnBmiMinAge', this.ctnBmiMinAge, 'age', '/aggr=quantile.value_t.(0)/const=marker.values.(1)/const=age.values.(all)/group=age');

    // maximum
    this.updateCtnGroupedHistograms('ctnBmiMaxLeft', this.ctnBmiMaxLeft, 'has_left', '/aggr=quantile.value_t.(1)/const=marker.values.(1)/const=has_left.values.(all)/group=has_left');
    this.updateCtnGroupedHistograms('ctnBmiMaxDead', this.ctnBmiMaxDead, 'dead', '/aggr=quantile.value_t.(1)/const=marker.values.(1)/const=dead.values.(all)/group=dead');
    this.updateCtnGroupedHistograms('ctnBmiMaxGender', this.ctnBmiMaxGender, 'gender', '/aggr=quantile.value_t.(1)/const=marker.values.(1)/const=gender.values.(all)/group=gender');
    this.updateCtnGroupedHistograms('ctnBmiMaxAge', this.ctnBmiMaxAge, 'age',
      '/aggr=quantile.value_t.(1)/const=marker.values.(1)/const=age.values.(all)/group=age');

    // distributions
    this.updateCtnGroupedBoxplots('ctnBmiDistLeft', this.ctnBmiDistLeft, 'has_left', '/aggr=quantile.value_t.(0:0.25:0.5:0.75:1)/const=marker.values.(1)/const=has_left.values.(all)/group=has_left');
    this.updateCtnGroupedBoxplots('ctnBmiDistDead', this.ctnBmiDistDead, 'dead', '/aggr=quantile.value_t.(0:0.25:0.5:0.75:1)/const=marker.values.(1)/const=dead.values.(all)/group=dead');
    this.updateCtnGroupedBoxplots('ctnBmiDistGender', this.ctnBmiDistGender, 'gender', '/aggr=quantile.value_t.(0:0.25:0.5:0.75:1)/const=marker.values.(1)/const=gender.values.(all)/group=gender');
    this.updateCtnGroupedBoxplots('ctnBmiDistAge', this.ctnBmiDistAge, 'age',
      '/aggr=quantile.value_t.(0:0.25:0.5:0.75:1)/const=marker.values.(1)/const=age.values.(all)/group=age');

    // progression
    this.updateCtnTemporalBands('ctnBmiPro', this.ctnBmiPro, 'event_date', '/aggr=quantile.value_t.(0.25:0.5:0.75)/const=marker.values.(1)/const=has_left.values.(all)/group=event_date');

    /////////////////////////////////////
    // IAH
    /////////////////////////////////////

    // minimum
    this.updateCtnGroupedHistograms('ctnIahMinLeft', this.ctnIahMinLeft, 'has_left', '/aggr=quantile.value_t.(0)/const=marker.values.(0)/const=has_left.values.(all)/group=has_left');
    this.updateCtnGroupedHistograms('ctnIahMinDead', this.ctnIahMinDead, 'dead', '/aggr=quantile.value_t.(0)/const=marker.values.(0)/const=dead.values.(all)/group=dead');
    this.updateCtnGroupedHistograms('ctnIahMinGender', this.ctnIahMinGender, 'gender', '/aggr=quantile.value_t.(0)/const=marker.values.(0)/const=gender.values.(all)/group=gender');
    this.updateCtnGroupedHistograms('ctnIahMinAge', this.ctnIahMinAge, 'age', '/aggr=quantile.value_t.(0)/const=marker.values.(0)/const=age.values.(all)/group=age');

    // maximum
    this.updateCtnGroupedHistograms('ctnIahMaxLeft', this.ctnIahMaxLeft, 'has_left', '/aggr=quantile.value_t.(1)/const=marker.values.(0)/const=has_left.values.(all)/group=has_left');
    this.updateCtnGroupedHistograms('ctnIahMaxDead', this.ctnIahMaxDead, 'dead', '/aggr=quantile.value_t.(1)/const=marker.values.(0)/const=dead.values.(all)/group=dead');
    this.updateCtnGroupedHistograms('ctnIahMaxGender', this.ctnIahMaxGender, 'gender', '/aggr=quantile.value_t.(1)/const=marker.values.(0)/const=gender.values.(all)/group=gender');
    this.updateCtnGroupedHistograms('ctnIahMaxAge', this.ctnIahMaxAge, 'age',
      '/aggr=quantile.value_t.(1)/const=marker.values.(0)/const=age.values.(all)/group=age');

    // distributions
    this.updateCtnGroupedBoxplots('ctnIahDistLeft', this.ctnIahDistLeft, 'has_left', '/aggr=quantile.value_t.(0:0.25:0.5:0.75:1)/const=marker.values.(0)/const=has_left.values.(all)/group=has_left');
    this.updateCtnGroupedBoxplots('ctnIahDistDead', this.ctnIahDistDead, 'dead', '/aggr=quantile.value_t.(0:0.25:0.5:0.75:1)/const=marker.values.(0)/const=dead.values.(all)/group=dead');
    this.updateCtnGroupedBoxplots('ctnIahDistGender', this.ctnIahDistGender, 'gender', '/aggr=quantile.value_t.(0:0.25:0.5:0.75:1)/const=marker.values.(0)/const=gender.values.(all)/group=gender');
    this.updateCtnGroupedBoxplots('ctnIahDistAge', this.ctnIahDistAge, 'age',
      '/aggr=quantile.value_t.(0:0.25:0.5:0.75:1)/const=marker.values.(0)/const=age.values.(all)/group=age');

    // progression
    this.updateCtnTemporalBands('ctnIahPro', this.ctnIahPro, 'event_date', '/aggr=quantile.value_t.(0.25:0.5:0.75)/const=marker.values.(0)/const=has_left.values.(all)/group=event_date');

    /////////////////////////////////////
    // Epworth
    /////////////////////////////////////

    // minimum
    this.updateCtnGroupedHistograms('ctnEpworthMinLeft', this.ctnEpworthMinLeft, 'has_left', '/aggr=quantile.value_t.(0)/const=marker.values.(2)/const=has_left.values.(all)/group=has_left');
    this.updateCtnGroupedHistograms('ctnEpworthMinDead', this.ctnEpworthMinDead, 'dead', '/aggr=quantile.value_t.(0)/const=marker.values.(2)/const=dead.values.(all)/group=dead');
    this.updateCtnGroupedHistograms('ctnEpworthMinGender', this.ctnEpworthMinGender, 'gender', '/aggr=quantile.value_t.(0)/const=marker.values.(2)/const=gender.values.(all)/group=gender');
    this.updateCtnGroupedHistograms('ctnEpworthMinAge', this.ctnEpworthMinAge, 'age', '/aggr=quantile.value_t.(0)/const=marker.values.(2)/const=age.values.(all)/group=age');

    // maximum
    this.updateCtnGroupedHistograms('ctnEpworthMaxLeft', this.ctnEpworthMaxLeft, 'has_left', '/aggr=quantile.value_t.(1)/const=marker.values.(2)/const=has_left.values.(all)/group=has_left');
    this.updateCtnGroupedHistograms('ctnEpworthMaxDead', this.ctnEpworthMaxDead, 'dead', '/aggr=quantile.value_t.(1)/const=marker.values.(2)/const=dead.values.(all)/group=dead');
    this.updateCtnGroupedHistograms('ctnEpworthMaxGender', this.ctnEpworthMaxGender, 'gender', '/aggr=quantile.value_t.(1)/const=marker.values.(2)/const=gender.values.(all)/group=gender');
    this.updateCtnGroupedHistograms('ctnEpworthMaxAge', this.ctnEpworthMaxAge, 'age',
      '/aggr=quantile.value_t.(1)/const=marker.values.(2)/const=age.values.(all)/group=age');

    // distributions
    this.updateCtnGroupedBoxplots('ctnEpworthDistLeft', this.ctnEpworthDistLeft, 'has_left', '/aggr=quantile.value_t.(0:0.25:0.5:0.75:1)/const=marker.values.(2)/const=has_left.values.(all)/group=has_left');
    this.updateCtnGroupedBoxplots('ctnEpworthDistDead', this.ctnEpworthDistDead, 'dead', '/aggr=quantile.value_t.(0:0.25:0.5:0.75:1)/const=marker.values.(2)/const=dead.values.(all)/group=dead');
    this.updateCtnGroupedBoxplots('ctnEpworthDistGender', this.ctnEpworthDistGender, 'gender', '/aggr=quantile.value_t.(0:0.25:0.5:0.75:1)/const=marker.values.(2)/const=gender.values.(all)/group=gender');
    this.updateCtnGroupedBoxplots('ctnEpworthDistAge', this.ctnEpworthDistAge, 'age',
      '/aggr=quantile.value_t.(0:0.25:0.5:0.75:1)/const=marker.values.(2)/const=age.values.(all)/group=age');

    // progression
    this.updateCtnTemporalBands('ctnEpworthPro', this.ctnEpworthPro, 'event_date', '/aggr=quantile.value_t.(0.25:0.5:0.75)/const=marker.values.(2)/const=has_left.values.(all)/group=event_date');

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

  updateCtnHistograms(ctn, ref, dim, query) {
    for (let i = 0; i < this.getCtn(ctn).length; ++i) {
      ref.remove(i);
    }

    // reset widgets
    this.setCtn(ctn, []);

    this.features.forEach((entry, index) => {
      const component = this.componentFactory.resolveComponentFactory(BarChartComponent);

      const componentRef = ref.createComponent(component);
      const componentInstance = <BarChartComponent>componentRef.instance;

      this.renderer2.addClass(componentRef.location.nativeElement, 'app-footer-item');

      componentInstance.register(dim, this.callback);
      componentInstance.setDataset('health');

      componentInstance.setFormatter(d3.format('.2s'));

      componentInstance.setYLabel('value');
      componentInstance.setXLabel('');

      componentInstance.setNextTerm(this.getConstraints(index) + query);

      // componentInstance.register(dim, this.setCategoricalData);
      this.getCtn(ctn).push({ key: 'none', type: 'categorical', widget: componentInstance });
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

      componentInstance.setFormatter(d3.format('.2s'));

      componentInstance.setYLabel('value');
      componentInstance.setXLabel('');

      componentInstance.setNextTerm(data);

      // componentInstance.register(dim, this.setCategoricalData);
      this.getCtn(ctn).push({ key: 'none', type: 'categorical', widget: componentInstance });
    });
  }

  setBoxplotLine = (dim: string, constraints, value, self) => {
    let query = constraints +
      '/aggr=inverse.value_t.(' + value + ')' +
      '/const=' + dim + '.values.(all)' +
      '/group=' + dim;

    this.dataService.query(query).subscribe(data => {
      const extents = d3.extent(data[0], d => d[1] * 100);
      const scale = d3.scaleLinear<string, string>().
        // interpolate(d3.interpoateRgb).
        domain(extents as [number, number]).
        range(['rgb(240,240,240)', 'rgb(2,56,88)']);

      const colors = (<any[]>data[0]).map(d => scale(d[1] * 100));

      self.setColors(colors, scale);
    });
  }

  updateCtnBoxplots(ctn, ref, dim, query) {
    for (let i = 0; i < this.getCtn(ctn).length; ++i) {
      ref.remove(i);
    }

    // reset widgets
    this.setCtn(ctn, []);

    this.features.forEach((entry, index) => {
      const component = this.componentFactory.resolveComponentFactory(BoxPlotComponent);

      const componentRef = ref.createComponent(component);
      const componentInstance = <BoxPlotComponent>componentRef.instance;

      this.renderer2.addClass(componentRef.location.nativeElement, 'app-footer-item');

      // componentInstance.register(dim, this.callback);
      componentInstance.setDataset('health');

      // componentInstance.setFormatter(d3.format('.2s'));

      componentInstance.setYLabel('value');
      componentInstance.setXLabel('');

      componentInstance.setNextTerm(this.getConstraints(index) + query);

      componentInstance.registerConstraints(dim, this.getConstraints(index), this.setBoxplotLine);
      this.getCtn(ctn).push({ key: 'none', type: 'boxplot', widget: componentInstance });
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

      componentInstance.setFormatter(d3.format('.2s'));

      componentInstance.setYLabel('value');
      componentInstance.setXLabel('');

      componentInstance.setNextTerm(data);

      // componentInstance.register(dim, this.setCategoricalData);
      this.getCtn(ctn).push({ key: 'none', type: 'boxplot', widget: componentInstance });
    });


    /* for (let i = 0; i < this.getCtn(ctn).length; ++i) {
      ref.remove(i);
    }

    // reset widgets
    this.setCtn(ctn, []);

    this.features.forEach((entry, index) => {
      const component = this.componentFactory.resolveComponentFactory(BoxPlotComponent);

      const componentRef = ref.createComponent(component);
      const componentInstance = <BoxPlotComponent>componentRef.instance;

      this.renderer2.addClass(componentRef.location.nativeElement, 'app-footer-item');

      // componentInstance.register(dim, this.callback);
      componentInstance.setDataset('health');

      // componentInstance.setFormatter(d3.format('.2s'));

      componentInstance.setYLabel('value');
      componentInstance.setXLabel('');

      componentInstance.setNextTerm(this.getConstraints(index) + query);

      componentInstance.registerConstraints(dim, this.getConstraints(index), this.setBoxplotLine);
      this.getCtn(ctn).push({ key: 'none', type: 'boxplot', widget: componentInstance });
    }); */
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

      // componentInstance.setFormatter(d3.format('.2s'));

      componentInstance.setYLabel('quantile');
      componentInstance.setXLabel(dim);
      componentInstance.setNumCurves(3);
      componentInstance.setLabel('Cohort #' + index);

      componentInstance.setNextTerm(this.getConstraints(index) + query);

      // componentInstance.registerConstraints(dim, this.getConstraints(index), this.setBoxplotLine);

      this.getCtn(ctn).push({ key: 'none', type: 'boxplot', widget: componentInstance });
    });
  }


  // this.updateCtnCalendar('ctnBmiCalendar', this.ctnBmiCalendar, '/const=marker.values.(1)/group=marker');

  callbackCalendars = (ctn, index, duration) => {
    this.durations.get(ctn)[index] = duration;
    this.refresCalendar(ctn, index);
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

    let initial = new Date('1/1/' + currDuration.currYear).valueOf() / 1000

    let compareFrom = new Date('1/1/' + currDuration.minValue).valueOf() / 1000;

    let compareTo = new Date('1/1/' + (currDuration.maxValue + 1)).valueOf() / 1000;

    let term = '/augmented_series' +
      '/series=event_date.(' + initial + ':86400:365:86400)' +
      '/pipeline/join=right_join/threshold=0' +
      '/source/aggr=average.value_g/dataset=health-durations' + this.getConstraints(index) + query +
      '/destination/aggr=inverse.value_t.($)/dataset=health-durations' + this.getConstraints(index) + query +
      '/const=event_date.interval.(' + compareFrom + ':' + compareTo + ')';

    return term;
  }

  refresCalendar(ctn, index) {
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
    this.getData();
    this.updateDashboard();
  }
}
