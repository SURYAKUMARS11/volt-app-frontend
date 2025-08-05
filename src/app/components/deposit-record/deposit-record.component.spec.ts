import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepositRecordComponent } from './deposit-record.component';

describe('DepositRecordComponent', () => {
  let component: DepositRecordComponent;
  let fixture: ComponentFixture<DepositRecordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepositRecordComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DepositRecordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
