package com.affordableride.service;

import com.affordableride.dto.FareObservationDTO;
import com.affordableride.dto.RideOptionDTO;
import com.affordableride.entity.FareObservation;
import com.affordableride.repository.FareObservationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class FareObservationService {

    @Autowired
    private FareObservationRepository fareObservationRepository;

    @Transactional
    public List<FareObservationDTO> recordObservations(Long searchId, List<RideOptionDTO> options, double distanceKm, double durationMins) {
        if (searchId == null || options == null || options.isEmpty()) {
            return new ArrayList<>();
        }

        List<FareObservation> savedList = new ArrayList<>();
        for (RideOptionDTO option : options) {
            FareObservation obs = new FareObservation(
                    searchId,
                    option.getProviderName(),
                    option.getRideType(),
                    option.getFare(),
                    distanceKm,
                    durationMins,
                    option.getSurgeMultiplier(),
                    option.getPredictionMode() != null ? option.getPredictionMode() : "ML_PREDICTED"
            );

            FareObservation saved = fareObservationRepository.save(obs);
            savedList.add(saved);

            // SECTION 14 DEBUG LOG: [FareSnapshot SAVED] searchId=... provider=... fare=... timestamp=...
            java.time.format.DateTimeFormatter timeFmt = java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss");
            String timeStr = saved.getObservedAt() != null ? saved.getObservedAt().format(timeFmt) : String.valueOf(saved.getTimestampMs());
            System.out.println("[FareSnapshot SAVED] searchId=" + searchId + " provider=" + saved.getProviderName() + " fare=" + saved.getPredictedFare() + " timestamp=" + timeStr);
            System.out.println("[FareHistory] searchId=" + searchId + " provider=" + saved.getProviderName() + " fare=" + saved.getPredictedFare() + " timestamp=" + saved.getTimestampMs());
        }

        return savedList.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<FareObservationDTO> getHistoryForSearch(Long searchId) {
        if (searchId == null) return new ArrayList<>();
        List<FareObservation> observations = fareObservationRepository.findBySearchIdOrderByTimestampMsAsc(searchId);
        return observations.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    private FareObservationDTO convertToDTO(FareObservation obs) {
        return new FareObservationDTO(
                obs.getId(),
                obs.getSearchId(),
                obs.getProviderName(),
                obs.getRideType(),
                obs.getPredictedFare(),
                obs.getDistanceKm(),
                obs.getDurationMins(),
                obs.getSurgeFactor(),
                obs.getPredictionMode(),
                obs.getTimestampMs()
        );
    }
}
