import * as d3 from 'd3';
import { Subject } from 'rxjs/Subject';

export interface Widget {
  uniqueId: string;
  dataset: any;
  dim: string;
  data: Array<any>;
  subject: Subject<any>;
  callbacks: Array<any>;

  loadWidget(): void;

  setNextTerm(query: string): void;

  register(dim: string, callback: any): void;
  unregister(callback: any): void;

  setDataset(dataset: string): void;

  broadcast(): void;

  setXLabel(label: string): void;
  setYLabel(label: string): void;
  setFormatter(formatter: any): void;
}
