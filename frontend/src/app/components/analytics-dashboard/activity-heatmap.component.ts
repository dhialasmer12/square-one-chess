import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import type { ActivityHeatmapDto } from '../../models/analytics.model';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  selector: 'app-activity-heatmap',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 class="mb-1 text-sm font-semibold text-zinc-300">
        Activity heatmap
      </h3>
      <p class="mb-3 text-xs text-zinc-500">{{ data.timezoneNote }}</p>
      <div class="heatmap-scroll overflow-x-auto pb-2">
        <div class="inline-block min-w-[640px]">
          <div
            class="grid gap-px"
            style="grid-template-columns: 2.25rem repeat(24, minmax(0, 1fr))"
          >
            <div></div>
            @for (h of hourLabels; track h) {
              <div class="text-center text-[8px] leading-none text-zinc-600">
                {{ h }}
              </div>
            }
            @for (day of dayIndices; track day) {
              <div
                class="flex items-center pr-1 text-[10px] text-zinc-500"
              >
                {{ dayLabel(day) }}
              </div>
              @for (h of hourLabels; track h) {
                <div
                  class="h-3 min-w-0 rounded-sm"
                  [style.background]="cellColor(day, h)"
                  [title]="tooltip(day, h)"
                ></div>
              }
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`],
})
export class ActivityHeatmapComponent {
  @Input() data: ActivityHeatmapDto = {
    cells: [],
    maxCount: 1,
    timezoneNote: '',
  };

  readonly hourLabels = Array.from({ length: 24 }, (_, i) => i);
  readonly dayIndices = [0, 1, 2, 3, 4, 5, 6];

  dayLabel(d: number): string {
    return DAY_LABELS[d] ?? '';
  }

  private getCount(day: number, hour: number): number {
    const cell = this.data.cells[day * 24 + hour];
    return cell?.count ?? 0;
  }

  cellColor(day: number, hour: number): string {
    const c = this.getCount(day, hour);
    const max = Math.max(1, this.data.maxCount);
    const t = c / max;
    const a = 0.12 + t * 0.78;
    return `rgba(251, 191, 36, ${a})`;
  }

  tooltip(day: number, hour: number): string {
    return `${DAY_LABELS[day]} ${hour}:00 — ${this.getCount(day, hour)}`;
  }
}
