import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingState = 0;
  private visible: boolean = false;
  private backdrop: boolean = true;

  constructor() {}

  isVisible(): boolean {
    return this.visible;
  }

  show(backdrop: boolean = true): void {
    this.loadingState++;
    if (this.visible == false) {
      this.backdrop = backdrop;
      this.visible = true;
    }
  }

  hide(): void {
    this.loadingState--;
    if (this.visible == true && this.loadingState == 0) {
      this.visible = false;
    }
  }

  hasBackdrop(): boolean {
    return this.backdrop;
  }
}
