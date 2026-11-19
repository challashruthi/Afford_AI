package com.affordableride.controller;

import com.affordableride.dto.RideSearchRequest;
import com.affordableride.dto.RideSearchResponse;
import com.affordableride.provider.ProviderRegistry;
import com.affordableride.provider.RideProviderInterface;
import com.affordableride.service.MlFarePredictionService;
import com.affordableride.service.RideService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/rides")
public class RideController {

    @Autowired
    private RideService rideService;

    @Autowired
    private ProviderRegistry providerRegistry;

    @Autowired
    private MlFarePredictionService mlFarePredictionService;

    @PostMapping("/search")
    public ResponseEntity<RideSearchResponse> searchRides(@Valid @RequestBody RideSearchRequest request) {
        RideSearchResponse response = rideService.processRideSearch(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/providers")
    public ResponseEntity<List<String>> getProviders() {
        List<String> providers = providerRegistry.getAllProviders().stream()
                .map(RideProviderInterface::getProviderName)
                .collect(Collectors.toList());
        return ResponseEntity.ok(providers);
    }

    @Autowired
    private com.affordableride.service.FareObservationService fareObservationService;

    @GetMapping("/{searchId}")
    public ResponseEntity<RideSearchResponse> getSearchById(@PathVariable Long searchId) {
        RideSearchResponse response = rideService.getSearchById(searchId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{searchId}/history")
    public ResponseEntity<List<com.affordableride.dto.FareObservationDTO>> getSearchHistory(@PathVariable Long searchId) {
        List<com.affordableride.dto.FareObservationDTO> history = fareObservationService.getHistoryForSearch(searchId);
        return ResponseEntity.ok(history);
    }

    /**
     * Returns real ML model metrics from the Python Flask ML service.
     * Used by the frontend to display actual MAE, RMSE, R² values.
     */
    @GetMapping("/model-metrics")
    public ResponseEntity<?> getModelMetrics() {
        Map<String, Object> metrics = mlFarePredictionService.getModelMetrics();
        if (metrics == null) {
            return ResponseEntity.ok(Map.of(
                "status", "ML_SERVICE_OFFLINE",
                "message", "ML service is not running. Start the Python Flask service (ml_service/app.py)."
            ));
        }
        return ResponseEntity.ok(metrics);
    }
}
