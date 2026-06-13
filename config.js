/* ============================================================
   Nexus Maps — Configuration
   ⚠️ Clé ORS visible publiquement ici (test perso). Pour un usage
      public, passe par un relais VPS (voir vps/ors-proxy.php).
   ============================================================ */
const NEXUS_CONFIG = {
  ORS_KEY: "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjVlMGQ4ZmVkNGU4OTRiNDVhMTY4ZTc1MGQwMzMwNjVjIiwiaCI6Im11cm11cjY0In0=",
  CENTER: [4.0744, 48.2973], // MapLibre = [lon, lat] !
  ZOOM: 12.5,
  PITCH: 45,
  GEOCODE_BBOX: { minLon: 3.5, minLat: 47.9, maxLon: 4.6, maxLat: 48.7 },
};
