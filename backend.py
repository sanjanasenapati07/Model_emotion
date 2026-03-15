from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
import uvicorn
import re

app = FastAPI(title="Emotion Detection API", version="0.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class MoodRequest(BaseModel):
    text: str


print("🚀 Loading AI model...")

try:
    classifier = pipeline(
        "text-classification",
        model="./emotion_model",
        top_k=None
    )
    print("✅ Local emotion model loaded")

except Exception:
    print("⚠️ Local model not found, loading fallback model...")
    classifier = pipeline(
        "text-classification",
        model="bhadresh-savani/bert-base-uncased-emotion",
        top_k=None
    )


LABEL_MAP = {
    "LABEL_0": "sadness",
    "LABEL_1": "joy",
    "LABEL_2": "love",
    "LABEL_3": "anger",
    "LABEL_4": "fear",
    "LABEL_5": "surprise",
    "LABEL_6": "neutral"
}


# ---------------- CORE ANALYSIS ----------------

def analyze_text(text):

    try:

        if len(text) > 512:
            text = text[:512]

        results = classifier(text)

        if not results:
            return [{"label": "neutral", "percentage": 100}]

        if isinstance(results[0], list):
            results = results[0]

        breakdown = []

        for res in results:

            label = LABEL_MAP.get(res["label"], res["label"])

            breakdown.append({
                "label": label,
                "score": float(res["score"])
            })

        text_lower = text.lower()

        # --- emotion boosts ---
        if "love" in text_lower or "like" in text_lower or "adore" in text_lower:
            for item in breakdown:
                if item["label"] == "love":
                    item["score"] += 0.15

        if "happy" in text_lower or "excited" in text_lower:
            for item in breakdown:
                if item["label"] == "joy":
                    item["score"] += 0.12

        total = sum(item["score"] for item in breakdown)

        if total == 0:
            return [{"label": "neutral", "percentage": 100}]

        for item in breakdown:
            item["percentage"] = round((item["score"] / total) * 100, 2)
            del item["score"]

        breakdown = sorted(breakdown, key=lambda x: x["percentage"], reverse=True)

        return breakdown

    except Exception:
        return [{"label": "neutral", "percentage": 100}]


# ---------------- API ----------------

@app.get("/")
def home():
    return {"status": "Emotion API running"}


@app.post("/analyze")
async def analyze_mood(request: MoodRequest):

    try:

        raw_text = request.text.strip()

        if raw_text == "":
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        # ---------- FULL TEXT ----------
        breakdown = analyze_text(raw_text)

        if not breakdown:
            return {
                "emotion": "neutral",
                "secondary": None,
                "breakdown": [],
                "timeline": []
            }

        top = breakdown[0]

        second = breakdown[1] if len(breakdown) > 1 else None

        main_emotion = top["label"]

        secondary_emotion = (
            second["label"] if second and second["percentage"] > 20 else None
        )

        # ---------- TIMELINE ----------
        sentences = re.split(r'[.!?]+', raw_text)
        sentences = [s.strip() for s in sentences if s.strip()]

        timeline = []

        for sentence in sentences:

            result = analyze_text(sentence)

            emotion = result[0]["label"] if result else "neutral"

            timeline.append({
                "text": sentence,
                "emotion": emotion
            })

        return {
            "emotion": main_emotion,
            "secondary": secondary_emotion,
            "breakdown": breakdown,
            "timeline": timeline
        }

    except Exception as e:

        return {
            "emotion": "neutral",
            "secondary": None,
            "breakdown": [],
            "timeline": [],
            "error": str(e)
        }


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
