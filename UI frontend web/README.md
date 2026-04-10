# Campaign Intelligence Platform

AI-powered campaign simulator built on your Cummins XGBoost models.

## Setup

### 1. Prerequisites
- Node.js 18+ installed → https://nodejs.org

### 2. Install dependencies
```bash
cd campaign-app
npm install
```

### 3. Add your Cerebras API key
Open the `.env` file and replace the placeholder:
```
VITE_CEREBRAS_API_KEY=your_api_key_here
```
Get your **FREE** key from → https://cloud.cerebras.ai/

**Why Cerebras?**
- ✅ **Completely FREE** tier (no credit card required)
- ✅ Fast inference with Llama 3.1 70B model
- ✅ No usage limits for development

### 4. Run the app
```bash
npm run dev
```

Open your browser at → http://localhost:5173

---

## Project structure

```
campaign-app/
├── src/
│   ├── main.jsx                  # React entry point
│   ├── App.jsx                   # Layout wrapper + header
│   ├── CampaignIntelligence.jsx  # Main 3-step flow component
│   └── index.css                 # Global styles + design tokens
├── .env                          # Your API key (never commit this)
├── index.html
├── package.json
└── vite.config.js
```

## How it works

| Step | What happens |
|------|-------------|
| 1. Campaign Brief | You describe the campaign in natural language |
| 2. Test Data | **Cerebras Llama 3.1 70B** generates 5 synthetic rows matching your XGBoost features |
| 3. Predictions | **Cerebras Llama 3.1 70B** simulates XGBoost regressor (revenue) + classifier (tier) + executive summary |

## Integrating your real trained models

To swap out the simulated predictions with your actual XGBoost models:

1. Export your trained models:
```python
import joblib
joblib.dump(best_model1, 'xgb_regressor.pkl')
joblib.dump(best_model, 'xgb_classifier.pkl')
joblib.dump(scaler, 'scaler.pkl')
```

2. Create a simple Flask/FastAPI endpoint:
```python
@app.post("/predict")
def predict(rows: list):
    df = pd.DataFrame(rows)
    # preprocess + encode same as notebook
    revenue = best_model1.predict(df)
    tier    = best_model.predict(df)
    return {"predictions": [...], "summary": "..."}
```

3. In `CampaignIntelligence.jsx`, replace the second `callCerebras()` call with:
```js
const res = await fetch("http://localhost:8000/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(testData)
});
const parsed = await res.json();
```
