/* ============================================================
   Nexus Maps — Configuration
   ------------------------------------------------------------
   ⚠️  NE PARTAGE PAS ce fichier publiquement : il contient ta clé.
   Si Nexus Maps devient public, déplace cet appel derrière un
   relais sur ton VPS pour ne pas exposer la clé dans le navigateur.

   Obtiens une clé gratuite sur :
   https://openrouteservice.org/dev/#/signup
   ============================================================ */

const NEXUS_CONFIG = {
  // Colle ta clé OpenRouteService ici, entre les guillemets :
  ORS_KEY: "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjVlMGQ4ZmVkNGU4OTRiNDVhMTY4ZTc1MGQwMzMwNjVjIiwiaCI6Im11cm11cjY0In0=",

  // Centre de la carte (Troyes) et zoom par défaut
  CENTER: [48.2973, 4.0744],
  ZOOM: 13,

  // Bornes du géocodage : on limite les recherches d'adresses à l'Aube
  // pour éviter qu'une recherche "gare" renvoie une gare à l'autre bout de la France.
  GEOCODE_BBOX: { minLon: 3.5, minLat: 47.9, maxLon: 4.6, maxLat: 48.7 },
};
