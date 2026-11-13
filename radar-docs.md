# Radar de Clientes — Plan de Implementación

> Aplicación web profesional de prospección local diseñada para vendedores y agencias de servicios digitales (diseño web, agentes IA de WhatsApp y automatización de citas) en España, combinando Google Places API (New), PageSpeed Insights v5 y Gemini Flash con contexto web.

---

### Decisiones Críticas y Preferencias Confirmadas

> [!IMPORTANT]
> Opciones acordadas en la fase de clarificación interactiva previa a la construcción:

- **Búsquedas reales con Google Cloud API Key**: La aplicación operará con llamadas directas a las APIs oficiales de Google Cloud (Places y PageSpeed). Si el usuario aún no ha introducido su clave, la interfaz mostrará una pantalla de configuración guiada y alertas contextuales con instrucciones claras para obtener y habilitar las APIs necesarias en Google Cloud Console.
- **Selector de tema (Oscuro / Claro)**: Interfaz de alta densidad con alternador de tema en la barra superior/lateral. Por defecto, tema oscuro profesional con paleta carbón/pizarra (`#0F172A`) y acentos esmeralda (`#10B981`) y ámbar (`#F59E0B`), con soporte completo para modo claro de oficina.
- **Persistencia local en IndexedDB**: Almacén transaccional en el navegador que soporta capturas de pantalla de PageSpeed, auditorías completas, estados de pipeline comercial, caché de consultas de Places (para ahorrar cuota y costes) y exportación/importación en CSV y JSON.

---

## 1. Visión General y Propuesta de Valor

«Radar de Clientes» optimiza el ciclo de vida de prospección B2B local para autónomos y agencias digitales:
1. **Detección rápida**: Localiza negocios en cualquier municipio o código postal de España vía Google Places API (New), categorizándolos al instante según si tienen web propia, un enlace a redes sociales o carecen por completo de presencia online.
2. **Auditoría técnica y de conversión**: Analiza velocidad móvil (PageSpeed), presencia de botón flotante de WhatsApp, reserva de citas, formularios de contacto, protocolo SSL y año del copyright.
3. **Generación de argumentos y contacto**: Gemini Flash sintetiza la actividad del negocio, identifica de 3 a 5 puntos débiles y redacta 3 borradores comerciales a medida (guion telefónico de 30 segundos, mensaje de WhatsApp y correo de prospección).
4. **Inteligencia de mercado**: El «Radar de Nichos» analiza sectores completos en una ciudad para recomendar dónde existe mayor probabilidad de venta antes de gastar recursos.

---

## 2. Experiencia de Usuario y Diseño Visual

### Pantallas Principales

```
┌────────────────────────────────────────────────────────────────────────┐
│  RADAR DE CLIENTES          [☀️/🌙] [Llamadas Places: 124/800] [Ajustes] │
├──────────────┬─────────────────────────────────────────────────────────┤
│ 🔍 Buscar    │ Búsqueda: [Sevilla                 ] [Talleres      ▼] │
│ 🏢 Ficha     │ Filtros: [x Sin web] [x Con tlf] [⭐ Min: 4.0] [Buscar]  │
│ 📡 Nichos    ├─────────────────────────────────────────────────────────┤
│ 📋 Mis Leads │ Resultados (20 de 48)            [Guardar sel.] [Analizar]│
│ ⚙️ Ajustes   │ ┌─────────────────────────────────────────────────────┐ │
│              │ │ Auto Taller Sevilla · 4.8★ (92 res.) · Sin web     │ │
│              │ │ Oportunidad: 88/100 (Alta) · [Ver Ficha] [WhatsApp] │ │
│              │ └─────────────────────────────────────────────────────┘ │
└──────────────┴─────────────────────────────────────────────────────────┘
```

#### 1. Buscar (`/search`)
- **Controles de búsqueda**: Zona (campo abierto para ciudad, barrio o código postal, e.g., «Dos Hermanas, Sevilla») y Nicho (selector con 14 sugerencias precargadas + texto libre).
- **Filtros de prospección**: Solo sin web, solo con teléfono, valoración mínima (slider 0-5), número mínimo de reseñas y exclusión de negocios permanentemente/temporalmente cerrados.
- **Detección inteligente de web**: Discrimina automáticamente entre webs reales y perfiles de terceros (Facebook, Instagram, Linktree, Páginas Amarillas, Milanuncios, QDQ, Doctoralia) marcándolos como «Sin web propia».
- **Vistas duales**: Alternador entre vista de Tabla densa (para escaneo masivo) y Tarjetas de oportunidad (con badges de contacto y métricas clave).
- **Acciones en lote**: Selección múltiple de negocios con botones para «Guardar en mis leads» y «Analizar seleccionados» (procesados en cola controlada de máximo 2 a la vez).
- **Paginación eficiente**: Botón «Cargar más resultados» utilizando `pageToken` (hasta el límite de 60 de Google Places).

#### 2. Ficha del Negocio (`/business/:id`)
- **Cabecera de contacto**: Nombre, categoría, dirección formateada, enlaces directos a Google Maps, botón interactivo `tel:` y botón de apertura de web.
- **Auditoría Técnica y Visual**:
  - Si no tiene web: aviso destacado «Sin presencia web», recomendación inmediata de paquete web + presencia en Maps, sin consumo de PageSpeed.
  - Si tiene web: botón «Analizar web» con barra de progreso (10–30s). Muestra las 4 puntuaciones de Google PageSpeed en móvil (Rendimiento, SEO, Accesibilidad, Buenas prácticas) codificadas por color (rojo < 50, ámbar 50-89, verde >= 90) y la captura de pantalla real del sitio.
  - **Diagnóstico Gemini Flash**: Resumen de actividad en 2 frases, checklist técnica (HTTPS, responsive, botón de WhatsApp, cita online, formulario, copyright obsoleto), correos/teléfonos extraídos de la web, 3-5 debilidades en lenguaje llano y recomendación estratégica de servicio (web moderna, agente IA o sistema de citas).
- **Generador de Primer Contacto**:
  - 3 borradores generados por Gemini adaptados al perfil del vendedor y los fallos de la web: Guion telefónico (30 s), Mensaje de WhatsApp y Correo electrónico.
  - Botón «Copiar al portapapeles» y «Regenerar tono» (cercano, formal, persuasivo, directo).
  - Aviso de cumplimiento ético: *«Borradores para contactar de forma personal. No envíes mensajes comerciales masivos sin consentimiento»*.
- **Gestión comercial**: Notas privadas del vendedor, estado del pipeline y selector de fecha para próxima acción/seguimiento.
- **Exportación**: Botón «Exportar Ficha» que genera una vista optimizada para imprimir o guardar como PDF comercial para llevar a la reunión.

#### 3. Radar de Nichos (`/niches`)
- **Explorador de mercado**: Introduce una zona y evalúa las categorías sugeridas (o personalizadas).
- **Simulador de coste**: Advierte previamente cuántas llamadas a Places va a realizar antes de ejecutar y pide confirmación al usuario.
- **Métricas sectoriales**: Calcula negocios totales, % sin web propia, valoración media y volumen medio de reseñas.
- **Recomendación IA**: Gemini ordena los nichos por potencial comercial, destaca el Top 3 con justificación y sugiere qué servicio vender prioritariamente a cada gremio.
- **Acceso directo**: Botón «Ver negocios» que lanza la búsqueda filtrada en la pantalla de Buscar.

#### 4. Mis Leads (`/leads`)
- **Gestión de Cartera**: Todos los negocios guardados sincronizados en IndexedDB.
- **Vistas**: Tabla filtrable y Tablero Kanban interactivo con 7 columnas: `Nuevo`, `Analizado`, `Contactado`, `Respondió`, `Reunión`, `Cliente`, `Descartado`.
- **Filtros rápidos**: Por nicho, zona, rango de oportunidad y fecha de próxima acción.
- **Exportación e Importación**: Descarga directa en CSV compatible con Excel/Google Sheets y copia de seguridad en JSON.

#### 5. Ajustes (`/settings`)
- **Gestión de API Keys**: Campo seguro para la clave de Google Cloud con botón de validación inmediata (prueba de ping a Places). Almacenamiento local en el navegador.
- **Perfil del Vendedor**: Nombre, nombre de la agencia/marca, servicios que ofrece, propuesta de valor diferenciadora y tono preferido de redacción.
- **Monitor de consumo**: Contador de llamadas a Places del mes en curso, barra de progreso con alerta configurable al alcanzar 800 de las 1.000 gratuitas.

---

## 3. Flujo de Datos y Uso de APIs

```
┌────────────────────────────────────────────────────────────────────────┐
│                             CLIENTE WEB                                │
│   React 19 + Tailwind CSS + Lucide Icons + IndexedDB (Local Store)     │
└──────────────┬───────────────────────────┬─────────────────────────────┘
               │                           │
    (1) Places API (New)          (2) PageSpeed Insights v5     (3) /api/gemini/...
       Direct Fetch                   Direct Fetch              Server-side Proxy
               │                           │                           │
  ┌────────────▼───────────┐  ┌────────────▼───────────┐  ┌────────────▼───────────┐
  │ Google Maps Platform   │  │ Google PageSpeed v5    │  │ Express Server Proxy   │
  │ POST places:searchText │  │ GET runPagespeed       │  │ @google/genai SDK      │
  │ • FieldMask optimizado │  │ • strategy=mobile      │  │ • gemini-3.8-flash     │
  │ • languageCode: "es"   │  │ • 4 categorías audit   │  │ • URL context tool     │
  │ • regionCode: "ES"     │  │ • final-screenshot     │  │ • Structured JSON      │
  └────────────────────────┘  └────────────────────────┘  └────────────────────────┘
```

### 1. Google Places API (New)
- **Endpoint**: `POST https://places.googleapis.com/v1/places:searchText`
- **Headers requeridos**:
  - `Content-Type: application/json`
  - `X-Goog-Api-Key: <GOOGLE_CLOUD_API_KEY>`
  - `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.primaryTypeDisplayName,places.types,places.googleMapsUri,places.businessStatus,nextPageToken`
- **Body**: `{ textQuery, languageCode: "es", regionCode: "ES", pageSize: 20, pageToken?: string }`
- **Caché en IndexedDB**: Las respuestas de búsqueda se indexan por clave normalizada `zona:nicho:pagina` durante 48 horas para evitar llamadas duplicadas.

### 2. Google PageSpeed Insights API v5
- **Endpoint**: `GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed`
- **Parámetros**:
  - `url`: URL del negocio
  - `strategy`: `mobile`
  - `category`: `performance`, `seo`, `accessibility`, `best-practices`
  - `key`: `<GOOGLE_CLOUD_API_KEY>`
- **Extracción de datos**: Extrae los 4 scores (0–100) y la captura de pantalla codificada en base64 desde `lighthouseResult.audits['final-screenshot'].details.data`.

### 3. Gemini API (Server-Side Proxy)
- **Modelo**: `gemini-3.8-flash` usando el SDK oficial `@google/genai`.
- **Endpoints del servidor**:
  - `POST /api/gemini/analyze-business`: Recibe la URL del negocio y sus datos básicos. Emplea la herramienta `urlContext` para inspeccionar el sitio web y extrae el diagnóstico estructurado (actividad, checklist de funcionalidades, problemas y recomendación de servicio).
  - `POST /api/gemini/generate-pitches`: Recibe el análisis del negocio y el perfil del vendedor para redactar los 3 borradores con el tono seleccionado.
  - `POST /api/gemini/rank-niches`: Recibe las estadísticas agregadas de los nichos explorados y devuelve el ranking ordenado con argumentos comerciales.

---

## 4. Algoritmo de Puntuación de Oportunidad (0 a 100)

El índice de oportunidad evalúa el potencial de venta basándose en dos etapas transparentes:

### Etapa 1: Puntuación Provisional (Solo con Places)
- **Presencia Web (Base: 50 pts)**:
  - Sin web o con perfil de redes sociales (Facebook/Instagram/Linktree): `+50 pts`
  - Con web propia: `+10 pts` (requiere auditoría)
- **Actividad y Reputación (Máx: 35 pts)**:
  - Reseñas $> 50$: `+20 pts` (negocio consolidado con clientela real que valora su presencia)
  - Reseñas entre 15 y 50: `+12 pts`
  - Reseñas $< 15$: `+5 pts`
  - Valoración $\ge 4.2$: `+15 pts` (alta reputación pero posibles carencias digitales)
  - Valoración entre 3.5 y 4.1: `+8 pts`
- **Contacto Directo (Máx: 15 pts)**:
  - Dispone de número de teléfono nacional verificado: `+15 pts`

### Etapa 2: Puntuación Final (Tras Auditoría Web)
- Si no tiene web, la puntuación se consolida en base a la necesidad urgente de web + ficha de Google Maps.
- Si tiene web:
  - Rendimiento móvil bajo (< 50): `+25 pts` (argumento directo de pérdida de clientes)
  - Sin botón de WhatsApp detectado: `+15 pts` (oportunidad de agente de ventas)
  - Sin sistema de citas online: `+15 pts` (oportunidad de software de reservas)
  - Sin certificado HTTPS o copyright desactualizado: `+10 pts`
  - Web rápida (> 85) y completa: resta hasta `30 pts` (baja oportunidad de venta).
- **Desglose visible**: La ficha muestra una barra de progreso y una lista detallada con cada suma/resta de puntos para que el vendedor entienda exactamente el motivo de la nota.

---

## 5. Modelo de Datos (IndexedDB)

```typescript
// Almacén: 'leads'
interface BusinessLead {
  id: string; // places.id
  displayName: string;
  formattedAddress: string;
  location?: { latitude: number; longitude: number };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  hasOwnWebsite: boolean; // false si es facebook, instagram, linktree, etc.
  rating?: number;
  userRatingCount?: number;
  primaryTypeDisplayName?: string;
  types?: string[];
  googleMapsUri: string;
  businessStatus: string;
  
  // Puntuación
  provisionalScore: number;
  finalScore?: number;
  scoreBreakdown: { label: string; points: number }[];
  
  // Auditoría PageSpeed
  pageSpeedAudit?: {
    analyzedAt: string;
    performance: number;
    seo: number;
    accessibility: number;
    bestPractices: number;
    screenshotBase64?: string;
  };
  
  // Análisis Gemini
  aiAnalysis?: {
    activitySummary: string; // 2 frases
    checklist: {
      hasHttps: boolean;
      isMobileResponsive: boolean;
      hasWhatsAppButton: boolean;
      hasOnlineBooking: boolean;
      hasContactForm: boolean;
      hasOutdatedCopyright: boolean;
      copyrightYear?: string;
    };
    contactDetailsFound: {
      emails: string[];
      socialLinks: string[];
    };
    detectedIssues: string[]; // 3 a 5 problemas en lenguaje llano
    recommendedService: 'web_nueva' | 'agente_whatsapp' | 'sistema_citas';
    recommendedServiceReason: string;
  };
  
  // Borradores comerciales
  pitches?: {
    phoneScript30s: string;
    whatsAppMessage: string;
    emailMessage: string;
    tone: 'cercano' | 'formal' | 'persuasivo' | 'directo';
  };
  
  // CRM / Gestión
  status: 'nuevo' | 'analizado' | 'contactado' | 'respondio' | 'reunion' | 'cliente' | 'descartado';
  notes?: string;
  nextActionDate?: string;
  savedAt: string;
  updatedAt: string;
}

// Almacén: 'search_cache'
interface SearchCacheItem {
  key: string; // zona:nicho:pagina
  results: BusinessLead[];
  nextPageToken?: string;
  cachedAt: number;
}

// Almacén: 'settings'
interface AppSettings {
  googleCloudApiKey: string;
  sellerProfile: {
    name: string;
    agencyName: string;
    servicesOffered: string[];
    valueProposition: string;
    defaultTone: 'cercano' | 'formal' | 'persuasivo' | 'directo';
  };
  placesApiCounter: {
    monthYear: string; // "2026-10"
    count: number;
    limitAlert: number; // default 800
  };
  theme: 'dark' | 'light';
}
```

---

## 6. Arquitectura del Sistema

```
                      +-----------------------------+
                      |         index.html          |
                      +--------------+--------------+
                                     |
                      +--------------v--------------+
                      |          main.tsx           |
                      +--------------+--------------+
                                     |
                      +--------------v--------------+
                      |           App.tsx           |
                      |   (Router + Sidebar Layout) |
                      +--------------+--------------+
                                     |
         +---------------------------+---------------------------+
         |              |            |             |             |
+--------v------+ +-----v----+ +-----v----+ +------v-----+ +-----v------+
| BuscarView    | | FichaView| | NichosView| | LeadsView  | | AjustesView|
+--------+------+ +-----+----+ +-----+----+ +------+-----+ +-----+------+
         |              |            |             |             |
         +--------------+------------+-------------+-------------+
                                     |
                      +--------------v--------------+
                      |        Servicios Core       |
                      | - db.ts (IndexedDB Engine)  |
                      | - placesService.ts          |
                      | - pageSpeedService.ts       |
                      | - scoringEngine.ts          |
                      | - geminiClient.ts           |
                      +--------------+--------------+
                                     |
                      +--------------v--------------+
                      |    Express Server Proxy     |
                      |      (server.ts / Vite)     |
                      |  - POST /api/gemini/analyze |
                      |  - POST /api/gemini/pitches |
                      |  - POST /api/gemini/niches  |
                      +--------------+--------------+
                                     |
                      +--------------v--------------+
                      |     @google/genai SDK       |
                      |   (GEMINI_API_KEY en env)   |
                      +-----------------------------+
```

---

## 7. Orden de Construcción Paso a Paso

1. **Configuración del Servidor y Dependencias**:
   - Integrar proxy Express en `vite.config.ts` o `server.ts` con `@google/genai` inicializado con `User-Agent: 'aistudio-build'` y endpoints `/api/gemini/*`.
   - Actualizar `metadata.json` con el nombre «Radar de Clientes» y descripción completa en español.
2. **Capa de Persistencia y Caché (IndexedDB)**:
   - Crear módulo `src/services/db.ts` con transacciones tipadas para leads, caché de búsquedas y configuración de usuario.
3. **Servicios de APIs Externas**:
   - `src/services/placesService.ts`: llamada a Places API (New) con FieldMask estricto, gestión de `nextPageToken`, detección de redes sociales/directorios y contador de cuota mensual.
   - `src/services/pageSpeedService.ts`: llamada a PageSpeed v5 con estrategia móvil y extracción de screenshot base64.
   - `src/services/scoringEngine.ts`: algoritmo determinista de oportunidad con desglose auditable.
4. **Pantalla de Ajustes y Estado Global**:
   - Configuración de la clave de Google Cloud, perfil del vendedor, medidor de 800/1000 llamadas y alternador de tema claro/oscuro.
5. **Pantalla de Búsqueda y Resultados**:
   - Formulario de zona + nichos sugeridos, filtros avanzados, vista dual de tabla y tarjetas, selección múltiple y paginación.
6. **Pantalla Ficha del Negocio**:
   - Datos de contacto, ejecución de auditoría PageSpeed con screenshot real, llamada a Gemini para análisis estructurado, generador de guiones/WhatsApp/emails y exportación imprimible/PDF.
7. **Pantalla Radar de Nichos**:
   - Comparador de sectores en una localidad, estimador de consumo de API y recomendación estratégica con Gemini.
8. **Pantalla Mis Leads (CRM y Kanban)**:
   - Tablero drag-and-drop / por estados, filtros avanzados, exportación a CSV y copia de seguridad JSON.
9. **Verificación y Pulido**:
   - Comprobación de compilación TypeScript (`tsc --noEmit`), pruebas de flujo completo y revisión de contraste/accesibilidad.
