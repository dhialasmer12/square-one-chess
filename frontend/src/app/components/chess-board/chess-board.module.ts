import { NgModule } from '@angular/core';
import { ChessBoardComponent } from './chess-board.component';

/**
 * Optional NgModule wrapper for apps that still use `imports: [ChessBoardModule]`.
 * The component is standalone; this module only re-exports it.
 */
@NgModule({
  imports: [ChessBoardComponent],
  exports: [ChessBoardComponent],
})
export class ChessBoardModule {}
