import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MakePortalLinkComponent } from './make-portal-link.component';

describe('MakePortalLinkComponent', () => {
  let component: MakePortalLinkComponent;
  let fixture: ComponentFixture<MakePortalLinkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MakePortalLinkComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MakePortalLinkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
