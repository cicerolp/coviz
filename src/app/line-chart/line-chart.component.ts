import { Component, ViewChild, OnInit, ElementRef, AfterViewInit, Input, ViewEncapsulation, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, FormControl } from '@angular/forms';

import { Widget } from '../widget';

import * as d3 from 'd3';
import * as moment from 'moment';

import { Subject } from 'rxjs/Subject';
import { DataService } from '../services/data.service';
import { SchemaService } from '../services/schema.service';
import { ConfigurationService } from '../services/configuration.service';
import { ActivatedRoute } from '@angular/router';
import { TimezoneService } from '../services/timezone.service';

@Component({
  selector: 'app-line-chart',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.css']
})
export class LineChartComponent implements Widget, OnInit, AfterViewInit, OnDestroy {
  uniqueId = 'id-' + Math.random().toString(36).substr(2, 16);

  dataset: any;
  data = [];
  dim = '';
  subject = new Subject<any>();
  callbacks: any[] = [];

  xLabel = '';
  yLabel = '';
  yFormat = d3.format('.2s');

  options: FormGroup;

  constructor(
    fb: FormBuilder,
    private timezoneService: TimezoneService,
    private dataService: DataService,
    private configService: ConfigurationService,
    private schemaService: SchemaService,
    private activatedRoute: ActivatedRoute) {
    this.activatedRoute.params.subscribe(params => {
      const param = params['dataset'];
      if (param !== undefined) {
        this.dataset = this.schemaService.get(param);
      } else {
        this.dataset = this.schemaService.get(this.configService.defaultDataset);
      }
    });

    this.options = fb.group({
      fromDateTime: new FormControl(Date.now()),
      toDateTime: new FormControl(Date.now())
    });

    this.subject.subscribe(term => {
      this.dataService.query(term).subscribe(data => {
        this.data = data[0];

        let initialDate: Date;
        let finalDate: Date;

        if (data[0].length) {
          initialDate = this.timezoneService.getDateFromSeconds(data[0][0][0]);
          finalDate = this.timezoneService.getDateFromSeconds(data[0][data[0].length - 1][0]);
        } else {
          initialDate = new Date();
          finalDate = new Date();
        }

        // setup data
        this.options.patchValue({
          fromDateTime: initialDate,
          toDateTime: finalDate,
        });

        if (data[0].length) {
          // this.data = this.completeCurve(this.data, initialDate, finalDate, this.dataset.timeStep);
          // format the data
          this.data.forEach((d) => {
            d[0] = this.timezoneService.getDateFromSeconds(d[0]);
          });
        }

        this.loadWidget();
      });
    });
  }

  ngOnInit() { }

  setXLabel(value: string) {
    this.xLabel = value;
  }

  setYLabel(value: string) {
    this.yLabel = value;
  }

  setFormatter(formatter: any) {
    this.yFormat = formatter;
  }

  completeCurve(curve, defaultMinTime, defaultMaxTime, step) {
    if (curve.length === 0) {
      const newCurve = [];
      for (let i = defaultMinTime; i <= defaultMaxTime; i += step) {
        newCurve.push([i, 0]);
      }
      return newCurve;
    } else if (curve.length === 1) {
      const newCurve = [];
      const onlyTime = curve[0][0];
      for (let t = defaultMinTime; t <= defaultMaxTime; t += step) {
        let value = 0;
        if (t === onlyTime) {
          value = curve[0][1];
        }

        newCurve.push([t, value]);
      }
      return newCurve;
    } else {
      const newCurve = [];
      let auxIndex = 0;
      for (let t = curve[0][0]; t <= curve[curve.length - 1][0]; t += step) {
        let value = 0;
        if (t === curve[auxIndex][0]) {
          value = curve[auxIndex][1];
          auxIndex += 1;
        }
        newCurve.push([t, value]);
      }
      return newCurve;
    }
  }

  setDataset(dataset: string) {
    this.dataset = this.schemaService.get(dataset);
  }

  setNextTerm(query: string) {
    this.subject.next(query);
  }

  register(dim: string, callback: any): void {
    this.callbacks.push({ dim, callback });
  }

  unregister(callback: any): void {
    this.callbacks = this.callbacks.filter(el => el.callback !== callback);
  }

  broadcast(): void {
    const interval = [
      this.timezoneService.getFormatedDate(this.options.get('fromDateTime').value),
      this.timezoneService.getFormatedDate(this.options.get('toDateTime').value)
    ];
    for (const pair of this.callbacks) {
      pair.callback(pair.dim, interval);
    }
  }

  loadWidget = () => {
    const self = this;
    let container = (d3.select('#' + this.uniqueId).node() as any);

    if (container === undefined || container.parentNode === undefined) {
      return;
    }

    container = container.parentNode.getBoundingClientRect();

    const margin = { top: 5, right: 5, bottom: 68, left: 55 };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    const x = d3.scaleTime<number, number>()
      .range([0, width]);

    const y = d3.scaleLinear<number, number>()
      .range([height, 0]);

    // define area
    const area = d3.area()
      .x(function (d) { return x(d[0]); })
      .y0(height)
      .y1(function (d) { return y(d[1]); });

    // define line
    const line = d3.line()
      .x(function (d) { return x(d[0]); })
      .y(function (d) { return y(d[1]); });


    d3.select('#' + this.uniqueId).selectAll('*').remove();

    const svg = d3.select('#' + this.uniqueId)
      .append('svg')
      .attr('viewBox', '0 0 ' + container.width + ' ' + container.height)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // scale the range of the data
    // x.domain([curr_lower_bound, curr_upper_bound]);
    x.domain(d3.extent<number, number>(this.data, (d) => d[0]));
    y.domain(d3.extent<number, number>(this.data, (d) => d[1]));

    // add the area
    svg.append('path')
      .data([this.data])
      .attr('class', 'area')
      .attr('d', area)
      .attr('fill', 'lightsteelblue');

    // var color = "steelblue";
    var lineScale = d3.scaleQuantize<string>()
      .domain([0, this.dataset.aliases[this.dim].length])
      //.range([d3.rgb(color).brighter().toString(), d3.rgb(color).darker().toString()]);
      .range(['rgb(166,206,227)', 'rgb(31,120,180)', 'rgb(178,223,138)', 'rgb(51,160,44)', 'rgb(251,154,153)', 'rgb(227,26,28)', 'rgb(253,191,111)', 'rgb(255,127,0)', 'rgb(202,178,214)', 'rgb(106,61,154)', 'rgb(255,255,153)', 'rgb(177,89,40)']);

    // add the valueline path
    svg.append('path')
      .data([this.data])
      .attr('class', 'line')
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', function (d) {
        return lineScale(d[1]);
      })
      .attr('stroke-width', '1.5px');

    // add the X axis
    const xAxis = d3.axisBottom(x);
    svg.append('g')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis);

    // add the Y axis
    const yAxis = d3.axisLeft(y)
      .tickFormat(self.yFormat)
      .ticks(5);
    svg.append('g')
      .call(yAxis);

    // labels
    svg.append('text').attr('id', 'labelXAxis');
    svg.append('text').attr('id', 'labelYAxis');

    // text label for the x axis
    xAxis(svg.select('.xAxis'));
    svg.select('#labelXAxis')
      .attr('x', (width / 2.0))
      .attr('y', height + margin.bottom - 39)
      .style('text-anchor', 'middle')
      .text(this.xLabel);

    // text label for the y axis
    yAxis(svg.select('.yAxis'));
    svg.select('#labelYAxis')
      .attr('transform', 'rotate(-90)')
      .attr('y', - (margin.left))
      .attr('x', - (height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text(this.yLabel);
  }

  ngAfterViewInit() {
    window.addEventListener('resize', this.loadWidget);
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.loadWidget);
  }
}
