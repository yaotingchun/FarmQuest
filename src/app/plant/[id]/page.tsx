"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
import { ArrowLeft, Sparkles, Rocket, AlertTriangle, Clock, ChevronLeft, ChevronRight, X, BrainCircuit, RefreshCcw } from "lucide-react";

import { useRouter } from "next/navigation";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { PotCard, SoilCard, SeedCard, NutritionCard } from "@/components/planting-setup/Cards";
import { ShoppingList } from "@/components/planting-setup/ShoppingList";
import { generateAIExplanation } from "@/utils/ai-placeholders";
import type { PlantSetup, Difficulty } from "@/types/plant";
import styles from "./carousel.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const difficultyColors: Record<Difficulty, string> = {
  Easy: "badge-easy",
  Medium: "badge-medium",
  Hard: "badge-hard",
};

// ── Typing Effect Component ──
function TypingEffect({ text, speed = 10, onUpdate }: { text: string; speed?: number; onUpdate?: () => void }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    setDisplayedText("");
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText((prev) => prev + text.charAt(index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  // Notify parent when text updates (for auto-scroll)
  useEffect(() => {
    if (onUpdate) onUpdate();
  }, [displayedText, onUpdate]);

  return <p className={styles['ai-text']}>{displayedText}</p>;
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
  const [showModal, setShowModal] = useState(false);
  const modalBodyRef = useRef<HTMLDivElement>(null);

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

        // Immediately render with base plant (as "Balanced" plan)
        setPlans([{ ...data, plan_type: "Balanced" }]);
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

  const handleAIExplain = async () => {
    if (!currentPlan) return;

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
        setExplanation(data.explanation);
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
    alert(`🌱 Let's start planting ${currentPlan?.name}! This feature is coming soon.`);
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
  };

  const stages = currentPlan.nutrition.stages.map((s) => s.stage);
  const totalMarkers = stages.length + 1; // +1 for harvest
  const markers = stages.map((stage, i) => ({
    emoji: stageEmojis[stage] || "🌱",
    label: stage,
    position: (i / (totalMarkers - 1)) * 100,
  }));
  // Add harvest marker at the end
  markers.push({ emoji: "✅", label: "harvest", position: 100 });

  const showCarousel = plans.length > 1;

  // ── Render ──
  return (
    <>
      <div className="setup-page">
        {/* Back Navigation */}
        <button className="setup-back" onClick={() => router.push("/recommendations")}>
          <ArrowLeft size={18} />
          <span>Recommendations</span>
        </button>


        {/* Hero / Header */}
        <div className="setup-hero">
          <div className="setup-hero-left">
            <div className="setup-hero-emoji">{currentPlan.emoji}</div>
            <div className="setup-hero-name-wrap">
              <h1 className="setup-hero-name">{currentPlan.name}</h1>
              <span className={`reco-badge ${difficultyColors[currentPlan.difficulty]}`}>
                {currentPlan.difficulty}
              </span>
            </div>
          </div>
          
          <div className="setup-hero-right">
            <p className="setup-hero-desc">{currentPlan.description}</p>
            <div className="setup-hero-meta">
              <Clock size={14} />
              <span>{currentPlan.growth_time_days} days to harvest</span>
            </div>
          </div>
        </div>

        {/* Growth Progress Indicator */}
        <div className="setup-growth-bar">
          <div className="setup-growth-label">
            <span>Growth Timeline</span>
            <span>{currentPlan.growth_time_days} days</span>
          </div>
          <div className="setup-growth-track">
            <div className="setup-growth-fill" style={{ width: "0%" }} />
            <div className="setup-growth-markers">
              {markers.map((m) => (
                <span
                  key={m.label}
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
        {showCarousel && (
          <div className="plan-info-bar">
            <div className="plan-info-left">
              <span className={styles['plan-label']}>Select Plan:</span>
              <div className={styles['plan-tabs']}>
                {plans.map((p, i) => (
                  <button
                    key={p.plan_type}
                    className={`${styles['plan-tab']} ${i === currentIndex ? styles['plan-tab-active'] : ''} ${styles[`plan-tab-${p.plan_type.toLowerCase()}`]}`}
                    onClick={() => setCurrentIndex(i)}
                  >
                    {p.plan_type}
                  </button>
                ))}
              </div>
              {aiLoading && <span className="plan-loading-dot">Generating plans…</span>}
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
        )}

        {/* Setup Guide Cards — Static container allows internal content (like bars) to animate */}
        <div className="setup-grid">
          <PotCard pot={currentPlan.pot} />
          <SoilCard soil={currentPlan.soil} />
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
                  <TypingEffect text={explanation || ""} onUpdate={handleAutoScroll} />
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

