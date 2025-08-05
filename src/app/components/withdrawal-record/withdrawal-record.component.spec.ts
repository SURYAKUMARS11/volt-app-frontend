import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WithdrawalRecordComponent } from './withdrawal-record.component';

describe('WithdrawalRecordComponent', () => {
  let component: WithdrawalRecordComponent;
  let fixture: ComponentFixture<WithdrawalRecordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WithdrawalRecordComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WithdrawalRecordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
