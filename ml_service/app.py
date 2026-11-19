import os
import json
import joblib
import pandas as pd
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "fare_model.pkl")
METRICS_PATH = os.path.join(SCRIPT_DIR, "model_metrics.json")

model = None
metrics = {}

def load_resources():
    global model, metrics
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print(f"Loaded ML model from '{MODEL_PATH}'.")
    else:
        print(f"WARNING: Model file '{MODEL_PATH}' not found. Execute train_model.py first.")

    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH, "r") as f:
            metrics = json.load(f)

load_resources()

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "UP" if model is not None else "MODEL_NOT_LOADED",
        "modelType": metrics.get("model_type", "RandomForestRegressor"),
        "dataMode": metrics.get("data_mode", "SIMULATED"),
        "datasetProvenance": metrics.get("dataset_provenance", "Simulated multi-provider ride dataset"),
        "metrics": metrics.get("ml_metrics", {}),
        "modelsCompared": metrics.get("models_compared", {}),
        "datasetSamples": metrics.get("dataset_samples", 10000),
        "trainTestSplit": metrics.get("train_test_split", "80/20"),
        "sampleEvaluations": metrics.get("sample_evaluations", [])
    })

@app.route("/predict", methods=["POST"])
def predict():
    if model is None:
        return jsonify({"error": "ML model is not loaded"}), 500

    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request body"}), 400

    items = data if isinstance(data, list) else [data]

    records = []
    now = datetime.now()
    default_hour = now.hour
    default_day = now.weekday()

    for item in items:
        hour = int(item.get("hourOfDay", default_hour))
        is_peak = int(item.get("isPeakTime", 1 if (7 <= hour <= 9 or 17 <= hour <= 20) else 0))

        records.append({
            "distance_km": float(item.get("distanceKm", 5.0)),
            "duration_mins": float(item.get("durationMins", 15.0)),
            "provider": str(item.get("provider", "Uber")),
            "ride_type": str(item.get("rideType", "Go")),
            "hour_of_day": hour,
            "day_of_week": int(item.get("dayOfWeek", default_day)),
            "is_peak_time": is_peak,
            "surge_multiplier": float(item.get("surgeMultiplier", 1.0))
        })

    feature_cols = [
        "distance_km", "duration_mins", "provider", "ride_type",
        "hour_of_day", "day_of_week", "is_peak_time", "surge_multiplier"
    ]
    df = pd.DataFrame(records)[feature_cols]
    predictions = model.predict(df)

    results = []
    for idx, item in enumerate(items):
        pred_fare = round(float(predictions[idx]), 2)
        results.append({
            "provider": item.get("provider"),
            "rideType": item.get("rideType"),
            "predictedFare": pred_fare,
            "isMlPrediction": True,
            "pricingNote": "ML PREDICTED"
        })

    return jsonify(results if isinstance(data, list) else results[0])

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
