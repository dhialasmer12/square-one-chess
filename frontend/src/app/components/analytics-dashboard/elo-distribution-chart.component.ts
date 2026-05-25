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
import type { ELOBucketDto } from '../../models/analytics.model';

@Component({
  selector: 'app-elo-distribution-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-wrap rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 class="mb-3 text-sm font-semibold text-zinc-300">
        ELO distribution (players)
      </h3>
      <div class="h-56 w-full min-h-[14rem]">
        <canvas #cv></canvas>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`],
})
export class EloDistributionChartComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('cv') cv?: ElementRef<HTMLCanvasElement>;
  @Input() buckets: ELOBucketDto[] = [];

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
    const labels = this.buckets.map((b) => b.label);
    const data = this.buckets.map((b) => b.count);
    this.chart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Players',
            data,
            backgroundColor: 'rgba(129, 140, 248, 0.55)',
            borderColor: 'rgb(129 140 248)',
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
            ticks: { color: '#a1a1aa', maxRotation: 35 },
          },
        },
      },
    });
  }
}
