import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  AssignmentCandidateOption,
  AssignmentSummary,
  AssignmentTestOption,
  AssignmentsService,
} from '../../services/assignments.service';

@Component({
  selector: 'app-assignments-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './assignments-page.component.html',
  styleUrl: './assignments-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignmentsPageComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly assignmentsService = inject(AssignmentsService);
  private readonly cdr = inject(ChangeDetectorRef);

  tests: AssignmentTestOption[] = [];
  candidates: AssignmentCandidateOption[] = [];
  assignments: AssignmentSummary[] = [];

  loadingOptions = false;
  loadingAssignments = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  readonly assignmentForm = this.formBuilder.nonNullable.group({
    testId: [0, [Validators.required, Validators.min(1)]],
    candidateUserId: [0, [Validators.required, Validators.min(1)]],
    enabledFrom: [''],
    enabledTo: [''],
  });

  ngOnInit(): void {
    this.loadOptions();
    this.loadAssignments();
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.assignmentForm.invalid) {
      this.assignmentForm.markAllAsTouched();
      this.errorMessage = 'Selecciona una prueba y un candidato para asignar.';
      return;
    }

    const raw = this.assignmentForm.getRawValue();
    this.saving = true;

    this.assignmentsService
      .createAssignment({
        testId: raw.testId,
        candidateUserId: raw.candidateUserId,
        enabledFrom: raw.enabledFrom || null,
        enabledTo: raw.enabledTo || null,
      })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (result) => {
          if (result.usedFallback) {
            this.successMessage = 'Asignacion creada con flujo de contingencia (fallback).';
          } else {
            this.successMessage = `Asignacion procesada. Creadas: ${result.createdAssignmentIds.length}, omitidas: ${result.skippedCandidateUserIds.length}, no encontradas: ${result.notFoundCandidateUserIds.length}.`;
          }

          this.assignmentForm.patchValue({
            testId: 0,
            candidateUserId: 0,
            enabledFrom: '',
            enabledTo: '',
          });

          this.loadAssignments();
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'No se pudo crear la asignacion.';
          this.cdr.markForCheck();
        },
      });
  }

  resolveTestTitle(testId: number): string {
    const found = this.tests.find((test) => test.id === testId);
    return found?.title ?? `Prueba #${testId}`;
  }

  resolveCandidateName(candidateUserId: number | null): string {
    if (candidateUserId === null) {
      return '-';
    }

    const found = this.candidates.find((candidate) => candidate.id === candidateUserId);
    return found?.fullName ?? `Usuario #${candidateUserId}`;
  }

  private loadOptions(): void {
    this.loadingOptions = true;

    this.assignmentsService
      .getTests()
      .pipe(finalize(() => (this.loadingOptions = false)))
      .subscribe({
        next: (tests) => {
          this.tests = tests;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'No se pudieron cargar las pruebas para asignar.';
          this.cdr.markForCheck();
        },
      });

    this.assignmentsService.getCandidateUsers().subscribe({
      next: (candidates) => {
        this.candidates = candidates;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar los candidatos.';
        this.cdr.markForCheck();
      },
    });
  }

  private loadAssignments(): void {
    this.loadingAssignments = true;

    this.assignmentsService
      .getAssignments()
      .pipe(finalize(() => (this.loadingAssignments = false)))
      .subscribe({
        next: (assignments) => {
          this.assignments = assignments;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'No se pudo cargar el listado de asignaciones.';
          this.cdr.markForCheck();
        },
      });
  }
}
