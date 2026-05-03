import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { environment } from '../../../environments/environment.prod';

// Fix para ícones do Leaflet
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

interface LocationData {
  driverId: string;
  lat: number;
  lng: number;
  timestamp?: string;
}

@Component({
  selector: 'app-client',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client.html',
  styleUrls: ['./client.css']
})
export class ClientComponent implements OnInit, OnDestroy, AfterViewInit {
  driverId: string = '';
  isConnected: boolean = false;
  currentLocation: LocationData | null = null;
  connectionStatus: string = 'Desconectado';
  errorMessage: string = '';
  isLoading: boolean = false;
  locationCount: number = 0;
  shouldCenterMap: boolean = true; // Controle para centralizar apenas na primeira vez
  
  private ws: WebSocket | null = null;
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  mapInitialized: boolean = false;
  isFirstLocation: boolean = true; // Primeira localização recebida

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    console.log('Client component initialized');
  }

  ngAfterViewInit(): void {
    console.log('View initialized, criando mapa...');
    setTimeout(() => {
      this.initializeMap();
    }, 100);
  }

  ngOnDestroy(): void {
    this.disconnect();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initializeMap(): void {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('Elemento do mapa não encontrado');
      setTimeout(() => this.initializeMap(), 500);
      return;
    }

    try {
      // Centro do Brasil como posição inicial
      this.map = L.map('map').setView([-15.7801, -47.9292], 4);
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB',
        subdomains: 'abcd',
        maxZoom: 19,
        minZoom: 3
      }).addTo(this.map);

      // Salvar o estado do zoom e centro quando o usuário interagir
      this.map.on('zoomend', () => {
        this.shouldCenterMap = false; // Usuário mudou o zoom, não centralizar mais automaticamente
        console.log('Usuário mudou o zoom, centralização automática desativada');
      });
      
      this.map.on('dragend', () => {
        this.shouldCenterMap = false; // Usuário moveu o mapa, não centralizar mais automaticamente
        console.log('Usuário moveu o mapa, centralização automática desativada');
      });

      this.mapInitialized = true;
      console.log('✅ Mapa inicializado com sucesso');
      this.cdr.detectChanges();
    } catch (error) {
      console.error('❌ Erro ao inicializar o mapa:', error);
      this.errorMessage = 'Erro ao carregar o mapa. Recarregue a página.';
      this.cdr.detectChanges();
    }
  }

  connect(): void {
    console.log('🔵 Tentando conectar...');
    
    if (!this.driverId || this.driverId.trim() === '') {
      this.errorMessage = 'Por favor, insira o ID do motorista';
      this.cdr.detectChanges();
      return;
    }

    if (this.isConnected) {
      console.log('Já está conectado');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.connectionStatus = 'Conectando...';
    this.locationCount = 0;
    this.currentLocation = null;
    this.isFirstLocation = true; // Resetar flag de primeira localização
    this.shouldCenterMap = true; // Resetar centralização para nova conexão
    this.cdr.detectChanges();
    
    // Limpar marcador anterior
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
    
    const wsUrl = `${environment.wsUrl}/ws?driverId=${this.driverId.trim()}`;
    console.log('Conectando ao WebSocket:', wsUrl);
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket conectado com sucesso');
        this.isConnected = true;
        this.connectionStatus = 'Conectado';
        this.isLoading = false;
        this.errorMessage = '';
        this.cdr.detectChanges();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data: LocationData = JSON.parse(event.data);
          console.log('📦 Mensagem recebida:', data);
          this.locationCount++;
          this.handleLocationUpdate(data);
          this.cdr.detectChanges();
        } catch (error) {
          console.error('❌ Erro ao processar mensagem:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ Erro no WebSocket:', error);
        this.errorMessage = 'Erro na conexão WebSocket';
        this.connectionStatus = 'Erro';
        this.isConnected = false;
        this.isLoading = false;
        this.cdr.detectChanges();
      };
      
      this.ws.onclose = (event) => {
        console.log('WebSocket fechado:', event.code, event.reason);
        this.isConnected = false;
        this.connectionStatus = 'Desconectado';
        this.isLoading = false;
        this.cdr.detectChanges();
        
        // Tentar reconectar após 5 segundos se ainda tiver driverId
        if (this.driverId) {
          console.log('Tentando reconectar em 5 segundos...');
          setTimeout(() => {
            if (!this.isConnected && this.driverId) {
              this.connect();
            }
          }, 5000);
        }
      };
      
    } catch (error) {
      console.error('❌ Erro ao criar WebSocket:', error);
      this.errorMessage = 'Erro ao conectar ao servidor';
      this.isLoading = false;
      this.connectionStatus = 'Erro';
      this.cdr.detectChanges();
    }
  }

  private handleLocationUpdate(location: LocationData): void {
    console.log('📍 Atualizando localização:', location);
    
    if (location.driverId !== this.driverId.trim()) {
      console.warn('Driver ID não corresponde:', location.driverId, '!=', this.driverId);
      return;
    }
    
    this.currentLocation = location;
    console.log('Current location atualizado:', this.currentLocation);
    
    // Atualizar o mapa
    this.updateMapLocation(location);
    this.cdr.detectChanges();
  }

  private updateMapLocation(location: LocationData): void {
    if (!this.mapInitialized || !this.map) {
      console.warn('Mapa não está inicializado');
      // Tentar inicializar o mapa novamente
      this.initializeMap();
      setTimeout(() => this.updateMapLocation(location), 500);
      return;
    }
    
    const latlng = L.latLng(location.lat, location.lng);
    console.log('🗺️ Atualizando mapa para:', latlng);
    console.log('Centralizar automaticamente:', this.shouldCenterMap);
    console.log('É primeira localização:', this.isFirstLocation);
    
    // Criar ou atualizar marcador
    if (this.marker) {
      this.marker.setLatLng(latlng);
      console.log('Marcador atualizado');
    } else {
      this.marker = L.marker(latlng).addTo(this.map);
      console.log('Marcador criado');
    }
    
    // Adicionar/atualizar popup
    this.marker.bindPopup(`
      <div style="font-family: sans-serif; padding: 5px;">
        <strong>🚗 Motorista</strong><br/>
        ID: ${location.driverId.substring(0, 8)}...<br/>
        📍 ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}<br/>
        🕐 ${new Date().toLocaleTimeString()}
      </div>
    `);
    
    // Centralizar o mapa apenas na primeira localização OU se o usuário não interagiu
    if (this.isFirstLocation) {
      // Primeira localização: centraliza e mantém zoom padrão
      this.map.setView(latlng, 15);
      this.isFirstLocation = false;
      console.log('Primeira localização: centralizando mapa');
    } else if (this.shouldCenterMap) {
      // Ainda não houve interação do usuário: centraliza mas mantém zoom atual
      this.map.setView(latlng, this.map.getZoom());
      console.log('Centralizando mantendo zoom atual:', this.map.getZoom());
    } else {
      // Usuário já interagiu: apenas atualiza o marcador sem mover o mapa
      console.log('Usuário controla o mapa, apenas movendo marcador');
      // Opcional: mostrar um efeito visual no marcador
      if (this.marker) {
        this.marker.openPopup(); // Abrir popup para indicar atualização
        setTimeout(() => {
          if (this.marker) this.marker.closePopup();
        }, 2000);
      }
    }
  }

  // Método para reativar a centralização automática (opcional)
  enableAutoCenter(): void {
    this.shouldCenterMap = true;
    console.log('Centralização automática reativada');
    // Se tiver uma localização atual, centraliza nela
    if (this.currentLocation) {
      const latlng = L.latLng(this.currentLocation.lat, this.currentLocation.lng);
      this.map?.setView(latlng, this.map.getZoom());
    }
  }

  disconnect(): void {
    console.log('🔴 Desconectando...');
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.connectionStatus = 'Desconectado';
    this.isLoading = false;
    this.currentLocation = null;
    this.locationCount = 0;
    this.isFirstLocation = true;
    this.shouldCenterMap = true;
    
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
    
    this.cdr.detectChanges();
    console.log('Desconectado');
  }

  formatCoordinate(coord: number): string {
    return coord ? coord.toFixed(6) : '---';
  }
}