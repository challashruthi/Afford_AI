package com.affordableride.controller;

import com.affordableride.dto.UserPreferencesDTO;
import com.affordableride.entity.User;
import com.affordableride.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/preferences")
    public ResponseEntity<?> getPreferences() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(401).body(Map.of("message", "User is not authenticated."));
        }

        String email = auth.getName();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        UserPreferencesDTO dto = new UserPreferencesDTO(
                user.getOnboardingCompleted(),
                user.getPreferredRideType(),
                user.getRidePriority(),
                user.getNumberOfPassengers(),
                user.getMaxBudget(),
                user.getApplyOffers(),
                user.getWelcomeOfferUsed(),
                user.getWelcomeOfferEligible()
        );
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/preferences")
    public ResponseEntity<?> updatePreferences(@RequestBody UserPreferencesDTO preferences) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(401).body(Map.of("message", "User is not authenticated."));
        }

        String email = auth.getName();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        if (preferences.getOnboardingCompleted() != null) {
            user.setOnboardingCompleted(preferences.getOnboardingCompleted());
        }
        if (preferences.getPreferredRideType() != null) {
            user.setPreferredRideType(preferences.getPreferredRideType());
        }
        if (preferences.getRidePriority() != null) {
            user.setRidePriority(preferences.getRidePriority());
        }
        if (preferences.getNumberOfPassengers() != null) {
            user.setNumberOfPassengers(preferences.getNumberOfPassengers());
        }
        if (preferences.getApplyOffers() != null) {
            user.setApplyOffers(preferences.getApplyOffers());
        }
        // Save or clear maxBudget
        user.setMaxBudget(preferences.getMaxBudget());

        // Rule 7: Do not reset offer eligibility when changing ride preferences!
        userRepository.save(user);

        return ResponseEntity.ok(new UserPreferencesDTO(
                user.getOnboardingCompleted(),
                user.getPreferredRideType(),
                user.getRidePriority(),
                user.getNumberOfPassengers(),
                user.getMaxBudget(),
                user.getApplyOffers(),
                user.getWelcomeOfferUsed(),
                user.getWelcomeOfferEligible()
        ));
    }

    @PostMapping("/reset-onboarding")
    public ResponseEntity<?> resetOnboarding() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(401).body(Map.of("message", "User is not authenticated."));
        }

        String email = auth.getName();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        // Rule 7: Do not reset offer eligibility when the user resets onboarding!
        user.setOnboardingCompleted(false);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message", "Onboarding state reset successfully.",
                "onboardingCompleted", false,
                "welcomeOfferUsed", user.getWelcomeOfferUsed(),
                "welcomeOfferEligible", user.getWelcomeOfferEligible()
        ));
    }

    @PostMapping("/use-welcome-offer")
    public ResponseEntity<?> useWelcomeOffer() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(401).body(Map.of("message", "User is not authenticated."));
        }

        String email = auth.getName();
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        user.setWelcomeOfferUsed(true);
        user.setWelcomeOfferEligible(false);
        user.setWelcomeOfferUsedAt(java.time.LocalDateTime.now());
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message", "Welcome offer marked as permanently used.",
                "welcomeOfferUsed", true,
                "welcomeOfferEligible", false
        ));
    }
}
