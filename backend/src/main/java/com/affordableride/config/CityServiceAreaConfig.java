package com.affordableride.config;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class CityServiceAreaConfig {

    public static class ServiceArea {
        private final String cityName;
        private final double centerLat;
        private final double centerLng;
        private final double maxRadiusKm;
        private final double minLat;
        private final double maxLat;
        private final double minLng;
        private final double maxLng;

        public ServiceArea(String cityName, double centerLat, double centerLng, double maxRadiusKm,
                           double minLat, double maxLat, double minLng, double maxLng) {
            this.cityName = cityName;
            this.centerLat = centerLat;
            this.centerLng = centerLng;
            this.maxRadiusKm = maxRadiusKm;
            this.minLat = minLat;
            this.maxLat = maxLat;
            this.minLng = minLng;
            this.maxLng = maxLng;
        }

        public boolean containsLocation(double lat, double lng, String locationName) {
            // Coordinate check 1: Bounding Box & Radial distance from city center if lat/lng present
            if (lat != 0.0 || lng != 0.0) {
                boolean inBoundingBox = (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng);
                double distanceKm = calculateHaversineDistance(centerLat, centerLng, lat, lng);
                boolean inRadius = (distanceKm <= maxRadiusKm);

                if (inBoundingBox || inRadius) {
                    return true;
                }
            }

            // Name check fallback if lat/lng are missing or for explicit location queries
            if (locationName != null && !locationName.trim().isEmpty()) {
                String nameLower = locationName.toLowerCase();
                if (cityName.equalsIgnoreCase("Hyderabad")) {
                    if (nameLower.contains("hyderabad") || nameLower.contains("secunderabad") ||
                        nameLower.contains("gachibowli") || nameLower.contains("hitec") ||
                        nameLower.contains("madhapur") || nameLower.contains("kukatpally") ||
                        nameLower.contains("begumpet") || nameLower.contains("banjara hills") ||
                        nameLower.contains("jubilee hills") || nameLower.contains("charminar") ||
                        nameLower.contains("lb nagar") || nameLower.contains("ameerpet") ||
                        nameLower.contains("miyapur") || nameLower.contains("kondapur") ||
                        nameLower.contains("financial district") || nameLower.contains("cyberabad") ||
                        nameLower.contains("shamshabad") || nameLower.contains("ghatkesar") ||
                        nameLower.contains("uppal") || nameLower.contains("ecil") ||
                        nameLower.contains("kphb") || nameLower.contains("balanagar") ||
                        nameLower.contains("dilsukhnagar") || nameLower.contains("nagole") ||
                        nameLower.contains("chandanagar") || nameLower.contains("manikonda") ||
                        nameLower.contains("mehdipatnam") || nameLower.contains("attapur") ||
                        nameLower.contains("rangareddy") || nameLower.contains("medchal")) {
                        return true;
                    }
                }
            }

            return false;
        }

        public String getCityName() {
            return cityName;
        }
    }

    private final Map<String, ServiceArea> cityAreas = new HashMap<>();

    public CityServiceAreaConfig() {
        // Hyderabad Service Area Geofence:
        // Center: (17.3850, 78.4867), Radius: 45 km, Bounding Box: [17.15..17.65, 78.15..78.75]
        cityAreas.put("hyderabad", new ServiceArea(
                "Hyderabad",
                17.3850, 78.4867,
                45.0,
                17.15, 17.65,
                78.15, 78.75
        ));
    }

    public boolean isLocationInCity(String cityName, double lat, double lng, String locationName) {
        if (cityName == null) return false;
        ServiceArea area = cityAreas.get(cityName.toLowerCase());
        if (area == null) return false;
        return area.containsLocation(lat, lng, locationName);
    }

    public boolean isLocationInHyderabad(double lat, double lng, String locationName) {
        return isLocationInCity("hyderabad", lat, lng, locationName);
    }

    private static double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        if (lat1 == 0.0 && lon1 == 0.0) return 999999.0;
        if (lat2 == 0.0 && lon2 == 0.0) return 999999.0;
        final int R = 6371; // Earth radius in KM
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
