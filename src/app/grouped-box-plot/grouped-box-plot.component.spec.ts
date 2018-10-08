import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupedBoxPlotComponent } from './grouped-box-plot.component';

describe('GroupedBoxPlotComponent', () => {
  let component: GroupedBoxPlotComponent;
  let fixture: ComponentFixture<GroupedBoxPlotComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GroupedBoxPlotComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupedBoxPlotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
