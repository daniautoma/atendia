/**
 * Detector y clasificador de plataformas, redes sociales y directorios locales
 * danIAutoma HQ - Radar de Clientes
 */

export interface UrlClassification {
  isOwnedWebsite: boolean;
  platformType: 'none' | 'owned' | 'social' | 'directory' | 'linkhub';
  platformName: string | null;
  rawUrl: string | null;
}

// Dominios de redes sociales
const SOCIAL_DOMAINS: Record<string, string> = {
  'facebook.com': 'Facebook',
  'fb.com': 'Facebook',
  'instagram.com': 'Instagram',
  'tiktok.com': 'TikTok',
  'linkedin.com': 'LinkedIn',
  'twitter.com': 'X / Twitter',
  'x.com': 'X / Twitter',
  'youtube.com': 'YouTube',
  'pinterest.com': 'Pinterest',
  'wa.me': 'WhatsApp Directo',
  'whatsapp.com': 'WhatsApp',
};

// Directorios salvadoreños y regionales
const DIRECTORY_DOMAINS: Record<string, string> = {
  'encuentra24.com': 'Encuentra24 El Salvador',
  'paginasamarillas.com': 'Páginas Amarillas',
  'svnegocios.com': 'SV Negocios',
  'directorio.sv': 'Directorio SV',
  'tuugo.com.sv': 'Tuugo El Salvador',
  'yalwa.com.sv': 'Yalwa El Salvador',
  'elsalvador.com': 'El Diario de Hoy / Directorio',
  'laprensagrafica.com': 'La Prensa Gráfica / Guía',
  'comprapues.com': 'CompraPues SV',
  'goplaceit.com': 'GoPlaceIt SV',
  'olx.com': 'OLX',
  'google.com': 'Perfil Google',
  'business.site': 'Google Sitio Gratuito (Descontinuado)',
};

// Hubs de enlaces / Bio links
const LINK_HUB_DOMAINS: Record<string, string> = {
  'linktr.ee': 'Linktree',
  'beacons.ai': 'Beacons',
  'bio.link': 'Bio.link',
  'taplink.cc': 'Taplink',
  'campsite.bio': 'Campsite',
  'solo.to': 'Solo.to',
  'instabio.cc': 'InstaBio',
};

/**
 * Clasifica una URL de negocio detectando si es sitio web propio, red social o directorio
 */
export function classifyBusinessUrl(url: string | null | undefined): UrlClassification {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return {
      isOwnedWebsite: false,
      platformType: 'none',
      platformName: null,
      rawUrl: null,
    };
  }

  const cleanUrl = url.trim().toLowerCase();

  try {
    let hostname = cleanUrl;
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      const parsed = new URL(cleanUrl);
      hostname = parsed.hostname;
    } else {
      hostname = cleanUrl.split('/')[0].split('?')[0];
    }

    // Quitar prefijo www. o m.
    hostname = hostname.replace(/^(www\.|m\.)/, '');

    // 1. Revisar Redes Sociales
    for (const [domain, name] of Object.entries(SOCIAL_DOMAINS)) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return {
          isOwnedWebsite: false,
          platformType: 'social',
          platformName: name,
          rawUrl: url,
        };
      }
    }

    // 2. Revisar Directorios
    for (const [domain, name] of Object.entries(DIRECTORY_DOMAINS)) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return {
          isOwnedWebsite: false,
          platformType: 'directory',
          platformName: name,
          rawUrl: url,
        };
      }
    }

    // 3. Revisar Link Hubs
    for (const [domain, name] of Object.entries(LINK_HUB_DOMAINS)) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return {
          isOwnedWebsite: false,
          platformType: 'linkhub',
          platformName: name,
          rawUrl: url,
        };
      }
    }

    // Es un sitio web propio
    return {
      isOwnedWebsite: true,
      platformType: 'owned',
      platformName: hostname,
      rawUrl: url,
    };
  } catch {
    // Si la URL es inválida o no parseable
    return {
      isOwnedWebsite: false,
      platformType: 'none',
      platformName: null,
      rawUrl: url,
    };
  }
}

