import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import type { FriendRequestDto } from '../../models';

@Component({
  selector: 'app-friends-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './friends-list.component.html',
})
export class FriendsListComponent {
  @Input() myUserId = '';
  @Input() friends: FriendRequestDto[] = [];
  @Input() incoming: FriendRequestDto[] = [];
  @Input() outgoing: FriendRequestDto[] = [];
  @Input() onlineFriendIds: Set<string> = new Set();
  @Input() selectedFriendId: string | null = null;

  @Output() pickFriend = new EventEmitter<string>();
  @Output() accept = new EventEmitter<string>();
  @Output() reject = new EventEmitter<string>();

  otherId(f: FriendRequestDto): string {
    return f.userId === this.myUserId ? f.friendId : f.userId;
  }

  otherName(f: FriendRequestDto): string {
    return f.userId === this.myUserId ? f.friendUsername : f.userUsername;
  }

  isOnline(friendUserId: string): boolean {
    return this.onlineFriendIds.has(friendUserId);
  }
}
