import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { hasPermission } from '../../../../core/auth/permission.utils';
import { selectPermissions } from '../../../../store/auth/auth.selectors';

@Component({
  selector: 'app-home-redirect-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-redirect-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeRedirectPageComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.store
      .select(selectPermissions)
      .pipe(take(1))
      .subscribe((permissions) => {
        const target = this.resolveTargetRoute(permissions);
        void this.router.navigateByUrl(target);
      });
  }

  private resolveTargetRoute(permissions: string[]): string {
    if (hasPermission('read:tests', permissions)) {
      return '/main/dashboard';
    }

    if (hasPermission('read:users', permissions)) {
      return '/main/users';
    }

    if (hasPermission('read:assignments', permissions)) {
      return '/main/assignments';
    }

    if (hasPermission('read:candidate-attempt', permissions)) {
      return '/main/attempts';
    }

    if (hasPermission('read:ai-analysis', permissions)) {
      return '/main/ai-analysis';
    }

    return '/login?denied=1';
  }
}
