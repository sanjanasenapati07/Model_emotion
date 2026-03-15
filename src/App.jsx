import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis,
  YAxis, Tooltip, ResponsiveContainer, Cell, Legend
} from "recharts";

const THEMES = {
  love: { label: "Love", emoji: "🥰", bgIcon: "💖", c1: "#ffdee9", c2: "#b5fffc", accent: "#be123c", messages: ["Oxytocin levels are likely high. This is a perfect moment to strengthen a meaningful bond.", "Connection is the core of human resilience.", "Scientific data shows expressing love increases long-term well-being."] },
  joy: { label: "Joy", emoji: "😊", bgIcon: "✨", c1: "#fbef9b", c2: "#f5d1b0", accent: "#a16207", messages: ["Your cognitive clarity is peaking. Use this for creative work!", "Success is a series of small wins.", "Neuroplasticity thrives in positive states."] },
  anger: { label: "Anger", emoji: "😡", bgIcon: "🔥", c1: "#fecaca", c2: "#f87171", accent: "#991b1b", messages: ["Energy is neutral, but use it wisely. Channel intensity into focus.", "Recalibrate your nervous system with deep breaths.", "Anger is often a protector of boundaries."] },
  sadness: { label: "Sadness", emoji: "😢", bgIcon: "💧", c1: "#bfdbfe", c2: "#60a5fa", accent: "#1e40af", messages: ["Even complex systems need downtime. Be patient today.", "Reflection is the foundation of wisdom.", "This state is temporary. A walk can reset your baseline."] },
  surprise: { label: "Surprise", emoji: "😲", bgIcon: "⚡", c1: "#e9d5ff", c2: "#c084fc", accent: "#7e22ce", messages: ["Novelty detected! Your brain is in a state of rapid learning.", "The unexpected is just uncategorized data.", "Shock is the first step toward discovery."] },
  fear: { label: "Fear", emoji: "😨", bgIcon: "👻", c1: "#e2e8f0", c2: "#64748b", accent: "#1e293b", messages: ["Your system is in alert mode. Focus on what you can control.", "Bravery is the choice to move forward anyway.", "Ground yourself: Name five things you see."] },
  neutral: { label: "Neutral", emoji: "😐", bgIcon: "☁️", c1: "#f1f5f9", c2: "#e2e8f0", accent: "#475569", messages: ["Optimal baseline reached. Ideal for deep work.", "Stability is a superpower.", "Maintain equilibrium for exponential results."] }
};

const sanitizeInput = (text) => {

  if (!text) return "";

  let cleaned = text;

  cleaned = cleaned.normalize("NFKC");
  cleaned = cleaned.replace(/<[^>]*>/g, "");
  cleaned = cleaned.replace(/javascript:/gi, "");
  cleaned = cleaned.replace(/on\w+\s*=/gi, "");
  cleaned = cleaned.replace(/[\u0000-\u001F\u007F]/g, "");
  cleaned = cleaned.replace(/ \t+/g, " ");

  return cleaned;
};

export default function App() {

  const [cards, setCards] = useState([
    { id: 1, text: "", emotion: "neutral", isAnalyzing: false, message: "", breakdown: [] }
  ]);

  const typingTimeoutRef = useRef(null);

  const getRandomMessage = (emotion) => {
    const msgs = THEMES[emotion]?.messages || THEMES.neutral.messages;
    return msgs[Math.floor(Math.random() * msgs.length)];
  };

  const addCard = () => {

    setCards([
      { id: Date.now(), text: "", emotion: "neutral", isAnalyzing: false, message: "", breakdown: [] },
      ...cards
    ]);
  };

  const handleInput = (id, text) => {

  // store raw text (no sanitization here)
  setCards(prev =>
    prev.map(c =>
      c.id === id
        ? { ...c, text: text }
        : c
    )
  );

  // reset emotion if cleared
  if (text.trim().length === 0) {
    setCards(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, emotion: "neutral", message: "", breakdown: [] }
          : c
      )
    );
    return;
  }

  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

  const hasPunctuation = /[.!?]$/.test(text.trim());

  if (hasPunctuation && text.trim().length > 3) {

    typingTimeoutRef.current = setTimeout(async () => {

      setCards(prev =>
        prev.map(c =>
          c.id === id ? { ...c, isAnalyzing: true } : c
        )
      );

      try {

        // sanitize ONLY before sending to backend
        const safeText = sanitizeInput(text);

        const response = await fetch("http://127.0.0.1:8000/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: safeText })
        });

        if (!response.ok) throw new Error("Backend error");

        const data = await response.json();

        let emotion = "neutral";
        if (data && data.emotion) emotion = data.emotion.toLowerCase();
        if (!THEMES[emotion]) emotion = "neutral";

        const safeBreakdown = Array.isArray(data.breakdown) ? data.breakdown : [];

        setCards(prev =>
          prev.map(c =>
            c.id === id
              ? {
                  ...c,
                  emotion: emotion,
                  isAnalyzing: false,
                  message: getRandomMessage(emotion),
                  breakdown: safeBreakdown
                }
              : c
          )
        );

      } catch {

        setCards(prev =>
          prev.map(c =>
            c.id === id
              ? { ...c, emotion: "neutral", isAnalyzing: false }
              : c
          )
        );

      }

    }, 400);
  }
};

  const current = THEMES[cards[0]?.emotion] || THEMES.neutral;

  useEffect(() => {

    document.documentElement.style.setProperty('--color-1', current.c1);
    document.documentElement.style.setProperty('--color-2', current.c2);

  }, [current]);

  return (

    <div className="vibe-mesh-app">

      <div className="mesh-bg" />

      <div className="floating-elements">

        <div className="float-icon" style={{ top: '10%', left: '5%' }}>
          {current.bgIcon}
        </div>

        <div className="float-icon" style={{ bottom: '15%', right: '5%', animationDelay: '-4s' }}>
          {current.bgIcon}
        </div>

      </div>

      <div className="dashboard-container" style={{ maxWidth: '950px', margin: '0 auto', padding: '80px 20px' }}>

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px' }}>

          <div>
            <h1 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-3px', margin: 0 }}>
              Emotion Detector
            </h1>

            <p style={{ margin: 0, opacity: 0.6, fontWeight: 700 }}>
              Empirical approach for emotional representation
            </p>
          </div>

          <button onClick={addCard} className="new-card-btn">
            <span style={{ fontSize: '1.4rem', fontWeight: '900' }}>＋</span> New Card
          </button>

        </header>

        <div className="stack">

          {cards.map(card => {

            const theme = THEMES[card.emotion] || THEMES.neutral;

            return (

              <div key={card.id} className="mood-card" style={{ borderLeft: `8px solid ${theme.accent}` }}>

                <span className="badge" style={{ background: theme.accent }}>
                  {theme.emoji} {card.isAnalyzing ? "Analyzing..." : theme.label}
                </span>

                <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', marginTop: '10px' }}>

                  <textarea
                    style={{ flex: 1, minHeight: '120px' }}
                    placeholder="Finish your sentence (. ! ?) to analyze..."
                    value={card.text}
                    onChange={(e) => handleInput(card.id, e.target.value)}
                  />

                  {card.breakdown && card.breakdown.length > 0 && !card.isAnalyzing && (

                    <div style={{
                      width: '240px',
                      padding: '15px',
                      background: 'rgba(255,255,255,0.15)',
                      borderRadius: '16px',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.2)'
                    }}>

                      <p style={{ fontSize: '0.65rem', fontWeight: 900, marginBottom: '12px', opacity: 0.5 }}>
                        Emotion Graph
                      </p>

                      <div style={{ width: "100%", height: 140 }}>

                        <ResponsiveContainer>

                          <BarChart data={[...card.breakdown].sort((a, b) => b.percentage - a.percentage)}>

                            <XAxis dataKey="label" hide />
                            <YAxis hide domain={[0, 100]} />

                            <Tooltip formatter={(value) => `${Math.round(value)}%`} />

                            <Legend verticalAlign="bottom" height={20} />

                            <Bar dataKey="percentage" radius={[6, 6, 0, 0]} animationDuration={1200}>

                              {[...card.breakdown]
                                .sort((a, b) => b.percentage - a.percentage)
                                .map((entry, index) => (

                                  <Cell
                                    key={index}
                                    fill={THEMES[entry.label]?.accent || "#8884d8"}
                                  />

                                ))}

                            </Bar>

                          </BarChart>

                        </ResponsiveContainer>

                      </div>

                      {/* DISTRIBUTION BARS RESTORED */}

                      <p style={{ fontSize: '0.65rem', fontWeight: 900, marginTop: '12px', marginBottom: '12px', opacity: 0.5 }}>
                        Distributions
                      </p>

                      {card.breakdown.map((item) => (

                        <div key={item.label} style={{ marginBottom: '10px' }}>

                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            marginBottom: '4px'
                          }}>
                            <span style={{ textTransform: 'capitalize' }}>{item.label}</span>
                            <span>{Math.round(item.percentage)}%</span>
                          </div>

                          <div style={{
                            background: 'rgba(0,0,0,0.06)',
                            height: '6px',
                            borderRadius: '10px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${item.percentage}%`,
                              height: '100%',
                              background: THEMES[item.label]?.accent || theme.accent,
                              transition: 'width 1.2s'
                            }} />
                          </div>

                        </div>

                      ))}

                    </div>

                  )}

                </div>

                {card.message && !card.isAnalyzing && (
                  <div style={{ borderLeft: `4px solid ${theme.accent}`, color: theme.accent, marginTop: '15px', padding: '10px' }}>
                    {card.message}
                  </div>
                )}

              </div>
            );
          })}

        </div>

      </div>

    </div>

  );
}

