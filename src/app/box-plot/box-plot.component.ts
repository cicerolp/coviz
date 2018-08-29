import { Component, ViewChild, OnInit, ElementRef, AfterViewInit, Input, ViewEncapsulation, OnDestroy } from '@angular/core';

import { Widget } from '../widget';

import * as d3 from 'd3';
import { legendColor } from 'd3-svg-legend';

import { Subject } from 'rxjs/Subject';
import { DataService } from '../services/data.service';
import { ConfigurationService } from '../services/configuration.service';
import { SchemaService } from '../services/schema.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-box-plot',
  // encapsulation: ViewEncapsulation.None,
  templateUrl: './box-plot.component.html',
  styleUrls: ['./box-plot.component.scss']
})
export class BoxPlotComponent implements Widget, OnInit, AfterViewInit, OnDestroy {
  uniqueId = 'id-' + Math.random().toString(36).substr(2, 16);

  dataset: any;
  data = [];
  dim = '';
  subject = new Subject<any>();
  callbacks: any[] = [];

  xLabel = '';
  yLabel = '';
  yFormat = d3.format('.2f');

  colors = [];
  scale: any;
  mouseLine = -1;
  lineLabel = -1;

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
        this.setData(data);
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

  setColors(colors, scale?) {
    this.scale = scale;
    this.colors = colors;

    this.loadWidget();
    this.loadLegend();
  }

  setData(data: any) {
    this.mouseLine = -1;

    this.data = [];
    this.scale = undefined;
    this.colors = [];

    for (let i = 0; i < data[0].length; i += 5) {
      const values = [
        this.dataset.aliases[this.dim][data[0][i + 0][0]],
        data[0][i + 0][1],
        data[0][i + 1][1],
        data[0][i + 2][1],
        data[0][i + 3][1],
        data[0][i + 4][1]
      ];
      this.data.push(values);
    }

    this.loadWidget();
    this.loadLegend();
  }

  loadLegend() {
    const svg = d3.select('#svg-color-quant-' + this.uniqueId);
    svg.selectAll('*').remove();
    svg.attr('class', 'svg-color-quant-boxplot');

    if (this.scale) {
      svg.append('g')
        .attr('class', 'legendQuant')
        .attr('transform', 'translate(0, 0)');

      const domain: [number, number] = [0, 1000];

      const colorLegend = legendColor()
        .labelFormat(d3.format('.2'))
        .orient('horizontal')
        .cells(10)
        .shapeWidth(70)
        .shapePadding(0)
        .shapeHeight(5)
        .scale(this.scale);

      svg.select('.legendQuant')
        .call(colorLegend);
    }
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

  broadcast(value?): void {
    for (const pair of this.callbacks) {
      if (value) {
        pair.callback(pair.dim, value, this);
      }
    }
  }

  loadWidget = () => {
    const self = this;
    let container = (d3.select('#' + this.uniqueId).node() as any);

    if (container === undefined || container.parentNode === undefined) {
      return;
    }

    container = container.parentNode.getBoundingClientRect();

    const margin = { top: 20, right: 5, bottom: 40, left: 55 };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    d3.select('#' + this.uniqueId).selectAll('*').remove();

    const draw_line = () => {
      if (this.mouseLine === -1) {
        return;
      }

      let mLine = svg.selectAll('.mouseLine').data([this.mouseLine]);
      mLine.remove();

      mLine = svg.selectAll('.mouseLine').data([this.mouseLine]);

      mLine.enter()
        .append('line')
        .merge(mLine)
        .attr('class', 'mouseLine')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', d => d)
        .attr('y2', d => d)
        .attr('stroke', 'red')
        .attr('stroke-width', 2);
    };

    const svg = d3.select('#' + this.uniqueId)
      .append('svg')
      .attr('viewBox', '0 0 ' + container.width + ' ' + container.height)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    svg.on('mousemove', () => {
      const precisionRound = (number, precision) => {
        const factor = Math.pow(10, precision);
        return Math.round(number * factor) / factor;
      };

      this.mouseLine = precisionRound(d3.mouse(<HTMLElement>svg.node())[1], 1);

      draw_line();

      self.lineLabel = yScale.invert(this.mouseLine);
      self.broadcast(yScale.invert(this.mouseLine));
    });

    //
    const xScale = d3.scaleBand()
      .range([0, width])
      .paddingInner(0.3)
      .paddingOuter(0.4);
    xScale.domain(this.data.map(d => d[0]));

    const xAxis = d3.axisBottom(xScale);
    svg.append('g')
      .attr('class', 'xAxis')
      .attr('transform', 'translate(0,' + height + ')');

    //
    const yScale = d3.scaleLinear().range([height, -margin.top]);
    //yScale.domain([d3.min(this.data.map(d => d[1])), d3.max(this.data.map(d => d[4] + (d[5] - d[4]) * 0.015))]);
    yScale.domain([-30, 30]);

    const yAxis = d3.axisLeft(yScale)
      .tickFormat(self.yFormat)
      .ticks(5);
    svg.append('g')
      .attr('class', 'yAxis')
      .attr('transform', 'translate(' + (0) + ',0)');

    //
    svg.append('text').attr('id', 'labelXAxis');
    svg.append('text').attr('id', 'labelYAxis');
    svg.append('text').attr('id', 'labelLine');

    // update axis
    /////////////////////////////////////////////////////////////

    // text label for the x axis
    xAxis(svg.select('.xAxis'));
    svg.select('#labelXAxis')
      .attr('x', (width / 2.0))
      .attr('y', (height + margin.bottom - 5))
      .style('text-anchor', 'middle')
      .text(this.xLabel);

    // text label for the y axis
    yAxis(svg.select('.yAxis'));
    svg.select('#labelYAxis')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text(this.yLabel);

    if (self.colors && self.colors.length > 0) {
      svg.select('#labelLine')
        .attr('x', (width))
        .attr('y', height + margin.bottom - 5)
        .style('text-anchor', 'end')
        .style('color', 'red')
        .text('parameter: ' + this.yFormat(this.lineLabel));
    }

    /* svg.on('click', () => {
      self.lineLabel = yScale.invert(this.mouseLine);
      self.broadcast(yScale.invert(this.mouseLine));
    }); */

    // update bars
    /////////////////////////////////////////////////////////////

    // spine
    const spines = svg
      .selectAll('.spine')
      .data(this.data);

    spines.exit().remove();
    spines
      .enter()
      .append('line')
      .attr('class', 'spine')
      .merge(spines)
      .attr('x1', (function (d) { return xScale(d[0]) + xScale.bandwidth() / 2; }).bind(this))
      .attr('y1', (function (d) {
        let value = Math.max(-30, d[1]);
        return yScale(value);
      }).bind(this))
      .attr('x2', (function (d) { return xScale(d[0]) + xScale.bandwidth() / 2; }).bind(this))
      .attr('y2', (function (d) { return yScale(d[5]); }).bind(this))
      .attr('stroke', 'black');

    // bodies
    const bodies = svg.selectAll('.body').data(this.data);

    bodies.exit().remove();
    bodies
      .enter()
      .append('rect')
      .merge(bodies)
      .attr('class', 'body')
      .attr('width', xScale.bandwidth())
      .attr('x', (d => xScale(d[0])).bind(this))
      .attr('y', (d => yScale(d[4])).bind(this))
      .attr('height', (d => yScale(d[2]) - yScale(d[4])).bind(this))
      .attr('stroke', 'black')
      .attr('fill', ((d, i) => {
        if (self.colors && self.colors.length > 0) {
          return self.colors[i];
        } else {
          return 'white';
        }
      }).bind(this));

    //
    const medians = svg.selectAll('.median').data(this.data);
    medians.exit().remove();

    medians.enter()
      .append('line')
      .attr('class', 'median')
      .merge(medians)
      .attr('x1', (function (d) { return xScale(d[0]); }).bind(this))
      .attr('y1', (function (d, i) { return yScale(d[3]); }).bind(this))
      .attr('x2', (function (d) { return xScale(d[0]) + xScale.bandwidth(); }).bind(this))
      .attr('y2', (function (d, i) { return yScale(d[3]); }).bind(this))
      .attr('stroke', 'black');

    draw_line();
  }

  ngAfterViewInit() {
    window.addEventListener('resize', this.loadWidget);
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.loadWidget);
  }
}
