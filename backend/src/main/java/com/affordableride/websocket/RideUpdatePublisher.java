package com.affordableride.websocket;

import com.affordableride.dto.RecommendationDTO;
import com.affordableride.dto.RideOptionDTO;
import com.affordableride.dto.WebSocketUpdateMessage;
import com.affordableride.recommendation.WeightedRecommendationEngine;
import com.affordableride.service.FareCalculationService;
import com.affordableride.service.SurgeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * RideUpdatePublisher
 *
 * Responsibilities:
 * 1. Broadcast periodic surge/demand state as SURGE_STATE_UPDATE (global topic)
 * 2. Publish fare updates for a specific search via /topic/ride-updates/{searchId}
 *    when explicitly triggered (e.g., after a search or on peak transition).
 *
 * NO Math.random() is used.
 * Surge is deterministic based on current system time and provider/rideType.
 */
@Component
public class RideUpdatePublisher {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private SurgeService surgeService;

    @Autowired
    private FareCalculationService fareCalculationService;

    @Autowired
    private WeightedRecommendationEngine recommendationEngine;

    // Active searches: searchId -> { distanceKm, durationMins, preferredCategory }
    private final ConcurrentHashMap<Long, SearchContext> activeSearches = new ConcurrentHashMap<>();

    // Inner class to hold a search context for WS publishing
    public static class SearchContext {
        public final double distanceKm;
        public final double durationMins;
        public final String preferredCategory;
        public final Double pickupLat;
        public final Double pickupLng;
        public final String pickupName;
        public final long registeredAt;

        public SearchContext(double distanceKm, double durationMins, String preferredCategory) {
            this(distanceKm, durationMins, preferredCategory, 0.0, 0.0, null);
        }

        public SearchContext(double distanceKm, double durationMins, String preferredCategory, Double pickupLat, Double pickupLng, String pickupName) {
            this.distanceKm = distanceKm;
            this.durationMins = durationMins;
            this.preferredCategory = preferredCategory != null ? preferredCategory : "ALL";
            this.pickupLat = pickupLat;
            this.pickupLng = pickupLng;
            this.pickupName = pickupName;
            this.registeredAt = System.currentTimeMillis();
        }
    }

    /**
     * Register a search so that periodic fare updates are published for it.
     * Call this after a successful ride search via the REST API.
     */
    public void registerSearch(Long searchId, double distanceKm, double durationMins, String preferredCategory) {
        registerSearch(searchId, distanceKm, durationMins, preferredCategory, 0.0, 0.0, null);
    }

    public void registerSearch(Long searchId, double distanceKm, double durationMins, String preferredCategory, Double pickupLat, Double pickupLng, String pickupName) {
        if (searchId == null) return;
        activeSearches.put(searchId, new SearchContext(distanceKm, durationMins, preferredCategory, pickupLat, pickupLng, pickupName));

        // Immediately publish an initial update
        publishFareUpdateForSearch(searchId);
    }

    /**
     * Deregister a search (optional cleanup — stale searches auto-expire via TTL check).
     */
    public void deregisterSearch(Long searchId) {
        if (searchId != null) activeSearches.remove(searchId);
    }

    @Autowired
    private com.affordableride.service.FareObservationService fareObservationService;

    /**
     * Publish a single FARE_UPDATE for a registered search.
     */
    public void publishFareUpdateForSearch(Long searchId) {
        SearchContext ctx = activeSearches.get(searchId);
        if (ctx == null) return;

        try {
            LocalTime now = LocalTime.now();
            List<RideOptionDTO> options = fareCalculationService.calculateAllFares(ctx.distanceKm, ctx.durationMins, ctx.pickupLat, ctx.pickupLng, ctx.pickupName);
            RecommendationDTO recommendation = recommendationEngine.evaluateCheapestRide(options, ctx.preferredCategory);
            Map<String, Object> demandInfo = surgeService.getDemandSummary(now);
            String surgeStatus = surgeService.getPeakStatus(now);

            // Record observation into MySQL DB (Step 2 & Step 8)
            fareObservationService.recordObservations(searchId, options, ctx.distanceKm, ctx.durationMins);
            List<com.affordableride.dto.FareObservationDTO> fullHistory = fareObservationService.getHistoryForSearch(searchId);

            WebSocketUpdateMessage msg = new WebSocketUpdateMessage(
                    "FARE_UPDATE",
                    "Deterministic fare update — " + surgeStatus,
                    searchId,
                    options,
                    recommendation,
                    demandInfo,
                    ctx.distanceKm,
                    (int) Math.round(ctx.durationMins),
                    fullHistory
            );

            messagingTemplate.convertAndSend("/topic/ride-updates/" + searchId, msg);
        } catch (Exception e) {
            // Silently handle failures — WS is best-effort
        }
    }

    /**
     * Periodic global surge state broadcast — 5s interval.
     * Does NOT carry route-specific fare data; frontend uses it for demand indicator only.
     */
    @Scheduled(fixedRate = 5000)
    public void publishPeriodicSurgeState() {
        try {
            LocalTime now = LocalTime.now();
            String status = surgeService.getPeakStatus(now);

            WebSocketUpdateMessage message = new WebSocketUpdateMessage(
                    "SURGE_STATE_UPDATE",
                    "Current System Demand: " + status,
                    new ArrayList<>()
            );
            messagingTemplate.convertAndSend("/topic/ride-updates", message);
        } catch (Exception ignored) {}
    }

    /**
     * Periodic fare update for all registered active searches — 10s interval.
     * Saves a new FareSnapshot record to MySQL DB on every prediction cycle (even if fare is unchanged).
     * Removes stale searches older than 30 minutes.
     */
    @Scheduled(fixedRate = 10000)
    public void publishPeriodicFareUpdates() {
        long now = System.currentTimeMillis();
        long ttlMs = 30L * 60 * 1000; // 30 min TTL

        for (Map.Entry<Long, SearchContext> entry : activeSearches.entrySet()) {
            Long searchId = entry.getKey();
            SearchContext ctx = entry.getValue();

            // Remove stale searches
            if (now - ctx.registeredAt > ttlMs) {
                activeSearches.remove(searchId);
                continue;
            }

            // Publish update
            publishFareUpdateForSearch(searchId);
        }
    }
}
