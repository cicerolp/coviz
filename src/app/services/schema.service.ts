import { Injectable } from '@angular/core';
import { FormControl } from '@angular/forms';

import * as moment from 'moment';
import { DataService } from './data.service';
import { ConfigurationService } from './configuration.service';

@Injectable()
export class SchemaService {
  datasets = {
    'on_time_performance': {
      'local': 'USA',
      'datasetName': 'on_time_performance',
      'timeStep': 86400,
      'temporalDimension': {
        'crs_dep_time': { 'lower': 978307200, 'upper': 1009756800 }
      },
      'spatialDimension': ['origin_airport', 'dest_airport'],
      // 'categoricalDimension': ['cancelled', 'diverted', 'unique_carrier', 'origin_airport_id'],
      'categoricalDimension': ['unique_carrier'],
      'payloads': ['arr_delay', 'dep_delay'],
      'payloadsScreenNames': {
        'arr_delay': 'Arrival Delay',
        'dep_delay': 'Depature Delay'
      },
      'aliases': {
        'cancelled': {
          '0': 'No',
          '1': 'Yes'
        },
        'diverted': {
          '0': 'No',
          '1': 'Yes'
        },
        'unique_carrier': {
          // TODO
        },
        'origin_airport_id': {
          // TODO
        }
      }
    }
  };

  constructor() { }

  get(dataset: string): any {
    return this.datasets[dataset];
  }
}
