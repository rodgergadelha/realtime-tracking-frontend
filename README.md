# Realtime Tracking

Aplicação Angular para rastreamento em tempo real de motoristas.

## Acesso

**Produção:** [https://realtime-tracking.netlify.app/motorista](https://realtime-tracking.netlify.app)

## Funcionalidades

**Motorista (`/motorista`)**
- ID único gerado automaticamente
- Compartilha localização em tempo real
- Copia ID com um clique

**Cliente (`/cliente`)**
- Conecta via ID do motorista
- Visualiza localização no mapa
- Atualizações automáticas

## Tecnologias

- Angular 21
- TypeScript
- Leaflet (mapas)
- WebSocket

## Executar localmente

```bash
npm install
ng serve
# Acesse http://localhost:4200
```

## Build

```bash
ng build --configuration production
```

## Deploy (Netlify)

```bash
npm run build
# Configure publish directory: dist/realtime-tracking-frontend/browser
```