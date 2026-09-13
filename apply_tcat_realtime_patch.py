#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
(ROOT / "realtime.js").write_text(
    (Path(__file__).resolve().parent / "realtime.js").read_text(encoding="utf-8"),
    encoding="utf-8"
)

cfg = ROOT / "config.js"
text = cfg.read_text(encoding="utf-8")

replacement = '''
  // ---- Temps réel TCAT / GTFS-RT ----
  // 81543 = positions GPS des véhicules
  // 81544 = mises à jour des trajets / prochains passages
  TCAT_VEHICLE_URL: "https://transport.data.gouv.fr/resources/81543/download",
  TCAT_TRIP_URL: "https://transport.data.gouv.fr/resources/81544/download",
  TCAT_RT_PROXY: "",
  TCAT_RT_INTERVAL: 15000,
  TCAT_RT_FRESHNESS: 90000,
};
'''

text = re.sub(
    r'\s*// ---- Temps réel TCAT \(GTFS-RT\) ----.*?\n\};\s*$',
    replacement,
    text,
    flags=re.S
)
cfg.write_text(text, encoding="utf-8")

for name in ("index.html", "sw.js"):
    p = ROOT / name
    t = p.read_text(encoding="utf-8").replace("?v=13", "?v=14")
    if name == "sw.js":
        t = t.replace("const VERSION = 'v13';", "const VERSION = 'v14';")
    p.write_text(t, encoding="utf-8")

print("Mise à jour TCAT appliquée.")
