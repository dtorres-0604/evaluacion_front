import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';

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

export interface AdminAttemptSummary {
  id: number;
  assignmentId: number | null;
  candidateUserId: number | null;
  candidateName: string | null;
  testId: number | null;
  testTitle: string | null;
  status: string;
  statusCode: number | null;
  startedAt: string | null;
  expiresAt: string | null;
  submittedAt: string | null;
  finishedAt: string | null;
  scoreFinal: number | null;
  active: boolean | null;
}

export interface AttemptAnswerSummary {
  id: number;
  attemptId: number;
  questionId: number;
  answerText: string | null;
  selectedOption: string | null;
  submittedAt: string | null;
}

export interface SubmitAttemptResult {
  success: boolean | null;
  statusCode: number | null;
  aiDispatched: boolean | null;
  alreadyFinalized: boolean;
  message: string | null;
}

export interface AttemptAnswerDraft {
  questionId: number;
  answerText: string;
  selectedOption: string | null;
}

const ATTEMPT_STATUS = {
  INICIADO: 1,
} as const;

@Injectable({
  providedIn: 'root',
})
export class CandidateAttemptService {
  constructor(private readonly http: HttpClient) {}

  getAttempts(): Observable<AdminAttemptSummary[]> {
    return this.http
      .get<unknown>(`${API_BASE_URL}/entity/intento`)
      .pipe(map((response) => this.mapAttemptsResponse(response)));
  }

  updateAttemptScore(attemptId: number, scoreFinal: number): Observable<void> {
    if (!Number.isFinite(attemptId) || attemptId <= 0) {
      throw new Error('AttemptId invalido para actualizar puntaje.');
    }

    if (!Number.isFinite(scoreFinal)) {
      throw new Error('Puntaje invalido para actualizar intento.');
    }

    return this.http.put<void>(`${API_BASE_URL}/entity/intento/${attemptId}`, {
      scoreFinal,
      puntajeFinal: scoreFinal,
    });
  }

  getAnswersByAttempt(attemptId: number): Observable<AttemptAnswerSummary[]> {
    if (!Number.isFinite(attemptId) || attemptId <= 0) {
      throw new Error('AttemptId invalido para consultar respuestas.');
    }

    return this.http
      .get<unknown>(`${API_BASE_URL}/entity/respuesta`)
      .pipe(map((response) => this.mapAnswersResponse(response, attemptId)));
  }

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

  saveAnswersBatch(attemptId: number, answers: AttemptAnswerDraft[]): Observable<void> {
    if (!Number.isFinite(attemptId) || attemptId <= 0) {
      throw new Error('AttemptId invalido para guardar respuestas.');
    }

    const validAnswers = answers.filter(
      (item) => Number.isFinite(item.questionId) && item.questionId > 0,
    );

    if (validAnswers.length === 0) {
      return throwError(() => new Error('No hay respuestas validas para enviar.'));
    }

    return this.http.post<void>(`${API_BASE_URL}/candidate/attempts/${attemptId}/answers`, {
      answers: validAnswers,
      respuestas: validAnswers,
      isFinal: false,
    });
  }

  submitAttempt(attemptId: number): Observable<SubmitAttemptResult> {
    if (!Number.isFinite(attemptId) || attemptId <= 0) {
      throw new Error('AttemptId invalido para enviar intento.');
    }

    return this.http
      .post<unknown>(`${API_BASE_URL}/candidate/attempts/${attemptId}/submit`, {})
      .pipe(
        map((response) => this.mapSubmitAttemptResponse(response)),
        catchError((error) => throwError(() => error)),
      );
  }

  private mapSubmitAttemptResponse(raw: unknown): SubmitAttemptResult {
    const envelope = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
    const source = this.unwrapData(raw);

    const topLevelMessage =
      envelope && typeof envelope['message'] === 'string' ? (envelope['message'] as string) : null;

    if (!source || typeof source !== 'object') {
      return {
        success: null,
        statusCode: null,
        aiDispatched: null,
        alreadyFinalized:
          typeof topLevelMessage === 'string' &&
          topLevelMessage.toLowerCase().includes('ya finalizado'),
        message: topLevelMessage,
      };
    }

    const bag = source as Record<string, unknown>;

    const dataMessage = this.readString(bag, ['message', 'mensaje']);
    const message = dataMessage ?? topLevelMessage;
    const alreadyFinalized =
      typeof message === 'string' && message.toLowerCase().includes('ya finalizado');

    return {
      success: this.readBoolean(bag, ['success']),
      statusCode: this.readNumber(bag, ['estado', 'statusCode']),
      aiDispatched: this.readBoolean(bag, ['aiDispatched']),
      alreadyFinalized,
      message,
    };
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

  private mapAttemptsResponse(raw: unknown): AdminAttemptSummary[] {
    const source = this.unwrapData(raw);

    if (!Array.isArray(source)) {
      return [];
    }

    return source
      .map((item) => this.mapAttempt(item))
      .filter((item): item is AdminAttemptSummary => item !== null)
      .sort((a, b) => b.id - a.id);
  }

  private mapAttempt(raw: unknown): AdminAttemptSummary | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const source = raw as Record<string, unknown>;
    const id = this.readNumber(source, ['id', 'intentoId', 'attemptId']);

    if (id === null || id <= 0) {
      return null;
    }

    return {
      id,
      assignmentId: this.readNumber(source, ['assignmentId', 'asignacionId']),
      candidateUserId: this.readNumber(source, ['candidateUserId', 'usuarioCandidatoId', 'userId']),
      candidateName: this.readString(source, ['candidateName', 'nombreCandidato']),
      testId: this.readNumber(source, ['testId', 'pruebaTecnicaId']),
      testTitle: this.readString(source, ['testTitle', 'tituloPrueba']),
      status: this.readString(source, ['status']) ?? this.mapStatusCode(this.readNumber(source, ['estado'])),
      statusCode: this.readNumber(source, ['estado']),
      startedAt: this.normalizeDate(this.readString(source, ['startedAt', 'fechaInicio', 'createdAt'])),
      expiresAt: this.normalizeDate(this.readString(source, ['expiresAt', 'fechaExpiracion'])),
      submittedAt: this.normalizeDate(this.readString(source, ['submittedAt', 'fechaEnvio'])),
      finishedAt: this.normalizeDate(this.readString(source, ['finishedAt', 'fechaFin', 'updatedAt'])),
      scoreFinal: this.readNumber(source, ['scoreFinal', 'puntajeFinal']),
      active: this.readBoolean(source, ['activo', 'active', 'isActive']),
    };
  }

  private mapStatusCode(statusCode: number | null): string {
    if (statusCode === null) {
      return 'Sin estado';
    }

    const statusMap: Record<number, string> = {
      1: 'Iniciado',
      2: 'En progreso',
      3: 'Enviado',
      4: 'Calificado',
      5: 'Anulado',
    };

    return statusMap[statusCode] ?? `Estado ${statusCode}`;
  }

  private normalizeDate(value: string | null): string | null {
    if (!value) {
      return null;
    }

    if (value.startsWith('0001-01-01')) {
      return null;
    }

    return value;
  }

  private readBoolean(source: Record<string, unknown>, keys: string[]): boolean | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'boolean') {
        return value;
      }

      if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') {
          return true;
        }

        if (value.toLowerCase() === 'false') {
          return false;
        }
      }
    }

    return null;
  }

  private mapAnswersResponse(raw: unknown, attemptId: number): AttemptAnswerSummary[] {
    const source = this.unwrapData(raw);

    if (!Array.isArray(source)) {
      return [];
    }

    return source
      .map((item) => this.mapAnswer(item))
      .filter((item): item is AttemptAnswerSummary => item !== null && item.attemptId === attemptId)
      .sort((a, b) => a.questionId - b.questionId);
  }

  private mapAnswer(raw: unknown): AttemptAnswerSummary | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const source = raw as Record<string, unknown>;
    const id = this.readNumber(source, ['id', 'respuestaId']);
    const attemptId = this.readNumber(source, ['attemptId', 'intentoId']);
    const questionId = this.readNumber(source, ['questionId', 'preguntaTecnicaId']);

    if (
      id === null ||
      id <= 0 ||
      attemptId === null ||
      attemptId <= 0 ||
      questionId === null ||
      questionId <= 0
    ) {
      return null;
    }

    return {
      id,
      attemptId,
      questionId,
      answerText: this.readString(source, ['answerText', 'textoRespuesta']),
      selectedOption: this.readString(source, ['selectedOption', 'opcionSeleccionada']),
      submittedAt: this.readString(source, ['createdAt', 'fechaRegistro', 'updatedAt']),
    };
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
