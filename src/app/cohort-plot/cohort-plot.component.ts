import { Component, ViewChild, OnInit, ElementRef, AfterViewInit, Input, ViewEncapsulation, OnDestroy } from '@angular/core';

import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';

import { Widget } from '../widget';

import * as d3 from 'd3';
import { legendColor } from 'd3-svg-legend';

import { Subject } from 'rxjs/Subject';
import { DataService } from '../services/data.service';
import { ConfigurationService } from '../services/configuration.service';
import { SchemaService } from '../services/schema.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-cohort-plot',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './cohort-plot.component.html',
  styleUrls: ['./cohort-plot.component.scss']
})
export class CohortPlotComponent implements Widget, OnInit, AfterViewInit, OnDestroy {
  uniqueId = 'id-' + Math.random().toString(36).substr(2, 16);

  dataset: any;
  data = [];
  dim = '';
  subject = new Subject<any>();
  callbacks: any[] = [];

  xLabel = '';
  yLabel = '';
  yFormat = d3.format('.2s');

  no_data = false;
  progress_spinner = false;

  color_range = ['rgb(165,0,38)', 'rgb(215,48,39)', 'rgb(244,109,67)', 'rgb(253,174,97)', 'rgb(254,224,139)', 'rgb(255,255,191)', 'rgb(217,239,139)', 'rgb(166,217,106)', 'rgb(102,189,99)', 'rgb(26,152,80)', 'rgb(0,104,55)'];

  constructor(
    private httpService: HttpClient,
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

    this.subject.subscribe(term => {
      this.progress_spinner = true;

      this.httpService.post('http://localhost:8888/post', term, { responseType: 'text' })
        .subscribe(response => {
          this.formatData(response);

          this.progress_spinner = false;

          this.loadLegend();
          this.loadWidget();
        });
    });
  }

  private formatData(bin) {
    if (bin.length == 0) {
      this.no_data = true;
      this.data = [];
      return;
    }

    this.no_data = false;

    let cohorts = bin.match(/[t]\d+[:].{3,10}[_][BE]\s[(]\d{1,3}[.]\d{1,3}[%][)]/mg);

    let map = new Map<string, any[]>();

    cohorts.forEach(element => {
      let t = element.match(/[t]\d+/gm)[0];
      let code = element.match(/[^:]{3,10}[_][BE]/gm)[0];
      let value = element.match(/\d{1,3}[.]\d{1,3}[%]/gm)[0].replace('%', '');

      // set tNN
      if (!map.has(t)) {
        map.set(t, []);
      }

      map.get(t).push({
        code: code,
        value: parseFloat(value)
      });
    });

    this.data = Array.from(map.entries());
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
      pair.callback(pair.dim);
    }
  }

  loadLegend() {
    const svg = d3.select('#svg-color-quant-' + this.uniqueId);
    svg.selectAll('*').remove();

    svg.attr('class', 'svg-color-scale-cohort');

    svg.append('g')
      .attr('class', 'legendQuant')
      .attr('transform', 'translate(0, 0)');

    const domain: [number, number] = [0, 1];

    const colorLegend = legendColor()
      .labelFormat(d3.format('.0%'))
      .orient('horizontal')
      .shapeWidth(90)
      .shapePadding(0)
      .shapeHeight(5)
      .scale(d3.scaleQuantize<string>()
        .domain([0, 1])
        .range([
          'rgb(165,0,38)',
          // 'rgb(215,48,39)',
          'rgb(244,109,67)',
          // 'rgb(253,174,97)',
          'rgb(254,224,139)',
          // 'rgb(255,255,191)',
          'rgb(217,239,139)',
          // 'rgb(166,217,106)',
          'rgb(102,189,99)',
          // 'rgb(26,152,80)',
          'rgb(0,104,55)'
        ])
      );



    svg.select('.legendQuant')
      .call(colorLegend);
  }

  
  loadWidget = () => {
    const self = this;
    let container = (d3.select('#' + this.uniqueId).node() as any);

    if (container === null || container.parentNode === undefined || this.data.length === 0) {
      return;
    }

    container = container.parentNode.getBoundingClientRect();

    let max_length = 0;
    this.data.forEach(element => {
      max_length = Math.max(max_length, element[1].length)
    });

    // bounding box
    const minCohortHeight = 30;

    const margin = { top: 30, right: 5, bottom: 5, left: 30 };
    const width = container.width - margin.left - margin.right;
    const height = (this.data.length * minCohortHeight) - margin.top - margin.bottom;

    d3.select('#' + this.uniqueId).selectAll('*').remove();

    const svg = d3.select('#' + this.uniqueId)
      .append('svg')
      .attr('viewBox', '0 0 ' + container.width + ' ' + (this.data.length * minCohortHeight))
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    const color = d3.scaleQuantize<string>()
      .domain([0, 100])
      .range(this.color_range);

    const xScale = d3.scaleBand<number>()
      .range([0, width])
      .paddingInner(0.05)
      .paddingOuter(0.1)
      .domain(Array.from(Array(max_length).keys()));

    const yScale = d3.scaleBand()
      .range([0, height])
      .paddingInner(0.1)
      .paddingOuter(0.1)
      .domain(this.data.map((d) => {
        return d[0];
      }));

    const yAxis = d3.axisLeft(yScale);

    svg.append('g')
      .call(yAxis);

    this.data.forEach((entry, tNN) => {
      let g = svg.selectAll('cohort-' + entry[0])
        .data(entry[1])
        .enter()
        .append('g')
        .attr('transform', (d, index) => {
          let x = xScale(index);
          let y = yScale(entry[0]);
          return 'translate(' + x + ',' + y + ')';
        });

      g.append('rect')
        .attr('width', (d) => {
          return xScale.bandwidth();
        })
        .attr('height', (d) => {
          return yScale.bandwidth();
        })
        .style('fill', (d, index) => {
          return color(d['value']);
        });

      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .style('fill', 'black')
        .style("font-size", "10px")
        .text((d, index) => {
          return d['code'];
        })
        .attr('transform', (d, index) => {
          let x = xScale.bandwidth() / 2;
          let y = yScale.bandwidth() / 2;
          return 'translate(' + x + ',' + y + ')';
        });;
    });
  }


  ngAfterViewInit() {
    window.addEventListener('resize', this.loadWidget);
    this.loadLegend()
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.loadWidget);
  }
}
