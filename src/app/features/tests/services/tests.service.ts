import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';

const API_BASE_URL = '/api';

export interface TechnicalTestFormValue {
  title: string;
  description: string;
  durationMinutes: number;
  passingScore: number;
  isPublished: boolean;
}

export interface TechnicalTestSummary {
  id: number;
  title: string;
  description: string;
  durationMinutes: number;
  passingScore: number;
  isPublished: boolean;
}

export interface CandidateUserSummary {
  id: number;
  fullName: string;
}

export interface AssignmentBatchResult {
  createdAssignmentIds: number[];
  skippedCandidateUserIds: number[];
  notFoundCandidateUserIds: number[];
  usedFallback?: boolean;
}

export interface QuestionOptionCanonical {
  text: string;
  value: string;
  correct: boolean;
}

export interface TechnicalQuestionFormValue {
  type: number;
  statement: string;
  options: QuestionOptionCanonical[];
  order: number;
  maxScore: number;
  timerSeconds: number | null;
}

export interface TechnicalQuestionSummary {
  id: number;
  testId: number;
  type: number;
  statement: string;
  options: QuestionOptionCanonical[];
  order: number;
  maxScore: number;
  timerSeconds: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class TestsService {
  constructor(private readonly http: HttpClient) {}

  getTechnicalTests(): Observable<TechnicalTestSummary[]> {
    return this.http
      .get<unknown>(`${API_BASE_URL}/entity/pruebatecnica`)
      .pipe(map((response) => this.mapTestsResponse(response)));
  }

  createTechnicalTest(payload: TechnicalTestFormValue): Observable<number> {
    const request = {
      titulo: payload.title,
      descripcion: payload.description,
      duracionMinutos: payload.durationMinutes,
      puntajeAprobacion: payload.passingScore,
      isPublished: payload.isPublished,
    };

    return this.http
      .post<unknown>(`${API_BASE_URL}/entity/pruebatecnica`, request)
      .pipe(map((response) => this.readEntityId(response)));
  }

  updateTechnicalTest(testId: number, payload: TechnicalTestFormValue): Observable<void> {
    const request = {
      titulo: payload.title,
      descripcion: payload.description,
      duracionMinutos: payload.durationMinutes,
      puntajeAprobacion: payload.passingScore,
      isPublished: payload.isPublished,
    };

    return this.http.put<void>(`${API_BASE_URL}/entity/pruebatecnica/${testId}`, request);
  }

  deleteTechnicalTest(testId: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/entity/pruebatecnica/${testId}`);
  }

  createTechnicalQuestion(testId: number, payload: TechnicalQuestionFormValue): Observable<void> {
    const serializedOptions = payload.options.length ? JSON.stringify(payload.options) : null;

    const request = {
      testId,
      tipoPregunta: payload.type,
      enunciado: payload.statement,
      opcionesJson: serializedOptions,
      orden: payload.order,
      puntajeMaximo: payload.maxScore,
      temporizadorSegundos: payload.timerSeconds,
    };

    return this.http.post<void>(`${API_BASE_URL}/entity/preguntatecnica`, request);
  }

  getQuestionsByTestId(testId: number): Observable<TechnicalQuestionSummary[]> {
    return this.http
      .get<unknown>(`${API_BASE_URL}/entity/preguntatecnica`)
      .pipe(map((response) => this.mapQuestionsByTestResponse(response, testId)));
  }

  updateTechnicalQuestion(
    questionId: number,
    payload: TechnicalQuestionFormValue,
  ): Observable<void> {
    const serializedOptions = payload.options.length ? JSON.stringify(payload.options) : null;

    return this.http.put<void>(`${API_BASE_URL}/entity/preguntatecnica/${questionId}`, {
      tipoPregunta: payload.type,
      enunciado: payload.statement,
      opcionesJson: serializedOptions,
      orden: payload.order,
      puntajeMaximo: payload.maxScore,
      temporizadorSegundos: payload.timerSeconds,
    });
  }

  deleteTechnicalQuestion(questionId: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/entity/preguntatecnica/${questionId}`);
  }

  getCandidateUsers(): Observable<CandidateUserSummary[]> {
    return this.http
      .get<unknown>(`${API_BASE_URL}/entity/usuario`)
      .pipe(map((response) => this.mapCandidateUsersResponse(response)));
  }

  assignTestToCandidates(
    testId: number,
    candidateUserIds: number[],
  ): Observable<AssignmentBatchResult> {
    const request = {
      candidateUserIds,
    };

    return this.http.post<unknown>(`${API_BASE_URL}/tests/${testId}/assignments`, request).pipe(
      map((response) => this.mapAssignmentBatchResponse(response)),
      catchError(() => this.assignTestToCandidatesFallback(testId, candidateUserIds)),
    );
  }

  private assignTestToCandidatesFallback(
    testId: number,
    candidateUserIds: number[],
  ): Observable<AssignmentBatchResult> {
    return this.http
      .post<void>(`${API_BASE_URL}/entity/asignacion`, {
        testId,
        candidateUserIds,
        assignedAtUtc: new Date().toISOString(),
      })
      .pipe(
        map(() => ({
          createdAssignmentIds: [],
          skippedCandidateUserIds: [],
          notFoundCandidateUserIds: [],
          usedFallback: true,
        })),
        catchError((error) => throwError(() => error)),
      );
  }

  private mapAssignmentBatchResponse(raw: unknown): AssignmentBatchResult {
    const source = this.unwrapData(raw);

    if (!source || typeof source !== 'object') {
      return {
        createdAssignmentIds: [],
        skippedCandidateUserIds: [],
        notFoundCandidateUserIds: [],
      };
    }

    const bag = source as Record<string, unknown>;

    return {
      createdAssignmentIds: this.readNumberArray(bag, ['createdAssignmentIds']),
      skippedCandidateUserIds: this.readNumberArray(bag, ['skippedCandidateUserIds']),
      notFoundCandidateUserIds: this.readNumberArray(bag, ['notFoundCandidateUserIds']),
    };
  }

  private mapTestsResponse(raw: unknown): TechnicalTestSummary[] {
    const source = this.unwrapData(raw);

    if (!Array.isArray(source)) {
      return [];
    }

    return source
      .map((item) => this.mapTest(item))
      .filter((item): item is TechnicalTestSummary => item !== null);
  }

  private mapTest(raw: unknown): TechnicalTestSummary | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const source = raw as Record<string, unknown>;
    const idRaw = source['id'] ?? source['pruebaTecnicaId'] ?? source['testId'];
    const id = typeof idRaw === 'number' ? idRaw : Number(idRaw);

    if (!Number.isFinite(id)) {
      return null;
    }

    return {
      id,
      title: this.readString(source, ['titulo', 'title', 'nombre']) ?? '',
      description: this.readString(source, ['descripcion', 'description']) ?? '',
      durationMinutes: this.readNumber(source, ['duracionMinutos', 'durationMinutes']) ?? 0,
      passingScore: this.readNumber(source, ['puntajeAprobacion', 'passingScore']) ?? 0,
      isPublished:
        this.readBoolean(source, ['isPublished', 'publicada', 'published', 'activo']) ?? false,
    };
  }

  private mapCandidateUsersResponse(raw: unknown): CandidateUserSummary[] {
    const source = this.unwrapData(raw);

    if (!Array.isArray(source)) {
      return [];
    }

    return source
      .map((item) => this.mapCandidate(item))
      .filter((item): item is CandidateUserSummary => item !== null);
  }

  private mapQuestionsByTestResponse(raw: unknown, testId: number): TechnicalQuestionSummary[] {
    const source = this.unwrapData(raw);

    if (!Array.isArray(source)) {
      return [];
    }

    return source
      .map((item) => this.mapQuestion(item))
      .filter((item): item is TechnicalQuestionSummary => item !== null && item.testId === testId)
      .sort((a, b) => a.order - b.order);
  }

  private mapQuestion(raw: unknown): TechnicalQuestionSummary | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const source = raw as Record<string, unknown>;

    const id = this.readNumber(source, ['id', 'preguntaTecnicaId', 'questionId']);
    const testId = this.readNumber(source, ['testId', 'pruebaTecnicaId']);
    const type = this.readNumber(source, ['tipoPregunta', 'questionType']);

    if (id === null || testId === null || type === null) {
      return null;
    }

    return {
      id,
      testId,
      type,
      statement: this.readString(source, ['enunciado', 'statement']) ?? '',
      options: this.parseOptionsJson(this.readString(source, ['opcionesJson', 'optionsJson'])),
      order: this.readNumber(source, ['orden', 'order']) ?? 1,
      maxScore: this.readNumber(source, ['puntajeMaximo', 'maxScore']) ?? 0,
      timerSeconds: this.readNumber(source, ['temporizadorSegundos', 'timerSeconds']),
    };
  }

  private parseOptionsJson(raw: string | null): QuestionOptionCanonical[] {
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((item, index) => {
          if (typeof item === 'string') {
            return {
              text: item,
              value: String.fromCharCode(65 + index),
              correct: false,
            };
          }

          if (item && typeof item === 'object') {
            const bag = item as Record<string, unknown>;
            return {
              text: typeof bag['text'] === 'string' ? bag['text'] : '',
              value:
                typeof bag['value'] === 'string' ? bag['value'] : String.fromCharCode(65 + index),
              correct: typeof bag['correct'] === 'boolean' ? bag['correct'] : false,
            };
          }

          return null;
        })
        .filter((option): option is QuestionOptionCanonical => !!option && option.text.length > 0);
    } catch {
      return [];
    }
  }

  private mapCandidate(raw: unknown): CandidateUserSummary | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const source = raw as Record<string, unknown>;
    const idRaw = source['id'] ?? source['usuarioId'] ?? source['userId'];
    const id = typeof idRaw === 'number' ? idRaw : Number(idRaw);

    if (!Number.isFinite(id)) {
      return null;
    }

    const roles = this.readRoles(source);
    const isCandidate = roles.some((role) => role.toLowerCase() === 'candidato');
    if (!isCandidate) {
      return null;
    }

    const name = this.readString(source, ['name', 'nombre']) ?? '';
    const lastName = this.readString(source, ['lastName', 'apellido']) ?? '';

    return {
      id,
      fullName:
        `${name} ${lastName}`.trim() ||
        this.readString(source, ['username', 'userName']) ||
        `Usuario ${id}`,
    };
  }

  private readRoles(source: Record<string, unknown>): string[] {
    const rolesRaw = source['roles'];

    if (!Array.isArray(rolesRaw)) {
      return [];
    }

    return rolesRaw
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item && typeof item === 'object') {
          return this.readString(item as Record<string, unknown>, ['name', 'nombre']) ?? '';
        }

        return '';
      })
      .filter((role) => role.length > 0);
  }

  private readEntityId(raw: unknown): number {
    const source = this.unwrapData(raw);

    if (!source || typeof source !== 'object') {
      throw new Error('No se pudo obtener el id de la prueba creada.');
    }

    const bag = source as Record<string, unknown>;
    const idRaw = bag['id'] ?? bag['pruebaTecnicaId'] ?? bag['testId'];
    const id = typeof idRaw === 'number' ? idRaw : Number(idRaw);

    if (!Number.isFinite(id)) {
      throw new Error('Respuesta sin id de prueba tecnica.');
    }

    return id;
  }

  private unwrapData(raw: unknown): unknown {
    if (raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)) {
      return (raw as Record<string, unknown>)['data'];
    }

    return raw;
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

  private readBoolean(source: Record<string, unknown>, keys: string[]): boolean | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'boolean') {
        return value;
      }
    }

    return null;
  }

  private readNumberArray(source: Record<string, unknown>, keys: string[]): number[] {
    for (const key of keys) {
      const value = source[key];

      if (!Array.isArray(value)) {
        continue;
      }

      return value.map((item) => Number(item)).filter((item) => Number.isFinite(item));
    }

    return [];
  }
}
