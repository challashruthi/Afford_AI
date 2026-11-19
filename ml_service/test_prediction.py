import os
import joblib
import pandas as pd

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "fare_model.pkl")

def test_predictions():
    if not os.path.exists(MODEL_PATH):
        print("Model file not found!")
        return

    model = joblib.load(MODEL_PATH)

    # Test Cases verifying different providers winning under varied conditions (Peak and Non-Peak)
    scenarios = [
        {
            "name": "Short Distance Bike Trip (Off-Peak, 14:00, 1.0x Surge)",
            "items": [
                {'distance_km': 2.5, 'duration_mins': 7, 'provider': 'Pink Bike', 'ride_type': 'Bike', 'hour_of_day': 14, 'day_of_week': 2, 'is_peak_time': 0, 'surge_multiplier': 1.0},
                {'distance_km': 2.5, 'duration_mins': 7, 'provider': 'Rapido', 'ride_type': 'Bike', 'hour_of_day': 14, 'day_of_week': 2, 'is_peak_time': 0, 'surge_multiplier': 1.0},
                {'distance_km': 2.5, 'duration_mins': 7, 'provider': 'Ola', 'ride_type': 'Bike', 'hour_of_day': 14, 'day_of_week': 2, 'is_peak_time': 0, 'surge_multiplier': 1.0},
                {'distance_km': 2.5, 'duration_mins': 7, 'provider': 'Uber', 'ride_type': 'Moto', 'hour_of_day': 14, 'day_of_week': 2, 'is_peak_time': 0, 'surge_multiplier': 1.0},
            ]
        },
        {
            "name": "Medium Distance Auto Trip (Off-Peak, 11:30, 1.0x Surge)",
            "items": [
                {'distance_km': 7.5, 'duration_mins': 20, 'provider': 'Rapido', 'ride_type': 'Auto', 'hour_of_day': 11, 'day_of_week': 3, 'is_peak_time': 0, 'surge_multiplier': 1.0},
                {'distance_km': 7.5, 'duration_mins': 20, 'provider': 'Ola', 'ride_type': 'Auto', 'hour_of_day': 11, 'day_of_week': 3, 'is_peak_time': 0, 'surge_multiplier': 1.0},
                {'distance_km': 7.5, 'duration_mins': 20, 'provider': 'Uber', 'ride_type': 'Auto', 'hour_of_day': 11, 'day_of_week': 3, 'is_peak_time': 0, 'surge_multiplier': 1.0},
            ]
        },
        {
            "name": "Morning Peak Hour Rush (08:30, 1.35x Surge)",
            "items": [
                {'distance_km': 8.0, 'duration_mins': 25, 'provider': 'Rapido', 'ride_type': 'Auto', 'hour_of_day': 8, 'day_of_week': 1, 'is_peak_time': 1, 'surge_multiplier': 1.35},
                {'distance_km': 8.0, 'duration_mins': 25, 'provider': 'Ola', 'ride_type': 'Auto', 'hour_of_day': 8, 'day_of_week': 1, 'is_peak_time': 1, 'surge_multiplier': 1.35},
                {'distance_km': 8.0, 'duration_mins': 25, 'provider': 'Uber', 'ride_type': 'Auto', 'hour_of_day': 8, 'day_of_week': 1, 'is_peak_time': 1, 'surge_multiplier': 1.35},
            ]
        },
        {
            "name": "Evening High Demand Peak Cab Trip (18:30, 1.5x Surge)",
            "items": [
                {'distance_km': 18.0, 'duration_mins': 42, 'provider': 'Rapido', 'ride_type': 'Cab Economy', 'hour_of_day': 18, 'day_of_week': 4, 'is_peak_time': 1, 'surge_multiplier': 1.5},
                {'distance_km': 18.0, 'duration_mins': 42, 'provider': 'Ola', 'ride_type': 'Mini', 'hour_of_day': 18, 'day_of_week': 4, 'is_peak_time': 1, 'surge_multiplier': 1.5},
                {'distance_km': 18.0, 'duration_mins': 42, 'provider': 'Uber', 'ride_type': 'Go', 'hour_of_day': 18, 'day_of_week': 4, 'is_peak_time': 1, 'surge_multiplier': 1.5},
            ]
        },
        {
            "name": "Direct Comparison: 10km Uber Go (Off-Peak vs Evening Peak)",
            "items": [
                {'distance_km': 10.0, 'duration_mins': 22, 'provider': 'Uber', 'ride_type': 'Go', 'hour_of_day': 14, 'day_of_week': 3, 'is_peak_time': 0, 'surge_multiplier': 1.0},
                {'distance_km': 10.0, 'duration_mins': 32, 'provider': 'Uber', 'ride_type': 'Go', 'hour_of_day': 18, 'day_of_week': 3, 'is_peak_time': 1, 'surge_multiplier': 1.5},
            ]
        }
    ]

    print("\n==================================================")
    print("      ML FARE PREDICTION MULTI-PROVIDER SCENARIOS ")
    print("==================================================")
    feature_cols = [
        'distance_km', 'duration_mins', 'provider', 'ride_type',
        'hour_of_day', 'day_of_week', 'is_peak_time', 'surge_multiplier'
    ]

    for sc in scenarios:
        print(f"\n--- Scenario: {sc['name']} ---")
        df = pd.DataFrame(sc['items'])
        if 'is_peak_time' not in df.columns:
            df['is_peak_time'] = df['hour_of_day'].apply(lambda h: 1 if (7 <= h <= 9 or 17 <= h <= 20) else 0)
        df = df[feature_cols]

        preds = model.predict(df)
        results = []
        for item, pred in zip(sc['items'], preds):
            rounded = round(float(pred), 2)
            results.append((item['provider'], item['ride_type'], rounded, item.get('surge_multiplier', 1.0), item.get('is_peak_time', 0)))
            peak_str = "PEAK" if item.get('is_peak_time') == 1 else "OFF-PEAK"
            print(f"  {item['provider']:<10} {item['ride_type']:<12} [{peak_str}, {item.get('surge_multiplier')}x] -> Predicted ML Fare: Rs.{rounded:.2f}")

        # Find winner / compare
        if len(results) > 1:
            winner = min(results, key=lambda x: x[2])
            sorted_res = sorted(results, key=lambda x: x[2])
            second = sorted_res[1]
            savings = round(second[2] - winner[2], 2)
            print(f"  --> LOWEST FARE: {winner[0]} {winner[1]} (Rs.{winner[2]:.2f}) | Savings vs 2nd lowest: Rs.{savings:.2f}")
    print("==================================================\n")

if __name__ == "__main__":
    test_predictions()
