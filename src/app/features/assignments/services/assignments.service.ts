import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';

const API_BASE_URL = '/api';

export interface AssignmentTestOption {
  id: number;
  title: string;
  passingScore: number | null;
  scoreFinal: number | null;
  scoreAverage: number | null;
  aiSuggestedScore: number | null;
  aiSummary: string | null;
  aiComment: string | null;
  aiCreatedAt: string | null;
}

export interface AssignmentCandidateOption {
  id: number;
  fullName: string;
}

export interface AssignmentBatchResult {
  createdAssignmentIds: number[];
  skippedCandidateUserIds: number[];
  notFoundCandidateUserIds: number[];
  usedFallback?: boolean;
}

export interface AssignmentSummary {
  id: number;
  testId: number;
  candidateUserId: number | null;
  enabledFrom: string | null;
  enabledTo: string | null;
  status: string;
}

export interface CreateAssignmentInput {
  testId: number;
  candidateUserId: number;
  enabledFrom?: string | null;
  enabledTo?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AssignmentsService {
  constructor(private readonly http: HttpClient) {}

  getTests(): Observable<AssignmentTestOption[]> {
    return this.http
      .get<unknown>(`${API_BASE_URL}/entity/pruebatecnica`)
      .pipe(map((response) => this.mapTestsResponse(response)));
  }

  getCandidateUsers(): Observable<AssignmentCandidateOption[]> {
    return this.http
      .get<unknown>(`${API_BASE_URL}/entity/usuario`)
      .pipe(map((response) => this.mapCandidateUsersResponse(response)));
  }

  getAssignments(): Observable<AssignmentSummary[]> {
    return this.http
      .get<unknown>(`${API_BASE_URL}/entity/asignacion`)
      .pipe(map((response) => this.mapAssignmentsResponse(response)));
  }

  createAssignment(input: CreateAssignmentInput): Observable<AssignmentBatchResult> {
    const request: Record<string, unknown> = {
      candidateUserIds: [input.candidateUserId],
    };

    if (input.enabledFrom) {
      request['enabledFrom'] = this.toIso(input.enabledFrom);
    }

    if (input.enabledTo) {
      request['enabledTo'] = this.toIso(input.enabledTo);
    }

    return this.http
      .post<unknown>(`${API_BASE_URL}/tests/${input.testId}/assignments`, request)
      .pipe(
        map((response) => this.mapAssignmentBatchResponse(response)),
        catchError(() => this.createAssignmentFallback(input)),
      );
  }

  private createAssignmentFallback(
    input: CreateAssignmentInput,
  ): Observable<AssignmentBatchResult> {
    const request: Record<string, unknown> = {
      testId: input.testId,
      candidateUserId: input.candidateUserId,
    };

    if (input.enabledFrom) {
      request['enabledFrom'] = this.toIso(input.enabledFrom);
    }

    if (input.enabledTo) {
      request['enabledTo'] = this.toIso(input.enabledTo);
    }

    return this.http.post<void>(`${API_BASE_URL}/entity/asignacion`, request).pipe(
      map(() => ({
        createdAssignmentIds: [],
        skippedCandidateUserIds: [],
        notFoundCandidateUserIds: [],
        usedFallback: true,
      })),
      catchError((error) => throwError(() => error)),
    );
  }

  private mapTestsResponse(raw: unknown): AssignmentTestOption[] {
    const source = this.unwrapData(raw);

    if (!Array.isArray(source)) {
      return [];
    }

    return source
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const bag = item as Record<string, unknown>;
        const id = this.readNumber(bag, ['id', 'pruebaTecnicaId', 'testId']);

        if (id === null) {
          return null;
        }

        return {
          id,
          title: this.readString(bag, ['titulo', 'title', 'nombre']) ?? `Prueba ${id}`,
          passingScore: this.readNumber(bag, ['puntajeAprobacion', 'passingScore']),
          scoreFinal:
            this.readNumber(bag, ['scoreFinal', 'puntajeFinal']) ??
            this.readNumberByPartialKey(bag, ['scorefinal', 'puntajefinal']),
          scoreAverage:
            this.readNumber(bag, ['scorePromedio', 'averageScore']) ??
            this.readNumberByPartialKey(bag, ['scorepromedio', 'scoreaverage', 'promedio']),
          aiSuggestedScore: this.readNumber(bag, ['aiSuggestedScore', 'suggestedScore']),
          aiSummary: this.readString(bag, ['aiSummary', 'summary']),
          aiComment: this.readString(bag, ['comentarioIa', 'aiComment']),
          aiCreatedAt: this.readString(bag, ['aiCreatedAt', 'createdAt']),
        };
      })
      .filter((item): item is AssignmentTestOption => item !== null);
  }

  private readNumberByPartialKey(
    source: Record<string, unknown>,
    keyFragments: string[],
  ): number | null {
    for (const [key, rawValue] of Object.entries(source)) {
      const normalizedKey = key.toLowerCase();
      const matches = keyFragments.some((fragment) => normalizedKey.includes(fragment));
      if (!matches) {
        continue;
      }

      if (typeof rawValue === 'number') {
        return rawValue;
      }

      const parsed = Number(rawValue);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  private mapCandidateUsersResponse(raw: unknown): AssignmentCandidateOption[] {
    const source = this.unwrapData(raw);

    if (!Array.isArray(source)) {
      return [];
    }

    return source
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const bag = item as Record<string, unknown>;
        const id = this.readNumber(bag, ['id', 'usuarioId', 'userId']);
        if (id === null) {
          return null;
        }

        const roles = this.readRoles(bag);
        const isCandidate = roles.some((role) => role.toLowerCase() === 'candidato');
        if (!isCandidate) {
          return null;
        }

        const name = this.readString(bag, ['name', 'nombre']) ?? '';
        const lastName = this.readString(bag, ['lastName', 'apellido']) ?? '';

        return {
          id,
          fullName:
            `${name} ${lastName}`.trim() ||
            this.readString(bag, ['username', 'userName']) ||
            `Usuario ${id}`,
        };
      })
      .filter((item): item is AssignmentCandidateOption => item !== null);
  }

  private mapAssignmentsResponse(raw: unknown): AssignmentSummary[] {
    const source = this.unwrapData(raw);

    if (!Array.isArray(source)) {
      return [];
    }

    return source
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const bag = item as Record<string, unknown>;
        const id = this.readNumber(bag, ['id', 'asignacionId']);
        const testId = this.readNumber(bag, ['testId', 'pruebaTecnicaId']);

        if (id === null || testId === null) {
          return null;
        }

        return {
          id,
          testId,
          candidateUserId: this.readNumber(bag, [
            'candidateUserId',
            'usuarioCandidatoId',
            'userId',
          ]),
          enabledFrom: this.readString(bag, ['enabledFrom', 'habilitadoDesde']),
          enabledTo: this.readString(bag, ['enabledTo', 'habilitadoHasta']),
          status: this.readString(bag, ['status', 'estado']) ?? 'Pendiente',
        };
      })
      .filter((item): item is AssignmentSummary => item !== null);
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

  private unwrapData(raw: unknown): unknown {
    if (raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)) {
      return (raw as Record<string, unknown>)['data'];
    }

    return raw;
  }

  private toIso(datetimeLocal: string): string {
    return new Date(datetimeLocal).toISOString();
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
}
