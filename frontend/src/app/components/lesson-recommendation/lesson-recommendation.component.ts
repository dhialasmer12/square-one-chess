import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import type {
  LessonPuzzleItem,
  LessonRecommendation,
} from '../../models/ai.model';
import { AiSuggestionService } from '../../services/ai-suggestion.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-lesson-recommendation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lesson-recommendation.component.html',
  styleUrl: './lesson-recommendation.component.scss',
})
export class LessonRecommendationComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly ai = inject(AiSuggestionService);

  lessons: LessonRecommendation[] = [];
  loading = true;
  loadError = '';
  activeIndex = 0;

  detailOpen = false;
  selected: LessonRecommendation | null = null;
  detailPuzzles: LessonPuzzleItem[] = [];
  detailPuzzlesLoading = false;
  detailPuzzlesError = '';

  ngOnInit(): void {
    this.auth.me().subscribe({
      next: (u) => this.fetchLessons(u.id),
      error: () => {
        this.loading = false;
        this.loadError = 'Sign in to load lesson recommendations.';
      },
    });
  }

  get active(): LessonRecommendation | null {
    return this.lessons[this.activeIndex] ?? null;
  }

  priorityClass(p: string): string {
    switch (p) {
      case 'high':
        return 'border-rose-500/40 bg-rose-500/10 text-rose-100';
      case 'medium':
        return 'border-amber-500/40 bg-amber-500/10 text-amber-100';
      default:
        return 'border-zinc-600 bg-zinc-800/80 text-zinc-300';
    }
  }

  prev(): void {
    if (this.activeIndex > 0) {
      this.activeIndex--;
    }
  }

  next(): void {
    if (this.activeIndex < this.lessons.length - 1) {
      this.activeIndex++;
    }
  }

  goTo(i: number): void {
    if (i >= 0 && i < this.lessons.length) {
      this.activeIndex = i;
    }
  }

  openDetails(lesson: LessonRecommendation): void {
    this.selected = lesson;
    this.detailPuzzles = [];
    this.detailPuzzlesError = '';
    this.detailOpen = true;
    this.detailPuzzlesLoading = true;
    this.ai.lessonPuzzles({ lessonId: lesson.id, limit: 10 }).subscribe({
      next: (res) => {
        const raw = res.puzzles ?? [];
        this.detailPuzzles = raw.map((p) => ({
          id: p.id,
          prompt: p.prompt,
          solutionHint: p.solutionHint,
          fen: p.fen,
          gameId: p.gameId,
          plyIndex: p.plyIndex,
          pattern: p.pattern,
          playedSan: p.playedSan,
          bestSan: p.bestSan,
        }));
        this.detailPuzzlesLoading = false;
      },
      error: () => {
        this.detailPuzzlesError = 'Could not load puzzles from your games.';
        this.detailPuzzlesLoading = false;
      },
    });
  }

  closeDetails(): void {
    this.detailOpen = false;
    this.selected = null;
    this.detailPuzzles = [];
    this.detailPuzzlesLoading = false;
    this.detailPuzzlesError = '';
  }

  private fetchLessons(userId: string): void {
    this.loading = true;
    this.loadError = '';
    this.ai.recommendLessons({ userId, numRecommendations: 5 }).subscribe({
      next: (res) => {
        this.lessons = res.lessons ?? [];
        this.activeIndex = 0;
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Could not load recommendations.';
        this.loading = false;
      },
    });
  }
}
