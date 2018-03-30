import { Component, ViewChild, OnInit, ElementRef, AfterViewInit, Input, ViewEncapsulation, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder, FormControl } from '@angular/forms';

import { Widget } from '../widget';

import * as d3 from 'd3';
import * as moment from 'moment';

import { Subject } from 'rxjs/Subject';
import { DataService } from '../services/data.service';
import { SchemaService } from '../services/schema.service';
import { ActivatedRoute } from '@angular/router';
import { ConfigurationService } from '../services/configuration.service';

@Component({
  selector: 'app-temporal-band',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './temporal-band.component.html',
  styleUrls: ['./temporal-band.component.scss']
})
export class TemporalBandComponent implements OnInit, AfterViewInit, OnDestroy {
  uniqueId = 'id-' + Math.random().toString(36).substr(2, 16);

  dataset: any;
  data = [];
  dim = '';
  subject = new Subject<any>();
  callbacks: any[] = [];

  numCurves = 1;

  bands = [];
  curves = [];

  xLabel = 'Time';
  yLabel = '';

  options: FormGroup;

  constructor(fb: FormBuilder, private dataService: DataService,
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
        let initialDate: Date;
        let finalDate: Date;

        if (data[0].length) {
          initialDate = new Date(data[0][0][0] * 1000);
          initialDate.setHours(0, 24 * 60, 0, 0);

          finalDate = new Date(data[0][data[0].length - 1][0] * 1000);
          finalDate.setHours(0, 24 * 60, 0, 0);
        } else {
          initialDate = new Date();
          finalDate = new Date();
        }

        // setup data
        this.options.patchValue({
          fromDateTime: initialDate,
          toDateTime: finalDate,
        });

        // format the data
        data[0].forEach(function (d) {
          d[0] = new Date(d[0] * 1000);
          d[0].setHours(0, 24 * 60, 0, 0);
        });

        this.data = d3.range(this.numCurves).map(d => []);

        if (data[0].length) {
          for (let i = 0; i < data[0].length; ++i) {
            this.data[i % this.numCurves].push([
              data[0][i][0],
              data[0][i][1]
            ]);
          }
        }

        const numCurves = this.data.length;
        const numBands = Math.floor(numCurves / 2);

        this.bands = [];
        for (let i = 0; i < numBands; ++i) {
          const upperLeft = this.data[i][0];
          const bandData = this.data[i].concat(this.data[numCurves - 1 - i].reverse()).concat([upperLeft]);

          this.bands.push(bandData);
        }

        let medianCurve;
        if (data[0].length === 0) {
          medianCurve = this.data[0];
          this.bands = [];
        } else {
          medianCurve = this.data[Math.floor(numCurves / 2)];
        }

        // average
        // const auxCurve = data[1];
        // const averageCurve = this.completeCurve(auxCurve, initialDate, finalDate, this.dataset.timeStep, 1000); */

        /* bandPlotWidget.setYAxisLabel(datasetInfo.payloadsScreenNames[activePayloadDimension]);
        bandPlotWidget.setData(bands, [
          { "curve": medianCurve, "color": "black" },
          { "curve": averageCurve, "color": "blue" }
        ]); */

        this.curves = [
          {
            'curve': medianCurve,
            'color': 'black'
          }
        ];

        this.loadWidget();
      });
    });
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


  ngOnInit() { }

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
      this.options.get('fromDateTime').value.valueOf() / 1000 - 7200,
      this.options.get('toDateTime').value.valueOf() / 1000 - 7200
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

    const margin = { top: 5, right: 25, bottom: 75, left: 50 };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    d3.select('#' + this.uniqueId).selectAll('*').remove();

    const svg = d3.select('#' + this.uniqueId)
      .append('svg')
      .attr('viewBox', '0 0 ' + container.width + ' ' + container.height);


    svg.append('g')
      .attr('id', 'line')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    const xScale = d3.scaleTime<number, number>()
      .range([0, width]);

    // add the X axis
    const xAxis = d3.axisBottom(xScale);
    svg.append('g')
      .attr('class', 'xAxis')
      .attr('transform', 'translate(' + margin.left + ',' + height + ')')
      .call(xAxis);

    svg.append('g').attr('id', 'bands')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    svg.append('g').attr('id', 'lines')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    const yScale = d3.scaleLinear<number, number>()
      .range([height, 0]);

    // add the Y axis
    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d3.format('d'))
      .ticks(5);
    svg.append('g')
      .attr('class', 'yAxis')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
      .call(yAxis);

    const brushGroup = svg.append('g')
      .attr('class', 'brushGroup');
    const myBrush = d3.brushX();
    brushGroup.call(myBrush);

    svg.append('text').attr('id', 'labelXAxis');
    svg.append('text').attr('id', 'labelYAxis');

    // updatePlot
    const xExtents = [];
    const yExtents = [];

    this.bands.concat(this.curves.map(d => d.curve)).forEach(band => {
      const lineXExtend = d3.extent(band, d => d[0]);
      xExtents.push(lineXExtend[0]);
      xExtents.push(lineXExtend[1]);

      const lineYExtend = d3.extent(band, d => d[1]);
      yExtents.push(lineYExtend[0]);
      yExtents.push(lineYExtend[1]);
    });

    const xExtend = d3.extent(xExtents);
    xScale.domain(xExtend);
    xAxis.scale(xScale);

    const yExtent = d3.extent(yExtents);
    if (yExtent[0] === yExtent[1]) {
      yExtent[0] -= (0.1 * yExtent[0]);
      yExtent[1] += (0.1 * yExtent[1]);
    }
    yScale.domain(yExtent);
    yAxis.scale(yScale);

    // updateAxis
    // text label for the x axis
    xAxis(svg.select('.xAxis'));
    svg.select('#labelXAxis')
      .attr('x', (width / 2.0))
      .attr('y', (height + margin.top + 20))
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

    // updateBands
    const bands = svg.select('#bands').selectAll('.band')
      .data(this.bands);

    const valueline = d3.line()
      .x(function (d) { return xScale(d[0]); })
      .y(function (d) { return yScale(d[1]); });

    bands.exit().remove();
    bands.enter()
      .append('path')
      .merge(bands)
      .attr('class', 'band')
      .attr('d', valueline)
      .attr('fill', 'rgba(255,0,0,0.5)');

    const curves = svg.select('#lines').selectAll('.curve').data(this.curves);
    curves.exit().remove();

    curves.enter()
      .append('path')
      .merge(curves)
      .attr('class', 'curve')
      .attr('d', d => valueline(d.curve))
      .attr('fill', 'none')
      .attr('stroke', d => d.color)
      .attr('stroke-width', 3);
  }

  setNumCurves(num: number) {
    this.numCurves = num;
  }

  ngAfterViewInit() {
    window.addEventListener('resize', this.loadWidget);
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.loadWidget);
  }
}
