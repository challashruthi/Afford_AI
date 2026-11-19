package com.affordableride.controller;

import com.affordableride.dto.SearchComparisonRequest;
import com.affordableride.dto.SearchComparisonResponse;
import com.affordableride.service.SearchComparisonService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST API for persisting and retrieving user-initiated fare comparison records.
 * All endpoints require authentication (handled by SecurityConfig).
 *
 * POST  /api/searches/comparison          — save a new comparison record
 * GET   /api/searches/comparisons         — get all comparisons for the current user
 * DELETE /api/searches/comparisons        — clear all comparisons for the current user
 */
@RestController
@RequestMapping("/api/searches")
public class SearchComparisonController {

    @Autowired
    private SearchComparisonService service;

    /**
     * Save a user-initiated comparison record.
     * Called only when the user explicitly clicks "Compare Rides & Find Cheapest".
     */
    @PostMapping("/comparison")
    public ResponseEntity<?> saveComparison(@RequestBody SearchComparisonRequest req) {
        if (req == null || req.getComparisonJson() == null || req.getComparisonJson().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid comparison data."));
        }
        SearchComparisonResponse saved = service.saveComparison(req);
        if (saved == null) {
            return ResponseEntity.status(401).body(Map.of("message", "User not authenticated."));
        }
        return ResponseEntity.ok(saved);
    }

    /**
     * Retrieve all saved comparison records for the authenticated user, newest first.
     */
    @GetMapping("/comparisons")
    public ResponseEntity<List<SearchComparisonResponse>> getComparisons() {
        return ResponseEntity.ok(service.getComparisons());
    }

    /**
     * Clear all saved comparisons for the authenticated user.
     */
    @DeleteMapping("/comparisons")
    public ResponseEntity<?> clearComparisons() {
        service.clearComparisons();
        return ResponseEntity.ok(Map.of("message", "Comparison history cleared."));
    }
}
