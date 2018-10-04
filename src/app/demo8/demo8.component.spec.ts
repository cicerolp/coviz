import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { Demo8Component } from './demo8.component';

describe('Demo8Component', () => {
  let component: Demo8Component;
  let fixture: ComponentFixture<Demo8Component>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ Demo8Component ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(Demo8Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
