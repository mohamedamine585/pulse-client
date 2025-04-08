import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { env } from '../environment/env';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from './auth.service';
import { HttpClient } from '@angular/common/http';
import { CloseEvent } from 'http';

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

private toastOptions = {
  closeButton: true,
  progressBar: true,
  timeOut: 3000, // Auto disappear after 3 seconds
  extendedTimeOut: 1000, // Shorter time when hovered
};



  constructor(private toastr: ToastrService,private authservice : AuthService, private http: HttpClient) { }

  connect(canvasId: string): void {

    if (this.socket) {
      this.socket.close();
    }
    if(!canvasId && canvasId.length === 0)
      return;
    const wsUrl = new URL(`${env.wsUrl}/live/canvas`);
    wsUrl.searchParams.append('canvasId', canvasId);
    wsUrl.searchParams.append('token', this.authservice.getToken() || '');

    try{
      this.socket = new WebSocket(wsUrl.toString());
 
      this.socket.onopen = () => {
        this.toastr.success('Server connection established', 'Connected', this.toastOptions);
      };
  
      this.socket.onmessage = (event) => {
        try {
        
          const data = JSON.parse(event.data);
          console.log(data)
          if(data.messageType == "HELLO"){
             this.sessionId = data.sessionId;
          }
          else if( data.messageType == "CANVAS_UPDATE" && data.sessionId != this.sessionId){
            this.messageSubject.next({
              pixelsEdits : data.values,
              pixelsPositions : data.positions,
              lineWidth: data.lineWidth
            })
            this.toastr.info('Canvas update received', 'Update', this.toastOptions);
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
            this.toastr.info('New User Joined', 'Update', this.toastOptions);
          }
        
        } catch (error) {
          console.log(error)
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
        console.log(e);
    }
    
   
  }

  

  sendPixelUpdates(pixelsPositions: number[], pixelsEdits: number[]): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try{

        const sessionId = this.sessionId;
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
    console.log(this.authservice.getToken())
    return this.http.post(
      `${env.apiUrl}/canvas`,
      { canvasName, isPrivate },
      { headers: { 'Authorization': `Bearer ${this.authservice.getToken()}` } }
    );
  }
}
