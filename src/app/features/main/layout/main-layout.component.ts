import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { map } from 'rxjs';
import { sidebarMenu } from '../../../core/lists/sidebar-menu';
import { hasPermission } from '../../../core/auth/permission.utils';
import { AuthActions } from '../../../store/auth/auth.actions';
import { selectPermissions, selectUserName } from '../../../store/auth/auth.selectors';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  private readonly store = inject(Store);

  collapsed = false;

  readonly userName$ = this.store.select(selectUserName).pipe(map((value) => value ?? 'Usuario'));

  readonly menuItems$ = this.store.select(selectPermissions).pipe(
    map((grantedPermissions) =>
      sidebarMenu.filter((item) => hasPermission(item.subject, grantedPermissions)),
    ),
  );

  onToggleSidenav(): void {
    this.collapsed = !this.collapsed;
  }

  onLogout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}
