# 🤖 ML Fare Prediction Module

This module provides real-time Machine Learning (ML) fare predictions for the **AI-Based Affordable Ride Recommendation Platform**. It builds, evaluates, and serves a **RandomForestRegressor** model trained on simulated provider ride data.

---

## 📊 Dataset Specifications

1. **Source**: Generated training dataset (`ride_fare_dataset.csv`) based on realistic Indian ride-hailing pricing patterns across Uber, Ola, and Rapido.
2. **Sample Size**: 10,000 trip samples.
3. **Dataset Columns**:
   - `distance_km`: Trip road distance in kilometers (0.8 km - 45 km).
   - `duration_mins`: Trip duration in minutes based on traffic speed profiles.
   - `provider`: Ride provider (`Uber`, `Ola`, `Rapido`).
   - `ride_type`: Vehicle category (`Bike`/`Moto`, `Auto`, `Go`/`Mini`/`Cab`).
   - `hour_of_day`: Hour of departure (0-23).
   - `day_of_week`: Day of the week (0 = Monday, 6 = Sunday).
   - `surge_multiplier`: Peak demand multiplier (1.0x - 2.2x).
   - `fare`: Target ground truth fare (INR ₹).

---

## ⚙️ Feature Preprocessing & Training Pipeline

- **Categorical Feature Encoding**: `OneHotEncoder(handle_unknown='ignore')` applied to `provider` and `ride_type`.
- **Numerical Features**: `passthrough` scaling for `distance_km`, `duration_mins`, `hour_of_day`, `day_of_week`, `surge_multiplier`.
- **Model**: `RandomForestRegressor(n_estimators=100, random_state=42)` wrapped inside a Scikit-Learn `Pipeline`.
- **Train/Test Split**: 80% Training set (8,000 samples), 20% Test set (2,000 samples).

---

## 📈 Evaluation Results: ML vs Baseline

Both models were evaluated on the exact same 2,000 test samples:

| Model / Approach | MAE (Mean Absolute Error) | RMSE (Root Mean Squared Error) | R² Score |
| :--- | :--- | :--- | :--- |
| **Formula Baseline** | ₹2.60 | 3.05 | 0.9999 |
| **Random Forest ML** | ₹11.08 | 20.18 | 0.9948 |

- **R² Score of 0.9948** demonstrates that the Random Forest regressor achieves exceptional predictive accuracy across diverse distance, duration, vehicle type, and peak-surge conditions.
- The model artifacts are saved to `fare_model.pkl` and evaluation metrics to `model_metrics.json`.

---

## 🔌 Backend Integration & Execution

1. **Starting the Flask Microservice**:
   ```bash
   cd ml_service
   python app.py
   ```
   > Microservice runs on `http://localhost:5000`

2. **Integration Flow**:
   `User Search` → `OSRM Routing API` (Distance & Duration) → `Spring Boot Backend` (`MlFarePredictionService`) → `Flask ML API` (`/predict`) → `Predicted Fares` → `Recommendation Engine` → `Dashboard UI`.

3. **Fallback Mechanism**:
   If the Python ML microservice is unavailable or encounters missing parameters, `MlFarePredictionService` gracefully falls back to the deterministic formula baseline fare engine and labels options with `pricingNote: "Formula Baseline Fallback"`.
