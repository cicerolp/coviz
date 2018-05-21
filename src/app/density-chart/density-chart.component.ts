import { Component, ViewChild, OnInit, ElementRef, AfterViewInit, Input, ViewEncapsulation, OnDestroy } from '@angular/core';

import { Widget } from '../widget';
import { DensityWidget } from '../density-widget';

import * as d3 from 'd3';
import { Subject } from 'rxjs/Subject';
import { DataService } from '../services/data.service';
import { ConfigurationService } from '../services/configuration.service';
import { SchemaService } from '../services/schema.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-density-chart',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './density-chart.component.html',
  styleUrls: ['./density-chart.component.scss']
})
export class DensityChartComponent implements DensityWidget, OnInit, AfterViewInit, OnDestroy {
  uniqueId = 'id-' + Math.random().toString(36).substr(2, 16);

  values = [];
  densities = [];

  dataset: any;
  data = [];
  dim = '';
  subject = new Subject<any>();
  callbacks: any[] = [];
  selectedElts = new Array<string>();

  xLabel = '';
  yLabel = '';

  yFormat = d3.format('.2f');
  xFormat = d3.format('.2f');

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
      this.dataService.query(term).subscribe(response => {
        this.data = [];
        this.densities = [];

        let prev_density = 0.0;
        for (let d = 0; d < response[0].length; ++d) {
          this.densities.push(response[0][d] - prev_density);
          prev_density = response[0][d];
        }
        this.densities.push(1.0 - prev_density);


        for (let i = 0; i < this.densities.length; ++i) {
          this.data.push({
            'x': (this.values[i] + this.values[i + 1]) / 2.0,
            'y': this.densities[i]
          })
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
    this.xFormat = formatter;
  }

  setDataset(dataset: string) {
    this.dataset = this.schemaService.get(dataset);
  }

  setValues(values: number[]) {
    this.values = values;
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

    const margin = { top: 8, right: 5, bottom: 35, left: 55 };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    // set the ranges
    const x = d3.scaleBand<number>()
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
    x.domain(this.data.map(d => d.x));
    y.domain([0, d3.max(this.data, d => d.y)]);

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
      .attr('x', d => x(d.x))
      .attr('width', x.bandwidth())
      .attr('y', (d) => y(d.y))
      .attr('height', (d) => height - y(d.y))
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
    const xAxis = d3.axisBottom(x)
      .tickFormat(self.xFormat);

    svg.append('g')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis);

    // add the Y axis
    const yAxis = d3.axisLeft(y)
      .tickFormat(self.yFormat);
    svg.append('g')
      .call(yAxis);

    // labels
    svg.append('text').attr('id', 'labelXAxis');
    svg.append('text').attr('id', 'labelYAxis');

    // text label for the x axis
    xAxis(svg.select('.xAxis'));
    svg.select('#labelXAxis')
      .attr('x', (width / 2.0))
      .attr('y', height + margin.bottom - 5)
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
