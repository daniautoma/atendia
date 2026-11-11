/**
 * Catálogo geográfico y nichos comerciales para El Salvador (SV)
 * danIAutoma HQ - Radar de Clientes
 */

export interface DepartmentInfo {
  id: string;
  name: string;
  municipalities: string[];
}

export const EL_SALVADOR_DEPARTMENTS: DepartmentInfo[] = [
  {
    id: 'san_salvador',
    name: 'San Salvador',
    municipalities: [
      'San Salvador Centro',
      'San Salvador',
      'Antiguo Cuscatlán',
      'Santa Tecla',
      'Soyapango',
      'Ilopango',
      'Mejicanos',
      'Apopa',
      'Ciudad Delgado',
      'Cuscatancingo',
      'San Marcos',
      'San Martín',
      'Panchimalco',
      'Tonacatepeque',
    ],
  },
  {
    id: 'la_libertad',
    name: 'La Libertad',
    municipalities: [
      'Santa Tecla',
      'Antiguo Cuscatlán',
      'Nuevo Cuscatlán',
      'Colón / Lourdes',
      'San Juan Opico',
      'Quezaltepeque',
      'Zaragoza',
      'Puerto de La Libertad',
      'San José Villanueva',
      'Ciudad Arce',
    ],
  },
  {
    id: 'santa_ana',
    name: 'Santa Ana',
    municipalities: [
      'Santa Ana',
      'Metapán',
      'Chalchuapa',
      'Coatepeque',
      'Texistepeque',
    ],
  },
  {
    id: 'san_miguel',
    name: 'San Miguel',
    municipalities: [
      'San Miguel',
      'Chinameca',
      'Ciudad Barrios',
      'Moncagua',
      'El Tránsito',
    ],
  },
  {
    id: 'sonsonate',
    name: 'Sonsonate',
    municipalities: [
      'Sonsonate',
      'Acajutla',
      'Izalco',
      'Nahuizalco',
      'Armenia',
      'Juayúa',
    ],
  },
  {
    id: 'usulutan',
    name: 'Usulután',
    municipalities: [
      'Usulután',
      'Jiquilisco',
      'Santiago de María',
      'Berlín',
      'Puerto El Triunfo',
    ],
  },
  {
    id: 'ahuachapan',
    name: 'Ahuachapán',
    municipalities: [
      'Ahuachapán',
      'Atiquizaya',
      'Apaneca',
      'Concepción de Ataco',
      'San Francisco Menéndez',
    ],
  },
  {
    id: 'la_paz',
    name: 'La Paz',
    municipalities: [
      'Zacatecoluca',
      'Olocuilta',
      'San Luis Talpa',
      'Santiago Nonualco',
      'San Juan Nonualco',
    ],
  },
  {
    id: 'la_union',
    name: 'La Unión',
    municipalities: [
      'La Unión',
      'Santa Rosa de Lima',
      'Conchagua',
      'Anamorós',
    ],
  },
  {
    id: 'chalatenango',
    name: 'Chalatenango',
    municipalities: [
      'Chalatenango',
      'La Palma',
      'Nueva Concepción',
      'Tejutla',
      'Ignacio',
    ],
  },
  {
    id: 'cuscatlan',
    name: 'Cuscatlán',
    municipalities: [
      'Cojutepeque',
      'Suchitoto',
      'San Pedro Perulapán',
      'San Martín / Cuscatlán',
    ],
  },
  {
    id: 'morazan',
    name: 'Morazán',
    municipalities: [
      'San Francisco Gotera',
      'Perquín',
      'Osicala',
      'Corquín',
    ],
  },
  {
    id: 'san_vicente',
    name: 'San Vicente',
    municipalities: [
      'San Vicente',
      'Tecoluca',
      'San Sebastián',
      'Apastepeque',
    ],
  },
  {
    id: 'cabanas',
    name: 'Cabañas',
    municipalities: [
      'Sensuntepeque',
      'Ilobasco',
      'Victoria',
      'Tejutepeque',
    ],
  },
];

export interface NicheCategory {
  category: string;
  items: string[];
}

export const RADAR_NICHES: NicheCategory[] = [
  {
    category: 'Salud & Especialidades',
    items: [
      'Clínicas Dentales y Odontología',
      'Médicos Especialistas y Clínicas',
      'Clínicas de Estética y Dermatología',
      'Laboratorios Clínicos',
      'Veterinarias y Hospitales de Mascotas',
      'Fisioterapia y Rehabilitación',
      'Ópticas y Salud Visual',
    ],
  },
  {
    category: 'Servicios Profesionales',
    items: [
      'Bufetes de Abogados y Notarías',
      'Firmas Contables y Auditoría',
      'Agencias de Bienes Raíces e Inmobiliarias',
      'Corredores de Seguros',
      'Arquitectos y Diseño Estructural',
    ],
  },
  {
    category: 'Automotriz y Transporte',
    items: [
      'Talleres Mecánicos y Electromecánica',
      'Car Wash & Detailing Profesional',
      'Venta de Repuestos y Llanterías',
      'Enderezado y Pintura Automotriz',
    ],
  },
  {
    category: 'Gastronomía y Eventos',
    items: [
      'Restaurantes y Marisquerías',
      'Cafeterías y Panaderías Artesanales',
      'Salones de Eventos y Banquetes',
      'Servicios de Catering y Banquetería',
    ],
  },
  {
    category: 'Belleza y Cuidado Personal',
    items: [
      'Salones de Belleza y Estilistas',
      'Barberías Modernas',
      'Spas y Centros de Masajes',
      'Gimnasios y Centros de Fitness',
    ],
  },
  {
    category: 'Hogar y Construcción',
    items: [
      'Ferreterías y Materiales de Construcción',
      'Empresas de Construcción y Remodelación',
      'Diseño de Interiores y Mueblerías',
      'Servicios de Climatización y A/C',
    ],
  },
  {
    category: 'Educación y Capacitación',
    items: [
      'Academias de Idiomas',
      'Colegios y Escuelas Privadas',
      'Escuelas de Manejo',
      'Centros de Capacitación Técnica',
    ],
  },
];

/**
 * Normaliza y formatea la consulta de búsqueda para Google Places API (New)
 */
export function buildPlacesSearchText(params: {
  niche: string;
  department?: string;
  municipality?: string;
  freeTextLocation?: string;
}): string {
  const parts: string[] = [params.niche.trim()];

  if (params.municipality && params.municipality.trim()) {
    parts.push(params.municipality.trim());
  }

  if (params.department && params.department.trim()) {
    parts.push(params.department.trim());
  }

  if (params.freeTextLocation && params.freeTextLocation.trim()) {
    parts.push(params.freeTextLocation.trim());
  }

  parts.push('El Salvador');

  return parts.filter(Boolean).join(', ');
}

