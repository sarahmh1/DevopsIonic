import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Storage } from '@ionic/storage-angular';
import { ModalController } from '@ionic/angular';
import { EventFormPage } from '../event-form/event-form.page';
import { ApiService, Event } from '../../services/api.service';

@Component({
  selector: 'app-organizer',
  templateUrl: './organizer.page.html',
  styleUrls: ['./organizer.page.scss'],
})
export class OrganizerPage implements OnInit {
  events: Event[] = [];
  user: any;
  isLoading: boolean = false;
  unread: number = 0;

  constructor(
    private router: Router,
    private storage: Storage,
    private modalController: ModalController,
    private apiService: ApiService
  ) {}

  async ngOnInit() {
    // Init: vérifie l'utilisateur, charge les événements et le compteur unread.
    this.user = await this.storage.get('user');
    if (!this.user || this.user.type !== 'organizer') {
      this.router.navigate(['/login']);
      return;
    }
    await this.loadEvents();
    await this.loadUnread();
  }

  async ionViewWillEnter() {
    // Rafraîchir le compteur de notifications à chaque affichage.
    await this.loadUnread();
  }

  async loadUnread() {
    // Récupère le nombre de notifications non lues et met à jour `this.unread`.
    try {
      this.unread = await this.apiService.getUnreadCount() as number || 0;
    } catch (e) {
      // ignore
    }
  }

  async loadEvents() {
    // Charge les événements de l'organisateur (met à jour `this.events`).
    this.isLoading = true;
    try {
  const events = await this.apiService.getMyEvents();
  this.events = events || [];
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
      this.events = [];
    } finally {
      this.isLoading = false;
    }
  }

  async addEvent() {
    // Ouvre le modal de création d'événement et recharge la liste après fermeture.
    const modal = await this.modalController.create({
      component: EventFormPage,
      componentProps: { event: null }
    });

    modal.onDidDismiss().then(async () => {
      await this.loadEvents();
    });

    return await modal.present();
  }

  async editEvent(event: Event) {
    // Ouvre le modal d'édition pour `event` et recharge la liste après fermeture.
    const modal = await this.modalController.create({
      component: EventFormPage,
      componentProps: { event: event }
    });

    modal.onDidDismiss().then(async () => {
      await this.loadEvents();
    });

    return await modal.present();
  }

  async deleteEvent(eventId: number) {
    // Supprime un événement après confirmation et recharge la liste.
    if (confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
      try {
  await this.apiService.deleteEvent(eventId);
        await this.loadEvents();
      } catch (error: any) {
        alert(error.error?.message || 'Erreur lors de la suppression');
      }
    }
  }

  logout() {
    // Déconnexion locale: supprime token/user et navigue vers /login.
    this.storage.remove('user');
    this.storage.remove('token');
    this.router.navigate(['/login']);
  }
}
