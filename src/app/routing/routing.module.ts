import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

import { Demo2Component } from '../demo2/demo2.component';
import { CompareComponent } from '../compare/compare.component';
import { CohortPlotComponent } from '../cohort-plot/cohort-plot.component';

const routes: Routes = [
  {
    path: '',
    component: Demo2Component
  },
  {
    path: 'demo2',
    component: Demo2Component
  },
  {
    path: 'demo2/:dataset',
    component: Demo2Component
  },
  {
    path: 'compare',
    component: CompareComponent
  },
  {
    path: 'cohort',
    component: CohortPlotComponent
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forRoot(routes)
  ],
  exports: [RouterModule],
  declarations: []
})
export class RoutingModule { }
