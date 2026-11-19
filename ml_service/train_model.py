import json
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from generate_dataset import generate_dataset

def formula_baseline_predict(df):
    """Formula baseline calculation matching deterministic logic."""
    base_rates = {
        ("Uber", "Moto"): (30.0, 8.0, 1.0, 35.0),
        ("Uber", "Auto"): (45.0, 11.5, 1.2, 55.0),
        ("Uber", "Go"): (65.0, 15.0, 1.5, 90.0),
        ("Ola", "Bike"): (25.0, 7.5, 0.9, 32.0),
        ("Ola", "Auto"): (40.0, 11.0, 1.1, 50.0),
        ("Ola", "Mini"): (60.0, 14.0, 1.4, 85.0),
        ("Rapido", "Bike"): (20.0, 7.0, 0.8, 28.0),
        ("Rapido", "Auto"): (35.0, 10.0, 1.0, 45.0),
        ("Rapido", "Cab Economy"): (50.0, 13.0, 1.3, 75.0),
        ("Pink Bike", "Women Captain"): (22.0, 7.2, 0.85, 30.0),
        ("Pink Bike", "Bike"): (22.0, 7.2, 0.85, 30.0),
    }

    preds = []
    for _, row in df.iterrows():
        key = (row['provider'], row['ride_type'])
        if key in base_rates:
            base, per_km, per_min, min_fare = base_rates[key]
            est = (base + (row['distance_km'] * per_km) + (row['duration_mins'] * per_min)) * row['surge_multiplier']
            preds.append(max(min_fare, est))
        else:
            preds.append(50.0)
    return np.array(preds)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(SCRIPT_DIR, "ride_fare_dataset.csv")
MODEL_PATH = os.path.join(SCRIPT_DIR, "fare_model.pkl")
METRICS_PATH = os.path.join(SCRIPT_DIR, "model_metrics.json")
ROOT_METRICS_PATH = os.path.join(os.path.dirname(SCRIPT_DIR), "model_metrics.json")

def train_and_evaluate():
    # 1. Regenerate/load dataset
    generate_dataset(DATASET_PATH, num_samples=10000)
    df = pd.read_csv(DATASET_PATH)

    if 'is_peak_time' not in df.columns:
        df['is_peak_time'] = df['hour_of_day'].apply(lambda h: 1 if (7 <= h <= 9 or 17 <= h <= 20) else 0)

    feature_cols = [
        'distance_km', 'duration_mins', 'provider', 'ride_type',
        'hour_of_day', 'day_of_week', 'is_peak_time', 'surge_multiplier'
    ]
    
    X = df[feature_cols]
    y = df['fare']

    # Train/Test Split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    categorical_features = ['provider', 'ride_type']
    numeric_features = ['distance_km', 'duration_mins', 'hour_of_day', 'day_of_week', 'is_peak_time', 'surge_multiplier']

    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features),
            ('num', 'passthrough', numeric_features)
        ]
    )

    # ── Model 1: Formula Baseline ──
    y_pred_baseline = formula_baseline_predict(X_test)
    base_mae = mean_absolute_error(y_test, y_pred_baseline)
    base_rmse = np.sqrt(mean_squared_error(y_test, y_pred_baseline))
    base_r2 = r2_score(y_test, y_pred_baseline)

    # ── Model 2: Linear Regression ──
    lr_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', LinearRegression())
    ])
    print("Training Linear Regression model...")
    lr_pipeline.fit(X_train, y_train)
    y_pred_lr = lr_pipeline.predict(X_test)
    lr_mae = mean_absolute_error(y_test, y_pred_lr)
    lr_rmse = np.sqrt(mean_squared_error(y_test, y_pred_lr))
    lr_r2 = r2_score(y_test, y_pred_lr)

    # ── Model 3: Random Forest Regressor ──
    rf_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
    ])
    print("Training RandomForestRegressor model...")
    rf_pipeline.fit(X_train, y_train)
    
    cv_scores = cross_val_score(rf_pipeline, X_train, y_train, cv=5, scoring='r2')
    y_pred_rf = rf_pipeline.predict(X_test)
    rf_mae = mean_absolute_error(y_test, y_pred_rf)
    rf_rmse = np.sqrt(mean_squared_error(y_test, y_pred_rf))
    rf_r2 = r2_score(y_test, y_pred_rf)

    # Provider-Specific Error Metrics for Random Forest
    test_df = X_test.copy()
    test_df['actual_fare'] = y_test.values
    test_df['pred_rf'] = y_pred_rf
    test_df['pred_baseline'] = y_pred_baseline

    provider_metrics = {}
    for p in ['Ola', 'Rapido', 'Uber', 'Pink Bike']:
        p_sub = test_df[test_df['provider'] == p]
        if len(p_sub) > 0:
            p_mae = mean_absolute_error(p_sub['actual_fare'], p_sub['pred_rf'])
            p_base_mae = mean_absolute_error(p_sub['actual_fare'], p_sub['pred_baseline'])
            provider_metrics[p] = {
                "ml_mae": round(float(p_mae), 2),
                "baseline_mae": round(float(p_base_mae), 2),
                "samples": len(p_sub)
            }

    # Sample evaluation observations (Actual, Baseline, ML Prediction, Absolute Error)
    sample_evaluations = []
    sample_indices = [0, 5, 12, 24, 50]
    for idx in sample_indices:
        actual = float(y_test.iloc[idx])
        base = float(y_pred_baseline[idx])
        rf_pred = float(y_pred_rf[idx])
        row_feat = X_test.iloc[idx]
        sample_evaluations.append({
            "provider": str(row_feat['provider']),
            "rideType": str(row_feat['ride_type']),
            "distanceKm": float(row_feat['distance_km']),
            "durationMins": float(row_feat['duration_mins']),
            "actualFare": round(actual, 2),
            "baselineFare": round(base, 2),
            "mlPredictedFare": round(rf_pred, 2),
            "absoluteError": round(abs(rf_pred - actual), 2)
        })

    print("\n==========================================")
    print("       MODEL EVALUATION & METRICS          ")
    print("==========================================")
    print(f"Dataset Samples  : {len(df)} | Test Split: {len(y_test)}")
    print(f"Formula Baseline -> MAE: Rs.{base_mae:.2f} | RMSE: {base_rmse:.2f} | R2: {base_r2:.4f}")
    print(f"Linear Regression-> MAE: Rs.{lr_mae:.2f} | RMSE: {lr_rmse:.2f} | R2: {lr_r2:.4f}")
    print(f"Random Forest ML -> MAE: Rs.{rf_mae:.2f} | RMSE: {rf_rmse:.2f} | R2: {rf_r2:.4f}")
    print(f"5-Fold CV R2 Score (Random Forest): {cv_scores.mean():.4f}")
    print("==========================================\n")

    # Save trained model (Random Forest pipeline)
    joblib.dump(rf_pipeline, MODEL_PATH)

    metrics_data = {
        "model_type": "RandomForestRegressor",
        "data_mode": "SIMULATED",
        "dataset_provenance": "Simulated multi-provider ride dataset (Uber, Ola, Rapido, Pink Bike) calibrated with realistic Indian base rates, deterministic peak surge windows, and market variance.",
        "dataset_samples": len(df),
        "test_samples": len(y_test),
        "train_test_split": "80/20",
        "features": feature_cols,
        "target": "fare",
        "cv_r2_mean": round(float(cv_scores.mean()), 4),
        "models_compared": {
            "baseline_formula": {
                "mae": round(float(base_mae), 2),
                "rmse": round(float(base_rmse), 2),
                "r2": round(float(base_r2), 4)
            },
            "linear_regression": {
                "mae": round(float(lr_mae), 2),
                "rmse": round(float(lr_rmse), 2),
                "r2": round(float(lr_r2), 4)
            },
            "random_forest": {
                "mae": round(float(rf_mae), 2),
                "rmse": round(float(rf_rmse), 2),
                "r2": round(float(rf_r2), 4)
            }
        },
        "ml_metrics": {
            "mae": round(float(rf_mae), 2),
            "rmse": round(float(rf_rmse), 2),
            "r2": round(float(rf_r2), 4)
        },
        "provider_metrics": provider_metrics,
        "sample_evaluations": sample_evaluations
    }

    with open(METRICS_PATH, "w") as f:
        json.dump(metrics_data, f, indent=4)

    with open(ROOT_METRICS_PATH, "w") as f:
        json.dump(metrics_data, f, indent=4)

    print(f"Saved trained model to '{MODEL_PATH}' and metrics JSON to '{METRICS_PATH}'.")

if __name__ == "__main__":
    train_and_evaluate()
