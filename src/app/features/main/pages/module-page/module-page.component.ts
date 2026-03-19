import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-module-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './module-page.component.html',
  styleUrl: './module-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulePageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly title = this.route.snapshot.data['title'] as string;
  readonly description = this.route.snapshot.data['description'] as string;
}
