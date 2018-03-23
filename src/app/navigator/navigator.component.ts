import { Component, OnInit, ElementRef } from '@angular/core';
import { GeocodingService } from '../services/geocoding.service';
import { MapService } from '../services/map.service';

import { Location } from '../location';

@Component({
  selector: 'app-navigator',
  templateUrl: './navigator.component.html',
  styleUrls: ['./navigator.component.css']
})
export class NavigatorComponent implements OnInit {
  address: string;

  constructor(
    private geocodingService: GeocodingService,
    private mapService: MapService,
    private ref: ElementRef
  ) { }

  ngOnInit() {
    this.mapService.disableEvent(this.ref);
  }

  goto(): void {
    if (!this.address) {
      return;
    }

    this.geocodingService.geocode(this.address)
      .subscribe(location => {
        this.mapService.flyTo(location);
        this.address = location.address;
      }, error => console.error(error));
  }
}
