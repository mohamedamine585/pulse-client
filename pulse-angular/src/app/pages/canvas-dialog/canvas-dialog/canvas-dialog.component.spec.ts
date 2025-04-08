import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CanvasDialogComponent } from './canvas-dialog.component';

describe('CanvasDialogComponent', () => {
  let component: CanvasDialogComponent;
  let fixture: ComponentFixture<CanvasDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanvasDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CanvasDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
