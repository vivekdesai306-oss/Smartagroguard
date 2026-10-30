import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function IrrigationDashboard({ selectedFarm }) {
  const [soilType, setSoilType] = useState(selectedFarm?.soil_type || 'Sandy Loam (Goradu)');
  const [areaAcres, setAreaAcres] = useState(selectedFarm?.farm_area ? parseFloat(selectedFarm.farm_area) : 2.5);
  const [das, setDas] = useState(48);
  const [irrigationMethod, setIrrigationMethod] = useState('Drip');
  const [simulatedVwc, setSimulatedVwc] = useState(22.0);
  const [irrigData, setIrrigData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sensorIngestFeedback, setSensorIngestFeedback] = useState('');

  useEffect(() => {
    if (selectedFarm?.soil_type) setSoilType(selectedFarm.soil_type);
    if (selectedFarm?.farm_area) setAreaAcres(parseFloat(selectedFarm.farm_area) || 2.5);
  }, [selectedFarm]);

  useEffect(() => {
    calculateIrrigation();
  }, [soilType, areaAcres, das, irrigationMethod, simulatedVwc]);

  const calculateIrrigation = async () => {
    setLoading(true);
    try {
      const res = await api.post('/api/v1/irrigation/calculate', {
        area_acres: parseFloat(areaAcres) || 1.0,
        soil_type: soilType,
        das: parseInt(das) || 45,
        temperature_c: 31.5,
        humidity_percent: 62,
        wind_speed_kmh: 8.5,
        solar_radiation_mj: 19.2,
        rainfall_7d_mm: 2.0,
        irrigation_method: irrigationMethod,
        simulated_soil_vwc_pct: parseFloat(simulatedVwc)
      });
      setIrrigData(res.data);
    } catch (err) {
      console.error('Irrigation calculation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateSensorTransmit = async () => {
    try {
      setSensorIngestFeedback('📡 Transmitting IoT sensor packet via MQTT/LoRaWAN...');
      await api.post('/api/v1/irrigation/telemetry/soil', {
        farm_id: selectedFarm?.farm_id || 'f_simulated',
        sensor_id: 'PROBE_01_15CM',
        depth_cm: 15,
        volumetric_water_content_pct: parseFloat(simulatedVwc),
        soil_temperature_c: 28.5
      });
      setSensorIngestFeedback(`✅ Packet Ingested: VWC=${simulatedVwc}% @ 15cm probe depth.`);
      setTimeout(() => setSensorIngestFeedback(''), 4000);
    } catch (err) {
      setSensorIngestFeedback('⚠️ Telemetry ingestion failed');
    }
  };

  return (
    <div className="card shadow-lg" style={{ background: '#0F172A', color: '#F8FAFC', borderRadius: '16px', border: '1px solid #1E293B', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #1E293B', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#38BDF8', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            💧 Smart Irrigation & FAO-56 Water Balance Engine
          </h2>
          <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: '13px' }}>
            Penman-Monteith Daily Evapotranspiration (ETc = Kc × ET0) & Stunting Root-Cause Triage
          </p>
        </div>
        <span style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
          Module 3/5 Irrigation
        </span>
      </div>

      {/* Control Panel Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94A3B8', marginBottom: '6px' }}>
            Soil Texture Profile
          </label>
          <select
            value={soilType}
            onChange={(e) => setSoilType(e.target.value)}
            style={{ width: '100%', background: '#1E293B', color: '#F8FAFC', border: '1px solid #334155', borderRadius: '8px', padding: '10px', fontSize: '13px' }}
          >
            <option value="Sandy Loam (Goradu)">Sandy Loam (Goradu - Gujarat)</option>
            <option value="Clay Loam">Clay Loam (Gangetic Alluvium - Bihar)</option>
            <option value="Black Cotton Soil (Vertisol)">Black Cotton Soil (Vertisol - Deccan)</option>
            <option value="Alluvial Silt Loam">Alluvial Silt Loam</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94A3B8', marginBottom: '6px' }}>
            Days After Sowing (DAS: {das})
          </label>
          <input
            type="range"
            min="5"
            max="115"
            value={das}
            onChange={(e) => setDas(Number(e.target.value))}
            style={{ width: '100%', marginTop: '8px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748B' }}>
            <span>VE (DAS 5)</span>
            <span>VT Tassel (DAS 50)</span>
            <span>R6 Harvest (DAS 105)</span>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94A3B8', marginBottom: '6px' }}>
            Irrigation Delivery Method
          </label>
          <select
            value={irrigationMethod}
            onChange={(e) => setIrrigationMethod(e.target.value)}
            style={{ width: '100%', background: '#1E293B', color: '#F8FAFC', border: '1px solid #334155', borderRadius: '8px', padding: '10px', fontSize: '13px' }}
          >
            <option value="Drip">Drip Irrigation (4 LPH Emitters)</option>
            <option value="Furrow">Furrow / Flood (5 HP Tubewell)</option>
            <option value="Sprinkler">Micro-Sprinkler</option>
          </select>
        </div>

        {/* Simulated Soil Moisture Slider */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#38BDF8', marginBottom: '6px' }}>
            Virtual IoT Probe (VWC: {simulatedVwc}%)
          </label>
          <input
            type="range"
            min="6"
            max="40"
            step="0.5"
            value={simulatedVwc}
            onChange={(e) => setSimulatedVwc(Number(e.target.value))}
            style={{ width: '100%', marginTop: '8px' }}
          />
          <button
            onClick={handleSimulateSensorTransmit}
            style={{ marginTop: '6px', width: '100%', background: '#1E293B', border: '1px solid #38BDF8', color: '#38BDF8', borderRadius: '6px', padding: '5px', fontSize: '11px', cursor: 'pointer' }}
          >
            📡 Ingest IoT Telemetry
          </button>
        </div>
      </div>

      {sensorIngestFeedback && (
        <div style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', marginBottom: '16px' }}>
          {sensorIngestFeedback}
        </div>
      )}

      {/* FAO-56 Results Grid */}
      {irrigData && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#1E293B', padding: '14px', borderRadius: '12px', borderLeft: '4px solid #38BDF8' }}>
              <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: '600' }}>CROP COEFFICIENT (Kc)</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#38BDF8' }}>
                {irrigData.kc_crop_coefficient}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>{irrigData.growth_stage_code}</div>
            </div>

            <div style={{ background: '#1E293B', padding: '14px', borderRadius: '12px', borderLeft: '4px solid #10B981' }}>
              <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: '600' }}>WATER DEMAND (ETc)</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>
                {irrigData.etc_crop_water_demand_mm_per_day} <span style={{ fontSize: '13px' }}>mm/day</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>ET0: {irrigData.et0_reference_mm_per_day} mm</div>
            </div>

            <div style={{ background: '#1E293B', padding: '14px', borderRadius: '12px', borderLeft: '4px solid #F59E0B' }}>
              <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: '600' }}>VOLUME REQUIRED</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#F59E0B' }}>
                {(irrigData.total_water_volume_liters / 1000).toFixed(1)}k <span style={{ fontSize: '13px' }}>Liters</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>Across {areaAcres} acres</div>
            </div>

            <div style={{ background: '#1E293B', padding: '14px', borderRadius: '12px', borderLeft: '4px solid #8B5CF6' }}>
              <div style={{ color: '#94A3B8', fontSize: '11px', fontWeight: '600' }}>PUMP RUN-TIME</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#8B5CF6' }}>
                {irrigData.recommended_runtime_hours} <span style={{ fontSize: '13px' }}>Hours</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>{irrigationMethod} delivery</div>
            </div>
          </div>

          {/* Stunting Triage Card */}
          <div style={{
            background: irrigData.soil_status.moisture_deficit_status === 'CRITICAL_STRESS' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            border: irrigData.soil_status.moisture_deficit_status === 'CRITICAL_STRESS' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: irrigData.soil_status.moisture_deficit_status === 'CRITICAL_STRESS' ? '#EF4444' : '#10B981', margin: '0 0 6px 0' }}>
              🔬 Agronomic Stunting Triage & Soil Status: {irrigData.soil_status.moisture_deficit_status}
            </h4>
            <p style={{ fontSize: '13px', color: '#E2E8F0', margin: '0 0 8px 0', lineHeight: '1.5' }}>
              {irrigData.stunting_triage_note}
            </p>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#94A3B8' }}>
              👉 Guidance: {irrigData.action_guidance}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
