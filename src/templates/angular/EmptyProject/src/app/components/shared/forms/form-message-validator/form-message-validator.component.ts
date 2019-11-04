import { Component, OnInit, Input } from '@angular/core';
import { FormControl } from '@angular/forms';
import { FormMessageValidatorService } from 'src/app/services/utils/form-message-validator.service';

@Component({
  selector: 'app-form-message-validator',
  templateUrl: './form-message-validator.component.html',
  styleUrls: ['./form-message-validator.component.scss']
})
export class FormMessageValidatorComponent implements OnInit {
  @Input() control: FormControl;

  constructor() {}

  ngOnInit() {}

  get errorMessage() {
    if (this.control) {
      for (let propertyName in this.control.errors) {
        if (
          this.control.errors.hasOwnProperty(propertyName) &&
          (this.control.touched || this.control.dirty)
        ) {
          return FormMessageValidatorService.getValidatorErrorMessage(
            propertyName
          );
        }
      }
    }

    return null;
  }
}
