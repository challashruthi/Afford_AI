package com.affordableride.dto;

public class AuthResponse {
    private String token;
    private String tokenType = "Bearer";
    private Long id;
    private String fullName;
    private String email;
    private Boolean onboardingCompleted;
    private String preferredRideType;
    private String tripPriority;
    private Boolean welcomeOfferUsed = false;
    private Boolean welcomeOfferEligible = true;

    public AuthResponse() {}

    public AuthResponse(String token, Long id, String fullName, String email, Boolean onboardingCompleted, String preferredRideType, String tripPriority) {
        this(token, id, fullName, email, onboardingCompleted, preferredRideType, tripPriority, false, true);
    }

    public AuthResponse(String token, Long id, String fullName, String email, Boolean onboardingCompleted, String preferredRideType, String tripPriority, Boolean welcomeOfferUsed, Boolean welcomeOfferEligible) {
        this.token = token;
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.onboardingCompleted = onboardingCompleted;
        this.preferredRideType = preferredRideType;
        this.tripPriority = tripPriority;
        this.welcomeOfferUsed = welcomeOfferUsed != null ? welcomeOfferUsed : false;
        this.welcomeOfferEligible = welcomeOfferEligible != null ? welcomeOfferEligible : true;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getTokenType() { return tokenType; }
    public void setTokenType(String tokenType) { this.tokenType = tokenType; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Boolean getOnboardingCompleted() { return onboardingCompleted; }
    public Boolean getHasCompletedOnboarding() { return onboardingCompleted; }
    public void setOnboardingCompleted(Boolean onboardingCompleted) { this.onboardingCompleted = onboardingCompleted; }

    public String getPreferredRideType() { return preferredRideType; }
    public void setPreferredRideType(String preferredRideType) { this.preferredRideType = preferredRideType; }

    public String getTripPriority() { return tripPriority; }
    public void setTripPriority(String tripPriority) { this.tripPriority = tripPriority; }

    public Boolean getWelcomeOfferUsed() { return welcomeOfferUsed != null ? welcomeOfferUsed : false; }
    public void setWelcomeOfferUsed(Boolean welcomeOfferUsed) { this.welcomeOfferUsed = welcomeOfferUsed; }

    public Boolean getWelcomeOfferEligible() { return welcomeOfferEligible != null ? welcomeOfferEligible : true; }
    public void setWelcomeOfferEligible(Boolean welcomeOfferEligible) { this.welcomeOfferEligible = welcomeOfferEligible; }
}
