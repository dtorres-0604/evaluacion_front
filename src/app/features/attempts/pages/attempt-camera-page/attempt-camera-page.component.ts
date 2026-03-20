import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CandidateAttemptService } from '../../services/candidate-attempt.service';

@Component({
  selector: 'app-attempt-camera-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './attempt-camera-page.component.html',
  styleUrl: './attempt-camera-page.component.scss',
})
export class AttemptCameraPageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly attemptService = inject(CandidateAttemptService);

  @ViewChild('cameraPreview', { static: false })
  private cameraPreviewRef?: ElementRef<HTMLVideoElement>;

  cameraEnabled = false;
  loadingCamera = false;
  startingEvaluation = false;
  errorMessage = '';

  private mediaStream: MediaStream | null = null;

  get assignmentId(): number {
    const raw = Number(this.route.snapshot.paramMap.get('assignmentId'));
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  }

  get testId(): number {
    const raw = Number(this.route.snapshot.queryParamMap.get('testId'));
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  }

  async onEnableCamera(): Promise<void> {
    this.errorMessage = '';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.errorMessage = 'Tu navegador no soporta acceso a camara.';
      return;
    }

    this.loadingCamera = true;

    try {
      const stream = await this.getUserMediaWithTimeout(12000);

      this.stopCamera();
      this.mediaStream = stream;
      this.cameraEnabled = true;

      const preview = this.cameraPreviewRef?.nativeElement;
      if (preview) {
        preview.srcObject = stream;

        // Avoid blocking on play(): in some browsers the promise can remain pending.
        void preview.play().catch(() => {
          this.errorMessage =
            'Camara activada, pero no se pudo reproducir la vista previa automaticamente.';
        });
      }
    } catch {
      this.errorMessage =
        'No fue posible activar la camara en el tiempo esperado. Puedes reintentar o continuar si ya esta activa.';
      this.cameraEnabled = false;
    } finally {
      this.loadingCamera = false;
    }
  }

  onForceCameraReady(): void {
    this.loadingCamera = false;
    this.cameraEnabled = true;
    this.errorMessage = '';
  }

  onDisableCamera(): void {
    this.stopCamera();
  }

  onBackToAssignments(): void {
    this.router.navigate(['/main/attempts']);
  }

  onContinueEvaluation(): void {
    if (!this.cameraEnabled) {
      this.errorMessage = 'Activa la camara antes de continuar con la evaluacion.';
      return;
    }

    if (this.assignmentId <= 0) {
      this.errorMessage =
        'No se pudo identificar la asignacion para continuar. Vuelve a la lista y reintenta.';
      return;
    }

    if (this.testId <= 0) {
      this.errorMessage =
        'No se pudo identificar la prueba asignada para continuar. Vuelve a la lista y reintenta.';
      return;
    }

    this.startingEvaluation = true;
    this.errorMessage = '';

    this.attemptService.startAttempt(this.assignmentId).subscribe({
      next: ({ attemptId }) => {
        this.router.navigate(['/main/attempts'], {
          queryParams: {
            directStartAttemptId: attemptId,
            directStartAssignmentId: this.assignmentId,
            directStartTestId: this.testId,
          },
        });
      },
      error: () => {
        this.errorMessage = 'No se pudo iniciar el intento. Intenta nuevamente.';
        this.startingEvaluation = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  private stopCamera(): void {
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;

    const preview = this.cameraPreviewRef?.nativeElement;
    if (preview) {
      preview.srcObject = null;
    }

    this.cameraEnabled = false;
  }

  private getUserMediaWithTimeout(timeoutMs: number): Promise<MediaStream> {
    return new Promise<MediaStream>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error('Camera activation timeout'));
      }, timeoutMs);

      navigator.mediaDevices
        .getUserMedia({
          video: true,
          audio: false,
        })
        .then((stream) => {
          window.clearTimeout(timeoutId);
          resolve(stream);
        })
        .catch((error) => {
          window.clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
}
