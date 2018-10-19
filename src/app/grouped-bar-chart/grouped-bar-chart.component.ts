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
  selector: 'app-grouped-bar-chart',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './grouped-bar-chart.component.html',
  styleUrls: ['./grouped-bar-chart.component.scss']
})
export class GroupedBarChartComponent implements Widget, OnInit, AfterViewInit, OnDestroy {
  uniqueId = 'id-' + Math.random().toString(36).substr(2, 16);

  dataset: any;
  data = [];
  dim = '';
  subject = new Subject<any>();
  callbacks: any[] = [];
  selectedElts = new Array<string>();

  xLabel = '';
  yLabel = '';
  yFormat = d3.format('.2s');

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

    this.subject.subscribe(data => {
      this.data = data;
      this.loadLegend();
      this.loadWidget();
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

  setDataset(dataset: string) {
    this.dataset = this.schemaService.get(dataset);
  }

  setNextTerm(data) {
    this.subject.next(data);
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

  loadLegend() {
    const self = this;
    let container = (d3.select('#' + this.uniqueId).node() as any);

    if (container === null || container.parentNode === undefined) {
      return;
    }

    container = container.parentNode.getBoundingClientRect();

    const margin = { top: 8, right: 5, bottom: 35, left: 55 };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;


    const svg = d3.select('#svg-color-quant-' + this.uniqueId);
    svg.selectAll('*').remove();

    svg.attr('class', 'svg-color-quant-calendar');

    svg.append('g')
      .attr('class', 'legendQuant')
      .attr('transform', 'translate(0, 0)');

    const colorLegend = legendColor()
      .labelFormat(d3.format('.2f'))
      .orient('horizontal')
      .shapeWidth(50)
      .shapePadding(0)
      .shapeHeight(5)
      .scale(d3.scaleOrdinal<number, string>()
        .domain(this.data.map((d, index) => index))
        .range(d3.schemeCategory10.slice(0, this.data.length))
      );

    svg.select('.legendQuant')
      .call(colorLegend);
  }

  loadWidget = () => {
    const self = this;
    let container = (d3.select('#' + this.uniqueId).node() as any);

    if (container == (undefined || null) || container.parentNode == (undefined || null)) {
      return;
    }

    container = container.parentNode.getBoundingClientRect();

    const margin = { top: 8, right: 5, bottom: 35, left: 55 };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    /* this.data = this.data.sort((lhs, rhs) => {
      return lhs[0] - rhs[0];
    }); */

    d3.select('#' + this.uniqueId).selectAll('*').remove();

    const svg = d3.select('#' + this.uniqueId)
      .append('svg')
      .attr('viewBox', '0 0 ' + container.width + ' ' + container.height)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    const x0 = d3.scaleBand()
      .rangeRound([0, width])
      .paddingInner(0.05);

    x0.domain(this.dataset.aliases[this.dim]);

    const x1 = d3.scaleBand<number>()
      .rangeRound([0, x0.bandwidth()])
      .padding(0.025);

    x1.domain(this.data.map((d, index) => index));

    const y = d3.scaleLinear<number, number>()
      .range([height, 0]);

    y.domain(
      [
        0,
        d3.max(this.data, (d) => {
          let max = d3.max(d, (elt) => elt[1]);
          return Number.parseInt(max);
        })
      ]
    );

    // y.domain(d3.extent<number, number>(this.data, (d) => d[1]));

    /* let yMin = d3.min(this.data, (elt) => { return elt[1] });
    let yMax = d3.max(this.data, (elt) => { return elt[1] }); */

    // var color = "steelblue";
    var colorScale = d3.scaleOrdinal<number, string>()
      .domain(this.data.map((d, index) => index))
      //.range([d3.rgb(color).brighter().toString(), d3.rgb(color).darker().toString()]);
      .range(d3.schemeCategory10.slice(0, this.data.length));

    let getColor = (d) => {
      return d3.rgb(colorScale(d));
    }

    this.data.forEach((element, index) => {
      svg.selectAll('bar')
        .data(this.data[index])
        .enter().append('rect')
        .attr("transform", (d) => {
          // console.log(index);
          return "translate(" + x1(index) + ",0)";
        })
        .attr('fill', (d) => {
          let color = getColor(index);
          return color.toString();
        })
        .attr('x', (d) => {
          return x0(this.dataset.aliases[this.dim][d[0]]);
        })
        .attr('width', (d) => {
          // console.log('width');
          // console.log(x1.bandwidth());
          return x1.bandwidth();
        })
        .attr('y', (d) => {
          return y(d[1]);
        })
        .attr('height', (d) => {
          return height - y(d[1]);
        });
    });

    // add the X axis
    const xAxis = d3.axisBottom(x0);
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

    // mouse
    svg.on('mousemove', () => {
      const precisionRound = (number, precision) => {
        const factor = Math.pow(10, precision);
        return Math.round(number * factor) / factor;
      };

      this.mouseLine = precisionRound(d3.mouse(<HTMLElement>svg.node())[1], 1);

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
          .attr('stroke', 'black')
          .attr('stroke-width', 2);
      };

      draw_line();

      self.lineLabel = y.invert(this.mouseLine);
      // self.broadcast(y.invert(this.mouseLine));
    });

    /* .on('mouseover', function (d) {
      if (self.selectedElts.find((elt) => elt === d[0]) !== undefined) {
        d3.select(this).attr('fill', d3.rgb(colorScale(d[0])).darker(2.0).toString());
      } else {
        d3.select(this).attr('fill', d3.rgb(colorScale(d[0])).darker().toString());
      }
    })
    .on('mouseout', function (d) {
      d3.select(this).attr('fill', getColor(d).toString());
    })
    .on('click', function (d) {
      let found = self.selectedElts.find(el => el === d[0]) !== undefined;

      if (found) {
        self.selectedElts = self.selectedElts.filter(el => el !== d[0]);
      } else {
        self.selectedElts.push(d[0]);
      }
      // reset color
      d3.select(this).attr('fill', getColor(d).toString());

      svg.selectAll("rect").attr("fill", function (d) {
        let color = getColor(d);
        return color.toString();
      });

      // broadcast
      self.broadcast();
    }); */
  }

  ngAfterViewInit() {
    window.addEventListener('resize', this.loadWidget);

    // force widget refresh
    this.loadLegend();
    this.loadWidget();
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.loadWidget);
  }
}
