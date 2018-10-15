import { Component, ViewChild, OnInit, ElementRef, AfterViewInit, Input, ViewEncapsulation, OnDestroy } from '@angular/core';

import { Widget } from '../widget';

import * as d3 from 'd3';
import { legendColor } from 'd3-svg-legend';

import { Subject } from 'rxjs/Subject';
import { DataService } from '../services/data.service';
import { ConfigurationService } from '../services/configuration.service';
import { SchemaService } from '../services/schema.service';
import { ActivatedRoute } from '@angular/router';
import { element } from 'protractor';

@Component({
  selector: 'app-grouped-box-plot',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './grouped-box-plot.component.html',
  styleUrls: ['./grouped-box-plot.component.scss']
})
export class GroupedBoxPlotComponent implements OnInit {
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
      this.setData(term);
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
    // this.loadLegend();
  }

  setData(data: any) {
    this.mouseLine = -1;

    this.data = [];
    this.scale = undefined;
    this.colors = [];

    data.forEach(element => {
      let group = [];

      for (let i = 0; i < element.length; i += 5) {
        const values = [
          this.dataset.aliases[this.dim][element[i][0]],
          element[i + 0][1],
          element[i + 1][1],
          element[i + 2][1],
          element[i + 3][1],
          element[i + 4][1]
        ];
        group.push(values);
      }

      this.data.push(group);
    });


    this.loadWidget();
    this.loadLegend();
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

  registerConstraints(dim: string, constraints: any, callback: any): void {
    this.dim = dim;
    this.callbacks.push({ dim, callback, constraints });
  }

  unregister(callback: any): void {
    this.callbacks = this.callbacks.filter(el => el.callback !== callback);
  }

  broadcast(value?): void {
    for (const entry of this.callbacks) {
      if (value) {
        entry.callback(entry.dim, entry.constraints, value, this);
      }
    }
  }

  loadWidget = () => {
    const self = this;
    let container = (d3.select('#' + this.uniqueId).node() as any);

    if (container === null || container.parentNode === undefined) {
      return;
    }

    container = container.parentNode.getBoundingClientRect();

    const margin = { top: 8, right: 5, bottom: 35, left: 55 };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

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

    const y = d3.scaleLinear()
      .range([height, 0]);

    let yDomain = [
      d3.min(this.data.map((d) => {
        // let value = d3.min(d, (elt) => { return elt[2] - (elt[] * 0.1); });
        let value = d3.min(d, (elt) => { return Number.parseInt(elt[1]); });
        return value;
      })),

      d3.max(this.data.map((d) => {
        // let value = d3.max(d, (elt) => { return Number.parseInt(elt[4]) + (elt[4] * 0.1); });
        let value = d3.max(d, (elt) => { return Number.parseInt(elt[5]); });
        return value;
      }))
    ];
    yDomain[1] += (Math.abs(yDomain[1] - Math.abs(yDomain[0])) * 0.10);
    yDomain[0] -= (Math.abs(yDomain[1] - Math.abs(yDomain[0])) * 0.10);

    y.domain(yDomain);

    var colorScale = d3.scaleOrdinal<number, string>()
      .domain(this.data.map((d, index) => index))
      .range(d3.schemeCategory10.slice(0, this.data.length));

    let getColor = (d) => {
      return d3.rgb(colorScale(d));
    }


    this.data.forEach((element, index) => {
      // spines
      svg.selectAll('.spine')
        .data(this.data[index])
        .enter()
        .append('line')
        .attr("transform", (d) => {
          return "translate(" + x1(index) + ",0)";
        })
        .attr('x1', (d) => {
          return x0(d[0]) + x1.bandwidth() / 2;
        })
        .attr('y1', (d) => {
          let value = d[1];
          return y(value);
        })
        .attr('x2', (d) => {
          return x0(d[0]) + x1.bandwidth() / 2;
        })
        .attr('y2', (d) => {
          return y(d[5]);
        })
        .attr('stroke', 'black');


      // bodies
      svg.selectAll('.body')
        .data(this.data[index])
        .enter()
        .append('rect')
        .attr("transform", (d) => {
          return "translate(" + x1(index) + ",0)";
        })
        .attr('width', x1.bandwidth())
        .attr('x', (d) => {
          return x0(d[0]);
        })
        .attr('y', (d) => {
          return y(d[4]);
        })
        .attr('height', (d) => {
          return y(d[2]) - y(d[4]);
        })
        .attr('stroke', 'black')
        .attr('fill', (d) => {
          let color = getColor(index);
          return color.toString();
        });

      // medians
      svg.selectAll('.median')
        .data(this.data[index])
        .enter()
        .append('line')
        .attr("transform", (d) => {
          return "translate(" + x1(index) + ",0)";
        })
        .attr('x1', (d) => {
          return x0(d[0]);
        })
        .attr('x2', (d) => {
          return x0(d[0]) + x1.bandwidth();
        })
        .attr('y1', (d, i) => {
          return y(d[3]);
        })
        .attr('y2', (d, i) => {
          return y(d[3]);
        })
        .attr('stroke', 'black');
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
    svg.append('text').attr('id', 'labelLine');

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

    svg.select('#labelLine')
      .attr('x', (width))
      .attr('y', height + margin.bottom - 5)
      .style('text-anchor', 'end')
      .style('color', 'red')
      .text('parameter: ' + this.yFormat(this.lineLabel));

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


    // mouse
    svg.on('mousemove', () => {
      const precisionRound = (number, precision) => {
        const factor = Math.pow(10, precision);
        return Math.round(number * factor) / factor;
      };

      this.mouseLine = precisionRound(d3.mouse(<HTMLElement>svg.node())[1], 1);

      this.loadWidget();

      self.lineLabel = y.invert(this.mouseLine);
      // self.broadcast(y.invert(this.mouseLine));
    });

    draw_line();
    
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
