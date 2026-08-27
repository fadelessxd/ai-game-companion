export class ScreenCapture {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;

  async start(): Promise<void> {
    if (this.stream) return;

    const displayMedia = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 5 },
      audio: false,
    });

    this.stream = displayMedia;
    this.video = document.createElement('video');
    this.video.srcObject = displayMedia;
    this.video.muted = true;
    this.video.autoplay = true;
    this.video.playsInline = true;

    await this.video.play().catch(() => {});

    displayMedia.getVideoTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        this.stop();
      });
    });
  }

  isCaptureActive(): boolean {
    return this.stream !== null && this.stream.getVideoTracks().some((t) => t.readyState === 'live');
  }

  captureScreenshot(economyMode: boolean = false): string | null {
    if (!this.video || !this.stream) return null;

    const track = this.stream.getVideoTracks()[0];
    if (!track || track.readyState !== 'live') return null;

    const video = this.video;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    const canvas = document.createElement('canvas');

    let targetWidth = video.videoWidth;
    let targetHeight = video.videoHeight;

    if (economyMode) {
      const maxDim = 854;
      if (targetWidth > maxDim) {
        const ratio = maxDim / targetWidth;
        targetWidth = Math.round(targetWidth * ratio);
        targetHeight = Math.round(targetHeight * ratio);
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    const quality = economyMode ? 0.5 : 0.8;
    return canvas.toDataURL('image/jpeg', quality);
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
  }
}

export const screenCapture = new ScreenCapture();
