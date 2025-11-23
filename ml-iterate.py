#!/usr/bin/env python3
"""
ML Model Iteration Script for ShadowCheck Threat Detection
Tests multiple algorithms with hyperparameter tuning
"""

import psycopg2
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
import json
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

MIN_VALID_TIMESTAMP = 946684800000  # Jan 1, 2000

class ThreatMLIterator:
    def __init__(self):
        self.conn = psycopg2.connect(
            user=os.getenv('DB_USER'),
            host=os.getenv('DB_HOST'),
            database=os.getenv('DB_NAME'),
            password=os.getenv('DB_PASSWORD'),
            port=os.getenv('DB_PORT')
        )
        self.scaler = StandardScaler()
        self.results = []
        
    def fetch_training_data(self):
        """Fetch tagged networks with features"""
        query = f"""
        WITH home_location AS (
            SELECT location_point::geography as home_point
            FROM app.location_markers
            WHERE marker_type = 'home'
            LIMIT 1
        )
        SELECT
            nt.bssid,
            nt.tag_type,
            n.type,
            COUNT(DISTINCT l.unified_id) as observation_count,
            COUNT(DISTINCT DATE(to_timestamp(l.time / 1000.0))) as unique_days,
            COUNT(DISTINCT ST_SnapToGrid(ST_SetSRID(ST_MakePoint(l.lon, l.lat), 4326)::geometry, 0.001)) as unique_locations,
            MAX(l.level) as max_signal,
            MAX(ST_Distance(
                ST_SetSRID(ST_MakePoint(l.lon, l.lat), 4326)::geography,
                h.home_point
            )) / 1000.0 - MIN(ST_Distance(
                ST_SetSRID(ST_MakePoint(l.lon, l.lat), 4326)::geography,
                h.home_point
            )) / 1000.0 as distance_range_km,
            BOOL_OR(ST_Distance(
                ST_SetSRID(ST_MakePoint(l.lon, l.lat), 4326)::geography,
                h.home_point
            ) < 100)::int as seen_at_home,
            BOOL_OR(ST_Distance(
                ST_SetSRID(ST_MakePoint(l.lon, l.lat), 4326)::geography,
                h.home_point
            ) > 500)::int as seen_away_from_home
        FROM app.network_tags nt
        JOIN app.networks_legacy n ON nt.bssid = n.bssid
        JOIN app.locations_legacy l ON n.bssid = l.bssid
        CROSS JOIN home_location h
        WHERE nt.tag_type IN ('THREAT', 'FALSE_POSITIVE')
            AND l.lat IS NOT NULL AND l.lon IS NOT NULL
            AND l.time >= {MIN_VALID_TIMESTAMP}
        GROUP BY nt.bssid, nt.tag_type, n.type
        """
        
        df = pd.read_sql_query(query, self.conn)
        print(f"✓ Fetched {len(df)} tagged networks")
        print(f"  THREAT: {(df['tag_type'] == 'THREAT').sum()}")
        print(f"  FALSE_POSITIVE: {(df['tag_type'] == 'FALSE_POSITIVE').sum()}")
        return df
    
    def prepare_features(self, df):
        """Extract and scale features"""
        feature_cols = ['distance_range_km', 'unique_days', 'observation_count', 
                       'max_signal', 'unique_locations', 'seen_at_home', 'seen_away_from_home']
        
        X = df[feature_cols].fillna(0).values
        y = (df['tag_type'] == 'THREAT').astype(int).values
        
        return X, y, feature_cols
    
    def test_logistic_regression(self, X_train, X_test, y_train, y_test):
        """Test Logistic Regression with hyperparameter tuning"""
        print("\n🔍 Testing Logistic Regression...")
        
        param_grid = {
            'C': [0.01, 0.1, 1, 10, 100],
            'penalty': ['l2'],
            'max_iter': [1000]
        }
        
        model = GridSearchCV(LogisticRegression(random_state=42), param_grid, cv=5, scoring='roc_auc')
        model.fit(X_train, y_train)
        
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)[:, 1]
        
        return {
            'name': 'Logistic Regression',
            'model': model.best_estimator_,
            'params': model.best_params_,
            'accuracy': model.score(X_test, y_test),
            'roc_auc': roc_auc_score(y_test, y_proba),
            'cv_score': model.best_score_,
            'predictions': y_pred,
            'probabilities': y_proba
        }
    
    def test_random_forest(self, X_train, X_test, y_train, y_test):
        """Test Random Forest with hyperparameter tuning"""
        print("\n🌲 Testing Random Forest...")
        
        param_grid = {
            'n_estimators': [50, 100, 200],
            'max_depth': [3, 5, 7, None],
            'min_samples_split': [2, 5, 10]
        }
        
        model = GridSearchCV(RandomForestClassifier(random_state=42), param_grid, cv=5, scoring='roc_auc')
        model.fit(X_train, y_train)
        
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)[:, 1]
        
        return {
            'name': 'Random Forest',
            'model': model.best_estimator_,
            'params': model.best_params_,
            'accuracy': model.score(X_test, y_test),
            'roc_auc': roc_auc_score(y_test, y_proba),
            'cv_score': model.best_score_,
            'predictions': y_pred,
            'probabilities': y_proba,
            'feature_importance': model.best_estimator_.feature_importances_
        }
    
    def test_gradient_boosting(self, X_train, X_test, y_train, y_test):
        """Test Gradient Boosting with hyperparameter tuning"""
        print("\n⚡ Testing Gradient Boosting...")
        
        param_grid = {
            'n_estimators': [50, 100, 200],
            'learning_rate': [0.01, 0.1, 0.2],
            'max_depth': [3, 5, 7]
        }
        
        model = GridSearchCV(GradientBoostingClassifier(random_state=42), param_grid, cv=5, scoring='roc_auc')
        model.fit(X_train, y_train)
        
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)[:, 1]
        
        return {
            'name': 'Gradient Boosting',
            'model': model.best_estimator_,
            'params': model.best_params_,
            'accuracy': model.score(X_test, y_test),
            'roc_auc': roc_auc_score(y_test, y_proba),
            'cv_score': model.best_score_,
            'predictions': y_pred,
            'probabilities': y_proba,
            'feature_importance': model.best_estimator_.feature_importances_
        }
    
    def run_iteration(self):
        """Run full ML iteration pipeline"""
        print("🤖 Starting ML Model Iteration\n")
        
        # Fetch data
        df = self.fetch_training_data()
        
        if len(df) < 10:
            print(f"❌ Need at least 10 tagged networks, found {len(df)}")
            return None
        
        # Prepare features
        X, y, feature_names = self.prepare_features(df)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42, stratify=y
        )
        
        print(f"\n📊 Dataset Split:")
        print(f"  Training: {len(X_train)} samples")
        print(f"  Testing: {len(X_test)} samples")
        
        # Test all models
        results = []
        
        lr_result = self.test_logistic_regression(X_train, X_test, y_train, y_test)
        results.append(lr_result)
        print(f"  ✓ Accuracy: {lr_result['accuracy']:.3f}, ROC-AUC: {lr_result['roc_auc']:.3f}")
        
        rf_result = self.test_random_forest(X_train, X_test, y_train, y_test)
        results.append(rf_result)
        print(f"  ✓ Accuracy: {rf_result['accuracy']:.3f}, ROC-AUC: {rf_result['roc_auc']:.3f}")
        
        gb_result = self.test_gradient_boosting(X_train, X_test, y_train, y_test)
        results.append(gb_result)
        print(f"  ✓ Accuracy: {gb_result['accuracy']:.3f}, ROC-AUC: {gb_result['roc_auc']:.3f}")
        
        # Find best model
        best_result = max(results, key=lambda x: x['roc_auc'])
        
        print(f"\n🏆 Best Model: {best_result['name']}")
        print(f"  ROC-AUC: {best_result['roc_auc']:.3f}")
        print(f"  Accuracy: {best_result['accuracy']:.3f}")
        print(f"  Best Params: {best_result['params']}")
        
        # Classification report
        print(f"\n📈 Classification Report ({best_result['name']}):")
        print(classification_report(y_test, best_result['predictions'], 
                                   target_names=['Safe', 'Threat']))
        
        # Feature importance (if available)
        if 'feature_importance' in best_result:
            print("\n🎯 Feature Importance:")
            for name, importance in zip(feature_names, best_result['feature_importance']):
                print(f"  {name}: {importance:.4f}")
        
        # Save results
        self.save_results(best_result, feature_names, results)
        
        return best_result
    
    def save_results(self, best_result, feature_names, all_results):
        """Save iteration results to file"""
        output = {
            'timestamp': datetime.now().isoformat(),
            'best_model': best_result['name'],
            'best_params': best_result['params'],
            'roc_auc': float(best_result['roc_auc']),
            'accuracy': float(best_result['accuracy']),
            'cv_score': float(best_result['cv_score']),
            'feature_names': feature_names,
            'all_results': [
                {
                    'name': r['name'],
                    'params': r['params'],
                    'roc_auc': float(r['roc_auc']),
                    'accuracy': float(r['accuracy'])
                }
                for r in all_results
            ]
        }
        
        with open('ml_iteration_results.json', 'w') as f:
            json.dump(output, f, indent=2)
        
        print(f"\n💾 Results saved to ml_iteration_results.json")
    
    def close(self):
        self.conn.close()

if __name__ == '__main__':
    iterator = ThreatMLIterator()
    try:
        iterator.run_iteration()
    finally:
        iterator.close()
