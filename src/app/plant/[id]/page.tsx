"use client";

import { useEffect, useState, use, useCallback, useRef, useMemo } from "react";
import { ArrowLeft, Sparkles, Rocket, AlertTriangle, Clock, ChevronLeft, ChevronRight, X, BrainCircuit, RefreshCcw } from "lucide-react";

import { useRouter } from "next/navigation";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { PotCard, SoilCard, SeedCard, NutritionCard } from "@/components/planting-setup/Cards";
import { ShoppingList } from "@/components/planting-setup/ShoppingList";
import { generateAIExplanation } from "@/utils/ai-placeholders";
import type { PlantSetup, Difficulty } from "@/types/plant";
import styles from "./carousel.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const difficultyColors: Record<string, string> = {
  easy: "badge-easy",
  medium: "badge-medium",
  hard: "badge-hard",
  Easy: "badge-easy",
  Medium: "badge-medium",
  Hard: "badge-hard",
};

const formatDifficulty = (d: string) => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();

function normalizeExplanationText(text: string): string {
  return text
    .replace(/\bpt\b\s*:/gi, "Pot:")
    .replace(/\bpt\b/gi, "Pot")
    .replace(/\bpotting\s*:/gi, "Pot:")
    .replace(/\bsoil\s*:/gi, "Soil:")
    .replace(/\bseed\s*:/gi, "Seed:")
    .replace(/\bnutrition\s*:/gi, "Nutrition:")
    .replace(/\bnutri\w*\s*:/gi, "Nutrition:");
}

// ── Typing Effect Component ──
function TypingEffect({ text, speed = 10, onUpdate }: { text: string; speed?: number; onUpdate?: () => void }) {
  const [displayedText, setDisplayedText] = useState("");
  const normalizedText = normalizeExplanationText(text);

  useEffect(() => {
    setDisplayedText("");
    let index = 0;
    const interval = setInterval(() => {
      if (index < normalizedText.length) {
        setDisplayedText((prev) => prev + normalizedText.charAt(index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [normalizedText, speed]);

  // Notify parent when text updates (for auto-scroll)
  useEffect(() => {
    if (onUpdate) onUpdate();
  }, [displayedText, onUpdate]);

  const paragraphs = displayedText
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className={styles['ai-text']}>
      {paragraphs.length > 0 ? (
        paragraphs.map((paragraph, index) => (
          <p key={index} className={styles['ai-text-paragraph']}>
            {paragraph}
          </p>
        ))
      ) : (
        <p className={styles['ai-text-paragraph']}>{displayedText}</p>
      )}
    </div>
  );
}

function ExplanationText({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className={styles['ai-text']}>
      {paragraphs.length > 0 ? (
        paragraphs.map((paragraph, index) => (
          <p key={index} className={styles['ai-text-paragraph']}>
            {paragraph}
          </p>
        ))
      ) : (
        <p className={styles['ai-text-paragraph']}>{text}</p>
      )}
    </div>
  );
}


const PLAN_TYPES = ["Budget", "Balanced", "Premium"] as const;

interface AIPlan extends PlantSetup {
  plan_type: "Budget" | "Balanced" | "Premium";
  cost?: number;
  currency?: string;
}

export default function PlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [plans, setPlans] = useState<AIPlan[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [skipTypingEffect, setSkipTypingEffect] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const explanationCacheRef = useRef<Map<string, string>>(new Map());

  const handleAutoScroll = useCallback(() => {
    if (modalBodyRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = modalBodyRef.current;
      // If user is within 100px of the bottom, keep following the text
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      if (isNearBottom) {
        modalBodyRef.current.scrollTo({
          top: scrollHeight,
          behavior: "smooth"
        });
      }
    }
  }, []);


  // ── Fetch base plant first, then AI plans in background ──
  useEffect(() => {
    const fetchPlant = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/plants/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("not_found");
          } else {
            setError("server_error");
          }
          return;
        }
        const data: PlantSetup = await res.json();

        // Immediately render with base plant as Budget (available before AI finishes)
        setPlans([{ ...data, plan_type: "Budget" }]);
        setLoading(false);

        // Now fetch AI plans in background
        setAiLoading(true);
        try {
          const aiRes = await fetch(`${API_URL}/api/plants/${id}/ai-plans`);
          if (aiRes.ok) {
            const aiPlans: AIPlan[] = await aiRes.json();
            if (Array.isArray(aiPlans) && aiPlans.length === 3) {
              setPlans(aiPlans);
              setCurrentIndex(0);
            }
          }
        } catch {
          // AI fetch failed — keep base plant, no crash
          console.warn("[UI] AI plans fetch failed, using base plant.");
        } finally {
          setAiLoading(false);
        }
      } catch {
        setError("network_error");
      } finally {
        setLoading(false);
      }
    };
    fetchPlant();
  }, [id]);

  // ── Carousel Navigation (round-robin) ──
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % plans.length);
  }, [plans.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + plans.length) % plans.length);
  }, [plans.length]);

  const currentPlan = plans[currentIndex] || null;
  const planIndexByType = useMemo(() => {
    const map = new Map<AIPlan["plan_type"], number>();
    plans.forEach((plan, index) => map.set(plan.plan_type, index));
    return map;
  }, [plans]);
  const isAiPlansReady = PLAN_TYPES.every((type) => planIndexByType.has(type));
  const activePlanType: AIPlan["plan_type"] = currentPlan?.plan_type || "Budget";

  const handleAIExplain = async () => {
    if (!currentPlan) return;

    const cacheKey = `${id}-${currentPlan.plan_type}`;
    const cachedExplanation = explanationCacheRef.current.get(cacheKey);

    if (cachedExplanation) {
      setSkipTypingEffect(true);
      setExplanation(cachedExplanation);
      setShowModal(true);
      setIsExplaining(false);
      return;
    }

    setSkipTypingEffect(false);
    setExplanation(""); // Reset
    setIsExplaining(true);
    setShowModal(true);

    try {
      const res = await fetch(`${API_URL}/api/plants/${id}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: currentPlan }),
      });

      if (res.ok) {
        const data = await res.json();
        const normalized = normalizeExplanationText(data.explanation || "");
        explanationCacheRef.current.set(cacheKey, normalized);
        setExplanation(normalized);
      } else {
        setExplanation("I encountered an issue while analyzing the setup. Please try again.");
      }
    } catch (err) {
      setExplanation("Unable to connect to the AI advisor. Check your internet connection.");
    } finally {
      setIsExplaining(false);
    }
  };

  const handleStartPlanting = () => {
    if (!currentPlan) return;
    router.push(`/quest/quests?plant=${id}&plan=${encodeURIComponent(currentPlan.plan_type)}`);
  };

  // ── Loading State ──
  if (loading) return <SkeletonPage />;

  // ── Error States ──
  if (error === "not_found") {
    return (
      <div className="setup-page">
        <div className="setup-error">
          <div className="setup-error-icon">🔍</div>
          <h2>Plant not found</h2>
          <p>We couldn't find a plant with that ID. It may have been removed or the URL is incorrect.</p>
          <button className="btn-primary" onClick={() => router.push("/recommendations")}>
            ← Back to Recommendations
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="setup-page">
        <div className="setup-error">
          <AlertTriangle size={40} className="setup-error-alert" />
          <h2>Unable to load plant data</h2>
          <p>Please check that the backend server is running and try again.</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!currentPlan) return null;

  // ── Build dynamic timeline markers from nutrition stages ──
  const stageEmojis: Record<string, string> = {
    seedling: "🌱",
    vegetative: "🌿",
    fruiting: "🌶️",
    flowering: "🌸",
    harvest: "✅",
    establishment: "🏗️",
    sprouting: "🌱",
    young: "🌿",
    mature: "🌳",
    growing: "📈",
  };

  const stages = currentPlan.nutrition.stages.map((s) => s.stage);
  const totalMarkers = stages.length + 1; // +1 for harvest
  const markers = stages.map((stage, i) => ({
    emoji: stageEmojis[stage.toLowerCase()] || "🌱",
    label: stage,
    position: (i / (totalMarkers - 1)) * 100,
  }));
  // Add harvest marker at the end
  markers.push({ emoji: "✅", label: "harvest", position: 100 });

  // ── Render ──
  return (
    <>
      <div className="setup-page">
        {/* Back Navigation */}
        <button className="setup-back" onClick={() => router.back()}>
          <ArrowLeft size={18} />
          <span>Go Back</span>
        </button>


        {/* Hero / Header */}
        <div className="setup-hero">
          <div className="setup-hero-left">
            <div className="setup-hero-emoji">{currentPlan.emoji}</div>
            <div className="setup-hero-name-wrap">
              <h1 className="setup-hero-name">{currentPlan.name}</h1>
              <span className={`reco-badge ${difficultyColors[currentPlan.difficulty] || "badge-medium"}`}>
                {formatDifficulty(currentPlan.difficulty)}
              </span>
            </div>
          </div>
          
          <div className="setup-hero-right">
            <p className="setup-hero-desc">{currentPlan.description}</p>
            <div className="setup-hero-meta">
              <Clock size={14} />
              <span>{currentPlan.growth_days} days to harvest</span>
            </div>
          </div>
        </div>

        {/* Growth Progress Indicator */}
        <div className="setup-growth-bar">
          <div className="setup-growth-label">
            <span>Growth Timeline</span>
            <span>{currentPlan.growth_days} days</span>
          </div>
          <div className="setup-growth-track">
            <div className="setup-growth-fill" style={{ width: "0%" }} />
            <div className="setup-growth-markers">
              {markers.map((m, i) => (
                <span
                  key={`${m.label}-${i}`}
                  className="setup-growth-marker"
                  style={{ left: `${m.position}%` }}
                  title={m.label}
                >
                  {m.emoji}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Plan Type Header + Cost */}
        <div className="plan-info-bar">
          <div className="plan-info-left">
            <span className={styles['plan-label']}>Select Plan:</span>
            <div className={styles['plan-tabs']}>
              {PLAN_TYPES.map((type) => {
                const isDisabled = type !== "Budget" && !isAiPlansReady;
                return (
                  <button
                    key={type}
                    className={`${styles['plan-tab']} ${type === activePlanType ? styles['plan-tab-active'] : ''} ${styles[`plan-tab-${type.toLowerCase()}`]}`}
                    onClick={() => {
                      if (isDisabled) return;
                      const index = planIndexByType.get(type);
                      if (index !== undefined) setCurrentIndex(index);
                    }}
                    disabled={isDisabled}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="plan-cost-display">
            {currentPlan.cost !== undefined && (
              <>
                <div className="plan-cost-amount">
                  <span className="plan-cost-label">Estimated Cost:</span>
                  <strong className="plan-cost-value">
                    {currentPlan.currency || "RM"} {currentPlan.cost}
                  </strong>
                </div>
                <span className="plan-cost-disclaimer">Based on average market prices</span>
              </>
            )}
          </div>
        </div>

        {/* Setup Guide Cards — Static container allows internal content (like bars) to animate */}
        <div className="setup-grid">
          <PotCard pot={currentPlan.pot} reason={currentPlan.ai_details?.pot_reason} />
          <SoilCard soil={currentPlan.soil} reason={currentPlan.ai_details?.soil_reason} />
          <SeedCard seed={currentPlan.seed} plantName={currentPlan.name} />
          <NutritionCard stages={currentPlan.nutrition.stages} />
        </div>

        {/* Shopping List - Key forces state reset on plan change, but doesn't remount the parent grid */}
        <ShoppingList key={currentIndex} plant={currentPlan} />

        {/* Action Buttons */}
        <div className="setup-actions">
          <button className="btn-primary setup-cta" onClick={handleStartPlanting}>
            <Rocket size={18} />
            <span>Start Planting</span>
          </button>
          <button className="btn-secondary setup-ai-btn" onClick={handleAIExplain}>
            <Sparkles size={18} />
            <span>Explain This Setup (AI)</span>
          </button>
        </div>
      </div>

      {/* ── AI Explanation Modal ── */}
      {showModal && (
        <div className={styles['ai-modal-overlay']}>
          <div className={styles['ai-modal-content']}>
            <div className={styles['ai-modal-header']}>
              <div className={styles['ai-modal-title']}>
                <div className={styles['ai-sparkle-circle']}>
                  <Sparkles size={18} />
                </div>
                <h3>AI Setup Analysis</h3>
              </div>
              <button
                className={styles['ai-modal-close']}
                onClick={() => setShowModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles['ai-modal-body']} ref={modalBodyRef}>
              {isExplaining ? (
                <div className={styles['ai-loading-container']}>
                  <div className={styles['ai-loading-dna']}>
                    <div className={styles['dna-dot']} />
                    <div className={styles['dna-dot']} />
                    <div className={styles['dna-dot']} />
                  </div>
                  <p>Consulting our botanical database...</p>
                </div>
              ) : (
                <div className={styles['ai-explanation-inner']}>
                  <div className={styles['ai-plan-badge']}>
                    {currentIndex === 0 ? "Budget Friendly" : currentIndex === 1 ? "Balanced Choice" : "Premium Setup"}
                  </div>
                  {skipTypingEffect ? (
                    <ExplanationText text={explanation || ""} />
                  ) : (
                    <TypingEffect text={explanation || ""} onUpdate={handleAutoScroll} />
                  )}
                </div>
              )}
            </div>

            <div className={styles['ai-modal-footer']}>
              <button className="btn-forest" onClick={() => setShowModal(false)}>
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

