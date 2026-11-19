# AI-Based Affordable Ride Recommendation Platform (Phase 1)

A full-stack web application designed to compute deterministic ride fare estimates and recommend the cheapest and fastest ride option across **Uber**, **Ola**, and **Rapido** for any location worldwide.

---

## 🏗️ Project Architecture & Structure

```
AI-Based-Affordable-Ride-Recommendation-Platform/
│
├── ml_service/                   # Python Flask ML Service (RandomForestRegressor)
│   ├── generate_dataset.py       # Dataset generator (10,000 samples)
│   ├── train_model.py            # Model training & baseline evaluation script
│   ├── app.py                    # Flask REST API endpoint (/predict & /health)
│   ├── ride_fare_dataset.csv     # Training dataset
│   ├── fare_model.pkl            # Trained Scikit-Learn model pipeline
│   ├── model_metrics.json        # Evaluation metrics (MAE, RMSE, R²)
│   └── README.md                 # ML documentation
│
├── frontend/                     # React.js (Vite) Frontend
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── components/           # LocationAutocomplete, MapView, RideCard, RecommendationBadge, LiveUpdateToggle, FirstTimeOnboardingModal
│       ├── pages/                # LandingPage, LoginPage, RegisterPage, DashboardPage, RideComparisonPage
│       ├── services/             # Axios API instance & STOMP WebSocket client
│       ├── App.jsx               # React Router navigation & protection guards
│       ├── main.jsx              # Entry point
│       └── styles/               # Glassmorphic Dark UI Theme System
│
├── backend/                      # Java 17 Spring Boot 3.x Backend
│   ├── pom.xml                   # Maven dependencies (Security, JWT, JPA, WebSocket, MySQL)
│   └── src/
│       └── main/
│           ├── java/com/affordableride/
│           │   ├── config/       # SecurityConfig, WebConfig, WebSocketConfig, DataInitializer
│           │   ├── controller/   # AuthController, RideController, RecommendationController, UserController
│           │   ├── dto/          # Requests & Responses (Auth, RideSearch, Location, WebSocket)
│           │   ├── entity/       # User, RideProvider, RideOption, RideSearch, Recommendation
│           │   ├── exception/    # GlobalExceptionHandler, Custom Exceptions
│           │   ├── provider/     # RideProviderInterface, UberProvider, OlaProvider, RapidoProvider, MockRideProvider
│           │   ├── recommendation/ # WeightedRecommendationEngine (AI Scoring)
│           │   ├── repository/   # JPA Data Repositories
│           │   ├── security/     # JwtTokenProvider, JwtAuthenticationFilter, CustomUserDetailsService
│           │   ├── service/      # AuthService, RideService, FareCalculationService, RecommendationService, MlFarePredictionService
│           │   └── websocket/    # RideUpdateController, RideUpdatePublisher (STOMP pusher)
│           └── resources/
│               └── application.properties # Server, MySQL & JWT configuration
│
├── .env.example
├── README.md
└── .vscode/
    └── tasks.json
```

---

## ⚡ Quick Start Guide (Running in VS Code)

### Prerequisites
- **Java JDK 17+**
- **Node.js v18+**
- **MySQL 8.0+** running on `localhost:3306`

### 1. Database Setup (MySQL)
Open MySQL CLI or Workbench and run:
```sql
CREATE DATABASE IF NOT EXISTS affordable_ride_platform;
```
*(The backend automatically creates all required tables: `users`, `ride_providers`, `ride_options`, `ride_searches`, `recommendations` and seeds provider data upon startup!)*

### 2. Backend Execution
```bash
cd backend
mvn spring-boot:run
```
> Server runs on `http://localhost:8080`

### 3. Frontend Execution
```bash
cd frontend
npm install
npm run dev
```
> App runs on `http://localhost:5173`

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user | ❌ No |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT | ❌ No |
| `GET` | `/api/rides/providers` | Get list of active ride providers | ❌ No |
| `POST` | `/api/rides/search` | Search pickup & dest, compute fares & AI recommendation | 🔒 Yes (Bearer JWT) |
| `GET` | `/api/rides/{searchId}` | Get saved search details by ID | 🔒 Yes (Bearer JWT) |
| `POST` | `/api/recommendations` | Evaluate custom list of options for cheapest recommendation | 🔒 Yes (Bearer JWT) |

### WebSocket Endpoint
- **STOMP Endpoint**: `/ws-ride-updates` (SockJS fallback enabled)
- **Topic**: `/topic/ride-updates`

---

## 🚀 Implemented Phase 1 Features
1. **JWT Authentication & BCrypt Security**: Registration & login with encrypted password storage in MySQL.
2. **Dynamic Geocoding (Nominatim)**: Debounced autocomplete supporting ANY location globally.
3. **OSRM Map & Routing (Leaflet)**: Route polyline rendering, road distance (KM) and actual estimated trip duration (MINS).
4. **Deterministic Fare Engine**: Zero random pricing (`Math.random` prohibited). Fares calculated dynamically via base rates, per-km rates, per-minute rates, and surge factors.
5. **AI Weighted Recommendation Engine**: Composite scoring favoring affordability to recommend the best ride option with exact savings and rationale.
6. **Real-time WebSockets**: STOMP push notifications for demand and surge updates.

---

## 🔮 Phase 2 Roadmap (Future Scope - Not Included Now)
- Live driver tracking & GPS geolocation
- Direct booking integration with Uber/Ola/Rapido APIs
- Payment gateway integration (Razorpay/Stripe)
- Price drop alert notifications
- Admin analytics dashboard & ride history exports
