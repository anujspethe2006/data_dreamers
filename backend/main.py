import os
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
import pickle
import pandas as pd
import traceback

# ==========================================
# ML MODEL CONFIGURATION
# ==========================================
ml_models = {}

def load_ml_models():
    try:
        print("Loading ML model from campaign_models_bundle.pkl...")
        with open("campaign_models_bundle.pkl", "rb") as f:
            bundle = pickle.load(f)
            ml_models["revenue_predictor"] = bundle.get("revenue_predictor")
            ml_models["performance_classifier"] = bundle.get("performance_classifier")
            ml_models["metadata"] = bundle.get("metadata", {})
        print("ML model loaded successfully.")
    except Exception as e:
        print(f"Error loading ML model: {e}")

load_ml_models()

# ==========================================
# 1. DATABASE & MODELS (All in one)
# ==========================================
SQLALCHEMY_DATABASE_URL = "sqlite:///./campaigns.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class CampaignEntry(Base):
    __tablename__ = "campaign_history"
    id = Column(Integer, primary_key=True, index=True)
    user_prompt = Column(String)
    channel = Column(String)
    region = Column(String)
    revenue = Column(Float)
    tier = Column(String)
    custom_note = Column(String, nullable=True)

# Create the DB file immediately
Base.metadata.create_all(bind=engine)

# ==========================================
# 2. SCHEMAS (Pydantic)
# ==========================================
class CampaignSaveRequest(BaseModel):
    user_prompt: str
    channel: str
    region: str
    revenue: float
    tier: str
    custom_note: Optional[str] = None

class CampaignResponse(CampaignSaveRequest):
    id: int
    class Config:
        from_attributes = True

class PredictRequest(BaseModel):
    # Depending on what the frontend passes, we optionally accept the feature inputs here
    channel: Optional[str] = None
    region: Optional[str] = None
    device_type: Optional[str] = None
    audience_segment: Optional[str] = None
    campaign_objective: Optional[str] = None
    impressions: Optional[float] = None
    clicks: Optional[float] = None
    ctr_pct: Optional[float] = None
    spend_usd: Optional[float] = None
    conversions: Optional[float] = None
    conversion_rate_pct: Optional[float] = None
    bounce_rate_pct: Optional[float] = None
    session_duration_sec: Optional[float] = None
    audience_age: Optional[str] = None
    ad_quality_score: Optional[float] = None
    predicted_revenue_usd: Optional[float] = None
    day_of_week: Optional[str] = None
    performance_segment: Optional[str] = None
    engagement_score: Optional[float] = None
    day: Optional[str] = None

    class Config:
        extra = "allow"

class PredictResponse(BaseModel):
    predicted_revenue_usd: Optional[float] = None
    predicted_performance_tier_index: Optional[int] = None
    status: str

# ==========================================
# 3. FASTAPI APP & ROUTES
# ==========================================
app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/save-campaign", response_model=CampaignResponse)
def save_campaign(request: CampaignSaveRequest, db: Session = Depends(get_db)):
    db_entry = CampaignEntry(**request.dict())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@app.get("/my-campaigns", response_model=List[CampaignResponse])
def get_my_campaigns(db: Session = Depends(get_db)):
    return db.query(CampaignEntry).order_by(CampaignEntry.id.desc()).all()

@app.get("/health")
def health():
    return {"status": "online", "db_path": os.path.abspath("campaigns.db")}

@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    if not ml_models.get("revenue_predictor") or not ml_models.get("performance_classifier"):
        raise HTTPException(status_code=500, detail="Models are not loaded on the server.")

    try:
        input_data = request.dict(exclude_none=True)
        # Capture strictly dynamic extra fields for newer pydantic versions
        if hasattr(request, '__pydantic_extra__') and request.__pydantic_extra__:
            input_data.update(request.__pydantic_extra__)
            
        print(f"Running prediction with input data: {input_data}")

        df = pd.DataFrame([input_data])
        
        regressor = ml_models["revenue_predictor"]
        classifier = ml_models["performance_classifier"]
        meta_reg = ml_models["metadata"].get("regressor", {})
        meta_clf = ml_models["metadata"].get("classifier", {})

        rev_pred = None
        tier_pred = None

        # Predict Revenue
        try:
            reg_features = meta_reg.get("feature_names", [])
            df_reg = df.reindex(columns=reg_features)
            for col in meta_reg.get("categorical_features", []):
                df_reg[col] = df_reg[col].astype("category")
            rev_pred = float(regressor.predict(df_reg)[0])
        except Exception as e:
            print(f"Warning: Revenue prediction failed: {e}")

        # Predict Performance Tier
        try:
            clf_features = meta_clf.get("feature_names", [])
            if "predicted_revenue_usd" in clf_features and "predicted_revenue_usd" not in df.columns:
                df["predicted_revenue_usd"] = rev_pred

            df_clf = df.reindex(columns=clf_features)
            for col in meta_clf.get("categorical_features", []):
                df_clf[col] = df_clf[col].astype("category")
            tier_pred = int(classifier.predict(df_clf)[0])
        except Exception as e:
            print(f"Warning: Performance classification failed: {e}")

        if rev_pred is None and tier_pred is None:
         return {
        "predicted_revenue_usd": 1000.0,
        "predicted_performance_tier_index": 1,
        "status": "fallback_prediction"
    }
        print(f"Prediction Success - Revenue: {rev_pred}, Tier: {tier_pred}")
        return PredictResponse(
            predicted_revenue_usd=rev_pred,
            predicted_performance_tier_index=tier_pred,
            status="success"
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))