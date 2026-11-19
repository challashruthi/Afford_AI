package com.affordableride.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class UserPreferencesDTO {
    private Boolean onboardingCompleted;
    private String preferredRideType; // ALL, BIKE, AUTO, CAB
    private String ridePriority;       // LOWEST_FARE
    private Integer numberOfPassengers; // 1–5+
    private Double maxBudget;          // Maximum ride budget in INR (₹)
    private Boolean applyOffers = true; // Platform offers preference
    private Boolean welcomeOfferUsed = false;
    private Boolean welcomeOfferEligible = true;

    public UserPreferencesDTO() {}

    public UserPreferencesDTO(Boolean onboardingCompleted, String preferredRideType,
                              String ridePriority, Integer numberOfPassengers, Double maxBudget, Boolean applyOffers) {
        this(onboardingCompleted, preferredRideType, ridePriority, numberOfPassengers, maxBudget, applyOffers, false, true);
    }

    public UserPreferencesDTO(Boolean onboardingCompleted, String preferredRideType,
                              String ridePriority, Integer numberOfPassengers, Double maxBudget, Boolean applyOffers,
                              Boolean welcomeOfferUsed, Boolean welcomeOfferEligible) {
        this.onboardingCompleted = onboardingCompleted;
        this.preferredRideType = preferredRideType;
        this.ridePriority = ridePriority;
        this.numberOfPassengers = numberOfPassengers;
        this.maxBudget = maxBudget;
        this.applyOffers = applyOffers != null ? applyOffers : true;
        this.welcomeOfferUsed = welcomeOfferUsed != null ? welcomeOfferUsed : false;
        this.welcomeOfferEligible = welcomeOfferEligible != null ? welcomeOfferEligible : true;
    }

    public UserPreferencesDTO(Boolean onboardingCompleted, String preferredRideType,
                              String ridePriority, Integer numberOfPassengers, Double maxBudget) {
        this(onboardingCompleted, preferredRideType, ridePriority, numberOfPassengers, maxBudget, true, false, true);
    }

    public UserPreferencesDTO(Boolean onboardingCompleted, String preferredRideType,
                              String ridePriority, Integer numberOfPassengers) {
        this(onboardingCompleted, preferredRideType, ridePriority, numberOfPassengers, null, true, false, true);
    }

    // Legacy constructor for existing callers
    public UserPreferencesDTO(Boolean onboardingCompleted, String preferredRideType) {
        this(onboardingCompleted, preferredRideType, "LOWEST_FARE", 1, null, true, false, true);
    }

    public Boolean getOnboardingCompleted() { return onboardingCompleted; }
    public Boolean getHasCompletedOnboarding() { return onboardingCompleted; }
    public void setOnboardingCompleted(Boolean onboardingCompleted) { this.onboardingCompleted = onboardingCompleted; }

    public String getPreferredRideType() { return preferredRideType; }
    public void setPreferredRideType(String preferredRideType) { this.preferredRideType = preferredRideType; }

    public String getRidePriority() { return ridePriority != null ? ridePriority : "LOWEST_FARE"; }
    public void setRidePriority(String ridePriority) { this.ridePriority = ridePriority; }

    public Integer getNumberOfPassengers() { return numberOfPassengers != null ? numberOfPassengers : 1; }
    public void setNumberOfPassengers(Integer numberOfPassengers) { this.numberOfPassengers = numberOfPassengers; }

    public Double getMaxBudget() { return maxBudget; }
    public void setMaxBudget(Double maxBudget) { this.maxBudget = maxBudget; }

    public Boolean getApplyOffers() { return applyOffers != null ? applyOffers : true; }
    public void setApplyOffers(Boolean applyOffers) { this.applyOffers = applyOffers != null ? applyOffers : true; }

    public Boolean getWelcomeOfferUsed() { return welcomeOfferUsed != null ? welcomeOfferUsed : false; }
    public void setWelcomeOfferUsed(Boolean welcomeOfferUsed) { this.welcomeOfferUsed = welcomeOfferUsed; }

    public Boolean getWelcomeOfferEligible() { return welcomeOfferEligible != null ? welcomeOfferEligible : true; }
    public void setWelcomeOfferEligible(Boolean welcomeOfferEligible) { this.welcomeOfferEligible = welcomeOfferEligible; }
}
