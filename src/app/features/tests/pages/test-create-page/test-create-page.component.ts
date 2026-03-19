import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, concatMap, finalize, from, last, map, Observable, of } from 'rxjs';
import {
  AssignmentBatchResult,
  CandidateUserSummary,
  QuestionOptionCanonical,
  TechnicalQuestionFormValue,
  TechnicalQuestionSummary,
  TechnicalTestSummary,
  TestsService,
} from '../../services/tests.service';

const QUESTION_TYPE = {
  ABIERTA: 1,
  OPCION_MULTIPLE: 2,
  CODIGO: 3,
} as const;
@Component({
  selector: 'app-test-create-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './test-create-page.component.html',
  styleUrl: './test-create-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestCreatePageComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly testsService = inject(TestsService);
  private readonly cdr = inject(ChangeDetectorRef);

  tests: TechnicalTestSummary[] = [];
  loadingTests = false;
  loadingQuestions = false;
  saving = false;
  errorMessage = '';
  successMessage = '';
  isEditMode = false;
  editingTestId: number | null = null;
  deletedQuestionIds: number[] = [];

  readonly testForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(4)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    durationMinutes: [60, [Validators.required, Validators.min(5)]],
    passingScore: [70, [Validators.required, Validators.min(1), Validators.max(100)]],
    isPublished: [true],
    questions: this.formBuilder.array([this.createQuestionGroup()]),
  });

  get questions(): FormArray {
    return this.testForm.controls.questions;
  }

  ngOnInit(): void {
    this.loadTests();
  }

  isMultipleChoice(index: number): boolean {
    const type = Number(this.questions.at(index).get('type')?.value ?? 0);
    return type === QUESTION_TYPE.OPCION_MULTIPLE;
  }

  addQuestion(): void {
    const nextOrder = this.questions.length + 1;
    this.questions.push(this.createQuestionGroup(nextOrder));
  }

  removeQuestion(index: number): void {
    if (this.questions.length === 1) {
      return;
    }

    const questionId = Number(this.questions.at(index).get('questionId')?.value);
    if (Number.isFinite(questionId) && questionId > 0) {
      this.deletedQuestionIds.push(questionId);
    }

    this.questions.removeAt(index);
    this.reindexQuestionOrder();
  }

  onQuestionTypeChange(index: number): void {
    const group = this.questions.at(index);
    const type = Number(group.get('type')?.value ?? QUESTION_TYPE.ABIERTA);

    if (type !== QUESTION_TYPE.OPCION_MULTIPLE) {
      group.get('options')?.setValue('');
      group.get('options')?.clearValidators();
      group.get('options')?.updateValueAndValidity();
      return;
    }

    group.get('options')?.setValidators([Validators.required]);
    group.get('options')?.updateValueAndValidity();
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.testForm.invalid) {
      this.testForm.markAllAsTouched();
      this.errorMessage = 'Completa todos los campos requeridos para crear la prueba.';
      return;
    }

    const raw = this.testForm.getRawValue();

    if (this.isEditMode && this.editingTestId) {
      this.saving = true;
      const questions = raw.questions.map((question, index) =>
        this.mapQuestionPayload(question, index + 1),
      );

      const timerValidationError = this.validateQuestionTimers(questions);
      if (timerValidationError) {
        this.errorMessage = timerValidationError;
        this.saving = false;
        return;
      }

      this.testsService
        .updateTechnicalTest(this.editingTestId, {
          title: raw.title,
          description: raw.description,
          durationMinutes: raw.durationMinutes,
          passingScore: raw.passingScore,
          isPublished: raw.isPublished,
        })
        .pipe(
          concatMap(() => this.syncQuestionsForEdit(this.editingTestId as number, questions)),
          finalize(() => (this.saving = false)),
        )
        .subscribe({
          next: () => {
            this.successMessage = 'Prueba tecnica actualizada correctamente.';
            this.resetForm();
            this.loadTests();
            this.cdr.markForCheck();
          },
          error: (error: { message?: string }) => {
            this.errorMessage = error.message ?? 'No se pudo actualizar la prueba tecnica.';
            this.cdr.markForCheck();
          },
        });

      return;
    }

    const questions = raw.questions.map((question, index) =>
      this.mapQuestionPayload(question, index + 1),
    );

    const timerValidationError = this.validateQuestionTimers(questions);
    if (timerValidationError) {
      this.errorMessage = timerValidationError;
      return;
    }

    this.saving = true;

    this.testsService
      .createTechnicalTest({
        title: raw.title,
        description: raw.description,
        durationMinutes: raw.durationMinutes,
        passingScore: raw.passingScore,
        isPublished: raw.isPublished,
      })
      .pipe(
        concatMap((testId) =>
          from(questions).pipe(
            concatMap((question) => this.testsService.createTechnicalQuestion(testId, question)),
            last(undefined, null),
            map(() => testId),
          ),
        ),
        concatMap((testId) => this.autoAssignToCandidates(testId)),
        finalize(() => (this.saving = false)),
      )
      .subscribe({
        next: (assignmentMessage) => {
          this.successMessage = assignmentMessage;
          this.resetForm();
          this.loadTests();
          this.cdr.markForCheck();
        },
        error: (error: { message?: string }) => {
          this.errorMessage = error.message ?? 'No se pudo crear la prueba tecnica.';
          this.cdr.markForCheck();
        },
      });
  }

  onEditTest(test: TechnicalTestSummary): void {
    this.isEditMode = true;
    this.editingTestId = test.id;
    this.deletedQuestionIds = [];
    this.testForm.patchValue({
      title: test.title,
      description: test.description,
      durationMinutes: test.durationMinutes,
      passingScore: test.passingScore,
      isPublished: test.isPublished,
    });
    this.loadQuestionsForTest(test.id);
  }

  onDeleteTest(test: TechnicalTestSummary): void {
    if (!confirm(`Deseas eliminar la prueba "${test.title}"?`)) {
      return;
    }

    this.testsService.deleteTechnicalTest(test.id).subscribe({
      next: () => {
        this.successMessage = 'Prueba tecnica eliminada.';
        this.loadTests();
        this.cdr.markForCheck();
      },
      error: (error: { message?: string }) => {
        this.errorMessage = error.message ?? 'No se pudo eliminar la prueba tecnica.';
        this.cdr.markForCheck();
      },
    });
  }

  onCancelEdit(): void {
    this.resetForm();
  }

  private createQuestionGroup(order = 1) {
    return this.formBuilder.nonNullable.group({
      questionId: [0],
      type: [QUESTION_TYPE.ABIERTA, [Validators.required]],
      statement: ['', [Validators.required, Validators.minLength(8)]],
      options: [''],
      order: [order, [Validators.required, Validators.min(1)]],
      maxScore: [10, [Validators.required, Validators.min(1)]],
      timerSeconds: [120],
    });
  }

  private createQuestionGroupFromExisting(question: TechnicalQuestionSummary) {
    return this.formBuilder.nonNullable.group({
      questionId: [question.id],
      type: [question.type, [Validators.required]],
      statement: [question.statement, [Validators.required, Validators.minLength(8)]],
      options: [this.optionsToMultiline(question.options)],
      order: [question.order, [Validators.required, Validators.min(1)]],
      maxScore: [question.maxScore, [Validators.required, Validators.min(1)]],
      timerSeconds: [question.timerSeconds ?? 120],
    });
  }

  private loadTests(): void {
    this.loadingTests = true;

    this.testsService
      .getTechnicalTests()
      .pipe(finalize(() => (this.loadingTests = false)))
      .subscribe({
        next: (tests) => {
          this.tests = tests;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'No se pudo cargar el listado de pruebas tecnicas.';
          this.cdr.markForCheck();
        },
      });
  }

  private autoAssignToCandidates(testId: number) {
    return this.testsService
      .getCandidateUsers()
      .pipe(concatMap((candidateUsers) => this.assignToCandidates(testId, candidateUsers)));
  }

  private assignToCandidates(testId: number, candidateUsers: CandidateUserSummary[]) {
    if (!candidateUsers.length) {
      return of('Prueba creada sin asignaciones automaticas (no hay candidatos).');
    }

    const candidateIds = candidateUsers.map((user) => user.id);

    return this.testsService.assignTestToCandidates(testId, candidateIds).pipe(
      map((result) => this.buildAssignmentMessage(candidateIds.length, result)),
      catchError(() =>
        of('Prueba creada, pero no fue posible asignarla automaticamente a candidatos.'),
      ),
    );
  }

  private mapQuestionPayload(
    question: {
      questionId: number;
      type: number;
      statement: string;
      options: string;
      order: number;
      maxScore: number;
      timerSeconds: number;
    },
    fallbackOrder: number,
  ): TechnicalQuestionFormValue {
    const options =
      question.type === QUESTION_TYPE.OPCION_MULTIPLE
        ? this.buildCanonicalOptions(question.options)
        : [];

    const normalizedTimer = Number(question.timerSeconds);
    const timerSeconds =
      Number.isFinite(normalizedTimer) && normalizedTimer > 0 ? normalizedTimer : null;

    return {
      type: Number(question.type),
      statement: question.statement,
      options,
      order: question.order || fallbackOrder,
      maxScore: question.maxScore,
      timerSeconds,
    };
  }

  private loadQuestionsForTest(testId: number): void {
    this.loadingQuestions = true;

    this.testsService
      .getQuestionsByTestId(testId)
      .pipe(finalize(() => (this.loadingQuestions = false)))
      .subscribe({
        next: (questions) => {
          while (this.questions.length > 0) {
            this.questions.removeAt(0);
          }

          if (questions.length === 0) {
            this.questions.push(this.createQuestionGroup());
          } else {
            questions.forEach((question) => {
              this.questions.push(this.createQuestionGroupFromExisting(question));
            });
          }

          this.setQuestionsValidation(true);
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'No se pudieron cargar las preguntas de la prueba.';
          this.cdr.markForCheck();
        },
      });
  }

  private syncQuestionsForEdit(
    testId: number,
    questions: TechnicalQuestionFormValue[],
  ): Observable<void> {
    const rawQuestions = this.testForm.getRawValue().questions;

    const upsertRequests = questions.map((payload, index) => {
      const questionId = Number(rawQuestions[index].questionId);
      if (Number.isFinite(questionId) && questionId > 0) {
        return this.testsService.updateTechnicalQuestion(questionId, payload);
      }

      return this.testsService.createTechnicalQuestion(testId, payload);
    });

    const deleteRequests = this.deletedQuestionIds.map((questionId) =>
      this.testsService.deleteTechnicalQuestion(questionId),
    );

    return from([...upsertRequests, ...deleteRequests]).pipe(
      concatMap((request) => request),
      last(undefined, void 0),
    );
  }

  private buildCanonicalOptions(rawOptions: string): QuestionOptionCanonical[] {
    return rawOptions
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((text, index) => ({
        text,
        value: String.fromCharCode(65 + index),
        correct: false,
      }));
  }

  private validateQuestionTimers(questions: TechnicalQuestionFormValue[]): string | null {
    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];

      if (question.timerSeconds !== null && question.timerSeconds < 15) {
        return `La pregunta ${index + 1} tiene temporizador invalido. Minimo permitido: 15 segundos.`;
      }

      if (question.type === QUESTION_TYPE.OPCION_MULTIPLE && question.options.length === 0) {
        return `La pregunta ${index + 1} es de opcion multiple y requiere opciones.`;
      }
    }

    return null;
  }

  private reindexQuestionOrder(): void {
    this.questions.controls.forEach((control, index) => {
      control.get('order')?.setValue(index + 1);
    });
  }

  private resetForm(): void {
    this.isEditMode = false;
    this.editingTestId = null;
    this.deletedQuestionIds = [];
    this.testForm.reset({
      title: '',
      description: '',
      durationMinutes: 60,
      passingScore: 70,
      isPublished: true,
    });

    while (this.questions.length > 0) {
      this.questions.removeAt(0);
    }

    this.questions.push(this.createQuestionGroup());
    this.setQuestionsValidation(true);
  }

  private optionsToMultiline(options: QuestionOptionCanonical[]): string {
    return options.map((option) => option.text).join('\n');
  }

  private setQuestionsValidation(enabled: boolean): void {
    this.questions.controls.forEach((control) => {
      const typeControl = control.get('type');
      const statementControl = control.get('statement');
      const optionsControl = control.get('options');
      const orderControl = control.get('order');
      const maxScoreControl = control.get('maxScore');

      if (
        !typeControl ||
        !statementControl ||
        !optionsControl ||
        !orderControl ||
        !maxScoreControl
      ) {
        return;
      }

      if (!enabled) {
        typeControl.clearValidators();
        statementControl.clearValidators();
        optionsControl.clearValidators();
        orderControl.clearValidators();
        maxScoreControl.clearValidators();
      } else {
        typeControl.setValidators([Validators.required]);
        statementControl.setValidators([Validators.required, Validators.minLength(8)]);
        orderControl.setValidators([Validators.required, Validators.min(1)]);
        maxScoreControl.setValidators([Validators.required, Validators.min(1)]);

        const type = Number(typeControl.value ?? QUESTION_TYPE.ABIERTA);
        if (type === QUESTION_TYPE.OPCION_MULTIPLE) {
          optionsControl.setValidators([Validators.required]);
        } else {
          optionsControl.clearValidators();
        }
      }

      typeControl.updateValueAndValidity();
      statementControl.updateValueAndValidity();
      optionsControl.updateValueAndValidity();
      orderControl.updateValueAndValidity();
      maxScoreControl.updateValueAndValidity();
    });
  }

  private buildAssignmentMessage(
    expectedCandidates: number,
    result: AssignmentBatchResult,
  ): string {
    if (result.usedFallback) {
      return 'Prueba creada y asignada por flujo de contingencia (fallback).';
    }

    const created = result.createdAssignmentIds.length;
    const skipped = result.skippedCandidateUserIds.length;
    const missing = result.notFoundCandidateUserIds.length;

    if (!created && !skipped && !missing) {
      return `Prueba creada. El backend no devolvio detalle de asignaciones para ${expectedCandidates} candidato(s).`;
    }

    return `Prueba creada. Asignaciones: creadas ${created}, omitidas ${skipped}, no encontradas ${missing}.`;
  }
}
