# Nexus Maps

Une carte web immersive centrée sur Troyes : recherche de lieux, itinéraires multimodaux, réseau TCAT en temps réel, favoris locaux et mode hors ligne.

## Points forts

- Carte 3D MapLibre avec fonds plan, satellite et relief
- Itinéraires à pied, à vélo, en voiture et en bus
- Arrêts, lignes et prochains passages du réseau TCAT
- Thème clair/sombre automatique, mémorisé et accessible
- Interface responsive pensée pour desktop, tablette et mobile
- PWA installable et cache hors ligne
- Favoris, statistiques et signalements conservés uniquement dans le navigateur
- Interface bilingue français/anglais

## Lancer en local

Le projet est statique : servez simplement le dossier avec un serveur HTTP local, puis ouvrez `index.html` depuis ce serveur.

```bash
python -m http.server 4173
```

L’application sera disponible sur `http://localhost:4173`.

## Configuration

Les options cartographiques, le point de départ et les flux TCAT sont regroupés dans `config.js`. Pour une mise en production, faites transiter la clé OpenRouteService par un relais côté serveur plutôt que de l’exposer dans le navigateur.
