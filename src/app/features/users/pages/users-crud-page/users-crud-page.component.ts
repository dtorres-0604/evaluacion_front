import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { RoleOptionDto, UserCreateDto, UserDto, UsersService } from '../../services/users.service';

@Component({
  selector: 'app-users-crud-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users-crud-page.component.html',
  styleUrl: './users-crud-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersCrudPageComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly formBuilder = inject(FormBuilder);

  @ViewChild('rolesComboboxRef')
  rolesComboboxRef?: ElementRef<HTMLElement>;

  users: UserDto[] = [];
  availableRoles: RoleOptionDto[] = [];
  loading = false;
  loadingRoles = false;
  saving = false;
  errorMessage = '';
  formMessage = '';
  isEditMode = false;
  editingUserId: number | null = null;
  rolesDropdownOpen = false;
  roleSearchTerm = '';

  readonly userForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    name: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    phone: [''],
    department: ['', [Validators.required]],
    roles: this.formBuilder.nonNullable.control<string[]>([], [Validators.required]),
  });

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
  }

  get filteredRoles(): RoleOptionDto[] {
    const term = this.roleSearchTerm.trim().toLowerCase();

    if (!term) {
      return this.availableRoles;
    }

    return this.availableRoles.filter((role) => role.name.toLowerCase().includes(term));
  }

  get selectedRolesLabel(): string {
    const selected = this.userForm.controls.roles.value;

    if (!selected.length) {
      return 'Selecciona uno o varios roles';
    }

    return selected.join(', ');
  }

  loadRoles(): void {
    this.loadingRoles = true;

    this.usersService
      .getRoles()
      .pipe(finalize(() => (this.loadingRoles = false)))
      .subscribe({
        next: (roles) => {
          this.availableRoles = roles;

          if (
            !this.isEditMode &&
            this.userForm.controls.roles.value.length === 0 &&
            roles.length > 0
          ) {
            this.userForm.controls.roles.setValue([roles[0].name]);
          }
        },
        error: () => {
          this.errorMessage = 'No se pudo cargar el catalogo de roles.';
        },
      });
  }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.usersService
      .getUsers()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (users) => {
          this.users = users;
        },
        error: () => {
          this.errorMessage = 'No se pudo cargar el listado de usuarios.';
        },
      });
  }

  onSubmit(): void {
    this.formMessage = '';
    this.errorMessage = '';

    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.formMessage = 'Completa los campos obligatorios y selecciona al menos un rol.';
      return;
    }

    const raw = this.userForm.getRawValue();
    const payload: UserCreateDto = {
      username: raw.username,
      email: raw.email,
      password: raw.password,
      name: raw.name,
      lastName: raw.lastName,
      phone: raw.phone || undefined,
      department: raw.department,
      roles: raw.roles,
    };

    this.saving = true;

    const updatePayload: Partial<UserCreateDto> = {
      username: payload.username,
      email: payload.email,
      name: payload.name,
      lastName: payload.lastName,
      phone: payload.phone,
      department: payload.department,
      roles: payload.roles,
      ...(payload.password ? { password: payload.password } : {}),
    };

    const request$ =
      this.isEditMode && this.editingUserId
        ? this.usersService.updateUser(this.editingUserId, updatePayload)
        : this.usersService.createUser(payload);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this.saving = false;
        this.formMessage = this.isEditMode
          ? 'Usuario actualizado correctamente.'
          : 'Usuario creado correctamente.';
        this.resetForm();
        this.loadUsers();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = this.mapHttpError(
          error,
          this.isEditMode ? 'No se pudo actualizar el usuario.' : 'No se pudo crear el usuario.',
        );
      },
    });
  }

  onEdit(user: UserDto): void {
    this.isEditMode = true;
    this.editingUserId = user.id;

    this.userForm.patchValue({
      username: user.username,
      email: user.email,
      password: '',
      name: user.name,
      lastName: user.lastName,
      phone: user.phone ?? '',
      department: user.department,
      roles: user.roles,
    });

    this.userForm.controls.password.clearValidators();
    this.userForm.controls.password.updateValueAndValidity();
  }

  onDelete(user: UserDto): void {
    if (!confirm(`Deseas eliminar al usuario ${user.username}?`)) {
      return;
    }

    this.usersService.deleteUser(user.id).subscribe({
      next: () => this.loadUsers(),
      error: (error) => {
        this.errorMessage = this.mapHttpError(error, 'No se pudo eliminar el usuario.');
      },
    });
  }

  onCancelEdit(): void {
    this.resetForm();
  }

  toggleRolesDropdown(): void {
    this.rolesDropdownOpen = !this.rolesDropdownOpen;

    if (!this.rolesDropdownOpen) {
      this.roleSearchTerm = '';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.rolesDropdownOpen) {
      return;
    }

    const target = event.target as Node | null;
    if (!target) {
      return;
    }

    if (this.rolesComboboxRef?.nativeElement.contains(target)) {
      return;
    }

    this.rolesDropdownOpen = false;
    this.roleSearchTerm = '';
  }

  onRoleSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.roleSearchTerm = input.value;
  }

  isRoleSelected(roleName: string): boolean {
    return this.userForm.controls.roles.value.includes(roleName);
  }

  onRoleToggle(event: Event, roleName: string): void {
    const checkbox = event.target as HTMLInputElement;
    const current = [...this.userForm.controls.roles.value];

    if (checkbox.checked) {
      if (!current.includes(roleName)) {
        current.push(roleName);
      }
    } else {
      const index = current.indexOf(roleName);
      if (index >= 0) {
        current.splice(index, 1);
      }
    }

    this.userForm.controls.roles.setValue(current);
    this.userForm.controls.roles.markAsTouched();
  }

  private resetForm(): void {
    this.isEditMode = false;
    this.editingUserId = null;
    this.userForm.reset({
      username: '',
      email: '',
      password: '',
      name: '',
      lastName: '',
      phone: '',
      department: '',
      roles: [],
    });
    this.rolesDropdownOpen = false;
    this.roleSearchTerm = '';
    this.userForm.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
    this.userForm.controls.password.updateValueAndValidity();
  }

  private mapHttpError(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallback;
    }

    const payload = error.error as
      | { message?: string; errors?: Record<string, string[]> }
      | undefined;

    if (payload?.message) {
      return payload.message;
    }

    if (payload?.errors) {
      const first = Object.values(payload.errors).find(
        (messages) => Array.isArray(messages) && messages.length > 0,
      );
      if (first) {
        return first[0];
      }
    }

    return fallback;
  }
}
