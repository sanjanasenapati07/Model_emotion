from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
import uvicorn
import re

app = FastAPI(title="Emotion Detection API", version="0.4.0")

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
except:
    print("Local model not found, loading fallback model...")
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


def analyze_text(text):

    results = classifier(text)

    if isinstance(results[0], list):
        results = results[0]

    breakdown = []

    for res in results:
        label = LABEL_MAP.get(res["label"], res["label"])

        breakdown.append({
            "label": label,
            "score": res["score"]
        })

    text_lower = text.lower()

    # --- small emotion boosts ---
    if "love" in text_lower or "like" in text_lower or "adore" in text_lower:
        for item in breakdown:
            if item["label"] == "love":
                item["score"] += 0.15

    if "happy" in text_lower or "so much" in text_lower or "excited" in text_lower:
        for item in breakdown:
            if item["label"] == "joy":
                item["score"] += 0.12

    # normalize
    total = sum(item["score"] for item in breakdown)

    for item in breakdown:
        item["percentage"] = round((item["score"] / total) * 100, 2)
        del item["score"]

    breakdown = sorted(breakdown, key=lambda x: x["percentage"], reverse=True)

    return breakdown


@app.post("/analyze")
async def analyze_mood(request: MoodRequest):

    try:
        raw_text = request.text.strip()

        if raw_text == "":
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        # ---------- FULL TEXT ANALYSIS ----------
        breakdown = analyze_text(raw_text)

        top = breakdown[0]
        second = breakdown[1]

        main_emotion = top["label"]
        secondary_emotion = second["label"] if second["percentage"] > 20 else None

        # ---------- TIMELINE ANALYSIS ----------
        sentences = re.split(r'[.!?]+', raw_text)
        sentences = [s.strip() for s in sentences if s.strip()]

        timeline = []

        for sentence in sentences:
            result = analyze_text(sentence)

            timeline.append({
                "text": sentence,
                "emotion": result[0]["label"]
            })

        return {
            "emotion": main_emotion,      # frontend will use this
            "secondary": secondary_emotion,
            "breakdown": breakdown,
            "timeline": timeline
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)