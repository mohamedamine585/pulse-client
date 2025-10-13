import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { env } from '../environment/env';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from './auth.service';
import { HttpClient } from '@angular/common/http';


export interface ConnectedUser{
  userId: number;
  username: string;
  connectedAt: number;
  canvasId: number;
  color: string;
  initials: string;
  status: 'active' | 'inactive' | 'drawing' | 'idle';
}

enum EventType {
  USER_EVENT = "USER_EVENT",
}

export enum UserEventType {
  USER_JOINED = "USER_JOINED",
  USER_LEFT = "USER_LEFT",
}

export interface Event {
  eventType: EventType;
  timestamp?: number;
  canvasId?: number;
  fading?: boolean; // add fading flag for UI
  description?: string; // optional description for UI
}

export interface UserEvent extends Event {
  eventType: EventType.USER_EVENT;
  userId: number;
  userEventType: UserEventType;

}

interface CanvasMessage {
  pixelsPositions: number[];
  pixelsEdits: number[];
  lineWidth : number;
}



@Injectable({
  providedIn: 'root'
})
export class CanvasService {
  private socket: WebSocket | null = null;
  private messageSubject = new Subject<CanvasMessage>();
  private sessionId : any ;
  private eventFeedSocket: WebSocket | null = null;
  private eventFeedSubject = new Subject<UserEvent>();
  private connectedUsersSocket : WebSocket | null = null;
  private connectedUsersSubject = new Subject<ConnectedUser>();

private toastOptions = {
  closeButton: true,
  progressBar: true,
  timeOut: 3000, // Auto disappear after 3 seconds
  extendedTimeOut: 1000, // Shorter time when hovered
};



  constructor(private toastr: ToastrService,private authservice : AuthService, private http: HttpClient) { }

  connect(canvasId: number): void {

    if (this.socket) {
      this.socket.close();
    }
    if(!canvasId)
      return;
    const wsUrl = new URL(`${env.liveCanvas}`);
    wsUrl.searchParams.append('canvasId', canvasId.toString());
    wsUrl.searchParams.append('token', this.authservice.getToken() || '');

    try{
      this.socket = new WebSocket(wsUrl.toString());



      this.socket.onmessage = (event) => {
        try {

          const data = JSON.parse(event.data);
          if(data.messageType == "HELLO"){
             this.sessionId = data.sessionId;
          }
          else if( data.messageType == "CANVAS_UPDATE" && data.sessionId != this.sessionId){
            this.messageSubject.next({
              pixelsEdits : data.values,
              pixelsPositions : data.positions,
              lineWidth: data.lineWidth
            })
          }
          else if( data.messageType == "NEW_USER"  && data.sessionId == this.sessionId){
            this.messageSubject.next({
              pixelsEdits : data.values,
              pixelsPositions : data.positions,
              lineWidth: data.lineWidth
            })
          }
          else if(data.messageType == "NEW_USER"  && data.sessionId != this.sessionId){
            this.messageSubject.next({
              pixelsEdits : data.values,
              pixelsPositions : data.positions,
              lineWidth: data.lineWidth
            })
          }

        } catch (error) {
          this.toastr.warning('Invalid canvas update received', 'Warning', this.toastOptions);
        }
      };

      this.socket.onerror = (error) => {
        this.toastr.error('Server connection error', 'Error', this.toastOptions);
      };

      this.socket.onclose = (reason : CloseEvent) => {
        if(reason.code == 1000)
          return;
        this.toastr.warning('Server connection closed', 'Disconnected', this.toastOptions);
      };
    }catch(e){
    }



  }

  connectToEventFeed(canvasId:number): void {
    if (this.eventFeedSocket) {
      this.eventFeedSocket.close();
    }

    const wsUrl = new URL(`${env.liveEvents}`);
    wsUrl.searchParams.append('canvasId', canvasId.toString());

    try{
      this.eventFeedSocket = new WebSocket(wsUrl.toString());



      this.eventFeedSocket.onmessage = (event) => {
        try {

          const data = JSON.parse(event.data);
          if(data.eventType == EventType.USER_EVENT){
            let userEvent = data as UserEvent;
            this.eventFeedSubject.next(userEvent);
          }

        } catch (error) {
          console.log(error)
          this.toastr.warning('Invalid event received', 'Warning', this.toastOptions);
        }
      };

      this.eventFeedSocket.onerror = (error) => {
        this.toastr.error('Event feed connection error', 'Error', this.toastOptions);
      };

      this.eventFeedSocket.onclose = (reason : CloseEvent) => {
        if(reason.code == 1000)
          return;
        this.toastr.warning('Event feed connection closed', 'Disconnected', this.toastOptions);
      };
    }catch(e){
        console.log(e);
    }
  }


  connectToConnectedUsersFeed(canvasId:number): void {
    if (this.connectedUsersSocket) {
      this.connectedUsersSocket.close();
    }

    const wsUrl = new URL(`${env.liveEvents}/connected-users`);
    wsUrl.searchParams.append('canvasId', canvasId.toString());

    try {
      this.connectedUsersSocket = new WebSocket(wsUrl.toString());
      this.connectedUsersSocket.onmessage = (event) => {
        try {

            const data = JSON.parse(event.data);
            if(data != undefined){
              this.connectedUsersSubject.next(data);

            }


        } catch (error) {
          console.log(error)
          this.toastr.warning('Invalid connected users update received', 'Warning', this.toastOptions);
        }
      };
      this.connectedUsersSocket.onerror = (error) => {
        this.toastr.error('Connected users feed connection error', 'Error', this.toastOptions);
      };
      this.connectedUsersSocket.onclose = (reason: CloseEvent) => {
        if (reason.code == 1000)
          return;
        this.toastr.warning('Connected users feed connection closed', 'Disconnected', this.toastOptions);
      };

    }
    catch (e) {
      console.log(e);
    }
  }

  sendPixelUpdates(pixelsPositions: number[], pixelsEdits: number[]): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try{

        const sessionId = this.sessionId;

        pixelsEdits = pixelsEdits.map(value => value >>> 0);
        this.socket.send(JSON.stringify({
          pixelsPositions,
          pixelsEdits,
          sessionId
        }));

      }

      catch(e){
       console.log(e);
      }

  }
  }
  getMessages(): Observable<CanvasMessage> {
    return this.messageSubject.asObservable();
  }

  getEventFeed(): Observable<UserEvent> {
    return this.eventFeedSubject.asObservable();
  }

  getConnectedUsersFeed(): Observable<ConnectedUser> {
    return this.connectedUsersSubject.asObservable();
  }
  disconnect(manual : boolean): void {
    if (this.socket) {
      this.socket.close(manual ? 1000 : 3000); // 1000 is a normal closure
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  createCanvas(canvasName: string, isPrivate: boolean): Observable<any> {
    return this.http.post(
      `${env.apiUrl}/api`,
      { canvasName, isPrivate },
      { headers: { 'Authorization': `Bearer ${this.authservice.getToken()}` } }
    );
  }
}
