import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import Chart from 'chart.js/auto';
import { firstValueFrom } from 'rxjs';
import { EditProfileModalComponent } from '../../components/edit-profile-modal/edit-profile-modal.component';
import { LessonRecommendationComponent } from '../../components/lesson-recommendation/lesson-recommendation.component';
import { SkillEstimateModalComponent } from '../../components/skill-estimate-modal/skill-estimate-modal.component';
import type { SkillEstimateResponse } from '../../models/ai.model';
import type {
  EloHistoryPoint,
  ProfileDashboard,
  UserProfileApi,
} from '../../models/profile.model';
import { AiSuggestionService } from '../../services/ai-suggestion.service';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    EditProfileModalComponent,
    SkillEstimateModalComponent,
    LessonRecommendationComponent,
  ],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent implements OnInit, OnDestroy {
  private readonly profileApi = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly aiSuggest = inject(AiSuggestionService);

  @ViewChild('eloCanvas') eloRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('pieCanvas') pieRef?: ElementRef<HTMLCanvasElement>;

  dashboard: ProfileDashboard | null = null;
  loadError = '';
  loading = true;

  editOpen = false;

  skillModalOpen = false;
  skillModalLoading = false;
  skillModalError = '';
  skillModalResult: SkillEstimateResponse | null = null;

  private eloChart: Chart | null = null;
  private pieChart: Chart | null = null;

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.eloChart?.destroy();
    this.pieChart?.destroy();
  }

  get initialLetter(): string {
    const u = this.dashboard?.profile?.username ?? '?';
    return u.trim().charAt(0).toUpperCase() || '?';
  }

  load(): void {
    this.loading = true;
    this.loadError = '';
    this.destroyCharts();
    this.auth.me().subscribe({
      next: (u) => {
        this.profileApi.loadDashboard(u.id).subscribe({
          next: (d) => {
            this.dashboard = d;
            this.loading = false;
            setTimeout(() => this.buildCharts(), 0);
          },
          error: () => {
            this.loadError = 'Could not load profile data.';
            this.loading = false;
          },
        });
      },
      error: () => {
        this.loadError = 'Not signed in.';
        this.loading = false;
      },
    });
  }

  openEdit(): void {
    this.editOpen = true;
  }

  closeEdit(): void {
    this.editOpen = false;
  }

  onProfileSaved(_p: UserProfileApi): void {
    this.load();
  }

  get lastFinishedGameId(): string | null {
    const g = this.dashboard?.games?.find((x) => x.result !== 'ongoing');
    return g?.gameId ?? null;
  }

  analyzeLastGame(): void {
    const id = this.lastFinishedGameId;
    this.skillModalOpen = true;
    this.skillModalLoading = !!id;
    this.skillModalError = '';
    this.skillModalResult = null;
    if (!id) {
      this.skillModalLoading = false;
      this.skillModalError = 'No completed games in your recent history yet.';
      return;
    }
    void this.fetchSkillEstimate(id);
  }

  closeSkillModal(): void {
    this.skillModalOpen = false;
    this.skillModalLoading = false;
    this.skillModalError = '';
    this.skillModalResult = null;
  }

  private async fetchSkillEstimate(gameId: string): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.aiSuggest.estimateSkill({ gameId })
      );
      this.skillModalResult = res;
    } catch {
      this.skillModalError = 'Could not analyze that game.';
    } finally {
      this.skillModalLoading = false;
    }
  }

  private destroyCharts(): void {
    this.eloChart?.destroy();
    this.pieChart?.destroy();
    this.eloChart = null;
    this.pieChart = null;
  }

  private buildCharts(): void {
    if (!this.dashboard) {
      return;
    }
    const eloEl = this.eloRef?.nativeElement;
    const pieEl = this.pieRef?.nativeElement;
    if (!eloEl || !pieEl) {
      return;
    }

    this.destroyCharts();

    const eloHist = this.dashboard.eloHistory;
    const dates = new Set<string>();
    for (const p of [...eloHist.bullet, ...eloHist.blitz, ...eloHist.rapid]) {
      dates.add(p.date);
    }
    const sortedDates = [...dates].sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    const labels = sortedDates.map((d) =>
      new Date(d).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    );

    const align = (pts: EloHistoryPoint[]): number[] => {
      if (!sortedDates.length) {
        return [];
      }
      if (!pts.length) {
        return sortedDates.map(() => 1200);
      }
      let i = 0;
      let last = pts[0]!.elo;
      return sortedDates.map((d) => {
        const t = new Date(d).getTime();
        while (i + 1 < pts.length && new Date(pts[i + 1]!.date).getTime() <= t) {
          i++;
          last = pts[i]!.elo;
        }
        return last;
      });
    };

    this.eloChart = new Chart(eloEl, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Bullet',
            data: align(eloHist.bullet),
            borderColor: 'rgb(248 113 113)',
            backgroundColor: 'rgba(248, 113, 113, 0.06)',
            fill: true,
            tension: 0.2,
          },
          {
            label: 'Blitz',
            data: align(eloHist.blitz),
            borderColor: 'rgb(250 204 21)',
            backgroundColor: 'rgba(250, 204, 21, 0.06)',
            fill: true,
            tension: 0.2,
          },
          {
            label: 'Rapid',
            data: align(eloHist.rapid),
            borderColor: 'rgb(251 191 36)',
            backgroundColor: 'rgba(251, 191, 36, 0.08)',
            fill: true,
            tension: 0.2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: 'rgb(161 161 170)', boxWidth: 10 },
          },
        },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.06)' } },
          x: { grid: { color: 'rgba(255,255,255,0.06)' } },
        },
      },
    });

    const stats = this.dashboard.stats;
    this.pieChart = new Chart(pieEl, {
      type: 'pie',
      data: {
        labels: ['Wins', 'Losses', 'Draws'],
        datasets: [
          {
            data: [stats.gamesWon, stats.gamesLost, stats.gamesDrawn],
            backgroundColor: [
              'rgba(34, 197, 94, 0.85)',
              'rgba(239, 68, 68, 0.85)',
              'rgba(161, 161, 170, 0.85)',
            ],
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
            labels: { color: '#a1a1aa' },
          },
        },
      },
    });
  }

  resultClass(r: string): string {
    switch (r) {
      case 'win':
        return 'text-emerald-400';
      case 'loss':
        return 'text-red-400';
      case 'draw':
        return 'text-zinc-400';
      default:
        return 'text-amber-400';
    }
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  winRate(stats: ProfileDashboard['stats']): string {
    const p = stats.winRatePercent;
    if (p == null) {
      return '—';
    }
    return `${p.toFixed(1)}%`;
  }
}
