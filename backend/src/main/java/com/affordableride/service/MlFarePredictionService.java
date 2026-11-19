package com.affordableride.service;

import com.affordableride.dto.RideOptionDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class MlFarePredictionService {

    private final RestTemplate restTemplate;
    private static final String ML_SERVICE_URL = "http://localhost:5000/predict";
    private static final String ML_HEALTH_URL  = "http://localhost:5000/health";

    public MlFarePredictionService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);   // 3 seconds to connect to Flask ML service
        factory.setReadTimeout(10000);     // 10 seconds for model inference
        this.restTemplate = new RestTemplate(factory);
    }

    @Autowired
    private SurgeService surgeService;

    /**
     * Fetch model health/metrics from the Python ML service.
     * Returns null if the ML service is unavailable.
     */
    public Map<String, Object> getModelMetrics() {
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(ML_HEALTH_URL, Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return response.getBody();
            }
        } catch (Exception e) {
            // ML service unavailable
        }
        return null;
    }

    public List<RideOptionDTO> predictFares(List<RideOptionDTO> options, Double distanceKm, Integer durationMins) {
        return predictFares(options, distanceKm, durationMins != null ? durationMins.doubleValue() : 0.0);
    }

    public List<RideOptionDTO> predictFares(List<RideOptionDTO> options, Double distanceKm, Double durationMins) {
        if (options == null || options.isEmpty()) {
            return options;
        }

        LocalDateTime now = LocalDateTime.now();
        int hourOfDay = now.getHour();
        int dayOfWeek = now.getDayOfWeek().getValue() - 1; // 0-indexed Monday=0
        boolean isPeak = (hourOfDay >= 7 && hourOfDay < 10) || (hourOfDay >= 17 && hourOfDay < 21);

        List<Map<String, Object>> requestBody = new ArrayList<>();
        for (RideOptionDTO opt : options) {
            Map<String, Object> item = new HashMap<>();
            item.put("provider", opt.getProviderName());
            item.put("rideType", opt.getRideType());
            item.put("distanceKm", distanceKm);
            item.put("durationMins", durationMins);
            item.put("hourOfDay", hourOfDay);
            item.put("dayOfWeek", dayOfWeek);
            item.put("isPeakTime", isPeak ? 1 : 0);
            item.put("surgeMultiplier", opt.getSurgeFactor());
            requestBody.add(item);
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<List<Map<String, Object>>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<List> response = restTemplate.postForEntity(ML_SERVICE_URL, entity, List.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> predictions = response.getBody();
                for (int i = 0; i < options.size() && i < predictions.size(); i++) {
                    RideOptionDTO opt = options.get(i);
                    Map<String, Object> pred = predictions.get(i);
                    if (pred.get("predictedFare") != null) {
                        double mlFare = ((Number) pred.get("predictedFare")).doubleValue();
                        opt.setEstimatedFare(mlFare);
                        opt.setPricingNote("ML Predicted");
                    }
                }
                return options;
            }
        } catch (Exception e) {
            System.err.println("ML Service unavailable. Falling back to Formula Baseline: " + e.getMessage());
        }

        // Fallback: If ML microservice fails, mark options clearly as Formula Baseline
        for (RideOptionDTO opt : options) {
            opt.setPricingNote("Baseline Estimate (ML Service Offline)");
        }
        return options;
    }
}
