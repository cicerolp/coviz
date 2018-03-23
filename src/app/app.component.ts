import { Component, ViewChild, OnInit, ElementRef, AfterViewInit } from '@angular/core';
import { MapService } from './services/map.service';
import { Marker } from './marker';

import { FormBuilder, FormGroup, FormControl } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  private title = 'app';
  private marker: Marker;

  mode = new FormControl('over');
  options: FormGroup;

  geometry_values = [
    { value: 'rect', viewValue: 'Rectangle' },
    { value: 'circle', viewValue: 'Circle' }
  ];

  constructor(private mapService: MapService, fb: FormBuilder) {
    this.options = fb.group({
      geometry: new FormControl('rect'),
      resolution: new FormControl(8),
    });
  }

  applyConfig(event) {
    console.log(this.options.get('geometry').value);
    console.log(this.options.get('resolution').value);
  }

  ngOnInit() {
    this.mapService.load();
  }

  ngAfterViewInit() {
    this.marker = new Marker(this.mapService);
    this.marker.register(this.callback);
  }

  public callback = (latlng: any, zoom: number): void => {
    const z = zoom + 8;
    const region = this.mapService.get_coords_bounds(latlng, z);

    /* const z = zoom + 8;
    const region = this.mapService.get_coords_bounds(latlng, z);

    const action = 'data/' + z
      + '/' + region.x0
      + '/' + region.y0
      + '/' + region.x1
      + '/' + region.y1;

    this.queries.next(action); */
  }
}
