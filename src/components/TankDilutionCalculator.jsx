import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function TankDilutionCalculator({ selectedFarm, onApplyDose }) {
  const [chemicals, setChemicals] = useState([]);
  const [selectedChemId, setSelectedChemId] = useState('PROPICONAZOLE_25_EC');
  const [areaAcres, setAreaAcres] = useState(selectedFarm?.farm_area ? parseFloat(selectedFarm.farm_area) : 2.5);
  const [tankCapacity, setTankCapacity] = useState(15); // 15L or 20L
  const [waterPerAcre, setWaterPerAcre] = useState(200);
  const [calculationResult, setCalculationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchChemicals();
  }, []);

  useEffect(() => {
    if (selectedFarm?.farm_area) {
      setAreaAcres(parseFloat(selectedFarm.farm_area) || 2.5);
    }
  }, [selectedFarm]);

  useEffect(() => {
    if (selectedChemId) {
      calculateDosage();
    }
  }, [selectedChemId, areaAcres, tankCapacity, waterPerAcre]);

  const fetchChemicals = async () => {
    try {
      const res = await api.get('/api/v1/dosage/chemicals');
      setChemicals(res.data);
      if (res.data.length > 0) {
        setSelectedChemId(res.data[0].chemical_id);
      }
    } catch (err) {
      console.error('Failed to fetch chemicals:', err);
    }
  };

  const calculateDosage = async () => {
    setLoading(true);
    try {
      const res = await api.post('/api/v1/dosage/calculate', {
        chemical_id: selectedChemId,
        area_acres: parseFloat(areaAcres) || 1.0,
        tank_capacity_liters: parseFloat(tankCapacity) || 15.0,
        water_volume_per_acre_liters: parseFloat(waterPerAcre) || 200.0
      });
      setCalculationResult(res.data);
    } catch (err) {
      console.error('Dosage calculation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedChem = chemicals.find(c => c.chemical_id === selectedChemId);

  return (
    <div className="card shadow-lg" style={{ background: '#0F172A', color: '#F8FAFC', borderRadius: '16px', border: '1px solid #1E293B', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #1E293B', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#38BDF8', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🧪 Precision Knapsack Sprayer & Tank Dilution Engine
          </h2>
          <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: '13px' }}>
            CIBRC Compliant Active Ingredient Dosing & Pre-Harvest Interval (PHI) Calculator
          </p>
        </div>
        <span style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
          Module 3 Precision Dosage
        </span>
      </div>

      {/* Input Controls Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Chemical Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94A3B8', marginBottom: '6px' }}>
            CIBRC Formulation
          </label>
          <select
            value={selectedChemId}
            onChange={(e) => setSelectedChemId(e.target.value)}
            style={{ width: '100%', background: '#1E293B', color: '#F8FAFC', border: '1px solid #334155', borderRadius: '8px', padding: '10px', fontSize: '13px' }}
          >
            {chemicals.map((c) => (
              <option key={c.chemical_id} value={c.chemical_id}>
                {c.active_ingredient} ({c.trade_names[0]})
              </option>
            ))}
          </select>
        </div>

        {/* Acreage Input */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94A3B8', marginBottom: '6px' }}>
            Plot Size (Acres)
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="100"
            value={areaAcres}
            onChange={(e) => setAreaAcres(e.target.value)}
            style={{ width: '100%', background: '#1E293B', color: '#F8FAFC', border: '1px solid #334155', borderRadius: '8px', padding: '10px', fontSize: '13px' }}
          />
        </div>

        {/* Knapsack Tank Size */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94A3B8', marginBottom: '6px' }}>
            Knapsack Tank Capacity
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[15, 20].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setTankCapacity(size)}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: tankCapacity === size ? '2px solid #38BDF8' : '1px solid #334155',
                  background: tankCapacity === size ? 'rgba(56, 189, 248, 0.2)' : '#1E293B',
                  color: tankCapacity === size ? '#38BDF8' : '#94A3B8',
                  cursor: 'pointer'
                }}
              >
                {size} Liters
              </button>
            ))}
          </div>
        </div>

        {/* Water Rate per Acre */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94A3B8', marginBottom: '6px' }}>
            Spray Volume (L/Acre)
          </label>
          <select
            value={waterPerAcre}
            onChange={(e) => setWaterPerAcre(Number(e.target.value))}
            style={{ width: '100%', background: '#1E293B', color: '#F8FAFC', border: '1px solid #334155', borderRadius: '8px', padding: '10px', fontSize: '13px' }}
          >
            <option value={150}>150 L/acre (Low foliage)</option>
            <option value={200}>200 L/acre (Standard canopy)</option>
            <option value={250}>250 L/acre (Dense VT Tassel canopy)</option>
          </select>
        </div>
      </div>

      {/* Result Cards & Batch Calculator */}
      {calculationResult && (
        <div>
          {/* Key Metric Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#1E293B', padding: '14px', borderRadius: '12px', borderLeft: '4px solid #38BDF8' }}>
              <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: '600' }}>TOTAL TANKS</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#F8FAFC' }}>
                {calculationResult.total_tanks_required} <span style={{ fontSize: '14px', color: '#38BDF8' }}>Tanks</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>{tankCapacity}L each</div>
            </div>

            <div style={{ background: '#1E293B', padding: '14px', borderRadius: '12px', borderLeft: '4px solid #10B981' }}>
              <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: '600' }}>CHEMICAL PER TANK</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>
                {calculationResult.chemical_per_tank} <span style={{ fontSize: '14px' }}>{calculationResult.unit}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Mix in {tankCapacity}L water</div>
            </div>

            <div style={{ background: '#1E293B', padding: '14px', borderRadius: '12px', borderLeft: '4px solid #F59E0B' }}>
              <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: '600' }}>TOTAL CHEMICAL</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#F59E0B' }}>
                {calculationResult.total_chemical_needed} <span style={{ fontSize: '14px' }}>{calculationResult.unit}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>In {calculationResult.total_water_liters}L water</div>
            </div>

            <div style={{ background: '#1E293B', padding: '14px', borderRadius: '12px', borderLeft: '4px solid #EC4899' }}>
              <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: '600' }}>PRE-HARVEST INTERVAL</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#EC4899' }}>
                {calculationResult.phi_days} <span style={{ fontSize: '14px' }}>Days</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>REI: {calculationResult.rei_hours}h</div>
            </div>
          </div>

          {/* Plain Language Summary Alert */}
          <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '18px' }}>📢</span>
              <div style={{ fontSize: '13px', color: '#E2E8F0', lineHeight: '1.5' }}>
                {calculationResult.plain_farmer_summary}
              </div>
            </div>
          </div>

          {/* Step-by-Step Batching Instructions */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#E2E8F0', marginBottom: '10px' }}>
              📋 Knapsack Tank Mixing Schedule ({calculationResult.total_tanks_required} Batches)
            </h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {calculationResult.batch_instructions.map((step) => (
                <div key={step.tank_number} style={{ background: '#1E293B', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ fontWeight: '700', color: '#38BDF8' }}>Tank #{step.tank_number}</span>
                  <span style={{ color: '#E2E8F0' }}>{step.water_liters}L Water + <strong style={{ color: '#10B981' }}>{step.chemical_amount} {step.unit}</strong> Chemical</span>
                  <span style={{ color: '#94A3B8', fontSize: '11px' }}>Hollow-cone nozzle</span>
                </div>
              ))}
            </div>
          </div>

          {/* Safety PPE Gear */}
          <div style={{ background: '#1E293B', padding: '14px', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#FCD34D', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🛡️ Mandatory CIBRC Safety Equipment:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {calculationResult.safety_ppe.map((ppe, i) => (
                <span key={i} style={{ background: 'rgba(252, 211, 77, 0.1)', color: '#FCD34D', padding: '4px 10px', borderRadius: '6px', fontSize: '11px' }}>
                  ✓ {ppe}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
