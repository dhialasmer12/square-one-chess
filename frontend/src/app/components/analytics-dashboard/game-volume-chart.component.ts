import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import Chart from 'chart.js/auto';
import type { GameVolumePointDto } from '../../models/analytics.model';

@Component({
  selector: 'app-game-volume-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-wrap rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 class="mb-3 text-sm font-semibold text-zinc-300">{{ heading }}</h3>
      <div class="h-56 w-full min-h-[14rem]">
        <canvas #cv></canvas>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class GameVolumeChartComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('cv') cv?: ElementRef<HTMLCanvasElement>;
  @Input() points: GameVolumePointDto[] = [];
  @Input() heading = 'Finished games per day';

  private chart: Chart | null = null;

  ngAfterViewInit(): void {
    this.build();
  }

  ngOnChanges(_c: SimpleChanges): void {
    if (this.cv?.nativeElement) {
      this.build();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  private build(): void {
    const el = this.cv?.nativeElement;
    if (!el) {
      return;
    }
    this.chart?.destroy();
    const labels = this.points.map((p) =>
      p.date.slice(5).replace('-', '/')
    );
    const data = this.points.map((p) => p.value);
    this.chart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Games',
            data,
            backgroundColor: 'rgba(251, 191, 36, 0.45)',
            borderColor: 'rgb(251 191 36)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#a1a1aa', stepSize: 1 },
          },
          x: {
            grid: { display: false },
            ticks: { color: '#a1a1aa', maxRotation: 45 },
          },
        },
      },
    });
  }
}
