import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subscription, interval, take } from 'rxjs';
import { CandidateAssignment, CandidateAttemptService } from '../../services/candidate-attempt.service';
import { TechnicalQuestionSummary, TestsService } from '../../../tests/services/tests.service';
import { selectUserId } from '../../../../store/auth/auth.selectors';

@Component({
  selector: 'app-candidate-attempt-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './candidate-attempt-page.component.html',
  styleUrl: './candidate-attempt-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateAttemptPageComponent implements OnInit, OnDestroy {
  private readonly attemptService = inject(CandidateAttemptService);
  private readonly testsService = inject(TestsService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly cdr = inject(ChangeDetectorRef);

  private timerSubscription?: Subscription;

  assignments: CandidateAssignment[] = [];
  questions: TechnicalQuestionSummary[] = [];
  selectedAssignment: CandidateAssignment | null = null;
  loadingAssignments = false;
  loadingQuestions = false;
  startingAttempt = false;
  saving = false;
  currentIndex = 0;
  currentAttemptId: number | null = null;
  currentAssignmentId: number | null = null;
  remainingSeconds = 0;
  errorMessage = '';
  successMessage = '';
  candidateUserId: number | null = null;

  readonly answerForm = this.formBuilder.nonNullable.group({
    answerText: [''],
    selectedOption: [''],
  });

  ngOnInit(): void {
    this.store.select(selectUserId).pipe(take(1)).subscribe((userId) => {
      this.candidateUserId = userId;
      this.loadAssignments();
    });
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  get currentQuestion(): TechnicalQuestionSummary | null {
    return this.questions[this.currentIndex] ?? null;
  }

  loadAssignments(): void {
    this.loadingAssignments = true;
    this.errorMessage = '';

    this.attemptService.getAssignmentsForCandidate(this.candidateUserId).subscribe({
      next: (assignments) => {
        this.assignments = assignments;
        this.loadingAssignments = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage =
          'No se pudieron cargar tus asignaciones. Backend esta respondiendo 403 en /api/entity/asignacion para este usuario.';
        this.loadingAssignments = false;
        this.cdr.markForCheck();
      },
    });
  }

  onStartAssignment(assignment: CandidateAssignment): void {
    this.selectedAssignment = assignment;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();
  }

  onCancelStart(): void {
    this.selectedAssignment = null;
    this.cdr.markForCheck();
  }

  onConfirmStartAttempt(): void {
    if (!this.selectedAssignment) {
      return;
    }

    if (!Number.isFinite(this.selectedAssignment.id) || this.selectedAssignment.id <= 0) {
      this.errorMessage =
        'La asignacion seleccionada no tiene AssignmentId valido. Solicita recrear la asignacion.';
      this.cdr.markForCheck();
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.currentAssignmentId = this.selectedAssignment.id;
    this.startingAttempt = true;

    this.attemptService.startAttempt(this.selectedAssignment.id).subscribe({
      next: ({ attemptId }) => {
        this.currentAttemptId = attemptId;
        this.loadQuestions(this.selectedAssignment?.testId ?? 0);
        this.startingAttempt = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'No se pudo iniciar el intento de la prueba.';
        this.startingAttempt = false;
        this.cdr.markForCheck();
      },
    });
  }

  onNextQuestion(): void {
    this.saveCurrentAnswer(() => {
      if (this.currentIndex < this.questions.length - 1) {
        this.currentIndex += 1;
        this.patchAnswerFromQuestionType();
        this.startTimerForCurrentQuestion();
      }
    });
  }

  onPreviousQuestion(): void {
    if (this.currentIndex === 0) {
      return;
    }

    this.currentIndex -= 1;
    this.patchAnswerFromQuestionType();
    this.startTimerForCurrentQuestion();
  }

  onSubmitAttempt(): void {
    this.saveCurrentAnswer(() => {
      if (!this.currentAttemptId) {
        return;
      }

      this.saving = true;
      this.attemptService.submitAttempt(this.currentAttemptId, this.currentAssignmentId).subscribe({
        next: () => {
          this.successMessage = 'Intento enviado y asignacion cerrada para este usuario.';
          this.stopTimer();
          this.questions = [];
          this.selectedAssignment = null;
          this.currentAttemptId = null;
          this.currentAssignmentId = null;
          this.currentIndex = 0;
          this.answerForm.reset({ answerText: '', selectedOption: '' });
          this.loadAssignments();
          this.saving = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'No se pudo enviar el intento.';
          this.saving = false;
          this.cdr.markForCheck();
        },
      });
    });
  }

  private loadQuestions(testId: number): void {
    if (!testId) {
      this.errorMessage = 'No se pudo identificar la prueba asignada para iniciar.';
      this.loadingQuestions = false;
      return;
    }

    this.loadingQuestions = true;

    this.testsService.getQuestionsByTestId(testId).subscribe({
      next: (questions) => {
        this.questions = questions;
        this.currentIndex = 0;
        this.patchAnswerFromQuestionType();
        this.startTimerForCurrentQuestion();
        this.loadingQuestions = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage =
          'No se pudieron cargar las preguntas. Backend responde 403 en /api/entity/preguntatecnica para este usuario.';
        this.loadingQuestions = false;
        this.cdr.markForCheck();
      },
    });
  }

  private saveCurrentAnswer(onSaved: () => void): void {
    const question = this.currentQuestion;

    if (!question || !this.currentAttemptId) {
      onSaved();
      return;
    }

    const raw = this.answerForm.getRawValue();
    const answerText = question.type === 2 ? '' : raw.answerText;
    const selectedOption = question.type === 2 ? raw.selectedOption || null : null;

    this.saving = true;

    this.attemptService
      .saveAnswer(this.currentAttemptId, question.id, answerText, selectedOption)
      .subscribe({
        next: () => {
          this.saving = false;
          onSaved();
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'No se pudo guardar la respuesta actual.';
          this.saving = false;
          this.cdr.markForCheck();
        },
      });
  }

  private patchAnswerFromQuestionType(): void {
    this.answerForm.reset({ answerText: '', selectedOption: '' });
  }

  private startTimerForCurrentQuestion(): void {
    this.stopTimer();

    const question = this.currentQuestion;
    if (!question) {
      return;
    }

    this.remainingSeconds = question.timerSeconds ?? 120;
    this.timerSubscription = interval(1000).subscribe(() => {
      this.remainingSeconds -= 1;

      if (this.remainingSeconds <= 0) {
        this.remainingSeconds = 0;
        this.onNextQuestion();
      }

      this.cdr.markForCheck();
    });
  }

  private stopTimer(): void {
    this.timerSubscription?.unsubscribe();
    this.timerSubscription = undefined;
  }
}
