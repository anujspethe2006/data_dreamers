import pickle
import traceback

print("Trying to load...")
try:
    with open('campaign_models_bundle.pkl', 'rb') as f:
        model = pickle.load(f)
    print("Type:", type(model))
    if isinstance(model, dict):
        print("Keys:", model.keys())
        for k, v in model.items():
            print(f"Key {k} has type {type(v)}")
    elif hasattr(model, 'feature_names_in_'):
        print("Feature names:", model.feature_names_in_)
except Exception as e:
    print("Error:", e)
    traceback.print_exc()
