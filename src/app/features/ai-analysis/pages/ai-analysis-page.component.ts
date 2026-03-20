import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CandidateAttemptService } from '../../attempts/services/candidate-attempt.service';
import { AiAnalysisService, AiAttemptAnalysisSummary } from '../services/ai-analysis.service';

interface AiAnalysisViewModel {
  id: number;
  attemptId: number;
  assignmentId: number | null;
  candidateName: string;
  testTitle: string;
  aiStatus: string;
  riskLevel: string;
  score: number | null;
  summary: string;
  recommendations: string[];
  createdAt: string | null;
  updatedAt: string | null;
  raw: Record<string, unknown>;
}

@Component({
  selector: 'app-ai-analysis-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-analysis-page.component.html',
  styleUrl: './ai-analysis-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAnalysisPageComponent implements OnInit {
  private readonly analysisService = inject(AiAnalysisService);
  private readonly attemptService = inject(CandidateAttemptService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = false;
  errorMessage = '';
  lookupMessage = '';

  query = '';
  statusFilter = 'all';
  attemptLookupId = '';
  lookupLoading = false;

  rows: AiAnalysisViewModel[] = [];
  selected: AiAnalysisViewModel | null = null;

  get filteredRows(): AiAnalysisViewModel[] {
    const normalized = this.query.trim().toLowerCase();

    return this.rows.filter((row) => {
      const matchStatus = this.statusFilter === 'all' || row.aiStatus.toLowerCase() === this.statusFilter;

      if (!matchStatus) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return (
        row.candidateName.toLowerCase().includes(normalized) ||
        row.testTitle.toLowerCase().includes(normalized) ||
        String(row.attemptId).includes(normalized)
      );
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      analyses: this.analysisService.getAttemptAnalyses(),
      attempts: this.attemptService.getAttempts(),
    }).subscribe({
      next: ({ analyses, attempts }) => {
        this.rows = analyses.map((analysis) => {
          const linkedAttempt = attempts.find((attempt) => attempt.id === analysis.attemptId);

          return {
            id: analysis.id,
            attemptId: analysis.attemptId,
            assignmentId: analysis.assignmentId ?? linkedAttempt?.assignmentId ?? null,
            candidateName:
              analysis.candidateName !== '-'
                ? analysis.candidateName
                : linkedAttempt?.candidateName ??
                  (linkedAttempt?.candidateUserId ? `Usuario #${linkedAttempt.candidateUserId}` : '-'),
            testTitle: analysis.testTitle !== '-' ? analysis.testTitle : linkedAttempt?.testTitle ?? '-',
            aiStatus: analysis.aiStatus,
            riskLevel: analysis.riskLevel,
            score: analysis.score,
            summary: analysis.summary,
            recommendations: analysis.recommendations,
            createdAt: analysis.createdAt,
            updatedAt: analysis.updatedAt,
            raw: analysis.raw,
          };
        });

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage =
          'No se pudo cargar Analisis IA. Verifica que exista endpoint de consulta para DTAiAttemptAnalysis.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onSelectRow(row: AiAnalysisViewModel): void {
    this.selected = row;
  }

  onLookupByAttemptId(): void {
    const attemptId = Number(this.attemptLookupId);

    if (!Number.isFinite(attemptId) || attemptId <= 0) {
      this.lookupMessage = 'Ingresa un attemptId valido para consultar analisis.';
      return;
    }

    this.lookupLoading = true;
    this.lookupMessage = '';
    this.errorMessage = '';

    this.analysisService.getAnalysisByAttempt(attemptId).subscribe({
      next: (analysis) => {
        if (!analysis) {
          this.lookupMessage = `No existe analisis para intento #${attemptId}.`;
          this.lookupLoading = false;
          this.cdr.markForCheck();
          return;
        }

        const model: AiAnalysisViewModel = {
          id: analysis.id,
          attemptId: analysis.attemptId,
          assignmentId: analysis.assignmentId,
          candidateName: analysis.candidateName,
          testTitle: analysis.testTitle,
          aiStatus: analysis.aiStatus,
          riskLevel: analysis.riskLevel,
          score: analysis.score,
          summary: analysis.summary,
          recommendations: analysis.recommendations,
          createdAt: analysis.createdAt,
          updatedAt: analysis.updatedAt,
          raw: analysis.raw,
        };

        const existingIndex = this.rows.findIndex((row) => row.attemptId === model.attemptId);
        if (existingIndex >= 0) {
          this.rows[existingIndex] = model;
        } else {
          this.rows = [model, ...this.rows];
        }

        this.selected = model;
        this.lookupMessage = `Analisis encontrado para intento #${attemptId}.`;
        this.lookupLoading = false;
        this.cdr.markForCheck();
      },
      error: (error: unknown) => {
        const httpError = error as HttpErrorResponse;
        if (httpError.status === 404) {
          this.lookupMessage = `Analisis no encontrado para intento #${attemptId} (404).`;
        } else if (httpError.status === 403) {
          this.lookupMessage = 'Sin permiso para consultar analisis IA. Usa token admin/reclutador.';
        } else {
          this.lookupMessage = 'Error consultando analisis IA por intento.';
        }

        this.lookupLoading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
