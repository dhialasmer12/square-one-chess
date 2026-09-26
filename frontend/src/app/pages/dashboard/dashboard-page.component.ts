import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivityHeatmapComponent } from '../../components/analytics-dashboard/activity-heatmap.component';
import { EloDistributionChartComponent } from '../../components/analytics-dashboard/elo-distribution-chart.component';
import { GameVolumeChartComponent } from '../../components/analytics-dashboard/game-volume-chart.component';
import { OpeningPieChartComponent } from '../../components/analytics-dashboard/opening-pie-chart.component';
import { StatsCardsComponent } from '../../components/analytics-dashboard/stats-cards.component';
import { UserGrowthChartComponent } from '../../components/analytics-dashboard/user-growth-chart.component';
import type {
  PlatformAnalyticsDto,
  UserAnalyticsDto,
  PlayerKpis,
} from '../../models/analytics.model';
import { AnalyticsDashboardService } from '../../services/analytics-dashboard.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    StatsCardsComponent,
    UserGrowthChartComponent,
    GameVolumeChartComponent,
    OpeningPieChartComponent,
    EloDistributionChartComponent,
    ActivityHeatmapComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  private readonly analytics = inject(AnalyticsDashboardService);
  readonly auth = inject(AuthService);

  mode: 'admin' | 'player' | 'loading' | 'error' = 'loading';
  platform: PlatformAnalyticsDto | null = null;
  player: UserAnalyticsDto | null = null;
  playerKpis: PlayerKpis | null = null;
  loadError = '';

  ngOnInit(): void {
    this.auth.me().subscribe({
      next: (u) => {
        if (u.isAdmin) {
          this.loadPlatform();
        } else {
          this.loadPlayer(u.id);
        }
      },
      error: () => {
        this.mode = 'error';
        this.loadError = 'Not signed in.';
      },
    });
  }

  private loadPlatform(): void {
    this.analytics.getPlatform(30).subscribe({
      next: (p) => {
        this.platform = p;
        this.mode = 'admin';
      },
      error: (e: HttpErrorResponse) => {
        if (e.status === 403) {
          const id = this.auth.currentUser()?.id;
          if (id) {
            this.loadPlayer(id);
            return;
          }
        }
        this.mode = 'error';
        this.loadError = 'Could not load analytics.';
      },
    });
  }

  private loadPlayer(userId: string): void {
    this.analytics.getUser(userId).subscribe({
      next: (pl) => {
        this.player = pl;
        this.playerKpis = {
          elo: pl.elo,
          eloBullet: pl.eloBullet,
          eloBlitz: pl.eloBlitz,
          eloRapid: pl.eloRapid,
          gamesPlayed: pl.gamesPlayed,
          gamesWon: pl.gamesWon,
          gamesLost: pl.gamesLost,
          username: pl.username,
        };
        this.mode = 'player';
      },
      error: () => {
        this.mode = 'error';
        this.loadError = 'Could not load your stats.';
      },
    });
  }
}
