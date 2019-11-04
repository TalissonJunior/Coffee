import { TestBed } from '@angular/core/testing';

import { FormMessageValidatorService } from './form-message-validator.service';

describe('FormMessageValidatorService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: FormMessageValidatorService = TestBed.get(
      FormMessageValidatorService
    );
    expect(service).toBeTruthy();
  });
});
