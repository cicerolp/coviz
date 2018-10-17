import { Component, ViewChild, OnInit, ElementRef, AfterViewInit, Input, ViewEncapsulation, OnDestroy } from '@angular/core';

import { Widget } from '../widget';

import * as d3 from 'd3';
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
export class CohortPlotComponent implements OnInit, AfterViewInit, OnDestroy {
  uniqueId = 'id-' + Math.random().toString(36).substr(2, 16);

  constructor() { }

  ngOnInit() {
    /* const self = this;
    let container = (d3.select('#' + this.uniqueId).node() as any);

    if (container === null || container.parentNode === undefined) {
      return;
    }

    container = container.parentNode.getBoundingClientRect();

    const margin = { top: 5, right: 5, bottom: 5, left: 5 };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;



    d3.select('#' + this.uniqueId).selectAll('*').remove();

    const svg = d3.select('#' + this.uniqueId)
      .append('svg')
      .attr('viewBox', '0 0 ' + container.width + ' ' + container.height)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')'); */


  }

  loadWidget = () => {

  }


  ngAfterViewInit() {
    // window.addEventListener('resize', this.loadWidget);

    let data = 't1:VEN_B (28.57%) t1:AERO_B (45.23%) t1:OXY_B (100.0%) t1:OXY_E (4.761%) t1:PERFCHIMIO_B (7.142%) t1:NUTENT_B (19.04%) t1:NUTENT_E (4.761%) t1:PERFANTID_B (2.380%) t1:COMPL_B (2.380%) t1:PPC_B (30.95%) t2:VEN_B (9.523%) t2:AERO_B (4.761%) t2:OXY_E (2.380%) t2:OXY_B (23.80%) t2:NUTENT_B (2.380%) t3:AERO_E (2.380%) t3:NUTENT_E (2.380%) t3:NUTENT_B (2.380%) t3:PPC_E (2.380%) t3:PPC_B (2.380%) t3:VEN_B (2.380%) t3:OXY_B (2.380%) t4:AERO_B (2.380%) t4:PERFANTIB_B (2.380%) t4:PERFCHIMIO_B (7.142%) t4:PERFCHIMIO_E (4.761%) t4:NUTENT_E (2.380%) t4:NUTENT_B (4.761%) t4:VEN_B (11.90%) t4:OXY_B (9.523%) t4:PPC_E (4.761%) t4:PPC_B (4.761%) t5:OXY_B (21.42%) t5:AERO_E (2.380%) t5:PERFCHIMIO_B (2.380%) t5:COMPL_E (2.380%) t5:VEN_B (9.523%) t5:NUTENT_B (7.142%) t5:PPC_E (2.380%) t6:OXY_B (16.66%) t6:PERFCHIMIO_B (4.761%) t6:PERFANTID_B (2.380%) t6:VEN_B (4.761%) t6:AERO_B (2.380%) t6:NUTENT_B (2.380%) t7:VEN_B (11.90%) t7:OXY_B (38.09%) t7:AERO_E (4.761%) t7:OXY_E (2.380%) t8:VEN_B (2.380%) t8:OXY_B (11.90%) t8:NUTENT_B (4.761%) t8:COMPL_E (2.380%) t9:NUTENT_B (2.380%) t9:NUTENT_E (2.380%) t9:OXY_B (9.523%) t9:AERO_E (2.380%) t9:AERO_B (2.380%) t9:OXY_E (2.380%) t9:PPC_B (2.380%) t9:VEN_B (2.380%) t10:NUTENT_E (2.380%) t10:AERO_E (2.380%) t10:PERFCHIMIO_E (2.380%) t11:OXY_B (9.523%) t11:VEN_B (9.523%) t11:OXY_E (2.380%) t12:OXY_B (4.761%) t12:OXY_E (2.380%) t12:NUTENT_B (2.380%) t13:VEN_B (16.66%) t13:OXY_E (2.380%) t13:OXY_B (16.66%) t13:VEN_E (2.380%) t14:VEN_B (2.380%) t14:NUTENT_E (2.380%) t14:OXY_B (7.142%) t15:NUTENT_B (2.380%) t15:OXY_B (2.380%) t15:PPC_B (2.380%) t16:PERFANTID_E (2.380%) t16:VEN_B (11.90%) t16:OXY_B (7.142%) t17:OXY_B (2.380%) t17:PERFANTID_B (2.380%) t17:VEN_B (11.90%) t17:PPC_E (2.380%) t17:PERFSANG_B (2.380%) t18:OXY_E (2.380%) t18:NUTENT_B (2.380%) t19:VEN_B (14.28%) t19:OXY_B (11.90%) t19:OXY_E (2.380%) t20:VEN_B (2.380%) t20:VEN_E (2.380%) t20:OXY_B (2.380%) t20:AERO_B (2.380%) t21:OXY_E (2.380%) t21:OXY_B (7.142%) t21:VEN_B (2.380%) t22:OXY_B (4.761%) t22:VEN_B (4.761%) t23:PERFANTIB_E (2.380%) t23:PERFANTID_E (2.380%) t23:PERFANTIV_E (2.380%) t23:PERFDIV_E (2.380%) t23:VEN_B (14.28%) t23:OXY_B (2.380%) t24:NUTENT_B (2.380%) t25:VEN_B (16.66%) t25:OXY_E (4.761%) t25:OXY_B (14.28%) t25:NUTENT_B (2.380%) t26:VEN_B (4.761%) t26:VEN_E (2.380%) t26:OXY_B (2.380%) t27:VEN_B (4.761%) t27:OXY_B (9.523%) t27:AERO_E (2.380%) t27:VEN_E (2.380%) t28:VEN_B (2.380%) t28:VEN_E (2.380%) t28:COMPL_E (2.380%) t28:OXY_B (2.380%) t29:OXY_E (2.380%) t29:VEN_B (4.761%) t29:OXY_B (4.761%) t30:OXY_B (2.380%) t30:PERFANTID_B (2.380%) t30:VEN_E (2.380%) t31:VEN_B (14.28%) t31:OXY_B (11.90%) t31:PERFANTID_B (2.380%) t32:OXY_B (23.80%) t32:OXY_E (4.761%) t32:NUTENT_E (2.380%) t32:VEN_B (4.761%) t33:VEN_E (2.380%) t33:OXY_E (4.761%) t33:NUTENT_B (2.380%) t33:VEN_B (4.761%) t33:OXY_B (4.761%) t34:VEN_B (4.761%) t35:VEN_E (2.380%) t36:OXY_B (2.380%) t37:VEN_B (9.523%) t37:OXY_B (9.523%) t37:OXY_E (2.380%) t37:VEN_E (2.380%) t38:OXY_B (16.66%) t38:VEN_B (2.380%) t38:OXY_E (2.380%) t39:VEN_E (2.380%) t39:OXY_B (23.80%) t39:VEN_B (7.142%) t40:VEN_B (7.142%) t40:NUTENT_B (2.380%) t40:OXY_E (2.380%) t42:OXY_E (2.380%) t43:VEN_B (4.761%) t43:OXY_B (2.380%) t44:PERFANTIV_E (2.380%) t44:OXY_B (2.380%) t45:VEN_E (4.761%) t45:OXY_B (2.380%) t46:VEN_E (2.380%) t46:VEN_B (4.761%) t47:OXY_E (2.380%) t47:NUTENT_B (2.380%) t48:PERFANTID_E (2.380%) t48:PERFDIV_E (2.380%) t49:VEN_E (2.380%) t49:VEN_B (2.380%) t49:AERO_E (2.380%) t49:PERFANTIV_E (2.380%) t50:PERFANTIB_B (2.380%) t50:PERFANTIB_E (2.380%) t50:OXY_B (4.761%) t51:OXY_E (2.380%) t51:OXY_B (4.761%) t51:PERFCHIMIO_B (2.380%) t52:VEN_B (4.761%) t52:PERFCHIMIO_B (2.380%) t53:PERFANTIV_E (2.380%) t53:NUTENT_B (2.380%) t53:OXY_B (2.380%) t54:VEN_B (2.380%) t54:OXY_B (2.380%) t55:VEN_B (4.761%) t55:OXY_B (4.761%) t55:AERO_E (2.380%) t56:OXY_E (2.380%) t57:OXY_B (4.761%) t58:VEN_B (2.380%) t59:VEN_E (2.380%) t59:VEN_B (2.380%) t59:OXY_B (2.380%) t60:VEN_E (2.380%) t60:AERO_B (2.380%) t61:AERO_E (2.380%) t61:VEN_B (2.380%) t61:OXY_B (2.380%) t63:VEN_E (2.380%) t63:OXY_B (4.761%) t64:VEN_B (4.761%) t64:PERFANTIB_B (2.380%) t64:PERFANTIB_E (2.380%) t64:OXY_B (2.380%) t65:COMPL_B (2.380%) t65:OXY_B (2.380%) t66:OXY_E (2.380%) t66:OXY_B (2.380%) t67:AERO_E (2.380%) t67:PERFANTIB_E (2.380%) t67:OXY_B (2.380%) t68:OXY_B (2.380%) t70:VEN_B (2.380%) t70:NUTENT_B (2.380%) t73:NUTENT_B (2.380%) t73:AERO_B (2.380%) t74:VEN_B (2.380%) t74:OXY_E (2.380%) t74:OXY_B (4.761%) t76:VEN_B (2.380%) t76:OXY_B (2.380%) t78:AERO_B (2.380%) t78:OXY_E (2.380%) t80:VEN_B (2.380%) t80:OXY_B (2.380%) t80:OXY_E (2.380%) t82:OXY_B (2.380%) t83:OXY_B (2.380%) t86:NUTENT_E (2.380%) t88:OXY_B (2.380%) t93:VEN_E (2.380%) t93:VEN_B (2.380%) t93:NUTENT_E (2.380%) t93:AERO_B (2.380%) t94:OXY_B (2.380%) t94:COMPL_E (2.380%) t94:COMPL_B (2.380%) t96:PERFANTID_B (2.380%) t96:NUTENT_E (2.380%) t96:NUTENT_B (2.380%) t96:AERO_E (2.380%) t96:PERFCHIMIO_B (2.380%) t96:COMPL_B (2.380%) t97:COMPL_B (2.380%) t98:COMPL_E (2.380%) t98:COMPL_B (2.380%) t99:VEN_E (2.380%) t99:AERO_B (2.380%) t100:OXY_B (2.380%) t101:COMPL_B (2.380%) t102:AERO_B (2.380%) t103:COMPL_B (2.380%) t103:COMPL_E (2.380%) t105:AERO_B (2.380%) t105:NUTENT_B (2.380%) t106:OXY_B (2.380%) t108:VEN_E (2.380%) t109:COMPL_E (2.380%) t111:PERFANTIB_E (2.380%) t111:AERO_B (2.380%) t112:PERFANTIB_E (2.380%) t113:NUTENT_B (2.380%) t113:PERFANTIB_B (2.380%) t114:AERO_B (2.380%) t116:AERO_E (2.380%) t120:AERO_B (4.761%) t120:AERO_E (2.380%) t122:AERO_E (2.380%) t126:AERO_B (2.380%) t129:NUTENT_E (2.380%) t143:COMPL_E (2.380%) t143:COMPL_B (2.380%) t146:COMPL_E (2.380%) t150:PERFANTIB_B (2.380%) t156:AERO_B (2.380%) t161:PERFANTIB_E (2.380%) t170:COMPL_E (2.380%) t170:COMPL_B (2.380%) t175:PERFANTID_E (2.380%) t175:PERFANTIV_B (2.380%) t175:PERFANTIV_E (2.380%) t180:PERFDIV_E (2.380%) t182:NUTENT_E (2.380%) t182:PERFANTIB_E (2.380%) t182:PERFANTID_E (2.380%)';


    let cohorts = data.match(/[t]\d+[:].{3,10}[_][BE]\s[(]\d{1,3}[.]\d{1,3}[%][)]/mg);

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

    // console.log(map.get('t1'));

    var svg = d3.select('#' + this.uniqueId).append('svg')
      .attr('width', 720)
      .attr('height', 720);

    Array.from(map.entries()).forEach((entry, tNN) => {
      let g = svg.selectAll('cohort-' + entry[0])
        .data(entry[1])
        .enter()
        .append('g')
        .attr('transform', (d, index) => {
          let x = tNN * 50;
          let y = index * 100;
          return 'translate(' + x + ',' + y + ')';
        });

      g.append('rect')
        .attr('width', 50)
        .attr('height', 100)
        .style('fill', 'red');

      g.append('text')
        // .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .style('fill', 'black')
        .text((d, index) => {
          return d.code;
        });

    });


    /* .attr('x', (value, index) => {
      // get index o tNN
      return 0;
    })
    .attr('y', (value, index) => {        
      return index * 100;
    })
    .attr('width', 50)
    .attr('height', 100); */
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.loadWidget);
  }
}
