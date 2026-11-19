package com.affordableride.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "role", nullable = false)
    private String role = "ROLE_USER";

    @Column(name = "onboarding_completed")
    private Boolean onboardingCompleted = true;

    @Column(name = "preferred_ride_type")
    private String preferredRideType = "ALL";

    @Column(name = "ride_priority")
    private String ridePriority = "LOWEST_FARE";

    @Column(name = "number_of_passengers")
    private Integer numberOfPassengers = 1;

    @Column(name = "max_budget")
    private Double maxBudget;

    @Column(name = "apply_offers")
    private Boolean applyOffers = true;

    @Column(name = "welcome_offer_used")
    private Boolean welcomeOfferUsed = false;

    @Column(name = "welcome_offer_eligible")
    private Boolean welcomeOfferEligible = true;

    @Column(name = "welcome_offer_search_id")
    private Long welcomeOfferSearchId;

    @Column(name = "welcome_offer_used_at")
    private LocalDateTime welcomeOfferUsedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public User() {}

    public User(String fullName, String email, String password, String role) {
        this.fullName = fullName;
        this.email = email;
        this.password = password;
        this.role = role != null ? role : "ROLE_USER";
        this.onboardingCompleted = true;
        this.preferredRideType = "ALL";
        this.ridePriority = "LOWEST_FARE";
        this.numberOfPassengers = 1;
        this.welcomeOfferUsed = false;
        this.welcomeOfferEligible = true;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Boolean getOnboardingCompleted() { return onboardingCompleted != null ? onboardingCompleted : false; }
    public void setOnboardingCompleted(Boolean onboardingCompleted) { this.onboardingCompleted = onboardingCompleted; }

    public String getPreferredRideType() { return preferredRideType != null ? preferredRideType : "ALL"; }
    public void setPreferredRideType(String preferredRideType) { this.preferredRideType = preferredRideType; }

    public String getRidePriority() { return ridePriority != null ? ridePriority : "LOWEST_FARE"; }
    public String getTripPriority() { return getRidePriority(); }
    public void setRidePriority(String ridePriority) { this.ridePriority = ridePriority; }

    public Integer getNumberOfPassengers() { return numberOfPassengers != null ? numberOfPassengers : 1; }
    public void setNumberOfPassengers(Integer numberOfPassengers) { this.numberOfPassengers = numberOfPassengers; }

    public Double getMaxBudget() { return maxBudget; }
    public void setMaxBudget(Double maxBudget) { this.maxBudget = maxBudget; }

    public Boolean getApplyOffers() { return applyOffers != null ? applyOffers : true; }
    public void setApplyOffers(Boolean applyOffers) { this.applyOffers = applyOffers != null ? applyOffers : true; }

    public Boolean getWelcomeOfferUsed() { return welcomeOfferUsed != null ? welcomeOfferUsed : false; }
    public void setWelcomeOfferUsed(Boolean welcomeOfferUsed) {
        this.welcomeOfferUsed = welcomeOfferUsed;
        if (Boolean.TRUE.equals(welcomeOfferUsed)) {
            this.welcomeOfferEligible = false;
        }
    }

    public Boolean getWelcomeOfferEligible() {
        if (Boolean.TRUE.equals(this.welcomeOfferUsed)) {
            return false;
        }
        return welcomeOfferEligible != null ? welcomeOfferEligible : true;
    }
    public void setWelcomeOfferEligible(Boolean welcomeOfferEligible) {
        this.welcomeOfferEligible = welcomeOfferEligible;
    }

    public Long getWelcomeOfferSearchId() { return welcomeOfferSearchId; }
    public void setWelcomeOfferSearchId(Long welcomeOfferSearchId) { this.welcomeOfferSearchId = welcomeOfferSearchId; }

    public LocalDateTime getWelcomeOfferUsedAt() { return welcomeOfferUsedAt; }
    public void setWelcomeOfferUsedAt(LocalDateTime welcomeOfferUsedAt) { this.welcomeOfferUsedAt = welcomeOfferUsedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
