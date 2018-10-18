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

  range = 'normal';

  range_map = {
    'normal': ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837'].reverse(),

    'outlier': ['rgb(215,25,28)', 'rgb(253,174,97)', 'rgb(255,255,191)'].reverse()
  }

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

  setColorRange(range) {
    this.range = range;
  }

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

    let yDomain = d3.extent<number, number>(this.data, (d) => d[1]);
    yDomain[1] += (Math.abs(yDomain[1] - Math.abs(yDomain[0])) * 0.10);
    yDomain[0] -= (Math.abs(yDomain[1] - Math.abs(yDomain[0])) * 0.10);

    x.domain(d3.extent<number, number>(this.data, (d) => d[0]));
    y.domain(yDomain);

    let colorScale;
    if (self.range == 'outlier') {
      colorScale = d3.scaleThreshold<number, string>()
        .domain([0.5, 0.9, 1])
        .range(this.range_map.outlier);
    } else {
      colorScale = d3.scaleQuantize<string>()
        .domain(d3.extent<number, number>(this.data, (d) => d[1]))
        .range(this.range_map.normal);
    }

    let colorData = [];
    if (self.range == 'outlier') {
      colorData.push({ offset: "0%", color: d3.rgb(colorScale(0)).toString() });
      colorData.push({ offset: "40%", color: d3.rgb(colorScale(0.5)).toString() });
      colorData.push({ offset: "60%", color: d3.rgb(colorScale(0.9)).toString() });
      colorData.push({ offset: "100%", color: d3.rgb(colorScale(1.0)).toString() });
    } else {
      let stride_offset = 100 / this.range_map.normal.length;
      let stride_color = (yDomain[1] - yDomain[0]) / this.range_map.normal.length;

      let curr_offset = 0;
      let curr_color = yDomain[0];

      for (let i = 0; i < this.range_map.normal.length; ++i) {
        colorData.push({ offset: curr_offset + '%', color: d3.rgb(colorScale(curr_color)).toString() });
        curr_offset += stride_offset;
        curr_color += stride_color;
      }

      // 100%
      colorData.push({ offset: '100%', color: d3.rgb(colorScale(yDomain[1])).toString() });
    }

    // set the gradient
    svg.append("linearGradient")
      .attr("id", "line-gradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", y(yDomain[0]))
      .attr("x2", 0).attr("y2", y(yDomain[1]))
      .selectAll("stop")
      .data(colorData)
      .enter().append("stop")
      .attr("offset", (d) => {
        return d.offset;
      })
      .attr("stop-color", (d) => {
        return d.color;
      });

      // add the valueline path
    svg.append('path')
      .data([this.data])
      .attr('class', 'line')
      .attr('d', line)
      .attr('stroke-width', '1.0px');

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
