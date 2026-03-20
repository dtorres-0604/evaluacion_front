import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { forkJoin, take } from 'rxjs';
import {
  AdminAttemptSummary,
  CandidateAttemptService,
} from '../../services/candidate-attempt.service';
import {
  AssignmentsService,
  AssignmentSummary,
  AssignmentTestOption,
} from '../../../assignments/services/assignments.service';
import { selectUserId } from '../../../../store/auth/auth.selectors';

interface CandidateScoreRow {
  attemptId: number;
  assignmentId: number | null;
  testTitle: string;
  status: string;
  submittedAt: string | null;
  scoreFinal: number | null;
  passingScore: number | null;
  testScoreFinal: number | null;
  testScoreAverage: number | null;
  aiSuggestedScore: number | null;
}

@Component({
  selector: 'app-candidate-score-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './candidate-score-page.component.html',
  styleUrl: './candidate-score-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateScorePageComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly attemptService = inject(CandidateAttemptService);
  private readonly assignmentsService = inject(AssignmentsService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = false;
  errorMessage = '';
  rows: CandidateScoreRow[] = [];

  get averageScore(): number | null {
    const scored = this.rows
      .map((item) => item.scoreFinal)
      .filter((value): value is number => value !== null);
    if (scored.length === 0) {
      return null;
    }

    const total = scored.reduce((sum, item) => sum + item, 0);
    return Number((total / scored.length).toFixed(2));
  }

  ngOnInit(): void {
    this.loadScores();
  }

  loadScores(): void {
    this.loading = true;
    this.errorMessage = '';

    this.store
      .select(selectUserId)
      .pipe(take(1))
      .subscribe((userId) => {
        forkJoin({
          attempts: this.attemptService.getAttempts(),
          assignments: this.assignmentsService.getAssignments(),
          tests: this.assignmentsService.getTests(),
        }).subscribe({
          next: ({ attempts, assignments, tests }) => {
            this.rows = this.mapRows(attempts, assignments, tests, userId);
            this.loading = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.errorMessage = 'No se pudo cargar tu historial de puntajes.';
            this.loading = false;
            this.cdr.markForCheck();
          },
        });
      });
  }

  private mapRows(
    attempts: AdminAttemptSummary[],
    assignments: AssignmentSummary[],
    tests: AssignmentTestOption[],
    userId: number | null,
  ): CandidateScoreRow[] {
    const candidateAssignments = assignments.filter((item) => item.candidateUserId === userId);

    const rowsFromAttempts = attempts
      .filter((attempt) => {
        if (userId !== null && attempt.candidateUserId === userId) {
          return true;
        }

        return (
          attempt.assignmentId !== null &&
          candidateAssignments.some((item) => item.id === attempt.assignmentId)
        );
      })
      .map((attempt) => {
        const assignment =
          attempt.assignmentId === null
            ? null
            : (assignments.find((item) => item.id === attempt.assignmentId) ?? null);
        const testId = attempt.testId ?? assignment?.testId ?? null;
        const test = testId === null ? null : (tests.find((item) => item.id === testId) ?? null);
        const visibleScoreFinal = attempt.scoreFinal ?? test?.scoreFinal ?? null;

        return {
          attemptId: attempt.id,
          assignmentId: attempt.assignmentId,
          testTitle:
            attempt.testTitle ?? (testId === null ? '-' : (test?.title ?? `Prueba #${testId}`)),
          status: attempt.status,
          submittedAt: attempt.submittedAt,
          scoreFinal: visibleScoreFinal,
          passingScore: test?.passingScore ?? null,
          testScoreFinal: test?.scoreFinal ?? null,
          testScoreAverage: test?.scoreAverage ?? null,
          aiSuggestedScore: test?.aiSuggestedScore ?? null,
        } as CandidateScoreRow;
      })
      .sort((a, b) => b.attemptId - a.attemptId);

    if (rowsFromAttempts.length > 0) {
      return rowsFromAttempts;
    }

    // Fallback: when attempts endpoint has no candidate rows yet, still show test-level score data.
    return tests
      .filter((test) => test.scoreFinal !== null || test.scoreAverage !== null)
      .map((test) => ({
        attemptId: test.id,
        assignmentId: null,
        testTitle: test.title,
        status: 'Sin intento visible',
        submittedAt: null,
        scoreFinal: test.scoreFinal,
        passingScore: test.passingScore,
        testScoreFinal: test.scoreFinal,
        testScoreAverage: test.scoreAverage,
        aiSuggestedScore: test.aiSuggestedScore,
      }))
      .sort((a, b) => b.attemptId - a.attemptId);
  }
}
