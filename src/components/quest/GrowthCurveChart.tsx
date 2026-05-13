'use client'

import { useMemo } from 'react'
import type { QuestPlantData, GrowthStage } from '@/types/quest'
import type { Timestamp } from 'firebase/firestore'

interface GrowthCurveChartProps {
  plantData: QuestPlantData
  createdAt: Timestamp
  currentStage: GrowthStage
  currentXP: number
}

// SVG chart dimensions
const W = 560
const H = 220
const PAD_L = 48
const PAD_R = 20
const PAD_T = 24
const PAD_B = 48
const CHART_W = W - PAD_L - PAD_R
const CHART_H = H - PAD_T - PAD_B

/**
 * Build the ideal growth curve as a smooth S-curve through stages.
 * Returns an array of {day, growth} points from 0..totalDays.
 */
function buildIdealCurve(stages: QuestPlantData['growth_stages']) {
  const totalDays =
    stages.seed.duration_days +
    stages.sprout.duration_days +
    stages.mature.duration_days +
    stages.harvest.duration_days

  const milestones = [
    { day: 0, growth: 0 },
    { day: stages.seed.duration_days, growth: 15 },
    { day: stages.seed.duration_days + stages.sprout.duration_days, growth: 45 },
    { day: stages.seed.duration_days + stages.sprout.duration_days + stages.mature.duration_days, growth: 85 },
    { day: totalDays, growth: 100 },
  ]

  // Interpolate smoothly between milestones using cubic easing
  const points: { day: number; growth: number }[] = []
  const RESOLUTION = 80

  for (let i = 0; i <= RESOLUTION; i++) {
    const day = (i / RESOLUTION) * totalDays

    // Find which segment we're in
    let segIdx = 0
    for (let j = 0; j < milestones.length - 1; j++) {
      if (day >= milestones[j].day && day <= milestones[j + 1].day) {
        segIdx = j
        break
      }
    }

    const start = milestones[segIdx]
    const end = milestones[segIdx + 1]
    const segLen = end.day - start.day
    const t = segLen > 0 ? (day - start.day) / segLen : 1

    // Smooth cubic easing
    const easedT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    const growth = start.growth + (end.growth - start.growth) * easedT

    points.push({ day, growth })
  }

  return { points, totalDays, milestones }
}

/**
 * Build the actual growth curve based on real elapsed days and current growth stage.
 */
function buildActualCurve(
  stages: QuestPlantData['growth_stages'],
  createdAt: Date,
  currentStage: GrowthStage,
  currentXP: number,
  totalDays: number
) {
  const now = new Date()
  const elapsedMs = now.getTime() - createdAt.getTime()
  const elapsedDays = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)))
  const cappedDays = Math.min(elapsedDays, totalDays)

  // Map stage to approximate growth %
  const stageGrowthMap: Record<GrowthStage, number> = {
    0: 8,   // Seed
    1: 35,  // Sprout
    2: 70,  // Mature
    3: 100, // Harvest
  }

  const currentGrowth = stageGrowthMap[currentStage]

  // Build a smooth actual curve from 0 to current day
  const points: { day: number; growth: number }[] = []
  const RESOLUTION = Math.max(20, Math.min(cappedDays, 50))

  for (let i = 0; i <= RESOLUTION; i++) {
    const day = (i / RESOLUTION) * cappedDays
    const t = cappedDays > 0 ? day / cappedDays : 0

    // Use a natural growth curve shape
    const easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    const growth = currentGrowth * easedT

    points.push({ day, growth })
  }

  return { points, elapsedDays: cappedDays, currentGrowth }
}

function toSVGPath(
  points: { day: number; growth: number }[],
  totalDays: number
): string {
  if (points.length === 0) return ''

  const xScale = (day: number) => PAD_L + (day / totalDays) * CHART_W
  const yScale = (growth: number) => PAD_T + CHART_H - (growth / 100) * CHART_H

  let d = `M ${xScale(points[0].day)} ${yScale(points[0].growth)}`

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cpX1 = xScale(prev.day + (curr.day - prev.day) * 0.5)
    const cpY1 = yScale(prev.growth)
    const cpX2 = xScale(prev.day + (curr.day - prev.day) * 0.5)
    const cpY2 = yScale(curr.growth)
    d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${xScale(curr.day)} ${yScale(curr.growth)}`
  }

  return d
}

export function GrowthCurveChart({ plantData, createdAt, currentStage, currentXP }: GrowthCurveChartProps) {
  const { idealCurve, actualCurve, totalDays, milestones, elapsedDays, estimatedHarvest, daysRemaining } = useMemo(() => {
    const created = createdAt?.toDate?.() ?? new Date()
    const { points: idealPoints, totalDays: total, milestones: ms } = buildIdealCurve(plantData.growth_stages)
    const { points: actualPoints, elapsedDays: elapsed, currentGrowth } = buildActualCurve(
      plantData.growth_stages,
      created,
      currentStage,
      currentXP,
      total
    )

    // Estimate harvest date
    const remaining = Math.max(0, total - elapsed)
    const harvestDate = new Date(created.getTime() + total * 24 * 60 * 60 * 1000)

    return {
      idealCurve: idealPoints,
      actualCurve: actualPoints,
      totalDays: total,
      milestones: ms,
      elapsedDays: elapsed,
      estimatedHarvest: harvestDate,
      daysRemaining: remaining,
    }
  }, [plantData, createdAt, currentStage, currentXP])

  const xScale = (day: number) => PAD_L + (day / totalDays) * CHART_W
  const yScale = (growth: number) => PAD_T + CHART_H - (growth / 100) * CHART_H

  const idealPath = toSVGPath(idealCurve, totalDays)
  const actualPath = toSVGPath(actualCurve, totalDays)

  // Stage labels for X axis
  const stageLabels = [
    { label: 'Seed', day: plantData.growth_stages.seed.duration_days / 2 },
    { label: 'Sprout', day: plantData.growth_stages.seed.duration_days + plantData.growth_stages.sprout.duration_days / 2 },
    { label: 'Mature', day: plantData.growth_stages.seed.duration_days + plantData.growth_stages.sprout.duration_days + plantData.growth_stages.mature.duration_days / 2 },
    { label: 'Harvest', day: totalDays - plantData.growth_stages.harvest.duration_days / 2 },
  ]

  // Y axis labels
  const yLabels = [0, 25, 50, 75, 100]

  // Current position on actual curve
  const lastActual = actualCurve[actualCurve.length - 1]

  // Stage boundary days for vertical markers
  const stageBoundaries = [
    plantData.growth_stages.seed.duration_days,
    plantData.growth_stages.seed.duration_days + plantData.growth_stages.sprout.duration_days,
    plantData.growth_stages.seed.duration_days + plantData.growth_stages.sprout.duration_days + plantData.growth_stages.mature.duration_days,
  ]

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const stageNames = ['🌰 Seed', '🌱 Sprout', '🌿 Mature', '🌾 Harvest']
  const stageColors = ['#a78bfa', '#4ade80', '#22c55e', '#facc15']

  return (
    <div className="growth-curve-section">
      {/* Header with harvest estimate */}
      <div className="growth-curve-header">
        <div className="growth-curve-title-row">
          <h3 className="growth-curve-title">📈 Growth Curve</h3>
          <span className="growth-curve-stage-chip" style={{ background: `${stageColors[currentStage]}22`, color: stageColors[currentStage], border: `1px solid ${stageColors[currentStage]}33` }}>
            {stageNames[currentStage]}
          </span>
        </div>
        <div className="growth-curve-harvest-row">
          <div className="growth-curve-harvest-item">
            <span className="growth-curve-harvest-label">Est. Harvest</span>
            <span className="growth-curve-harvest-value">{formatDate(estimatedHarvest)}</span>
          </div>
          <div className="growth-curve-harvest-divider" />
          <div className="growth-curve-harvest-item">
            <span className="growth-curve-harvest-label">Days Elapsed</span>
            <span className="growth-curve-harvest-value">{elapsedDays} / {totalDays}</span>
          </div>
          <div className="growth-curve-harvest-divider" />
          <div className="growth-curve-harvest-item">
            <span className="growth-curve-harvest-label">Remaining</span>
            <span className="growth-curve-harvest-value harvest-remaining">
              {daysRemaining > 0 ? `${daysRemaining} days` : '🎉 Ready!'}
            </span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="growth-curve-chart-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="growth-curve-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Ideal curve gradient */}
            <linearGradient id="idealGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.6" />
            </linearGradient>
            {/* Actual curve gradient */}
            <linearGradient id="actualGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            {/* Area fill for actual */}
            <linearGradient id="actualAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.02" />
            </linearGradient>
            {/* Glow filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Horizontal grid lines */}
          {yLabels.map((val) => (
            <g key={val}>
              <line
                x1={PAD_L}
                y1={yScale(val)}
                x2={W - PAD_R}
                y2={yScale(val)}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
              <text
                x={PAD_L - 8}
                y={yScale(val) + 4}
                textAnchor="end"
                fill="rgba(232,253,240,0.3)"
                fontSize="9"
                fontWeight="600"
                fontFamily="'Satoshi', sans-serif"
              >
                {val}%
              </text>
            </g>
          ))}

          {/* Stage boundary vertical markers */}
          {stageBoundaries.map((day, i) => (
            <line
              key={`stage-${i}`}
              x1={xScale(day)}
              y1={PAD_T}
              x2={xScale(day)}
              y2={PAD_T + CHART_H}
              stroke="rgba(94,196,130,0.12)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Stage labels on X axis */}
          {stageLabels.map((s, i) => (
            <text
              key={`label-${i}`}
              x={xScale(s.day)}
              y={H - 8}
              textAnchor="middle"
              fill="rgba(232,253,240,0.35)"
              fontSize="9"
              fontWeight="600"
              fontFamily="'Satoshi', sans-serif"
            >
              {s.label}
            </text>
          ))}

          {/* Ideal growth curve (dotted) */}
          <path
            d={idealPath}
            fill="none"
            stroke="url(#idealGrad)"
            strokeWidth="2"
            strokeDasharray="6 4"
            strokeLinecap="round"
            opacity="0.7"
          />

          {/* Actual growth area fill */}
          {actualCurve.length > 1 && (
            <path
              d={`${actualPath} L ${xScale(lastActual.day)} ${yScale(0)} L ${xScale(actualCurve[0].day)} ${yScale(0)} Z`}
              fill="url(#actualAreaGrad)"
            />
          )}

          {/* Actual growth curve (solid) */}
          {actualCurve.length > 1 && (
            <path
              d={actualPath}
              fill="none"
              stroke="url(#actualGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
          )}

          {/* Current position indicator */}
          {lastActual && (
            <g>
              {/* Pulse ring */}
              <circle
                cx={xScale(lastActual.day)}
                cy={yScale(lastActual.growth)}
                r="8"
                fill="none"
                stroke="#818cf8"
                strokeWidth="1.5"
                opacity="0.4"
              >
                <animate
                  attributeName="r"
                  values="6;12;6"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.5;0.1;0.5"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
              </circle>
              {/* Dot */}
              <circle
                cx={xScale(lastActual.day)}
                cy={yScale(lastActual.growth)}
                r="4.5"
                fill="#818cf8"
                stroke="#020d06"
                strokeWidth="2"
                filter="url(#glow)"
              />
              {/* Day label */}
              <text
                x={xScale(lastActual.day)}
                y={yScale(lastActual.growth) - 14}
                textAnchor="middle"
                fill="#c4b5fd"
                fontSize="9"
                fontWeight="700"
                fontFamily="'Satoshi', sans-serif"
              >
                Day {elapsedDays}
              </text>
            </g>
          )}

          {/* Harvest marker */}
          <g>
            <circle
              cx={xScale(totalDays)}
              cy={yScale(100)}
              r="5"
              fill="#facc15"
              stroke="#020d06"
              strokeWidth="2"
              opacity="0.7"
            />
            <text
              x={xScale(totalDays)}
              y={yScale(100) - 10}
              textAnchor="end"
              fill="#facc15"
              fontSize="8.5"
              fontWeight="700"
              fontFamily="'Satoshi', sans-serif"
              opacity="0.7"
            >
              🌾
            </text>
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="growth-curve-legend">
        <div className="growth-curve-legend-item">
          <span className="growth-curve-legend-line ideal" />
          <span>Ideal Growth</span>
        </div>
        <div className="growth-curve-legend-item">
          <span className="growth-curve-legend-line actual" />
          <span>Actual Growth</span>
        </div>
      </div>
    </div>
  )
}
