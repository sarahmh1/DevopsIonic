import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss']
})
export class NotificationsPage {
  notifications: any[] = [];
  loading = false;

  // Constructeur : injection du service API.
  constructor(private api: ApiService) {}

  // Charge les notifications à chaque affichage.
  ionViewWillEnter() {
    this.load();
  }

  // Charge les notifications et termine le refresher si fourni.
  async load(event?: any) {
    this.loading = true;
    try {
      this.notifications = await this.api.getNotifications();
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      this.loading = false;
  // Termine l'animation du refresher si présent.
      try {
        if (event) {
          if (event.target && typeof event.target.complete === 'function') {
            event.target.complete();
          } else if (event.detail && typeof event.detail.complete === 'function') {
            event.detail.complete();
          }
        }
      } catch (e) {
        // swallow any refresher errors; they don't affect core functionality
      }
    }
  }

  // Marque la notification comme lue et recharge la liste.
  async markRead(n: any) {
    try {
      await this.api.markNotificationRead(n.id);
      // refresh
      await this.load();
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  }
}
