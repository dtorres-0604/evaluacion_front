import { Injectable } from '@angular/core';
import { palette } from './palette';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  applyTheme(): void {
    const root = document.documentElement;

    root.style.setProperty('--color-primary-main', palette.primary.main);
    root.style.setProperty('--color-primary-text', palette.primary.text);
    root.style.setProperty('--color-primary-modal-text-1', palette.primary.modal_text_1);

    root.style.setProperty('--color-dynamic-success', palette.dinamic_components.success);
    root.style.setProperty('--color-dynamic-preparation', palette.dinamic_components.preparation);
    root.style.setProperty('--color-dynamic-danger', palette.dinamic_components.danger);

    root.style.setProperty('--color-driver-success', palette.driver_card.success);
    root.style.setProperty('--color-driver-warning', palette.driver_card.warning);
    root.style.setProperty('--color-driver-on-way', palette.driver_card.on_way);

    root.style.setProperty('--color-button-save', palette.buttons.modal_save);
    root.style.setProperty('--color-button-cancel', palette.buttons.modal_cancel);
    root.style.setProperty('--color-button-blue-aqua', palette.buttons.blue_aqua);
    root.style.setProperty('--color-button-red', palette.buttons.red);
    root.style.setProperty('--color-button-green', palette.buttons.green);
    root.style.setProperty('--color-button-full-blue', palette.buttons.full_blue);
  }
}
