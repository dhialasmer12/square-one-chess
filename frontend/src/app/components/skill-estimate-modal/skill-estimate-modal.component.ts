import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import type { SkillEstimateResponse } from '../../models/ai.model';

@Component({
  selector: 'app-skill-estimate-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skill-estimate-modal.component.html',
  styleUrl: './skill-estimate-modal.component.scss',
})
export class SkillEstimateModalComponent {
  @Input() open = false;
  @Input() loading = false;
  @Input() error = '';
  @Input() result: SkillEstimateResponse | null = null;
  @Input() title = 'Skill estimate';

  @Output() closed = new EventEmitter<void>();

  onBackdrop(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) {
      this.closed.emit();
    }
  }

  close(): void {
    this.closed.emit();
  }

  tierClass(t: string): string {
    switch (t) {
      case 'good':
        return 'text-emerald-400';
      case 'average':
        return 'text-amber-200/90';
      default:
        return 'text-red-300/90';
    }
  }
}
