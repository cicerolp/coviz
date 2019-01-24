import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CohortPlotComponent } from './cohort-plot.component';

describe('CohortPlotComponent', () => {
  let component: CohortPlotComponent;
  let fixture: ComponentFixture<CohortPlotComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CohortPlotComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CohortPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
