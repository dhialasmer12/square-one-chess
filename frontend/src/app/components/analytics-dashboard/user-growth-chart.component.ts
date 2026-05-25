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
import type { UserGrowthPointDto } from '../../models/analytics.model';

@Component({
  selector: 'app-user-growth-chart',
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
      .chart-wrap canvas {
        max-height: 14rem;
      }
    `,
  ],
})
export class UserGrowthChartComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('cv') cv?: ElementRef<HTMLCanvasElement>;
  @Input() points: UserGrowthPointDto[] = [];
  @Input() heading = 'New users per day';

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
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'New users',
            data,
            borderColor: 'rgb(52 211 153)',
            backgroundColor: 'rgba(52, 211, 153, 0.12)',
            fill: true,
            tension: 0.3,
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
            ticks: { color: '#a1a1aa' },
          },
          x: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#a1a1aa', maxRotation: 45 },
          },
        },
      },
    });
  }
}
