import { Component, OnDestroy } from '@angular/core';
import { Platform } from '@ionic/angular';
import { ApiService } from './services/api.service';
import { Router } from '@angular/router';
import { Storage } from '@ionic/storage-angular';

import { interval, Subscription } from 'rxjs';
// Import Capacitor StatusBar plugin to demonstrate native integration.
import { StatusBar } from '@capacitor/status-bar';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnDestroy {
  unread = 0;
  user: any = null;
  pollSub: Subscription | null = null;

  constructor(private platform: Platform, private api: ApiService, private router: Router, private storage: Storage) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Platform ready; try a safe StatusBar call to show Capacitor is available
      // (no-op on web). Then initialize storage and notifications polling.
      (async () => {
        try {
          // Example: set a subtle status bar background color on devices.
          await StatusBar.setBackgroundColor({ color: '#3880ff' });
        } catch (e) {
          // If StatusBar or Capacitor isn't available (web), ignore the error.
        }
      })();

      this.initializeNotifications();
    });
  }

  async initializeNotifications() {
    try {
      await this.storage.create();
      this.user = await this.storage.get('user');
      if (!this.user || this.user.type !== 'organizer') return;

      // start polling unread count every 15s
      this.pollSub = interval(15000).subscribe(async () => {
        try {
          const count = await this.api.getUnreadCount();
          this.unread = count as any;
        } catch (e) {
          // ignore
        }
      });
      // initial fetch
      const initial = await this.api.getUnreadCount();
      this.unread = initial as any;
    } catch (e) {
      // ignore
    }
  }

  ngOnDestroy(): void {
    if (this.pollSub) this.pollSub.unsubscribe();
  }
}
