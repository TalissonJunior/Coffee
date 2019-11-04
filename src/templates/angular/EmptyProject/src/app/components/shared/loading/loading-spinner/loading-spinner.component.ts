import { Component, OnInit, Input } from '@angular/core';
import { LoadingService } from 'src/app/services/utils/loading.service';

@Component({
  selector: 'app-loading-spinner',
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.scss']
})
export class LoadingSpinnerComponent implements OnInit {
  @Input() bdColor = 'rgba(51,51,51,0.2)';
  @Input() size = 'small';
  @Input() type = 'ball-atom';
  @Input() fullScreen = false;

  class = '';

  constructor(public loadingService: LoadingService) {}

  ngOnInit() {
    this.class = this.getClass(this.type, this.size);
  }

  private getClass(type: string, size: string): string {
    let sizeClass = '';
    switch (size.toLowerCase()) {
      case 'small':
        sizeClass = 'la-sm';
        break;
      case 'medium':
        sizeClass = 'la-2x';
        break;
      case 'large':
        sizeClass = 'la-3x';
        break;
      default:
        break;
    }
    return 'la-' + type + ' ' + sizeClass;
  }
}
