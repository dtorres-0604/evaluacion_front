import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, concatMap, map, Observable, of, throwError } from 'rxjs';

const API_BASE_URL = '/api';

export interface CandidateAssignment {
  id: number;
  testId: number;
  candidateUserId: number | null;
  enabledFrom: string | null;
  enabledTo: string | null;
  status: string;
  testTitle: string;
}

export interface StartedAttempt {
  attemptId: number;
}

const ATTEMPT_STATUS = {
  INICIADO: 1,
  ENVIADO: 2,
} as const;

@Injectable({
  providedIn: 'root',
})
export class CandidateAttemptService {
  constructor(private readonly http: HttpClient) {}

  getAssignmentsForCandidate(userId: number | null): Observable<CandidateAssignment[]> {
    return this.http
      .get<unknown>(`${API_BASE_URL}/entity/asignacion`)
      .pipe(map((response) => this.mapAssignmentsResponse(response, userId)));
  }

  startAttempt(assignmentId: number): Observable<StartedAttempt> {
    if (!Number.isFinite(assignmentId) || assignmentId <= 0) {
      throw new Error('AssignmentId invalido para iniciar intento.');
    }

    return this.http
      .post<unknown>(`${API_BASE_URL}/entity/intento`, {
        assignmentId,
      })
      .pipe(
        map((response) => this.mapStartedAttempt(response)),
        catchError(() =>
          this.http
            .post<unknown>(`${API_BASE_URL}/entity/intento`, {
              assignmentId,
              estado: ATTEMPT_STATUS.INICIADO,
            })
            .pipe(
              map((response) => this.mapStartedAttempt(response)),
              catchError((error) => throwError(() => error)),
            ),
        ),
      );
  }

  saveAnswer(
    attemptId: number,
    questionId: number,
    answerText: string,
    selectedOption: string | null,
  ): Observable<void> {
    if (!Number.isFinite(attemptId) || attemptId <= 0) {
      throw new Error('AttemptId invalido para guardar respuesta.');
    }

    if (!Number.isFinite(questionId) || questionId <= 0) {
      throw new Error('QuestionId invalido para guardar respuesta.');
    }

    return this.http
      .post<void>(`${API_BASE_URL}/entity/respuesta`, {
        attemptId,
        questionId,
        answerText,
        selectedOption,
        intentoId: attemptId,
        preguntaTecnicaId: questionId,
        textoRespuesta: answerText,
        opcionSeleccionada: selectedOption,
      });
  }

  submitAttempt(attemptId: number, assignmentId: number | null): Observable<void> {
    return this.http
      .put<void>(`${API_BASE_URL}/entity/intento/${attemptId}`, {
        estado: ATTEMPT_STATUS.ENVIADO,
      })
      .pipe(
        concatMap(() => this.closeAssignmentForCandidate(assignmentId)),
        catchError((error) => throwError(() => error)),
      );
  }

  private closeAssignmentForCandidate(assignmentId: number | null): Observable<void> {
    if (!assignmentId || assignmentId <= 0) {
      return of(void 0);
    }

    return this.http
      .put<void>(`${API_BASE_URL}/entity/asignacion/${assignmentId}`, {
        activo: false,
        enabledTo: new Date().toISOString(),
      })
      .pipe(
        catchError(() =>
          this.http
            .put<void>(`${API_BASE_URL}/entity/asignacion/${assignmentId}`, {
              isActive: false,
              enabledTo: new Date().toISOString(),
            })
            .pipe(catchError((error) => throwError(() => error))),
        ),
      );
  }

  private mapStartedAttempt(raw: unknown): StartedAttempt {
    const source = this.unwrapData(raw);

    if (!source || typeof source !== 'object') {
      throw new Error('No se pudo obtener id del intento iniciado.');
    }

    const bag = source as Record<string, unknown>;
    const attemptIdRaw = bag['attemptId'] ?? bag['id'] ?? bag['intentoId'];
    const attemptId = typeof attemptIdRaw === 'number' ? attemptIdRaw : Number(attemptIdRaw);

    if (!Number.isFinite(attemptId)) {
      throw new Error('Respuesta invalida al iniciar intento.');
    }

    return { attemptId };
  }

  private mapAssignmentsResponse(raw: unknown, userId: number | null): CandidateAssignment[] {
    const source = this.unwrapData(raw);

    if (!Array.isArray(source)) {
      return [];
    }

    return source
      .map((item) => this.mapAssignment(item))
      .filter((item): item is CandidateAssignment => item !== null)
      .filter((assignment) => userId === null || assignment.candidateUserId === userId);
  }

  private mapAssignment(raw: unknown): CandidateAssignment | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const source = raw as Record<string, unknown>;

    const id = this.readNumber(source, ['id', 'asignacionId', 'assignmentId', 'AssignmentId']);
    const testId = this.readNumber(source, ['testId', 'pruebaTecnicaId', 'TestId']);

    if (id === null || testId === null || id <= 0 || testId <= 0) {
      return null;
    }

    return {
      id,
      testId,
      candidateUserId: this.readNumber(source, [
        'candidateUserId',
        'usuarioCandidatoId',
        'userId',
      ]),
      enabledFrom: this.readString(source, ['enabledFrom', 'habilitadoDesde']),
      enabledTo: this.readString(source, ['enabledTo', 'habilitadoHasta']),
      status: this.readString(source, ['status', 'estado']) ?? 'Pendiente',
      testTitle: this.readString(source, ['testTitle', 'tituloPrueba']) ?? `Prueba #${testId}`,
    };
  }

  private unwrapData(raw: unknown): unknown {
    if (raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)) {
      return (raw as Record<string, unknown>)['data'];
    }

    return raw;
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

  private readString(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string') {
        return value;
      }
    }

    return null;
  }
}
