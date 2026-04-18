"use client";

import { useState, useCallback } from "react";
import { ShoppingCart, Copy, CheckCheck, Trash2 } from "lucide-react";
import type { PlantSetup, ShoppingItem } from "@/types/plant";
import { generateShoppingList, formatShoppingListText } from "@/utils/shopping-list";

interface ShoppingListProps {
  plant: PlantSetup;
}

export function ShoppingList({ plant }: ShoppingListProps) {
  const [items, setItems] = useState<ShoppingItem[]>(() =>
    generateShoppingList(plant)
  );
  const [copied, setCopied] = useState(false);

  const toggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  }, []);

  const clearAll = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, checked: false })));
  }, []);

  const handleCopy = useCallback(async () => {
    const text = formatShoppingListText(plant.name, items);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [items, plant.name]);

  const completedCount = items.filter((i) => i.checked).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  const categoryLabels: Record<string, { label: string; emoji: string }> = {
    pot: { label: "Pot", emoji: "🪴" },
    soil: { label: "Soil", emoji: "🌍" },
    seed: { label: "Seed", emoji: "🌱" },
    fertilizer: { label: "Fertilizer", emoji: "🧪" },
  };

  const groupedItems = items.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="shopping-list-card">
      <div className="setup-card-header">
        <div className="setup-card-icon">
          <ShoppingCart size={20} />
        </div>
        <h3 className="setup-card-title">Shopping List</h3>
      </div>

      {/* Progress bar */}
      <div className="shopping-progress">
        <div className="shopping-progress-info">
          <span>{completedCount} of {items.length} items</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="shopping-progress-track">
          <div
            className="shopping-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Grouped items */}
      {Object.entries(groupedItems).map(([category, catItems]) => (
        <div key={category} className="shopping-group">
          <div className="shopping-group-label">
            <span>{categoryLabels[category]?.emoji}</span>
            <span>{categoryLabels[category]?.label}</span>
          </div>
          {catItems.map((item) => (
            <label
              key={item.id}
              className={`shopping-item ${item.checked ? "shopping-item-checked" : ""}`}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleItem(item.id)}
                className="shopping-checkbox"
              />
              <div className="shopping-item-content">
                <span className={`shopping-item-name ${item.checked ? "shopping-item-strike" : ""}`}>
                  {item.name}
                </span>
                {item.detail && (
                  <span className="shopping-item-detail">{item.detail}</span>
                )}
              </div>
            </label>
          ))}
        </div>
      ))}

      {/* Actions */}
      <div className="shopping-actions">
        <button
          className="shopping-btn shopping-btn-primary"
          onClick={handleCopy}
        >
          {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
          <span>{copied ? "Copied!" : "Copy List"}</span>
        </button>
        <button
          className="shopping-btn shopping-btn-secondary"
          onClick={clearAll}
          disabled={completedCount === 0}
        >
          <Trash2 size={16} />
          <span>Clear All</span>
        </button>
      </div>
    </div>
  );
}
