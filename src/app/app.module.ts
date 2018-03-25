import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { HttpModule } from '@angular/http';
import { HttpClientModule } from '@angular/common/http';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { RoutingModule } from './routing/routing.module';

import { GeocodingService } from './services/geocoding.service';

import { AppComponent } from './app.component';
import { NavbarComponent } from './navbar/navbar.component';
import { MapService } from './services/map.service';
import { NavigatorComponent } from './navigator/navigator.component';

import { MaterialModule } from './material/material.module';
import { DataService } from './services/data.service';
import { ConfigurationService } from './services/configuration.service';
import { LineChartComponent } from './line-chart/line-chart.component';


@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    NavigatorComponent,
    LineChartComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,

    HttpModule,
    FormsModule,
    ReactiveFormsModule,

    HttpClientModule,

    NgbModule.forRoot(),

    MaterialModule,
    RoutingModule
  ],
  providers: [GeocodingService, MapService, DataService, ConfigurationService],
  bootstrap: [AppComponent]
})
export class AppModule { }
