import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';

const API_BASE_URL = '/api';

export interface AiAttemptAnalysisSummary {
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

@Injectable({
  providedIn: 'root',
})
export class AiAnalysisService {
  constructor(private readonly http: HttpClient) {}

  getAnalysisByAttempt(attemptId: number): Observable<AiAttemptAnalysisSummary | null> {
    if (!Number.isFinite(attemptId) || attemptId <= 0) {
      throw new Error('AttemptId invalido para consulta de analisis IA.');
    }

    return this.http
      .get<unknown>(`${API_BASE_URL}/ai/attempts/${attemptId}/analysis`)
      .pipe(map((response) => this.mapSingleResponse(response)));
  }

  getAttemptAnalyses(): Observable<AiAttemptAnalysisSummary[]> {
    const endpoints = [
      `${API_BASE_URL}/entity/aiattemptanalysis`,
      `${API_BASE_URL}/entity/dtaiattemptanalysis`,
      `${API_BASE_URL}/ai/attempt-analyses`,
    ];

    return this.requestAnalyses(endpoints, 0);
  }

  private requestAnalyses(endpoints: string[], index: number): Observable<AiAttemptAnalysisSummary[]> {
    if (index >= endpoints.length) {
      return throwError(() => new Error('No se pudo consultar el analisis IA en ningun endpoint conocido.'));
    }

    return this.http.get<unknown>(endpoints[index]).pipe(
      map((response) => this.mapResponse(response)),
      catchError(() => this.requestAnalyses(endpoints, index + 1)),
    );
  }

  private mapResponse(raw: unknown): AiAttemptAnalysisSummary[] {
    const source = this.unwrapData(raw);

    if (!Array.isArray(source)) {
      return [];
    }

    return source
      .map((item) => this.mapItem(item))
      .filter((item): item is AiAttemptAnalysisSummary => item !== null)
      .sort((a, b) => b.id - a.id);
  }

  private mapSingleResponse(raw: unknown): AiAttemptAnalysisSummary | null {
    const source = this.unwrapData(raw);

    if (Array.isArray(source)) {
      return source.map((item) => this.mapItem(item)).find((item) => item !== null) ?? null;
    }

    return this.mapItem(source);
  }

  private mapItem(raw: unknown): AiAttemptAnalysisSummary | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const bag = raw as Record<string, unknown>;

    const id = this.readNumber(bag, ['id', 'analysisId', 'analisisId']);
    const attemptId = this.readNumber(bag, ['attemptId', 'intentoId']);

    if (id === null || attemptId === null || id <= 0 || attemptId <= 0) {
      return null;
    }

    return {
      id,
      attemptId,
      assignmentId: this.readNumber(bag, ['assignmentId', 'asignacionId']),
      candidateName: this.readString(bag, ['candidateName', 'nombreCandidato']) ?? '-',
      testTitle: this.readString(bag, ['testTitle', 'tituloPrueba']) ?? '-',
      aiStatus: this.readString(bag, ['status', 'estadoIa', 'analysisStatus']) ?? 'Pendiente',
      riskLevel: this.readString(bag, ['riskLevel', 'nivelRiesgo']) ?? 'No definido',
      score: this.readNumber(bag, ['scoreFinal', 'score', 'puntaje', 'aiScore']),
      summary:
        this.readString(bag, ['summary', 'resumen', 'analysisSummary', 'conclusion']) ??
        'Sin resumen generado.',
      recommendations: this.readStringArray(bag, [
        'recommendations',
        'recomendaciones',
        'nextActions',
      ]),
      createdAt: this.normalizeDate(this.readString(bag, ['createdAt', 'fechaCreacion'])),
      updatedAt: this.normalizeDate(this.readString(bag, ['updatedAt', 'fechaActualizacion'])),
      raw: bag,
    };
  }

  private unwrapData(raw: unknown): unknown {
    if (raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)) {
      return (raw as Record<string, unknown>)['data'];
    }

    return raw;
  }

  private normalizeDate(value: string | null): string | null {
    if (!value || value.startsWith('0001-01-01')) {
      return null;
    }

    return value;
  }

  private readString(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string') {
        return value;
      }
    }

    return null;
  }

  private readNumber(source: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
      const value = source[key];

      if (typeof value === 'number') {
        return value;
      }

      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  private readStringArray(source: Record<string, unknown>, keys: string[]): string[] {
    for (const key of keys) {
      const value = source[key];

      if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
      }

      if (typeof value === 'string' && value.trim().length > 0) {
        return value
          .split(/\r?\n|;/)
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      }
    }

    return [];
  }
}
