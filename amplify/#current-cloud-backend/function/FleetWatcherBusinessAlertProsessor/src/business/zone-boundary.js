export const zoneBoundary = async (alert, trame) => {
  console.log('[DEBUG] Début de la fonction zoneBoundary');

  // 1. Coordonnées du centre de la zone
  const origLat = alert['zone_lat'];
  const origLon = alert['zone_lng'];
  console.log('[DEBUG] Centre de la zone:', { origLat, origLon });

  // 2. Rayon de la zone en kilomètres
  const radius = alert['zone_radius'] / 1000; // Convertir en kilomètres
  console.log('[DEBUG] Rayon de la zone (km):', radius);

  // 3. Position actuelle du véhicule
  const destLat = trame['position_latitude'];
  const destLon = trame['position_longitude'];
  console.log('[DEBUG] Position du véhicule:', { destLat, destLon });

  // 4. Si la position est invalide, retourner null
  if (!destLat || !destLon) {
    console.error('[ERROR] Position du véhicule invalide.');
    return null;
  }

  // 5. Calculer la distance à vol d'oiseau (formule de Haversine)
  const distanceKm = haversine(origLat, origLon, destLat, destLon);
  console.log('[DEBUG] Distance à vol d\'oiseau (km):', distanceKm);

  // 6. Retourner 'in' si dans la zone, sinon 'out'
  const result = (distanceKm < radius) ? 'in' : 'out';
  console.log('[DEBUG] Résultat de zoneBoundary:', result);
  return result;
};

// Fonction pour calculer la distance à vol d'oiseau (Haversine)
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance en km
};