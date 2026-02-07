export type ParticleType = 'rain' | 'snow';

interface Particle {
  x: number;
  y: number;
  speed: number;
  size: number;
  drift: number;
}

const PRIME = 73; // For deterministic seeding

export class WeatherParticleOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private animationId: number | null = null;
  private type: ParticleType | null = null;
  private intensity: number = 0;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.inset = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '10';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.resize();
  }

  start(type: ParticleType, intensity: number): void {
    this.type = type;
    this.intensity = Math.min(intensity, 1.0);
    this.generateParticles();
    this.animate();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.particles = [];
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  resize(): void {
    this.canvas.width = this.canvas.offsetWidth || window.innerWidth;
    this.canvas.height = this.canvas.offsetHeight || window.innerHeight;
  }

  destroy(): void {
    this.stop();
    this.canvas.remove();
  }

  private generateParticles(): void {
    this.particles = [];
    const count =
      this.type === 'rain' ? Math.floor(this.intensity * 200) : Math.floor(this.intensity * 100);

    for (let i = 0; i < count; i++) {
      // Deterministic seeding: use index * PRIME
      const seedValue = (i * PRIME) % (this.canvas.width * this.canvas.height);
      const x = seedValue % this.canvas.width;
      const y = (seedValue / this.canvas.width) % this.canvas.height;

      if (this.type === 'rain') {
        this.particles.push({
          x,
          y: y % this.canvas.height,
          speed: 4 + Math.random() * 3,
          size: 1.5,
          drift: (Math.random() - 0.5) * 1.5,
        });
      } else {
        this.particles.push({
          x,
          y: y % this.canvas.height,
          speed: 0.5 + Math.random() * 1,
          size: 3 + Math.random() * 2,
          drift: (Math.random() - 0.5) * 0.5,
        });
      }
    }
  }

  private animate = (): void => {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle =
      this.type === 'rain' ? 'rgba(200, 210, 220, 0.6)' : 'rgba(255, 255, 255, 0.8)';

    for (const p of this.particles) {
      if (this.type === 'rain') {
        // Rain: vertical streaks
        const newY = p.y + p.speed;
        this.ctx.fillRect(p.x + p.drift, newY, 1, 8);
        p.y = newY > this.canvas.height ? -10 : newY;
      } else {
        // Snow: circular dots with sinusoidal drift
        const drift = Math.sin((p.y / this.canvas.height) * Math.PI * 4) * 2 + p.drift;
        const newY = p.y + p.speed;
        this.ctx.beginPath();
        this.ctx.arc(p.x + drift, newY, p.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
        p.y = newY > this.canvas.height ? -10 : newY;
      }
    }

    this.animationId = requestAnimationFrame(this.animate);
  };
}
