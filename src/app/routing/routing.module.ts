import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

import { AppComponent } from '../app.component';

const routes: Routes = [
  {
    path: '',
    component: AppComponent
  }/* ,
  {
    path: 'app-demo1',
    component: Demo1Component
  },
  {
    path: 'app-demo2',
    component: Demo2Component
  },
  {
    path: 'app-demo3',
    component: Demo3Component
  },
  {
    path: 'app-demo4',
    component: Demo4Component
  } */
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
