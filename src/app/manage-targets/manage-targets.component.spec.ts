import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageTargetsComponent } from './manage-targets.component';

describe('ManageTargetsComponent', () => {
  let component: ManageTargetsComponent;
  let fixture: ComponentFixture<ManageTargetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageTargetsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ManageTargetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
