import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TemporalBandComponent } from './temporal-band.component';

describe('TemporalBandComponent', () => {
  let component: TemporalBandComponent;
  let fixture: ComponentFixture<TemporalBandComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TemporalBandComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TemporalBandComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
