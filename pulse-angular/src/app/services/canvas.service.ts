import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { env } from '../environment/env';
import { ToastrService } from 'ngx-toastr';

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



  constructor(private toastr: ToastrService) { }

  connect(canvasId: string): void {
    if (this.socket) {
      this.socket.close();
    }
    if(!canvasId && canvasId.length === 0)
      return;
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.g32eyztZkhuniuPwwl9s4rcolpRbFJcYhs4Opzv7sU0";
    const wsUrl = new URL(`${env.wsUrl}/canvas`);
    wsUrl.searchParams.append('canvasId', canvasId);
    wsUrl.searchParams.append('token', `${token}`);

    this.socket = new WebSocket(wsUrl.toString());
    
    
    this.socket.onopen = () => {
      this.toastr.success('Server connection established', 'Connected', this.toastOptions);
    };

    this.socket.onmessage = (event) => {
      try {
      
        const data = JSON.parse(event.data);
        console.log(data)
        if(data.message === "hello"){
           this.sessionId = data.sessionId;
        }
        else if(data.sessionId != this.sessionId){
          this.messageSubject.next({
            pixelsEdits : data.values,
            pixelsPositions : data.positions,
            lineWidth: data.lineWidth
          })
          this.toastr.info('Canvas update received', 'Update', this.toastOptions);
        }
      
      } catch (error) {
        console.log(error)
        this.toastr.warning('Invalid canvas update received', 'Warning', this.toastOptions);
      }
    };

    this.socket.onerror = (error) => {
      this.toastr.error('Server connection error', 'Error', this.toastOptions);
    };

    this.socket.onclose = () => {
      this.toastr.warning('Server connection closed', 'Disconnected', this.toastOptions);
    };
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

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}
