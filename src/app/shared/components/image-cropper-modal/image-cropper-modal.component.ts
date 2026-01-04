import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageCroppedEvent, ImageCropperComponent, LoadedImage } from 'ngx-image-cropper';

@Component({
  selector: 'app-image-cropper-modal',
  standalone: true,
  imports: [CommonModule, ImageCropperComponent],
  templateUrl: './image-cropper-modal.component.html',
  styleUrl: './image-cropper-modal.component.scss'
})
export class ImageCropperModalComponent {
  @ViewChild('cropper') cropper!: ImageCropperComponent;

  @Input() imageFile: File | null | undefined = null;
  @Input() aspectRatio: number = 1; // 1:1 for circle
  @Input() roundCropper: boolean = true;
  @Input() resizeToWidth: number = 300;
  @Input() resizeToHeight: number = 300;
  @Input() maintainAspectRatio: boolean = true;
  @Input() format: 'png' | 'jpeg' | 'webp' = 'png';
  @Input() quality: number = 92;

  @Output() imageCropped = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  isVisible: boolean = false;
  croppedImage: string = '';
  isLoading: boolean = true;
  imageLoadFailed: boolean = false;
  zoomLevel: number = 1;
  readonly minZoom: number = 0.5;
  readonly maxZoom: number = 3;
  readonly zoomStep: number = 0.1;

  show(): void {
    this.isVisible = true;
    this.isLoading = true;
    this.imageLoadFailed = false;
    this.zoomLevel = 1;
  }

  hide(): void {
    this.isVisible = false;
    this.imageFile = null;
    this.croppedImage = '';
    this.zoomLevel = 1;
  }

  onImageCropped(event: ImageCroppedEvent): void {
    if (event.base64) {
      this.croppedImage = event.base64;
    }
  }

  onImageLoaded(image: LoadedImage): void {
    this.isLoading = false;
  }

  onCropperReady(): void {
    this.isLoading = false;
  }

  onLoadImageFailed(): void {
    this.isLoading = false;
    this.imageLoadFailed = true;
  }

  confirmCrop(): void {
    if (this.croppedImage) {
      this.imageCropped.emit(this.croppedImage);
      this.hide();
    }
  }

  cancel(): void {
    this.cancelled.emit();
    this.hide();
  }

  zoomIn(): void {
    if (this.zoomLevel < this.maxZoom) {
      this.zoomLevel = Math.min(this.zoomLevel + this.zoomStep, this.maxZoom);
    }
  }

  zoomOut(): void {
    if (this.zoomLevel > this.minZoom) {
      this.zoomLevel = Math.max(this.zoomLevel - this.zoomStep, this.minZoom);
    }
  }

  resetZoom(): void {
    this.zoomLevel = 1;
  }

  onZoomChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.zoomLevel = parseFloat(input.value);
  }
}
