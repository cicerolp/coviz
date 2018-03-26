import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  MatDatetimepickerModule,
  MatNativeDatetimeModule,
  MAT_DATETIME_FORMATS
} from '@mat-datetimepicker/core';

import {
  MatMomentDatetimeModule,
  MAT_MOMENT_DATETIME_FORMATS
} from '@mat-datetimepicker/moment';

import {
  MatButtonModule,
  MatCheckboxModule,
  MatFormFieldModule,
  MatSidenavModule,
  MatToolbarModule,
  MatInputModule,
  MatSelectModule,
  MatOptionModule,
  MatCardModule,
  MatSliderModule,
  MatDatepickerModule,
  MatDividerModule,
  MatGridListModule
} from '@angular/material';

import {
  MatMomentDateModule
} from '@angular/material-moment-adapter';

@NgModule({
  imports: [
    CommonModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatSidenavModule,
    MatToolbarModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatCardModule,
    MatSliderModule,
    MatInputModule,
    MatMomentDateModule,
    MatDatepickerModule,
    MatDatetimepickerModule,
    MatMomentDatetimeModule,
    MatDividerModule,
    MatGridListModule
  ],
  exports: [
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatSidenavModule,
    MatToolbarModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatCardModule,
    MatSliderModule,
    MatInputModule,
    MatMomentDateModule,
    MatDatepickerModule,
    MatDatetimepickerModule,
    MatDividerModule,
    MatGridListModule
  ]
})
export class MaterialModule { }
