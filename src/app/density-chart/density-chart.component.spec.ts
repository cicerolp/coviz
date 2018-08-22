import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DensityChartComponent } from './density-chart.component';

describe('DensityChartComponent', () => {
  let component: DensityChartComponent;
  let fixture: ComponentFixture<DensityChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DensityChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DensityChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
