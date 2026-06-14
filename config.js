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
  // Flux officiel « Mises à jour des trajets » (transport.data.gouv.fr, ressource 81544).
  // URL stable de téléchargement ; à confirmer/ajuster depuis :
  //   https://transport.data.gouv.fr/resources/81544
  TCAT_RT_URL: "https://transport.data.gouv.fr/resources/81544/download",
  // Si le flux est bloqué par CORS dans le navigateur, mets ici l'URL d'un
  // relais CORS (ex. ton VPS : "https://ton-vps/cors?u="). Le flux sera appelé
  // via PROXY + encodeURIComponent(URL). Laisser vide si le flux autorise CORS.
  TCAT_RT_PROXY: "",
  // Intervalle de rafraîchissement (ms)
  TCAT_RT_INTERVAL: 30000,
};
