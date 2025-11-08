// @utils/api/api.ts
// ---- Server config ----------------------------------------------------------
export const SERVER_IP = 'mirhadati.octaprize.com';
export const SERVER_URL = `https://${SERVER_IP}`;           // ensure protocol
export const API_PREFIX = '/api';
export const BASE_URL = `${SERVER_URL}${API_PREFIX}`;      // -> http://192.168.1.100:8000/api

// ---- Route catalogue (aligned with your Laravel routes) ---------------------
export const ApiRoutes = {
  // Health / taxonomy
  root: '/',
  taxonomy: '/taxonomy',

  // --- Auth ---
  auth: {
    base: '/auth',
    register: '/auth/register',     // POST
    login: '/auth/login',           // POST
    me: '/auth/me',                 // GET (auth:sanctum)
    logout: '/auth/logout',         // POST (auth:sanctum)
    upgradeToHost: '/auth/upgrade-to-host',
    profile: '/auth/profile'
  },

  // --- Toilets (public list & show) ---
  toilets_markers: '/toilets-markers', // GET (public)

  toilets: {
    index: '/toilets',              // GET (public, auth.optional)
    show: '/toilets/:toilet',       // GET (public, auth.optional)

    // Favorites (auth:sanctum)
    favorite: {
      add: '/toilets/:toilet/favorite',             // POST
      remove: '/toilets/:toilet/favorite',          // DELETE
      mine: '/me/favorites',                        // GET
    },

    // Sessions (auth:sanctum)
    sessions: {
      start: '/toilets/:toilet/sessions/start',     // POST
      end: '/toilets/:toilet/sessions/:sessionId/end', // POST
      mine: '/me/sessions',                         // GET
    },

    // Reviews (GET public via auth.optional; write requires auth:sanctum)
    reviews: {
      list: '/toilets/:toilet/reviews',             // GET
      create: '/toilets/:toilet/reviews',           // POST
      updateMine: '/toilets/:toilet/reviews/me',    // PATCH
      deleteMine: '/toilets/:toilet/reviews/me',    // DELETE
    },

    // Reports (auth:sanctum; list/resolve owner/admin server-side)
    reports: {
      create: '/toilets/:toilet/reports',                     // POST
      list: '/toilets/:toilet/reports',                       // GET
      resolve: '/toilets/:toilet/reports/:reportId/resolve',  // POST
    },
  },

  // --- Host (auth:sanctum) ---
  host: {
    me: '/host/me',
    toilets: {
      index: '/host/toilets',
      show: '/host/toilets/:toilet',                    // GET (host view)
      // Mutations (auth:sanctum) — assuming these live under /toilets/*
      store: '/host/toilets',                           // POST
      update: '/host/toilets/:toilet',                  // PUT/PATCH
      destroy: '/host/toilets/:toilet',                 // DELETE
      setStatus: '/host/toilets/:toilet/status',        // POST
    },

  },

  // --- Uploads (auth:sanctum) ---
  uploads: {
    toiletPhoto: '/uploads/toilet-photo',         // POST multipart
  },
} as const;

// ---- Helper: route builder --------------------------------------------------
/**
 * Build a full URL to your API, with path params and optional query.
 *
 * @param route - A path from ApiRoutes (e.g. "/toilets/:toilet")
 * @param params - Replaces :param segments
 * @param query - Appends ?key=value (arrays supported by repeating keys)
 */
export const buildRoute = (
  route: string,
  params: Record<string, string | number | boolean> = {},
  query: Record<string, any> = {}
): string => {
  if (!route) throw new Error('Route is required');

  // Replace :param segments that exist in the route
  let path = route;
  for (const key of Object.keys(params)) {
    const val = params[key];
    path = path.replace(new RegExp(`:${key}(?=/|$)`), encodeURIComponent(String(val)));
  }

  // Clean leading slashes to avoid // when joining with BASE_URL
  path = path.replace(/^\/+/, '');

  // Build query string (supports array values via repeated keys)
  const qs = new URLSearchParams();
  for (const k of Object.keys(query)) {
    const v = query[k];
    if (Array.isArray(v)) {
      v.forEach(item => {
        if (item !== undefined && item !== null && item !== '') {
          qs.append(k, String(item));
        }
      });
    } else if (v !== undefined && v !== null && v !== '') {
      qs.append(k, String(v));
    }
  }

  const url = `${BASE_URL}/${path}`;
  return qs.toString() ? `${url}?${qs.toString()}` : url;
};

// ---- Optional: HTTP method enum --------------------------------------------
export const Http = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;
