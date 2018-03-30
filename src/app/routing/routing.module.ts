import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

import { Demo1Component } from '../demo1/demo1.component';
import { Demo2Component } from '../demo2/demo2.component';
import { Demo3Component } from '../demo3/demo3.component';
import { Demo4Component } from '../demo4/demo4.component';
import { Demo5Component } from '../demo5/demo5.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'demo1/on_time_performance',
    pathMatch: 'full'
  },
  {
    path: 'demo1',
    redirectTo: 'demo1/on_time_performance'
  },
  {
    path: 'demo1/:dataset',
    component: Demo1Component
  },
  {
    path: 'demo2',
    redirectTo: 'demo2/green_tripdata'
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
