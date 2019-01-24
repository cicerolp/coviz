import { TestBed, inject } from '@angular/core/testing';

import { DataSharingService } from './data-sharing.service';

describe('DataSharingService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DataSharingService]
    });
  });

  it('should be created', inject([DataSharingService], (service: DataSharingService) => {
    expect(service).toBeTruthy();
  }));
});
