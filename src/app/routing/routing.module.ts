import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

import { Demo1Component } from '../demo1/demo1.component';
import { Demo2Component } from '../demo2/demo2.component';
import { Demo3Component } from '../demo3/demo3.component';
import { Demo4Component } from '../demo4/demo4.component';
import { Demo5Component } from '../demo5/demo5.component';
import { Demo6Component } from '../demo6/demo6.component';
import { Demo7Component } from '../demo7/demo7.component';
import { Demo8Component } from '../demo8/demo8.component';
import { CompareComponent } from '../compare/compare.component';

const routes: Routes = [
  {
    path: '',
    component: Demo2Component
  },
  {
    path: 'demo1',
    component: Demo1Component
  },
  {
    path: 'demo1/:dataset',
    component: Demo1Component
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
    path: 'demo3',
    component: Demo3Component
  },
  {
    path: 'demo4',
    redirectTo: 'demo4/yellow_tripdata'
  },
  {
    path: 'demo4/:dataset',
    component: Demo4Component
  },
  {
    path: 'demo5',
    component: Demo5Component
  },
  {
    path: 'demo6',
    redirectTo: 'demo6/hurdat2'
  },
  {
    path: 'demo6/:dataset',
    component: Demo6Component
  },
  {
    path: 'demo7',
    redirectTo: 'demo7/cvrr-i5sim'
  },
  {
    path: 'demo7/:dataset',
    component: Demo7Component
  },
  {
    path: 'demo8',
    redirectTo: 'demo8/health'
  },  
  {
    path: 'demo8/:dataset',
    component: Demo8Component
  },
  {
    path: 'compare',
    component: CompareComponent
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
