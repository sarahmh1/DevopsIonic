import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Storage } from '@ionic/storage-angular';
import { ApiService, Event } from '../../services/api.service';

@Component({
  selector: 'app-participant',
  templateUrl: './participant.page.html',
  styleUrls: ['./participant.page.scss'],
})
export class ParticipantPage implements OnInit {
  events: Event[] = [];
  user: any;
  myEvents: Event[] = [];
  selectedTab: string = 'all';
  isLoading: boolean = false;
  unread: number = 0;

  constructor(
    private router: Router,
    private storage: Storage,
    private apiService: ApiService
  ) {}

  async ngOnInit() {
    // Init: vérifie le rôle, charge événements publics et mes événements.
    this.user = await this.storage.get('user');
    if (!this.user || this.user.type !== 'participant') {
      this.router.navigate(['/login']);
      return;
    }
    await this.loadEvents();
    await this.loadUnreadIfOrganizer();
  }

  async ionViewWillEnter() {
    // Rafraîchir le compteur unread si nécessaire.
    await this.loadUnreadIfOrganizer();
  }

  async loadUnreadIfOrganizer() {
    // Si l'utilisateur est organizer, récupère le nombre de notifications non lues.
    try {
      const u = await this.storage.get('user');
      if (u && u.type === 'organizer') {
        this.unread = await this.apiService.getUnreadCount() as number || 0;
      } else {
        this.unread = 0;
      }
    } catch (e) {
      // ignore
    }
  }

  async loadEvents() {
    // Charge tous les événements publics et les événements de l'utilisateur.
    this.isLoading = true;
    try {
  const allEvents = await this.apiService.getEvents();
  const myEvents = await this.apiService.getMyEvents();

  this.events = allEvents || [];
  this.myEvents = myEvents || [];
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
      this.events = [];
      this.myEvents = [];
    } finally {
      this.isLoading = false;
    }
  }

  async registerForEvent(eventId: number) {
    // Inscrit l'utilisateur à l'événement et recharge les listes.
    try {
  await this.apiService.registerForEvent(eventId);
      await this.loadEvents();
    } catch (error: any) {
      alert(error.error?.message || 'Erreur lors de l\'inscription');
    }
  }

  async unregisterFromEvent(eventId: number) {
    // Annule l'inscription à l'événement et recharge les listes.
    try {
  await this.apiService.unregisterFromEvent(eventId);
      await this.loadEvents();
    } catch (error: any) {
      alert(error.error?.message || 'Erreur lors de la désinscription');
    }
  }

  isRegisteredForEvent(eventId: number): boolean {
    // Retourne true si l'utilisateur est inscrit à l'événement.
    return this.myEvents.some(event => event.id === eventId);
  }

  onTabChange() {
    // Méthode appelée lors du changement d'onglet
  }

  logout() {
    // Déconnexion locale : supprime token/user et navigue vers login.
    this.storage.remove('user');
    this.storage.remove('token');
    this.router.navigate(['/login']);
  }
}
