import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { GameReviewResponse, LessonPuzzleItem } from '../../models/ai.model';
import { AiSuggestionService } from '../../services/ai-suggestion.service';

@Component({
  selector: 'app-game-review-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './game-review-page.component.html',
  styleUrl: './game-review-page.component.scss',
})
export class GameReviewPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ai = inject(AiSuggestionService);

  gameId = '';
  loading = true;
  loadError = '';
  review: GameReviewResponse | null = null;

  ngOnInit(): void {
    this.gameId = this.route.snapshot.paramMap.get('gameId') ?? '';
    if (!this.gameId) {
      this.loading = false;
      this.loadError = 'Missing game id.';
      return;
    }
    this.ai.gameReview(this.gameId).subscribe({
      next: (r) => {
        this.review = r;
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Could not load game review (finished games only).';
        this.loading = false;
      },
    });
  }

  qualityClass(q: string | undefined): string {
    switch (q) {
      case 'blunder':
        return 'gr-blunder';
      case 'mistake':
        return 'gr-mistake';
      case 'good':
        return 'gr-good';
      case 'excellent':
        return 'gr-excellent';
      default:
        return 'gr-neutral';
    }
  }

  trackPuzzle(_i: number, p: LessonPuzzleItem): string {
    return p.id;
  }
}
