import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DataService } from './data.service';
import { SchemaService } from './schema.service';

@Injectable()
export class GeoDataService {
  private dataset;

  public json = new Map();
  public json_curr = new Map();
  public json_valid = new Map();
  public json_value = new Map();
  public json_min_max = new Map();
  public json_selected = new Map();

  constructor(
    private httpService: HttpClient,
    private dataService: DataService,
    private schemaService: SchemaService
  ) { }

  load() {
    this.dataset = this.schemaService.get('health');

    // initialize maps
    this.json_selected.set('region', new Map());
    this.json_selected.set('department', new Map());
    this.json_selected.set('arrondissement', new Map());
    this.json_selected.set('commune', new Map());

    this.json_min_max.set('region', [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]);
    this.json_min_max.set('department', [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]);
    this.json_min_max.set('arrondissement', [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]);
    this.json_min_max.set('commune', [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]);

    let getRegionPromise = (dim, file) => {
      return new Promise((resolve, reject) => {
        this.httpService.get(file)
          .subscribe(response => {
            this.json.set(dim, response);
            resolve(true);
          }, (err: HttpErrorResponse) => {
            console.log(err.message);
          });
      })
    };

    let getCodePromise = (dim, file) => {
      return new Promise((resolve, reject) => {
        this.httpService.get(file)
          .subscribe(response => {
            this.json.set(dim, response);

            const query = '/query' +
              '/dataset=' + this.dataset.datasetName +
              '/aggr=count' +
              '/const=' + dim + '.values.(all)' +
              '/group=' + dim;

            this.dataService.query(query).subscribe(response => {
              this.json_valid.set(dim, response[0]);
              resolve(true);

            }, (err: HttpErrorResponse) => {
              console.log(err.message);
            });

          }, (err: HttpErrorResponse) => {
            console.log(err.message);
          });
      })
    };

    let promises = [];

    promises.push(getRegionPromise('country', './assets/geojson/countries.geojson'));
    promises.push(getRegionPromise('region', './assets/geojson/france-regions.geojson'));
    promises.push(getCodePromise('department', './assets/geojson/france-departements.geojson'));
    promises.push(getCodePromise('arrondissement', './assets/geojson/france-arrondissements.geojson'));
    promises.push(getRegionPromise('commune', './assets/geojson/france-communes.geojson'));
    

    return new Promise((resolve, reject) => {
      Promise.all(promises).then(() => resolve(true));
    });
  }
}
