package com.affordableride.service;

import com.affordableride.dto.CanonicalRouteResponseDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Service
public class RouteCalculationService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RouteCalculationService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);  // 5 seconds to establish connection
        factory.setReadTimeout(8000);     // 8 seconds to receive data from OSRM
        this.restTemplate = new RestTemplate(factory);
    }

    public CanonicalRouteResponseDTO calculateCanonicalRoute(String sourceName, double startLat, double startLng,
                                                              String destName, double endLat, double endLng) {
        double distanceMeters = 0.0;
        double durationSeconds = 0.0;
        List<List<Double>> geometryCoords = new ArrayList<>();
        String routingProvider = "OSRM_DRIVING";

        try {
            // OSRM Driving API URL with full GeoJSON overview geometry
            String osrmUrl = String.format(
                    "https://router.project-osrm.org/route/v1/driving/%.6f,%.6f;%.6f,%.6f?overview=full&geometries=geojson",
                    startLng, startLat, endLng, endLat
            );

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "AffordableRidePlatform/1.0");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> responseEntity = restTemplate.exchange(osrmUrl, HttpMethod.GET, entity, String.class);
            String response = responseEntity.getBody();

            if (response != null) {
                JsonNode rootNode = objectMapper.readTree(response);
                JsonNode routes = rootNode.path("routes");
                if (routes.isArray() && routes.size() > 0) {
                    JsonNode route = routes.get(0);
                    distanceMeters = route.path("distance").asDouble();
                    durationSeconds = route.path("duration").asDouble();

                    // Parse polyline geometry coordinates [[lng, lat], ...]
                    JsonNode geometryNode = route.path("geometry").path("coordinates");
                    if (geometryNode.isArray()) {
                        for (JsonNode point : geometryNode) {
                            if (point.isArray() && point.size() >= 2) {
                                List<Double> coord = new ArrayList<>();
                                coord.add(point.get(0).asDouble()); // lng
                                coord.add(point.get(1).asDouble()); // lat
                                geometryCoords.add(coord);
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("OSRM routing service failed: " + e.getMessage() + ". Using Haversine road estimation fallback.");
            routingProvider = "HAVERSINE_ROAD_FALLBACK";
            double directDistance = calculateHaversineDistance(startLat, startLng, endLat, endLng);
            distanceMeters = directDistance * 1000.0 * 1.3; // 1.3x road factor
            durationSeconds = (distanceMeters / 1000.0 / 30.0) * 3600.0; // 30 km/h average city speed
        }

        // Keep full float precision for internal ML prediction
        double distanceKm = distanceMeters / 1000.0;
        double durationMinutes = durationSeconds / 60.0;

        // Print Routing Debug Log
        printRoutingDebugLog(sourceName, startLat, startLng, destName, endLat, endLng,
                routingProvider, distanceMeters, distanceKm, durationSeconds, durationMinutes);

        return new CanonicalRouteResponseDTO(
                sourceName != null ? sourceName : "Pickup Location",
                startLat, startLng,
                destName != null ? destName : "Destination Location",
                endLat, endLng,
                distanceMeters,
                distanceKm,
                durationSeconds,
                durationMinutes,
                geometryCoords,
                routingProvider
        );
    }

    public double[] geocodeLocation(String locationName) {
        try {
            String url = "https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&limit=1&addressdetails=1&q=" + URLEncoder.encode(locationName, StandardCharsets.UTF_8);
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "AffordableRidePlatform/1.0");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> responseEntity = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            String response = responseEntity.getBody();

            if (response != null) {
                JsonNode root = objectMapper.readTree(response);
                if (root.isArray() && root.size() > 0) {
                    JsonNode item = root.get(0);
                    double lat = item.path("lat").asDouble();
                    double lon = item.path("lon").asDouble();
                    String displayName = item.path("display_name").asText();

                    System.out.printf("[GEOCODING AUDIT LOG] Query: '%s' | Provider: Nominatim | Lat: %.6f | Lng: %.6f | Address: '%s'%n",
                            locationName, lat, lon, displayName);

                    return new double[]{lat, lon};
                }
            }
        } catch (Exception e) {
            System.err.println("Geocoding failed for location query: " + locationName + " - " + e.getMessage());
        }
        return null;
    }

    private void printRoutingDebugLog(String sourceName, double startLat, double startLng,
                                      String destName, double endLat, double endLng,
                                      String provider, double distanceMeters, double distanceKm,
                                      double durationSeconds, double durationMinutes) {
        System.out.println("\n==================================================");
        System.out.println("            CANONICAL ROUTING DEBUG LOG           ");
        System.out.println("==================================================");
        System.out.printf("SOURCE      : %s (Lat: %.6f, Lon: %.6f)%n", sourceName, startLat, startLng);
        System.out.printf("DESTINATION : %s (Lat: %.6f, Lon: %.6f)%n", destName, endLat, endLng);
        System.out.printf("ROUTING     : Provider: %s | Profile: driving%n", provider);
        System.out.printf("RESULT      : Distance: %.2f m (%.3f km) | Duration: %.2f s (%.2f mins)%n",
                distanceMeters, distanceKm, durationSeconds, durationMinutes);
        System.out.println("==================================================\n");
    }

    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
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
