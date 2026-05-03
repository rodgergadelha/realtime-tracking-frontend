import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { v4 as uuidv4 } from 'uuid';
import { environment } from '../../../environments/environment.prod';

interface LocationUpdate {
  driverId: string;
  lat: number;
  lng: number;
}

@Component({
  selector: 'app-driver',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './driver.html',
  styleUrls: ['./driver.css']
})
export class DriverComponent implements OnInit, OnDestroy {
  driverId: string = '';
  isTracking: boolean = false;
  watchId: number | null = null;
  lastLocation: { lat: number; lng: number } | null = null;
  statusMessage: string = '';
  errorMessage: string = '';
  showCopiedFeedback: boolean = false;
  locationCount: number = 0; // Para debug
  
  private apiUrl = `${environment.apiUrl}/location`;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef  // Forçar detecção de mudanças
  ) { }

  ngOnInit(): void {
    this.driverId = uuidv4();
    console.log('Driver ID gerado:', this.driverId);
  }

  ngOnDestroy(): void {
    this.stopTracking();
  }

  async copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.driverId);
      this.showCopiedFeedback = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.showCopiedFeedback = false;
        this.cdr.detectChanges();
      }, 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
      this.errorMessage = 'Não foi possível copiar';
      this.cdr.detectChanges();
      setTimeout(() => {
        this.errorMessage = '';
        this.cdr.detectChanges();
      }, 2000);
    }
  }

  startTracking(): void {
    console.log('🔵 Iniciando rastreamento...');
    
    if (!this.driverId) {
      this.errorMessage = 'ID inválido';
      this.cdr.detectChanges();
      return;
    }

    if (!navigator.geolocation) {
      this.errorMessage = 'Geolocalização não suportada';
      this.cdr.detectChanges();
      return;
    }

    this.isTracking = true;
    this.statusMessage = '🟡 Solicitando permissão...';
    this.locationCount = 0;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        console.log('✅ Posição recebida:', position.coords);
        this.locationCount++;
        this.statusMessage = '🟢 Rastreando em tempo real';
        this.lastLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        console.log('Última localização atualizada:', this.lastLocation);
        
        // Forçar atualização da tela
        this.cdr.detectChanges();
        
        // Enviar para o servidor
        this.sendLocation(position);
      },
      (error) => {
        console.error('❌ Erro na geolocalização:', error);
        this.handleGeoError(error);
        this.cdr.detectChanges();
        this.stopTracking();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    console.log('Watch ID criado:', this.watchId);
    this.cdr.detectChanges();

    // Timeout para evitar ficar travado
    setTimeout(() => {
      if (this.statusMessage === '🟡 Solicitando permissão...') {
        this.statusMessage = '';
        this.errorMessage = '⏰ Tempo esgotado. Verifique se você permitiu acesso à localização.';
        this.cdr.detectChanges();
        this.stopTracking();
      }
    }, 10000);
  }

  private sendLocation(position: GeolocationPosition): void {
    const location: LocationUpdate = {
      driverId: this.driverId,
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
    
    console.log('📤 Enviando localização #', this.locationCount, ':', location);
    
    this.http.post(this.apiUrl, location).subscribe({
      next: (response) => {
        console.log('✅ Localização #', this.locationCount, 'enviada com sucesso');
      },
      error: (error) => {
        console.error('❌ Erro no envio #', this.locationCount, ':', error);
        if (this.isTracking) {
          this.errorMessage = 'Erro ao enviar localização';
          this.cdr.detectChanges();
          setTimeout(() => {
            if (this.errorMessage === 'Erro ao enviar localização') {
              this.errorMessage = '';
              this.cdr.detectChanges();
            }
          }, 2000);
        }
      }
    });
  }

  private handleGeoError(error: GeolocationPositionError): void {
    console.error('Erro de geolocalização:', error);
    switch(error.code) {
      case error.PERMISSION_DENIED:
        this.errorMessage = '❌ Permissão negada. Por favor, permita o acesso à localização nas configurações do navegador.';
        break;
      case error.POSITION_UNAVAILABLE:
        this.errorMessage = '❌ Localização indisponível. Verifique se o GPS está ativo.';
        break;
      case error.TIMEOUT:
        this.errorMessage = '❌ Tempo esgotado. Tente novamente.';
        break;
      default:
        this.errorMessage = '❌ Erro desconhecido. Tente recarregar a página.';
    }
    this.cdr.detectChanges();
  }

  stopTracking(): void {
    console.log('🛑 Parando rastreamento...');
    
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    this.isTracking = false;
    this.statusMessage = '⏹️ Rastreamento parado';
    this.lastLocation = null;
    this.locationCount = 0;
    this.cdr.detectChanges();
    
    setTimeout(() => {
      if (this.statusMessage === '⏹️ Rastreamento parado') {
        this.statusMessage = '';
        this.cdr.detectChanges();
      }
    }, 2000);
  }

  formatCoordinate(coord: number): string {
    return coord ? coord.toFixed(6) : '---';
  }
}