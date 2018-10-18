import { Injectable } from '@angular/core';
import { FormControl } from '@angular/forms';

import * as moment from 'moment';
import { DataService } from './data.service';
import { ConfigurationService } from './configuration.service';

@Injectable()
export class SchemaService {
  datasets = {
    'health': {
      'local': 'France',
      'geometry': 'rect',
      'geometry_size': 0,
      'resolution': 5,
      'composition': 'lighter',
      'color': 'ryw',

      'datasetName': 'health-durations',
      'timeStep': 86400,

      'identifier': 'event_id',
      'trajectory': 'value_t',

      'temporalDimension': {
        'event_date': { 'lower': 0, 'upper': 0 }
      },
      'spatialDimension': ['coord'],
      'categoricalDimension': ['has_left', 'dead', 'gender', /* 'marker', */ 'age'],
      'payloads': ['value', 'value_delta'],
      'payloadValues': {
        'value': {
          'quantile': { 'min_value': 0, 'max_value': 52, 'value': 0.5, 'min': 0, 'max': 1, 'step': 0.05 },
          'cdf': { 'min_value': 0, 'max_value': 1, 'value': 30, 'min': 0, 'max': 60, 'step': 1 },
          'mean': { 'min_value': 0, 'max_value': 52 },
          'variance': { 'min_value': 0, 'max_value': 100 },
          'pipeline': { 'min_value': 0, 'max_value': 1 }
        },
        'value_delta': {
          'quantile': { 'min_value': 0, 'max_value': 52, 'value': 0.75, 'min': 0, 'max': 1, 'step': 0.05 },
          'cdf': { 'min_value': 0, 'max_value': 1, 'value': 0, 'min': -10, 'max': 10, 'step': 0.01 },
          'mean': { 'min_value': 0, 'max_value': 52 },
          'variance': { 'min_value': 0, 'max_value': 100 },
          'pipeline': { 'min_value': 0, 'max_value': 1 }
        }
      },
      'aliases': {
        'has_left' : ['No', 'Yes'],

        'dead': ['No', 'Yes'],

        'gender': ['F', 'M'],

        'marker': ['iah', 'bmi', 'epworth'],

        'age': ['<55', '55-61', '62-66', '67-70', '71-74', '75-79', '80-85', '>85']
      }
    }
  };

  constructor(
    private config: ConfigurationService,
    private dataService: DataService,
  ) { }

  get(dataset?: string): any {
    let obj: any;
    if (dataset !== undefined) {
      obj = this.datasets[dataset];
    } else {
      obj = this.datasets[this.config.defaultDataset];
    }
    return obj;
  }

  getPromise(key: string) {
    return new Promise((resolve, reject) => {
      const dataset = this.datasets[key];
      this.dataService.schema('/dataset=' + dataset.datasetName).subscribe(data => {
        if ((<any[]>data).length === 0) {
          resolve(true);
          return;
        }
        for (const dim of data.index_dimensions) {
          if (dim.type === 'temporal') {
            const interval = (<string>dim.hint).split('|');
            dataset.temporalDimension[dim.index].lower = interval[0];
            dataset.temporalDimension[dim.index].upper = interval[1];
          }
        }
        resolve(true);
      });
    });
  }

  load() {
    const promises = [];
    for (const key of Object.keys(this.datasets)) {
      promises.push(this.getPromise(key));
    }

    return new Promise((resolve, reject) => {
      Promise.all(promises).then(() => resolve(true));
    });
  }
}
