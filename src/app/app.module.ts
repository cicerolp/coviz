import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';
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
import { SchemaService } from './services/schema.service';
import { CalendarComponent } from './calendar/calendar.component';
import { BarChartComponent } from './bar-chart/bar-chart.component';
import { WidgetHostDirective } from './widget-host.directive';

import { Md2Module, NoConflictStyleCompatibilityMode } from 'md2';
import { Demo1Component } from './demo1/demo1.component';
import { Demo2Component } from './demo2/demo2.component';
import { Demo3Component } from './demo3/demo3.component';
import { Demo4Component } from './demo4/demo4.component';
import { Demo5Component } from './demo5/demo5.component';
import { TemporalBandComponent } from './temporal-band/temporal-band.component';
import { BoxPlotComponent } from './box-plot/box-plot.component';
import { TimezoneService } from './services/timezone.service';

export function configProviderFactory(provider: SchemaService) {
  return () => provider.load();
}

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    NavigatorComponent,
    LineChartComponent,
    CalendarComponent,
    BarChartComponent,
    WidgetHostDirective,
    Demo1Component,
    Demo2Component,
    Demo3Component,
    Demo4Component,
    Demo5Component,
    TemporalBandComponent,
    BoxPlotComponent
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
    RoutingModule,

    Md2Module,
    NoConflictStyleCompatibilityMode,
  ],
  providers: [
    SchemaService,
    {
      provide: APP_INITIALIZER,
      useFactory: configProviderFactory,
      deps: [SchemaService],
      multi: true
    },
    GeocodingService,
    MapService,
    DataService,
    ConfigurationService,
    TimezoneService
  ],
  bootstrap: [AppComponent],
  entryComponents: [BarChartComponent, LineChartComponent, CalendarComponent, TemporalBandComponent, BoxPlotComponent],
})
export class AppModule { }
