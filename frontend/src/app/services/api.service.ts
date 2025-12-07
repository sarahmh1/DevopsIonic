import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Storage } from '@ionic/storage-angular';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  email: string;
  type: 'organizer' | 'participant';
}

export interface Event {
  id: number;
  title: string;
  date: string;
  location: string;
  description: string;
  organizer_id: number;
  organizer_email?: string;
  participant_count?: number;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private storage: Storage
  ) {}
  private async getAuthHeaders(): Promise<HttpHeaders> {
    const token = await this.storage.get('token');
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return new HttpHeaders(headers);
  }

  // Authentification
  login(email: string, password: string) {
    return firstValueFrom(this.http.post<LoginResponse>(`${this.baseUrl}/login`, { email, password }));
  }

  register(email: string, password: string, type: 'organizer' | 'participant') {
    return firstValueFrom(this.http.post<LoginResponse>(`${this.baseUrl}/register`, { email, password, type }));
  }

  // Événements
  async getEvents(): Promise<Event[]> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(this.http.get<Event[]>(`${this.baseUrl}/events`, { headers }));
  }

  async createEvent(event: Partial<Event>) {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(this.http.post(`${this.baseUrl}/events`, event, { headers }));
  }

  async updateEvent(id: number, event: Partial<Event>) {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(this.http.put(`${this.baseUrl}/events/${id}`, event, { headers }));
  }

  async deleteEvent(id: number) {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(this.http.delete(`${this.baseUrl}/events/${id}`, { headers }));
  }

  // Inscriptions
  async registerForEvent(eventId: number) {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(this.http.post(`${this.baseUrl}/events/${eventId}/register`, {}, { headers }));
  }

  async unregisterFromEvent(eventId: number) {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(this.http.delete(`${this.baseUrl}/events/${eventId}/unregister`, { headers }));
  }

  // Mes événements
  async getMyEvents(): Promise<Event[]> {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(this.http.get<Event[]>(`${this.baseUrl}/my-events`, { headers }));
  }

  // Notifications
  async getNotifications() {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(this.http.get<any[]>(`${this.baseUrl}/notifications`, { headers }));
  }

  async markNotificationRead(id: number) {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(this.http.post(`${this.baseUrl}/notifications/${id}/mark-read`, {}, { headers }));
  }

  async getUnreadCount() {
    const headers = await this.getAuthHeaders();
    return firstValueFrom(this.http.get<number>(`${this.baseUrl}/notifications/unread-count`, { headers }));
  }
}
