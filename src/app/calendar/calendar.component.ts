import { Component, ViewChild, OnInit, ElementRef, AfterViewInit, Input, ViewEncapsulation } from '@angular/core';

import * as d3 from 'd3';
import { Subject } from 'rxjs/Subject';
import { DataService } from '../services/data.service';

@Component({
  selector: 'app-calendar',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent  implements OnInit, AfterViewInit {
  private subject = new Subject<any>();

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.subject.subscribe(term => {
      this.dataService.query(term).subscribe(data => {
        this.loadWidget(data[0]);
      });
    });
  }

  setNextTerm(query: string) {
    this.subject.next(query);
  }

  private loadWidget(data) {


    const margin = { top: 20, right: 10, bottom: 30, left: 50 };
    const width = 1366 - margin.left - margin.right;
    const height = 150 - margin.top - margin.bottom;

    const x = d3.scaleUtc<number, number>()
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


    d3.select('#chart').selectAll('*').remove();


    const svg = d3.select('#chart')
      .append('div')
      .classed('svg-containerr', true)
      .append('svg')
      .attr('preserveAspectRatio', 'none')
      .attr('viewBox', '0 0 1366 150')
      .classed('svg-content-responsive', true)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // format the data
    data.forEach(function (d) {
      d[0] = new Date(d[0] * 1000);
    });

    // scale the range of the data
    // x.domain([curr_lower_bound, curr_upper_bound]);
    x.domain(d3.extent<number, number>(data, function (d) { return d[0]; }));
    y.domain([0, d3.max<number, number>(data, function (d) { return d[1]; })]);

    // add the area
    svg.append('path')
      .data([data])
      .attr('class', 'area')
      .attr('d', area)
      .attr('fill', 'lightsteelblue');

    // add the valueline path
    svg.append('path')
      .data([data])
      .attr('class', 'line')
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', '1.5px');

    // add the X axis
    const xAxis = d3.axisBottom(x);
    svg.append('g')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis);

    // add the Y axis
    const yAxis = d3.axisLeft(y);
    svg.append('g')
      .call(yAxis);
  }

  ngAfterViewInit() {
  }
}
