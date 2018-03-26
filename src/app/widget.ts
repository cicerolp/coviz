import * as d3 from 'd3';
import { Subject } from 'rxjs/Subject';

export interface Widget {
  uniqueId: string;
  dim: string;
  data: Array<any>;
  subject: Subject<any>;
  callbacks: Array<any>;

  loadWidget(): void;

  setNextTerm(query: string): void;

  register(dim: string, callback: any): void;
  unregister(callback: any): void;

  broadcast(): void;
}
