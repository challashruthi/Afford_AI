package com.affordableride.service;

import com.affordableride.dto.SearchComparisonRequest;
import com.affordableride.dto.SearchComparisonResponse;
import com.affordableride.entity.SearchComparison;
import com.affordableride.entity.User;
import com.affordableride.repository.SearchComparisonRepository;
import com.affordableride.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SearchComparisonService {

    @Autowired
    private SearchComparisonRepository repository;

    @Autowired
    private UserRepository userRepository;

    private static final DateTimeFormatter ISO_FMT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /**
     * Persists a new comparison record for the currently authenticated user.
     * Returns null if the user cannot be resolved (should not happen in normal flow).
     */
    @Transactional
    public SearchComparisonResponse saveComparison(SearchComparisonRequest req) {
        User user = resolveCurrentUser();
        if (user == null) return null;

        SearchComparison entity = new SearchComparison();
        entity.setUser(user);
        entity.setRideSearchId(req.getRideSearchId());
        entity.setPickupName(req.getPickupName() != null ? req.getPickupName() : "Pickup");
        entity.setDestName(req.getDestName() != null ? req.getDestName() : "Destination");
        entity.setDistanceKm(req.getDistanceKm());
        entity.setTotalPotentialSavings(req.getTotalPotentialSavings());
        entity.setValidCategoryCount(req.getValidCategoryCount());
        entity.setComparisonJson(req.getComparisonJson() != null ? req.getComparisonJson() : "{}");

        entity = repository.save(entity);
        return toResponse(entity);
    }

    /**
     * Returns all saved comparisons for the current user, newest first.
     */
    @Transactional(readOnly = true)
    public List<SearchComparisonResponse> getComparisons() {
        User user = resolveCurrentUser();
        if (user == null) return Collections.emptyList();

        return repository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Deletes all saved comparisons for the current user (clear history).
     */
    @Transactional
    public void clearComparisons() {
        User user = resolveCurrentUser();
        if (user == null) return;
        List<SearchComparison> records = repository.findByUserIdOrderByCreatedAtDesc(user.getId());
        repository.deleteAll(records);
    }

    private User resolveCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        return userRepository.findByEmail(auth.getName()).orElse(null);
    }

    private SearchComparisonResponse toResponse(SearchComparison e) {
        return new SearchComparisonResponse(
                e.getId(),
                e.getRideSearchId(),
                e.getPickupName(),
                e.getDestName(),
                e.getDistanceKm(),
                e.getTotalPotentialSavings(),
                e.getValidCategoryCount(),
                e.getComparisonJson(),
                e.getCreatedAt() != null ? e.getCreatedAt().format(ISO_FMT) : null
        );
    }
}
