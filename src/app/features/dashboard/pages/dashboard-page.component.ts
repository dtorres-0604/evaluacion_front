import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { map } from 'rxjs';
import { selectUserName } from '../../../store/auth/auth.selectors';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  private readonly store = inject(Store);

  readonly fullName$ = this.store.select(selectUserName).pipe(map((value) => value ?? 'Usuario'));
  readonly sessionStart = new Date();
}
