import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AuthActions } from '../../../store/auth/auth.actions';
import { selectAuthError, selectAuthLoading } from '../../../store/auth/auth.selectors';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly store = inject(Store);

  readonly loading$ = this.store.select(selectAuthLoading);
  readonly error$ = this.store.select(selectAuthError);
  isButtonDisabled = true;

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    this.loginForm.valueChanges.subscribe(() => {
      this.validateFormState();
    });
  }

  onSubmit(): void {
    this.validateFormState();

    if (this.loginForm.invalid || this.isButtonDisabled) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.store.dispatch(
      AuthActions.login({
        request: this.loginForm.getRawValue(),
      }),
    );
  }

  private validateFormState(): void {
    const password = this.loginForm.controls.password.value;
    const emailIsValid = this.loginForm.controls.email.valid;

    this.isButtonDisabled = !(emailIsValid && !!password);
  }
}
