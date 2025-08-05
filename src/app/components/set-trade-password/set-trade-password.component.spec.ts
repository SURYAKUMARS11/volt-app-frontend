import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetTradePasswordComponent } from './set-trade-password.component';

describe('SetTradePasswordComponent', () => {
  let component: SetTradePasswordComponent;
  let fixture: ComponentFixture<SetTradePasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetTradePasswordComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetTradePasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
