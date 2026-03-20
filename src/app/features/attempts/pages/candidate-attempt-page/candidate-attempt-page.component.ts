import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, forkJoin, interval, take } from 'rxjs';
import {
  AdminAttemptSummary,
  AttemptAnswerSummary,
  AttemptAnswerDraft,
  CandidateAssignment,
  CandidateAttemptService,
} from '../../services/candidate-attempt.service';
import {
  AssignmentCandidateOption,
  AssignmentSummary,
  AssignmentsService,
  AssignmentTestOption,
} from '../../../assignments/services/assignments.service';
import { TechnicalQuestionSummary, TestsService } from '../../../tests/services/tests.service';
import { selectAuthState, selectUserId } from '../../../../store/auth/auth.selectors';
import { selectPermissions } from '../../../../store/auth/auth.selectors';
import { hasPermission } from '../../../../core/auth/permission.utils';

interface AdminAttemptRow {
  id: number;
  assignmentId: number | null;
  candidateUserId: number | null;
  candidateName: string;
  testId: number | null;
  testTitle: string;
  status: string;
  statusCode: number | null;
  startedAt: string | null;
  expiresAt: string | null;
  submittedAt: string | null;
  finishedAt: string | null;
  scoreFinal: number | null;
  active: boolean | null;
}

interface AdminAttemptAnswerView {
  questionId: number;
  statement: string;
  response: string;
  submittedAt: string | null;
}

@Component({
  selector: 'app-candidate-attempt-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './candidate-attempt-page.component.html',
  styleUrl: './candidate-attempt-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateAttemptPageComponent implements OnInit, OnDestroy {
  private readonly attemptService = inject(CandidateAttemptService);
  private readonly testsService = inject(TestsService);
  private readonly assignmentsService = inject(AssignmentsService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly cdr = inject(ChangeDetectorRef);

  private timerSubscription?: Subscription;

  isAdminView = false;
  adminLoading = false;
  adminAttempts: AdminAttemptRow[] = [];
  selectedAdminAttempt: AdminAttemptRow | null = null;
  adminAnswersLoading = false;
  adminAnswerRows: AdminAttemptAnswerView[] = [];
  updatingScoreAttemptId: number | null = null;
  canUpdateAttemptScore = false;
  private readonly scoreDrafts = new Map<number, string>();
  private assignmentsLookup: AssignmentSummary[] = [];
  private testsLookup: AssignmentTestOption[] = [];
  private candidatesLookup: AssignmentCandidateOption[] = [];

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
  attemptLocalStatus: 'idle' | 'en_curso' | 'finalizado' = 'idle';
  autosaveActive = false;
  inputsLocked = false;
  candidateUserId: number | null = null;
  private pendingStartAssignmentId: number | null = null;
  private pendingDirectAttemptId: number | null = null;
  private pendingDirectAssignmentId: number | null = null;
  private pendingDirectTestId: number | null = null;
  private readonly draftAnswers = new Map<number, AttemptAnswerDraft>();

  readonly answerForm = this.formBuilder.nonNullable.group({
    answerText: [''],
    selectedOption: [''],
  });

  ngOnInit(): void {
    this.store
      .select(selectPermissions)
      .pipe(take(1))
      .subscribe((permissions) => {
        this.canUpdateAttemptScore = hasPermission('update:candidate-attempt', permissions);
      });

    this.store
      .select(selectAuthState)
      .pipe(take(1))
      .subscribe((authState) => {
        const roles = authState.roles ?? [];
        this.isAdminView = roles.some((role) => {
          const normalized = role.toLowerCase();
          return normalized === 'admin' || normalized === 'administrador';
        });

        if (this.isAdminView) {
          this.loadAdminAttempts();
        }
      });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (this.isAdminView) {
        return;
      }

      const directAttemptId = Number(params.get('directStartAttemptId'));
      const directAssignmentId = Number(params.get('directStartAssignmentId'));
      const directTestId = Number(params.get('directStartTestId'));

      if (
        Number.isFinite(directAttemptId) &&
        directAttemptId > 0 &&
        Number.isFinite(directTestId) &&
        directTestId > 0
      ) {
        this.pendingDirectAttemptId = directAttemptId;
        this.pendingDirectAssignmentId =
          Number.isFinite(directAssignmentId) && directAssignmentId > 0 ? directAssignmentId : null;
        this.pendingDirectTestId = directTestId;
        this.pendingStartAssignmentId = null;
        this.tryResumeDirectAttempt();
        return;
      }

      const assignmentId = Number(params.get('startAssignmentId'));
      this.pendingStartAssignmentId =
        Number.isFinite(assignmentId) && assignmentId > 0 ? assignmentId : null;
      this.tryAutoStartFromCamera();
    });

    this.store
      .select(selectUserId)
      .pipe(take(1))
      .subscribe((userId) => {
        if (this.isAdminView) {
          return;
        }

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

  loadAdminAttempts(): void {
    this.adminLoading = true;
    this.errorMessage = '';

    forkJoin({
      attempts: this.attemptService.getAttempts(),
      assignments: this.assignmentsService.getAssignments(),
      tests: this.assignmentsService.getTests(),
      candidates: this.assignmentsService.getCandidateUsers(),
    }).subscribe({
      next: ({ attempts, assignments, tests, candidates }) => {
        this.assignmentsLookup = assignments;
        this.testsLookup = tests;
        this.candidatesLookup = candidates;

        this.adminAttempts = attempts.map((attempt) => this.mapAdminAttemptRow(attempt));
        this.adminLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar los intentos de candidatos.';
        this.adminLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onSelectAdminAttempt(row: AdminAttemptRow): void {
    this.selectedAdminAttempt = row;
    this.adminAnswersLoading = true;
    this.adminAnswerRows = [];
    this.errorMessage = '';

    const answers$ = this.attemptService.getAnswersByAttempt(row.id);
    const questions$ = row.testId
      ? this.testsService.getQuestionsByTestId(row.testId)
      : this.testsService.getQuestionsByTestId(-1);

    forkJoin({ answers: answers$, questions: questions$ }).subscribe({
      next: ({ answers, questions }) => {
        this.adminAnswerRows = this.mapAdminAnswerRows(answers, questions);
        this.adminAnswersLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar el detalle de respuestas del intento.';
        this.adminAnswersLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  getScoreDraft(row: AdminAttemptRow): string {
    const cached = this.scoreDrafts.get(row.id);
    if (cached !== undefined) {
      return cached;
    }

    return row.scoreFinal === null ? '' : String(row.scoreFinal);
  }

  onScoreDraftChange(attemptId: number, value: string): void {
    this.scoreDrafts.set(attemptId, value);
  }

  saveAttemptScore(row: AdminAttemptRow): void {
    if (!this.canUpdateAttemptScore) {
      this.errorMessage = 'No tienes permiso para actualizar puntajes.';
      this.cdr.markForCheck();
      return;
    }

    const draftRaw = this.getScoreDraft(row);
    const parsed = Number(draftRaw);

    if (!Number.isFinite(parsed)) {
      this.errorMessage = 'Ingresa un puntaje valido para guardar.';
      this.cdr.markForCheck();
      return;
    }

    this.updatingScoreAttemptId = row.id;
    this.errorMessage = '';

    this.attemptService.updateAttemptScore(row.id, parsed).subscribe({
      next: () => {
        this.adminAttempts = this.adminAttempts.map((attempt) =>
          attempt.id === row.id
            ? {
                ...attempt,
                scoreFinal: parsed,
                statusCode: attempt.statusCode === 3 ? 4 : attempt.statusCode,
                status: attempt.statusCode === 3 ? 'Calificado' : attempt.status,
              }
            : attempt,
        );

        if (this.selectedAdminAttempt?.id === row.id) {
          this.selectedAdminAttempt =
            this.adminAttempts.find((attempt) => attempt.id === row.id) ?? null;
        }

        this.successMessage = `Puntaje actualizado para intento #${row.id}.`;
        this.updatingScoreAttemptId = null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'No se pudo guardar el puntaje del intento.';
        this.updatingScoreAttemptId = null;
        this.cdr.markForCheck();
      },
    });
  }

  loadAssignments(): void {
    this.loadingAssignments = true;
    this.errorMessage = '';

    this.attemptService.getAssignmentsForCandidate(this.candidateUserId).subscribe({
      next: (assignments) => {
        this.assignments = assignments;
        this.tryAutoStartFromCamera();
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

  private tryAutoStartFromCamera(): void {
    if (!this.pendingStartAssignmentId) {
      return;
    }

    const assignment = this.assignments.find((item) => item.id === this.pendingStartAssignmentId);
    if (!assignment) {
      if (this.assignments.length > 0) {
        this.pendingStartAssignmentId = null;
        this.errorMessage = 'No se encontro la asignacion para continuar la evaluacion.';
      }
      return;
    }

    this.pendingStartAssignmentId = null;
    this.selectedAssignment = assignment;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { startAssignmentId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.onConfirmStartAttempt();
  }

  private tryResumeDirectAttempt(): void {
    if (!this.pendingDirectAttemptId || !this.pendingDirectTestId) {
      return;
    }

    this.currentAttemptId = this.pendingDirectAttemptId;
    this.attemptLocalStatus = 'en_curso';
    this.autosaveActive = true;
    this.inputsLocked = false;
    this.currentAssignmentId = this.pendingDirectAssignmentId;
    this.selectedAssignment =
      this.pendingDirectAssignmentId === null
        ? null
        : (this.assignments.find((item) => item.id === this.pendingDirectAssignmentId) ?? null);

    this.pendingDirectAttemptId = null;
    this.pendingDirectAssignmentId = null;
    const testId = this.pendingDirectTestId;
    this.pendingDirectTestId = null;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        directStartAttemptId: null,
        directStartAssignmentId: null,
        directStartTestId: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    this.loadQuestions(testId);
    this.cdr.markForCheck();
  }

  onStartAssignment(assignment: CandidateAssignment): void {
    this.router.navigate(['/main/attempts', assignment.id, 'camera'], {
      queryParams: {
        testId: assignment.testId,
      },
    });
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
        this.attemptLocalStatus = 'en_curso';
        this.autosaveActive = true;
        this.inputsLocked = false;
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
    if (this.inputsLocked) {
      return;
    }

    this.cacheCurrentAnswer();
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex += 1;
      this.patchAnswerFromQuestionType();
      this.startTimerForCurrentQuestion();
    }
  }

  onPreviousQuestion(): void {
    if (this.inputsLocked) {
      return;
    }

    if (this.currentIndex === 0) {
      return;
    }

    this.currentIndex -= 1;
    this.cacheCurrentAnswer();
    this.patchAnswerFromQuestionType();
    this.startTimerForCurrentQuestion();
  }

  onSubmitAttempt(): void {
    if (this.inputsLocked || !this.currentAttemptId) {
      return;
    }

    this.cacheCurrentAnswer();

    if (!this.currentAttemptId) {
      return;
    }

    this.autosaveActive = false;
    this.inputsLocked = true;
    this.stopTimer();
    this.saving = true;

    const attemptId = this.currentAttemptId;
    const answersToSend = Array.from(this.draftAnswers.values());

    if (answersToSend.length === 0) {
      this.finalizeAttemptSubmit(attemptId, null);
      return;
    }

    this.attemptService.saveAnswersBatch(attemptId, answersToSend).subscribe({
      next: () => {
        this.finalizeAttemptSubmit(attemptId, null);
      },
      error: (error: unknown) => {
        const httpError = error as HttpErrorResponse;
        const warningMessage =
          httpError.status === 404
            ? 'El intento ya estaba cerrado al enviar respuestas (404 en /answers). Se continuo con submit.'
            : 'Fallo el envio de respuestas consolidado. Se continuo con submit.';

        this.finalizeAttemptSubmit(attemptId, warningMessage);
      },
    });
  }

  private finalizeAttemptSubmit(attemptId: number, preSubmitWarning: string | null): void {
    this.attemptService.submitAttempt(attemptId).subscribe({
      next: (result) => {
        const statusLabel =
          result.statusCode === 3 ? 'Enviado' : result.statusCode === 4 ? 'Expirado' : 'Procesado';
        const aiLabel =
          result.aiDispatched === null
            ? 'IA sin confirmacion de despacho.'
            : result.aiDispatched
              ? 'IA despachada correctamente.'
              : 'IA no se despacho.';

        const submitMessage = result.alreadyFinalized
          ? (result.message ?? 'Intento ya finalizado previamente. Operacion tomada como exitosa.')
          : `Intento ${statusLabel}. ${aiLabel}`;

        this.successMessage = preSubmitWarning
          ? `${preSubmitWarning} ${submitMessage}`
          : submitMessage;
        this.attemptLocalStatus = 'finalizado';
        this.questions = [];
        this.selectedAssignment = null;
        this.currentAttemptId = null;
        this.currentAssignmentId = null;
        this.currentIndex = 0;
        this.draftAnswers.clear();
        this.answerForm.reset({ answerText: '', selectedOption: '' });
        this.loadAssignments();
        this.saving = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage =
          'No se pudo enviar el intento con /candidate/attempts/{attemptId}/submit.';
        this.autosaveActive = true;
        this.inputsLocked = false;
        this.startTimerForCurrentQuestion();
        this.saving = false;
        this.cdr.markForCheck();
      },
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
        this.draftAnswers.clear();
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

  private cacheCurrentAnswer(): void {
    const question = this.currentQuestion;

    if (this.inputsLocked || !question || !this.currentAttemptId) {
      return;
    }

    const raw = this.answerForm.getRawValue();
    const answerText = question.type === 2 ? '' : raw.answerText;
    const selectedOption = question.type === 2 ? raw.selectedOption || null : null;

    this.draftAnswers.set(question.id, {
      questionId: question.id,
      answerText,
      selectedOption,
    });
  }

  private patchAnswerFromQuestionType(): void {
    const question = this.currentQuestion;
    if (!question) {
      this.answerForm.reset({ answerText: '', selectedOption: '' });
      return;
    }

    const existing = this.draftAnswers.get(question.id);
    this.answerForm.reset({
      answerText: existing?.answerText ?? '',
      selectedOption: existing?.selectedOption ?? '',
    });
  }

  private startTimerForCurrentQuestion(): void {
    this.stopTimer();

    if (!this.autosaveActive || this.inputsLocked) {
      return;
    }

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

  private mapAdminAttemptRow(attempt: AdminAttemptSummary): AdminAttemptRow {
    const assignment =
      attempt.assignmentId === null
        ? null
        : (this.assignmentsLookup.find((item) => item.id === attempt.assignmentId) ?? null);

    const testId = attempt.testId ?? assignment?.testId ?? null;
    const candidateUserId = attempt.candidateUserId ?? assignment?.candidateUserId ?? null;

    const candidateName =
      attempt.candidateName ??
      (candidateUserId === null
        ? '-'
        : (this.candidatesLookup.find((item) => item.id === candidateUserId)?.fullName ??
          `Usuario #${candidateUserId}`));

    const testTitle =
      attempt.testTitle ??
      (testId === null
        ? '-'
        : (this.testsLookup.find((item) => item.id === testId)?.title ?? `Prueba #${testId}`));

    return {
      id: attempt.id,
      assignmentId: attempt.assignmentId,
      candidateUserId,
      candidateName,
      testId,
      testTitle,
      status: attempt.status,
      statusCode: attempt.statusCode,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      submittedAt: attempt.submittedAt,
      finishedAt: attempt.finishedAt,
      scoreFinal: attempt.scoreFinal,
      active: attempt.active,
    };
  }

  private mapAdminAnswerRows(
    answers: AttemptAnswerSummary[],
    questions: TechnicalQuestionSummary[],
  ): AdminAttemptAnswerView[] {
    return answers.map((answer) => {
      const question = questions.find((item) => item.id === answer.questionId);
      const fallbackStatement = `Pregunta #${answer.questionId}`;

      if (question?.type === 2) {
        const optionText =
          question.options.find((option) => option.value === answer.selectedOption)?.text ??
          answer.selectedOption ??
          '-';

        return {
          questionId: answer.questionId,
          statement: question.statement || fallbackStatement,
          response: optionText,
          submittedAt: answer.submittedAt,
        };
      }

      return {
        questionId: answer.questionId,
        statement: question?.statement || fallbackStatement,
        response: answer.answerText || '-',
        submittedAt: answer.submittedAt,
      };
    });
  }
}
