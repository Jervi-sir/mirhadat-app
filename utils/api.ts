// ---- Server config ----------------------------------------------------------
export const SERVER_IP = '192.168.1.100:8000'
export const SERVER_URL = `http://${SERVER_IP}`            // ensure protocol
export const API_PREFIX = '/api'
export const BASE_URL = `${SERVER_URL}${API_PREFIX}`       // -> http://192.168.1.100:8000/api

// ---- Route catalogue --------------------------------------------------------
/**
 * Centralized, human-readable list of API paths.
 * Use with buildRoute(ApiRoutes.auth.login) or buildRoute(ApiRoutes.toilets.show, { toilet: 123 })
 */
export const ApiRoutes = {
  // Health / default
  root: '/',
  taxonomy: '/taxonomy',

  // --- Auth ---
  auth: {
    base: '/auth',
    register: '/auth/register',       // POST
    login: '/auth/login',             // POST
    me: '/auth/me',                   // GET (auth)
    logout: '/auth/logout',           // POST (auth)
  },

  // --- User (example protected user endpoint in your file) ---
  user: '/user',                      // GET (auth)

  // --- Toilets (public list & show; rest is auth) ---
  toilets_markers: '/toilets-markers',                // GET (public list)
  toilets: {
    index: '/toilets',                // GET (public list)
    show: '/toilets/:toilet',         // GET (public show)

    store: '/toilets',                // POST (auth)
    update: '/toilets/:toilet',       // PUT/PATCH (auth)
    destroy: '/toilets/:toilet',      // DELETE (auth)
    setStatus: '/toilets/:toilet/status', // POST (auth)

    // Favorites (auth)
    favorite: {
      add: '/toilets/:toilet/favorite',    // POST
      remove: '/toilets/:toilet/favorite', // DELETE
      mine: '/me/favorites',               // GET
    },

    // Sessions (auth)
    sessions: {
      start: '/toilets/:toilet/sessions/start',          // POST
      end: '/toilets/:toilet/sessions/:sessionId/end',   // POST
      mine: '/me/sessions',                               // GET
    },

    // Reviews (list public, write auth)
    reviews: {
      list: '/toilets/:toilet/reviews',   // GET (public)
      create: '/toilets/:toilet/reviews', // POST (auth)
      updateMine: '/toilets/:toilet/reviews/me',   // PATCH (auth)
      deleteMine: '/toilets/:toilet/reviews/me',   // DELETE (auth)
    },

    // Reports (auth; owner/admin for list/resolve)
    reports: {
      create: '/toilets/:toilet/reports',                    // POST
      list: '/toilets/:toilet/reports',                      // GET (owner/admin)
      resolve: '/toilets/:toilet/reports/:reportId/resolve', // POST (owner/admin)
    },
  },
} as const

// ---- Helper: route builder --------------------------------------------------
/**
 * Build a full URL to your API, with path params and optional query.
 *
 * @param {string} route - A path from ApiRoutes (e.g. "/toilets/:toilet")
 * @param {Record<string, string|number|boolean>} [params] - Replaces :param segments
 * @param {Record<string, string|number|boolean|Array<string|number|boolean>>} [query] - Appends ?key=value
 * @returns {string}
 */

// @ts-ignore
export const buildRoute = (route, params = {}, query = {}) => {
  if (!route) throw new Error('Route is required')

  // Replace :param segments
  let path = route
  for (const key of Object.keys(params)) {
    // @ts-ignore
    const val = params[key]
    path = path.replace(new RegExp(`:${key}(?=/|$)`), encodeURIComponent(String(val)))
  }

  // Clean leading slashes to avoid // when joining with BASE_URL
  path = path.replace(/^\/+/, '')

  // Build query string (supports array values)
  const qs = new URLSearchParams()
  for (const k of Object.keys(query)) {
    // @ts-ignore
    const v = query[k]
    if (Array.isArray(v)) {
      v.forEach(item => qs.append(k, String(item)))
    } else if (v !== undefined && v !== null && v !== '') {
      qs.append(k, String(v))
    }
  }

  const url = `${BASE_URL}/${path}`
  return qs.toString() ? `${url}?${qs.toString()}` : url
}

// ---- (Optional) tiny helper to pick method ---------------------------------
/**
 * Optional convenience: map a semantic action to HTTP method for your fetch layer.
 */
export const Http = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const

// ----------------------------
// Usage examples
// ----------------------------

// Auth
// buildRoute(ApiRoutes.auth.login)                      -> http://192.168.1.100:8000/api/auth/login
// buildRoute(ApiRoutes.auth.me)                         -> http://192.168.1.100:8000/api/auth/me

// Toilets public
// buildRoute(ApiRoutes.toilets.index, {}, { page: 1, perPage: 20, q: 'center' })
// -> http://192.168.1.100:8000/api/toilets?page=1&perPage=20&q=center
// buildRoute(ApiRoutes.toilets.show, { toilet: 42 })
// -> http://192.168.1.100:8000/api/toilets/42

// Toilets (auth-required)
// buildRoute(ApiRoutes.toilets.update, { toilet: 42 })
// buildRoute(ApiRoutes.toilets.setStatus, { toilet: 42 })

// Favorites
// buildRoute(ApiRoutes.toilets.favorite.add, { toilet: 42 })
// buildRoute(ApiRoutes.toilets.favorite.remove, { toilet: 42 })
// buildRoute(ApiRoutes.toilets.favorite.mine)

// Sessions
// buildRoute(ApiRoutes.toilets.sessions.start, { toilet: 42 })
// buildRoute(ApiRoutes.toilets.sessions.end, { toilet: 42, sessionId: 123 })
// buildRoute(ApiRoutes.toilets.sessions.mine)

// Reviews
// buildRoute(ApiRoutes.toilets.reviews.list, { toilet: 42 })
// buildRoute(ApiRoutes.toilets.reviews.create, { toilet: 42 })
// buildRoute(ApiRoutes.toilets.reviews.updateMine, { toilet: 42 })
// buildRoute(ApiRoutes.toilets.reviews.deleteMine, { toilet: 42 })

// Reports
// buildRoute(ApiRoutes.toilets.reports.create, { toilet: 42 })
// buildRoute(ApiRoutes.toilets.reports.list, { toilet: 42 })
// buildRoute(ApiRoutes.toilets.reports.resolve, { toilet: 42, reportId: 7 })
