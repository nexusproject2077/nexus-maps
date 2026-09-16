/* ============================================================
   Nexus Maps — Configuration
   [!] Clé ORS visible publiquement ici (test perso). Pour un usage
      public, passe par un relais VPS (voir vps/ors-proxy.php).
   ============================================================ */
const NEXUS_CONFIG = {
  ORS_KEY: "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjVlMGQ4ZmVkNGU4OTRiNDVhMTY4ZTc1MGQwMzMwNjVjIiwiaCI6Im11cm11cjY0In0=",
  CENTER: [4.0744, 48.2973], // MapLibre = [lon, lat]
  ZOOM: 12.5,
  PITCH: 45,
  // Géocodage : France entière, résultats près de Troyes priorisés
  GEOCODE_COUNTRY: "FR",
  GEOCODE_FOCUS: { lat: 48.2973, lon: 4.0744 },

  // ---- Temps réel TCAT (GTFS-RT) ----
  // Flux officiels : positions GPS (81543) et passages aux arrêts (81544).
  // Les deux flux sont consommés en parallèle puis rafraîchis automatiquement.
  // URLs finales des fichiers (évite la redirection transport.data.gouv.fr
  // qui bloque certains navigateurs avant même l'essai du relais CORS).
  TCAT_VEHICLE_URL: "https://www.data.gouv.fr/api/1/datasets/r/98230d13-cccb-4c27-b0bc-d1b9341ca77b",
  TCAT_TRIP_URL: "https://www.data.gouv.fr/api/1/datasets/r/8dc66569-b744-4d22-95df-f8496e8eddb6",
  // Rétrocompatibilité avec les intégrations qui ne fournissent qu'un flux.
  TCAT_RT_URL: "https://www.data.gouv.fr/api/1/datasets/r/8dc66569-b744-4d22-95df-f8496e8eddb6",
  // Si le flux est bloqué par CORS dans le navigateur, mets ici l'URL d'un
  // relais CORS (ex. ton VPS : "https://ton-vps/cors?u="). Le flux sera appelé
  // via PROXY + encodeURIComponent(URL). Laisser vide si le flux autorise CORS.
  TCAT_RT_PROXY: "",
  // Intervalle de rafraîchissement (ms) — positions et passages en direct.
  TCAT_RT_INTERVAL: 15000,
  TCAT_RT_FRESHNESS: 90000,
};
