import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { env } from '../environment/env';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from './auth.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Canvas } from '../models/canvas';

export interface ConnectedUser {
  userId: number;
  username: string;
  connectedAt: number;
  canvasId: number;
  color: string;
  initials: string;
  status: 'active' | 'inactive' | 'drawing' | 'idle';
}

enum EventType {
  USER_EVENT = 'USER_EVENT',
}

export enum UserEventType {
  USER_JOINED = 'USER_JOINED',
  USER_LEFT = 'USER_LEFT',
}

export interface Event {
  eventType: EventType;
  timestamp?: number;
  canvasId?: number;
  fading?: boolean;
  description?: string;
}

export interface UserEvent extends Event {
  eventType: EventType.USER_EVENT;
  userId: number;
  userEventType: UserEventType;
}

interface CanvasMessage {
  pixelsPositions: number[];
  pixelsEdits: number[];
  lineWidth: number;
}

@Injectable({
  providedIn: 'root',
})
export class CanvasService {
  private socket: WebSocket | null = null;
  private sessionId: any;

  private messageSubject = new Subject<CanvasMessage>();
  private eventFeedSocket: WebSocket | null = null;
  private eventFeedSubject = new Subject<UserEvent>();

  private connectedUsersSocket: WebSocket | null = null;
  private connectedUsersSubject = new Subject<ConnectedUser>();

  // ✅ persistent participants feed map
  private countParticipantsSubjects = new Map<number, Subject<number>>();
  private countParticipantsSockets = new Map<number, WebSocket>();

  private toastOptions = {
    closeButton: true,
    progressBar: true,
    timeOut: 3000,
    extendedTimeOut: 1000,
  };

  constructor(
    private toastr: ToastrService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  // ============================================================
  // 🧩 LIVE CANVAS CONNECTION
  // ============================================================

  connect(canvasId: number): void {
    if (!canvasId) return;

    if (this.socket) this.socket.close();

    const wsUrl = new URL(`${env.liveCanvas}`);
    wsUrl.searchParams.append('canvasId', canvasId.toString());
    wsUrl.searchParams.append('token', this.authService.getToken() || '');

    try {
      this.socket = new WebSocket(wsUrl.toString());

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.messageType === 'HELLO') {
            this.sessionId = data.sessionId;
          }
          else if (data.messageType === 'NEW_USER'){
            if(data){
              this.messageSubject.next({
                pixelsEdits: data.values,
                pixelsPositions: data.positions,
                lineWidth: data.lineWidth,
              });


            }

          }
          else if (
            data.messageType === 'CANVAS_UPDATE' &&
            data.sessionId !== this.sessionId
          ) {
              if(data.sessionId !== this.sessionId && data){
                this.messageSubject.next({
                  pixelsEdits: data.values,
                  pixelsPositions: data.positions,
                  lineWidth: data.lineWidth,
                });

              }

          }
        } catch {
          this.toastr.warning(
            'Invalid canvas update received',
            'Warning',
            this.toastOptions
          );
        }
      };

      this.socket.onerror = () => {
        this.toastr.error('Server connection error', 'Error', this.toastOptions);
      };

      this.socket.onclose = (reason: CloseEvent) => {
        if (reason.code !== 1000)
          this.toastr.warning(
            'Server connection closed',
            'Disconnected',
            this.toastOptions
          );
      };
    } catch (e) {
      console.error(e);
    }
  }

  sendPixelUpdates(pixelsPositions: number[], pixelsEdits: number[]): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        const sessionId = this.sessionId;
        pixelsEdits = pixelsEdits.map((value) => value >>> 0);

        this.socket.send(
          JSON.stringify({
            pixelsPositions,
            pixelsEdits,
            sessionId,
          })
        );
      } catch (e) {
        console.error(e);
      }
    }
  }

  getMessages(): Observable<CanvasMessage> {
    return this.messageSubject.asObservable();
  }

  // ============================================================
  // 🧩 USER EVENT FEED
  // ============================================================

  connectToEventFeed(canvasId: number): void {
    if (this.eventFeedSocket) this.eventFeedSocket.close();

    const wsUrl = new URL(`${env.liveEvents}`);
    wsUrl.searchParams.append('canvasId', canvasId.toString());

    try {
      this.eventFeedSocket = new WebSocket(wsUrl.toString());

      this.eventFeedSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.eventType === EventType.USER_EVENT) {
            this.eventFeedSubject.next(data as UserEvent);
          }
        } catch {
          this.toastr.warning('Invalid event received', 'Warning');
        }
      };

      this.eventFeedSocket.onerror = () => {
        this.toastr.error('Event feed connection error', 'Error');
      };

      this.eventFeedSocket.onclose = (reason: CloseEvent) => {
        if (reason.code !== 1000)
          this.toastr.warning('Event feed connection closed', 'Disconnected');
      };
    } catch (e) {
      console.error(e);
    }
  }

  getEventFeed(): Observable<UserEvent> {
    return this.eventFeedSubject.asObservable();
  }

  // ============================================================
  // 🧩 CONNECTED USERS FEED
  // ============================================================

  connectToConnectedUsersFeed(canvasId: number): void {
    if (this.connectedUsersSocket) this.connectedUsersSocket.close();

    const wsUrl = new URL(`${env.liveEvents}/connected-users`);
    wsUrl.searchParams.append('canvasId', canvasId.toString());

    try {
      this.connectedUsersSocket = new WebSocket(wsUrl.toString());
      this.connectedUsersSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.connectedUsersSubject.next(data);
        } catch {
          this.toastr.warning('Invalid connected users update', 'Warning');
        }
      };
    } catch (e) {
      console.error(e);
    }
  }

  getConnectedUsersFeed(): Observable<ConnectedUser> {
    return this.connectedUsersSubject.asObservable();
  }

  // ============================================================
  // 🧩 PARTICIPANTS COUNT FEED (Persistent)
  // ============================================================

  connectToParticipantsCountFeed(canvasId: number): Observable<number> {
    // ✅ Return existing feed if already connected
    if (this.countParticipantsSubjects.has(canvasId)) {
      return this.countParticipantsSubjects.get(canvasId)!.asObservable();
    }

    const subject = new Subject<number>();
    this.countParticipantsSubjects.set(canvasId, subject);

    const wsUrl = new URL(`${env.liveEvents}/connected-users/count`);
    wsUrl.searchParams.append('canvasId', canvasId.toString());

    try {
      const socket = new WebSocket(wsUrl.toString());
      this.countParticipantsSockets.set(canvasId, socket);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && typeof data.count === 'number') {
            subject.next(data.count);
          }
        } catch {
          this.toastr.warning('Invalid count update', 'Warning');
        }
      };

      socket.onclose = (reason: CloseEvent) => {
        this.countParticipantsSockets.delete(canvasId);
        this.countParticipantsSubjects.delete(canvasId);
        subject.complete();

        if (reason.code !== 1000) {
          console.warn(`[WS] Count feed closed unexpectedly for ${canvasId}`);
        }
      };
    } catch (e) {
      this.toastr.error('Failed to connect to participants feed', 'Error');
    }

    return subject.asObservable();
  }

  getParticipantsCountFeed(canvasId: number): Observable<number> | null {
    return this.countParticipantsSubjects.get(canvasId)?.asObservable() || null;
  }

  disconnectParticipantsFeed(canvasId: number): void {
    const socket = this.countParticipantsSockets.get(canvasId);
    if (socket) {
      socket.close(1000, 'Manual disconnect');
      this.countParticipantsSockets.delete(canvasId);
    }
    this.countParticipantsSubjects.delete(canvasId);
  }

  disconnectAllParticipantsFeeds(): void {
    this.countParticipantsSockets.forEach((socket) => socket.close(1000));
    this.countParticipantsSockets.clear();
    this.countParticipantsSubjects.clear();
  }

  // ============================================================
  // 🧩 HTTP ENDPOINTS
  // ============================================================

  createCanvas(canvas: any): Observable<any> {
    return this.http.post<any>(`${env.apiUrl}`, canvas, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authService.getToken()}`,
      },
    });
  }

  getAllCanvases(page = 0, size = 20): Observable<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<any>(`${env.apiUrl}`, {
      params,
      headers: { Authorization: `Bearer ${this.authService.getToken()}` },
    });
  }

  deleteCanvas(id: number): Observable<void> {
    return this.http.delete<void>(`${env.apiUrl}/${id}`, {
      headers: { Authorization: `Bearer ${this.authService.getToken()}` },
    });
  }

  // ============================================================
  // 🧩 CLEANUP
  // ============================================================

  disconnect(manual: boolean): void {
    [this.socket, this.eventFeedSocket, this.connectedUsersSocket].forEach(
      (s) => s?.close(manual ? 1000 : 3000)
    );
    this.socket = this.eventFeedSocket = this.connectedUsersSocket = null;
  }

  isConnected(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }
}
