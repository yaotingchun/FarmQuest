'use client'

import React, { useState, useMemo } from 'react'
import { Search, Droplet, Sun, Thermometer, Clock, CloudSun, Cloud } from 'lucide-react'
import db from '@/data/plants.json'
import './explore.css'

type Plant = typeof db.plants[0]

export default function ExplorePage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All types')
  const [diffFilter, setDiffFilter] = useState('Any difficulty')
  const [spaceFilter, setSpaceFilter] = useState('Any space')
  const [sunFilter, setSunFilter] = useState('Any sunlight')

  const plants = db.plants as Plant[]

  // Unique options for filters
  const types = ['All types', ...Array.from(new Set(plants.map(p => p.type)))]
  const difficulties = ['Any difficulty', ...Array.from(new Set(plants.map(p => p.difficulty)))]
  const spaces = ['Any space', ...Array.from(new Set(plants.flatMap(p => p.space)))]
  const sunlights = ['Any sunlight', ...Array.from(new Set(plants.map(p => p.sunlight)))]

  // Filtered results
  const filteredPlants = useMemo(() => {
    return plants.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.plant_id.toLowerCase().includes(search.toLowerCase())
      const matchType = typeFilter === 'All types' || p.type === typeFilter
      const matchDiff = diffFilter === 'Any difficulty' || p.difficulty === diffFilter
      const matchSpace = spaceFilter === 'Any space' || p.space.includes(spaceFilter)
      const matchSun = sunFilter === 'Any sunlight' || p.sunlight === sunFilter

      return matchSearch && matchType && matchDiff && matchSpace && matchSun
    })
  }, [plants, search, typeFilter, diffFilter, spaceFilter, sunFilter])

  // Stats
  const totalEdible = filteredPlants.filter(p => p.type === 'food' || p.type === 'herb' || p.type === 'fruit' || p.type === 'vegetable').length
  const totalEasy = filteredPlants.filter(p => p.difficulty === 'easy').length
  const avgDays = filteredPlants.length > 0 
    ? Math.round(filteredPlants.reduce((acc, p) => acc + p.growth_days, 0) / filteredPlants.length) 
    : 0

  const getSunIcon = (sunlight: string) => {
    if (sunlight === 'full_sun') return <Sun size={16} className="text-yellow-400" />
    if (sunlight === 'partial') return <CloudSun size={16} className="text-yellow-200" />
    return <Cloud size={16} className="text-gray-400" />
  }

  const getWaterDrops = (water: string) => {
    const counts: Record<string, number> = { low: 1, medium: 2, high: 3 }
    const count = counts[water] || 1
    return Array.from({ length: count }).map((_, i) => (
      <Droplet key={i} size={16} className="water-drop" />
    ))
  }

  return (
    <div className="explorer-page">
      <div className="explorer-header fade-up">
        <h1 className="section-title">Plant Database</h1>
        <p className="section-desc">Interactive viewer to explore the FarmQuest plant dataset.</p>
      </div>

      <div className="filters-grid fade-up" style={{ animationDelay: '0.1s' }}>
        <div className="filter-bar search-bar">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Search plants..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="filter-input"
            />
            <Search className="search-icon" size={20} />
          </div>
        </div>

        <div className="filter-bar options-bar">
          <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="filter-select" value={diffFilter} onChange={e => setDiffFilter(e.target.value)}>
            {difficulties.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="filter-bar options-bar">
          <select className="filter-select" value={spaceFilter} onChange={e => setSpaceFilter(e.target.value)}>
            {spaces.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="filter-select" value={sunFilter} onChange={e => setSunFilter(e.target.value)}>
            {sunlights.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="stats-row fade-up" style={{ animationDelay: '0.2s' }}>
        <div className="stat-pill"><span className="stat-pill-val">{filteredPlants.length}</span> plants</div>
        <div className="stat-pill"><span className="stat-pill-val">{totalEasy}</span> easy</div>
        <div className="stat-pill"><span className="stat-pill-val">{totalEdible}</span> edible</div>
        <div className="stat-pill">Avg <span className="stat-pill-val">{avgDays}</span> days to grow</div>
      </div>

      <div className="cards-grid">
        {filteredPlants.map((plant, index) => (
          <div 
            key={plant.plant_id} 
            className="plant-card fade-up"
            style={{ animationDelay: `${0.3 + index * 0.05}s` }}
          >
            <div className="card-header">
              <h3 className="plant-name">{plant.name}</h3>
              <span className="plant-id">{plant.plant_id}</span>
            </div>
            
            <div className="tags-row">
              <span className={`tag diff-${plant.difficulty}`}>{plant.difficulty}</span>
              <span className="tag type-tag">{plant.type.replace('_', ' ')}</span>
            </div>

            <div className="metrics-row">
              <div className="metric">
                {getSunIcon(plant.sunlight)}
                <span>{plant.sunlight.replace('_', ' ')}</span>
              </div>
              <div className="metric">
                <div className="drops-wrap">
                  {getWaterDrops(plant.water)}
                </div>
              </div>
              <div className="metric">
                <Thermometer size={16} className="temp-icon" />
                <span>{plant.temp_min}-{plant.temp_max}°C</span>
              </div>
            </div>

            <div className="time-row">
              <Clock size={15} className="clock-icon" />
              <span>{plant.growth_days} days to maturity</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
