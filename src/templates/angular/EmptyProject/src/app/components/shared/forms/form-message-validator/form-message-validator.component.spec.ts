import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FormMessageValidatorComponent } from './form-message-validator.component';

describe('FormMessageValidatorComponent', () => {
  let component: FormMessageValidatorComponent;
  let fixture: ComponentFixture<FormMessageValidatorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [FormMessageValidatorComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FormMessageValidatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
});
