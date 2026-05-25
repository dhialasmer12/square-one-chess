import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatSidebarComponent } from './components/social/chat-sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ChatSidebarComponent],
  template: '<router-outlet /><app-chat-sidebar />',
})
export class AppComponent {
  title = 'Square One';
}
