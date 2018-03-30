import { Component, ViewChild, OnInit, ElementRef, AfterViewInit, Input, ViewEncapsulation, OnDestroy } from '@angular/core';

import { Widget } from '../widget';

import * as d3 from 'd3';
import { Subject } from 'rxjs/Subject';
import { DataService } from '../services/data.service';
import { ConfigurationService } from '../services/configuration.service';
import { SchemaService } from '../services/schema.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-bar-chart',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.scss']
})
export class BarChartComponent implements Widget, OnInit, AfterViewInit, OnDestroy {
  uniqueId = 'id-' + Math.random().toString(36).substr(2, 16);

  dataset: any;
  data = [];
  dim = '';
  subject = new Subject<any>();
  callbacks: any[] = [];
  selectedElts = new Array<string>();

  constructor(private dataService: DataService,
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

    this.subject.subscribe(term => {
      this.dataService.query(term).subscribe(data => {
        this.data = data[0];
        this.loadWidget();
      });
    });
  }

  ngOnInit() { }

  setDataset(dataset: string) {
    this.dataset = this.schemaService.get(dataset);
  }

  setNextTerm(query: string) {
    this.subject.next(query);
  }

  register(dim: string, callback: any): void {
    this.dim = dim;
    this.callbacks.push({ dim, callback });
  }

  unregister(callback: any): void {
    this.callbacks = this.callbacks.filter(el => el.callback !== callback);
  }

  broadcast(): void {
    for (const pair of this.callbacks) {
      pair.callback(pair.dim, this.selectedElts);
    }
  }

  loadWidget = () => {
    const self = this;
    let container = (d3.select('#' + this.uniqueId).node() as any);

    if (container === undefined || container.parentNode === undefined) {
      return;
    }

    container = container.parentNode.getBoundingClientRect();

    const margin = { top: 20, right: 5, bottom: 20, left: 60 };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    // set the ranges
    const x = d3.scaleBand()
      .range([0, width])
      .padding(0.025);

    const y = d3.scaleLinear<number, number>()
      .range([height, 0]);

    d3.select('#' + this.uniqueId).selectAll('*').remove();

    const svg = d3.select('#' + this.uniqueId)
      .append('svg')
      .attr('viewBox', '0 0 ' + container.width + ' ' + container.height)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // scale the range of the data
    x.domain(this.data.map(d => this.dataset.aliases[this.dim][d[0]]));
    y.domain([0, d3.max<number, number>(this.data, function (d) { return d[1]; })]);

    svg.selectAll('bar')
      .data(this.data)
      .enter().append('rect')
      .attr('class', function (d, i): string {
        if (self.selectedElts.find((elt) => elt === d[0]) !== undefined) {
          return 'bar-selected';
        } else {
          return 'bar';
        }
      })
      .attr('x', d => x(this.dataset.aliases[this.dim][d[0]]))
      .attr('width', x.bandwidth())
      .attr('y', function (d) { return y(d[1]); })
      .attr('height', function (d) { return height - y(d[1]); })
      .on('click', function (d) {
        if (d3.select(this).attr('class') === 'bar') {
          d3.select(this).attr('class', 'bar-selected');
        } else {
          d3.select(this).attr('class', 'bar');
        }

        self.selectedElts = new Array<string>();
        svg.selectAll('rect').filter('.bar-selected').each(elt => {
          self.selectedElts.push(elt[0]);
        });

        self.broadcast();
      });

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
    window.addEventListener('resize', this.loadWidget);
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.loadWidget);
  }
}
