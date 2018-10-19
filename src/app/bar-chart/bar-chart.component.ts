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

  xLabel = '';
  yLabel = '';
  yFormat = d3.format('.2s');

  range = 'normal';

  range_map = {
    'normal': ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850', '#006837'].reverse(),

    'outlier': ['rgb(215,25,28)', 'rgb(253,174,97)', 'rgb(255,255,191)'].reverse()
  }

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

    if (container == (undefined || null) || container.parentNode == (undefined || null)) {
      return;
    }

    container = container.parentNode.getBoundingClientRect();

    const margin = { top: 8, right: 5, bottom: 35, left: 55 };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    this.data = <[[number, number]]>this.data.sort((lhs, rhs) => {
      return lhs[0] - rhs[0];
    });

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

    let yDomain = d3.extent<number, number>(this.data, (d) => d[1]);
    yDomain[0] -= (Math.abs(yDomain[1] - Math.abs(yDomain[0])) * 0.15);
    // yDomain[1] += (Math.abs(yDomain[1] - Math.abs(yDomain[0])) * 0.25);

    if (yDomain[0] == yDomain[1]) {
      yDomain[0] -= (Math.abs(yDomain[0]) * 0.10);
    }

    // scale the range of the data
    x.domain(this.dataset.aliases[this.dim]);
    y.domain(yDomain);

    let colorScale;
    if (self.range == 'outlier') {
      colorScale = d3.scaleThreshold<number, string>()
        .domain([0.5, 0.9, 1])
        .range(this.range_map.outlier);
    } else {
      colorScale = d3.scaleQuantize<string>()
        .domain(yDomain)
        .range(this.range_map.normal);
    }


    let getColor = (d) => {
      if (self.selectedElts.find((elt) => elt === d[0]) !== undefined) {
        return d3.rgb(colorScale(d[1]));
      } else {
        if (self.selectedElts.length !== 0) {
          // return d3.rgb(colorScale(d[1])).brighter(0.5);
          return d3.rgb('lightgray');
        } else {
          return d3.rgb(colorScale(d[1]));
        }
      }
    }

    svg.selectAll('bar')
      .data(this.data)
      .enter().append('rect')
      .attr('fill', (d) => {
        let color = getColor(d);
        return color.toString();
      })
      .attr('x', d => x(this.dataset.aliases[this.dim][d[0]]))
      .attr('width', x.bandwidth())
      .attr('y', (d) => y(d[1]))
      .attr('height', (d) => height - y(d[1]))
      .on('mouseover', function (d) {
        if (self.selectedElts.find((elt) => elt === d[0]) !== undefined) {
          d3.select(this).attr('fill', d3.rgb(colorScale(d[1])).darker(2.0).toString());
        } else {
          d3.select(this).attr('fill', d3.rgb(colorScale(d[1])).darker().toString());
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
      });

    // add the X axis
    const xAxis = d3.axisBottom(x);
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
    // this.loadLegend();
    this.loadWidget();
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.loadWidget);
  }
}
