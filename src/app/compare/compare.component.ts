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

  constructor(
    private dataService: DataService,
    private sharing: DataSharingService,

    private renderer2: Renderer2,
    private componentFactory: ComponentFactoryResolver,
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

  updateDashboard() {
    this.updateInfo();

    this.updateCtnValue('ctn2', '/aggr=count', d3.format(''));
    this.updateCtnValueFun('ctn3', '/aggr=count' + '/const=user_id.values.(all)/group=user_id', this.getUniqueUsers, d3.format(''));

    // minimum
    this.updateCtnHistograms('ctnBmiMinLeft', this.ctnBmiMinLeft, 'has_left', '/aggr=quantile.value_t.(0)/const=marker.values.(1)/const=has_left.values.(all)/group=has_left');
    this.updateCtnHistograms('ctnBmiMinDead', this.ctnBmiMinDead, 'dead', '/aggr=quantile.value_t.(0)/const=marker.values.(1)/const=dead.values.(all)/group=dead');
    this.updateCtnHistograms('ctnBmiMinGender', this.ctnBmiMinGender, 'gender', '/aggr=quantile.value_t.(0)/const=marker.values.(1)/const=gender.values.(all)/group=gender');
    this.updateCtnHistograms('ctnBmiMinAge', this.ctnBmiMinAge, 'age', '/aggr=quantile.value_t.(0)/const=marker.values.(1)/const=age.values.(all)/group=age');

    // maximum
    this.updateCtnHistograms('ctnBmiMaxLeft', this.ctnBmiMaxLeft, 'has_left', '/aggr=quantile.value_t.(1)/const=marker.values.(1)/const=has_left.values.(all)/group=has_left');
    this.updateCtnHistograms('ctnBmiMaxDead', this.ctnBmiMaxDead, 'dead', '/aggr=quantile.value_t.(1)/const=marker.values.(1)/const=dead.values.(all)/group=dead');
    this.updateCtnHistograms('ctnBmiMaxGender', this.ctnBmiMaxGender, 'gender', '/aggr=quantile.value_t.(1)/const=marker.values.(1)/const=gender.values.(all)/group=gender');
    this.updateCtnHistograms('ctnBmiMaxAge', this.ctnBmiMaxAge, 'age',
      '/aggr=quantile.value_t.(1)/const=marker.values.(1)/const=age.values.(all)/group=age');

    // distributions
    this.updateCtnBoxplots('ctnBmiDistLeft', this.ctnBmiDistLeft, 'has_left', '/aggr=quantile.value_t.(0:0.25:0.5:0.75:1)/const=marker.values.(1)/const=has_left.values.(all)/group=has_left');
    this.updateCtnBoxplots('ctnBmiDistDead', this.ctnBmiDistDead, 'dead', '/aggr=quantile.value_t.(0:0.25:0.5:0.75:1)/const=marker.values.(1)/const=dead.values.(all)/group=dead');
    this.updateCtnBoxplots('ctnBmiDistGender', this.ctnBmiDistGender, 'gender', '/aggr=quantile.value_t.(0:0.25:0.5:0.75:1)/const=marker.values.(1)/const=gender.values.(all)/group=gender');
    this.updateCtnBoxplots('ctnBmiDistAge', this.ctnBmiDistAge, 'age',
      '/aggr=quantile.value_t.(0:0.25:0.5:0.75:1)/const=marker.values.(1)/const=age.values.(all)/group=age');
  }

  callback = () => { }

  getUniqueUsers = (data) => {
    return data[0].length;
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
      this.getCtn('ctnConstraints')[index] = entry.constraints;
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
    }

    if (storage_features) {
      this.features = JSON.parse(storage_features);
    }
  }

  ngOnInit() {
    this.getData();
    this.updateDashboard();
  }
}
