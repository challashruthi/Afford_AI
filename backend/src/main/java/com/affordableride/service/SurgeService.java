package com.affordableride.service;

import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class SurgeService {

    public String getPeakStatus(LocalTime time) {
        if (time == null) time = LocalTime.now();
        int hour = time.getHour();

        if (hour >= 7 && hour < 10) {
            return "Morning Peak Time";
        } else if (hour >= 17 && hour < 21) {
            return "Evening High Demand";
        } else if (hour >= 21 || hour < 7) {
            return "Late Night";
        } else {
            return "Off-Peak";
        }
    }

    public String getPeakLevel(LocalTime time) {
        if (time == null) time = LocalTime.now();
        int hour = time.getHour();

        if (hour >= 17 && hour < 21) {
            return "HIGH_DEMAND"; // 🔴 High Demand
        } else if ((hour >= 7 && hour < 10) || (hour >= 21 && hour < 23)) {
            return "PEAK_TIME"; // 🟠 Peak Time
        } else {
            return "OFF_PEAK"; // 🟢 Off-Peak
        }
    }

    public double calculateSurge(LocalTime time, String provider, String rideType, double distanceKm) {
        if (time == null) time = LocalTime.now();
        int hour = time.getHour();
        int minute = time.getMinute();

        double baseSurge = 1.0;

        // Determine base surge from time of day
        if (hour >= 7 && hour < 10) {
            // Morning peak: 1.1x to 1.3x deterministically based on minute
            baseSurge = 1.15 + ((minute % 15) * 0.01);
        } else if (hour >= 17 && hour < 21) {
            // Evening peak: 1.2x to 1.4x
            baseSurge = 1.25 + ((minute % 15) * 0.01);
        } else if (hour >= 21 || hour < 7) {
            // Late night: 1.05x to 1.15x
            baseSurge = 1.08 + ((minute % 10) * 0.01);
        } else {
            // Off-peak: 1.0x
            baseSurge = 1.0;
        }

        // Provider specific minor offset (deterministic)
        double providerOffset = 0.0;
        if ("Uber".equalsIgnoreCase(provider)) {
            providerOffset = 0.05;
        } else if ("Ola".equalsIgnoreCase(provider)) {
            providerOffset = 0.02;
        } else if ("Rapido".equalsIgnoreCase(provider)) {
            providerOffset = 0.0;
        }

        // Category adjustment: Bike slightly lower surge, Auto medium, Cab standard
        double categoryOffset = 0.0;
        if (rideType != null && (rideType.toLowerCase().contains("bike") || rideType.toLowerCase().contains("moto"))) {
            categoryOffset = -0.02;
        } else if (rideType != null && rideType.toLowerCase().contains("auto")) {
            categoryOffset = 0.01;
        }

        double finalSurge = baseSurge + providerOffset + categoryOffset;

        // Long distance multiplier slight adjustment (above 15km)
        if (distanceKm > 15.0) {
            finalSurge += 0.05;
        }

        return Math.round(finalSurge * 100.0) / 100.0;
    }

    public Map<String, Object> getDemandSummary(LocalTime time) {
        if (time == null) time = LocalTime.now();
        Map<String, Object> summary = new HashMap<>();
        summary.put("status", getPeakStatus(time));
        summary.put("level", getPeakLevel(time));
        summary.put("baseSurge", calculateSurge(time, "General", "All", 10.0));
        summary.put("note", "Simulated Surge • Current Time State");
        return summary;
    }
}
