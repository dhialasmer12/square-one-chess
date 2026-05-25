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
import type { OpeningSliceDto } from '../../models/analytics.model';

const COLORS = [
  'rgba(251, 191, 36, 0.85)',
  'rgba(52, 211, 153, 0.85)',
  'rgba(96, 165, 250, 0.85)',
  'rgba(167, 139, 250, 0.85)',
  'rgba(251, 113, 133, 0.85)',
  'rgba(45, 212, 191, 0.85)',
  'rgba(253, 186, 116, 0.85)',
  'rgba(148, 163, 184, 0.85)',
  'rgba(244, 63, 94, 0.75)',
  'rgba(161, 161, 170, 0.75)',
];

@Component({
  selector: 'app-opening-pie-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-wrap rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 class="mb-3 text-sm font-semibold text-zinc-300">{{ heading }}</h3>
      <div class="mx-auto h-64 w-full max-w-sm min-h-[16rem]">
        <canvas #cv></canvas>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`],
})
export class OpeningPieChartComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('cv') cv?: ElementRef<HTMLCanvasElement>;
  @Input() slices: OpeningSliceDto[] = [];
  @Input() heading = 'Popular first moves';

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
    if (this.slices.length === 0) {
      this.chart = new Chart(el, {
        type: 'doughnut',
        data: {
          labels: ['No data yet — play a few games'],
          datasets: [
            {
              data: [1],
              backgroundColor: ['rgba(63, 63, 70, 0.55)'],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#a1a1aa', boxWidth: 12 },
            },
            tooltip: { enabled: false },
          },
        },
      });
      return;
    }
    const labels = this.slices.map((s) => s.label);
    const data = this.slices.map((s) => s.count);
    const bg = labels.map((_, i) => COLORS[i % COLORS.length]!);
    this.chart = new Chart(el, {
      type: 'pie',
      data: {
        labels,
        datasets: [{ data, backgroundColor: bg, borderWidth: 0 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#a1a1aa', boxWidth: 12 },
          },
        },
      },
    });
  }
}
