import React, { useState, useEffect, useRef } from 'react';
import api from './services/api';
import { AuthService } from './services/auth';
import Module4LifecycleHistory from './components/Module4LifecycleHistory';
import Module4WeatherDashboard from './components/Module4WeatherDashboard';
import HomePage from './components/HomePage';
import TankDilutionCalculator from './components/TankDilutionCalculator';
import IrrigationDashboard from './components/IrrigationDashboard';
import LifecycleTimeline from './components/LifecycleTimeline';
import ActionReminderCenter from './components/ActionReminderCenter';
import HarvestReadinessCard from './components/HarvestReadinessCard';
import VoiceAdvisoryPlayer from './components/VoiceAdvisoryPlayer';
import PwaInstallPrompt from './components/PwaInstallPrompt';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());
  const [currentPage, setCurrentPage] = useState('landing');
  
  // Auth Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Region & Presets Metadata
  const [regionMetadata, setRegionMetadata] = useState({ states: [], districts: [], zones: {}, case_presets: [] });
  const [selectedCasePreset, setSelectedCasePreset] = useState('CASE_A');

  // Farms State
  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [farmsLoading, setFarmsLoading] = useState(false);
  const [farmModalOpen, setFarmModalOpen] = useState(false);
  const [editFarmModalOpen, setEditFarmModalOpen] = useState(false);

  // Farm Form Inputs
  const [farmAddress, setFarmAddress] = useState('Vavdi, Godhra, Panchmahal, Gujarat');
  const [farmArea, setFarmArea] = useState('4.5');
  const [farmCrop, setFarmCrop] = useState('Corn');
  const [farmState, setFarmState] = useState('Gujarat');
  const [farmDistrict, setFarmDistrict] = useState('Panchmahal');
  const [farmTaluka, setFarmTaluka] = useState('Godhra');
  const [farmVillage, setFarmVillage] = useState('Vavdi');
  const [farmLat, setFarmLat] = useState('22.7758');
  const [farmLon, setFarmLon] = useState('73.6149');
  const [farmSoil, setFarmSoil] = useState('Sandy Loam (Goradu)');
  const [farmSeason, setFarmSeason] = useState('KHARIF');
  const [farmSowingDate, setFarmSowingDate] = useState('2026-06-28');
  const [farmVariety, setFarmVariety] = useState('GAYMH-1');
  const [submittingFarm, setSubmittingFarm] = useState(false);

  // Geocoding & Bidirectional Location Sync State
  const geoSyncSourceRef = useRef(null);
  const [isGeocodingLoading, setIsGeocodingLoading] = useState(false);
  const [geocodingFeedback, setGeocodingFeedback] = useState('');

  // GPS / Geolocation State
  const currentGpsRef = useRef({ lat: 22.7762, lon: 73.6155, hasRealGps: false });
  const [gpsLat, setGpsLat] = useState(22.7762);
  const [gpsLon, setGpsLon] = useState(73.6155);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [locationWarningDismissed, setLocationWarningDismissed] = useState(false);

  // Agricultural Suitability Evaluation State
  const [suitabilityEval, setSuitabilityEval] = useState(null);
  const [suitabilityLoading, setSuitabilityLoading] = useState(false);

  // Scans State
  const [scans, setScans] = useState([]);
  const [scansLoading, setScansLoading] = useState(false);
  const [activeScan, setActiveScan] = useState(null);

  // Submit Scan Form State
  const [scanSowingDate, setScanSowingDate] = useState('2026-06-10');
  const [scanDate, setScanDate] = useState('2026-07-22');
  const [dayCount, setDayCount] = useState('42');
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageDimensions, setImageDimensions] = useState(null);
  const [submittingScan, setSubmittingScan] = useState(false);

  // Forgot Password State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [submittingForgot, setSubmittingForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');

  const handleLogout = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {}
    AuthService.logout();
    setIsAuthenticated(false);
    setCurrentPage('landing');
    setFarms([]);
    setSelectedFarm(null);
    setScans([]);
    setActiveScan(null);
  };

  // Auto-reset if URL has ?reset parameter (e.g. ?reset=true or ?reset=1)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('reset') || params.has('clean')) {
        handleLogout();
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Listen for automatic unauthorized event from Axios interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      handleLogout();
    };
    window.addEventListener('agroguard:unauthorized', handleAuthExpired);
    return () => window.removeEventListener('agroguard:unauthorized', handleAuthExpired);
  }, []);

  // Initial load
  useEffect(() => {
    fetchRegionMetadata();
  }, []);

  // Auto-validate session on mount: if token is invalid/expired, reset automatically
  useEffect(() => {
    if (isAuthenticated) {
      api.get('/api/v1/auth/me')
        .then(() => {
          fetchFarms();
        })
        .catch((err) => {
          if (err.response?.status === 401) {
            handleLogout();
          } else {
            fetchFarms();
          }
        });
    }
  }, [isAuthenticated]);

  // Attempt background browser GPS acquisition on mount if permission already granted
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(5));
          const lon = parseFloat(pos.coords.longitude.toFixed(5));
          currentGpsRef.current = { lat, lon, hasRealGps: true };
          setGpsLat(lat);
          setGpsLon(lon);
        },
        () => {
          // Silent fallback to preset GPS
        },
        { timeout: 6000, enableHighAccuracy: false }
      );
    }
  }, []);

  // When selected farm or GPS changes, re-evaluate suitability
  useEffect(() => {
    if (selectedFarm) {
      evaluateSuitabilityForFarm(selectedFarm, gpsLat, gpsLon);
    }
  }, [selectedFarm, gpsLat, gpsLon]);

  // Automatically sync scanSowingDate with selected farm's sowing date or farm parameter
  useEffect(() => {
    if (selectedFarm?.sowing_date) {
      setScanSowingDate(selectedFarm.sowing_date);
    } else if (farmSowingDate) {
      setScanSowingDate(farmSowingDate);
    }
  }, [selectedFarm?.sowing_date, farmSowingDate]);

  const fetchRegionMetadata = async () => {
    try {
      const response = await api.get('/api/v1/suitability/regions');
      setRegionMetadata(response.data);
    } catch (err) {
      console.error('Error loading region metadata:', err);
    }
  };

  const fetchFarms = async () => {
    setFarmsLoading(true);
    try {
      const response = await api.get('/api/v1/farms');
      setFarms(response.data);
      if (response.data.length > 0) {
        const first = response.data[0];
        setSelectedFarm(first);
        populateFarmFormState(first);
        fetchScans(first.farm_id);
      } else {
        setSelectedFarm(null);
        setScans([]);
        setActiveScan(null);
      }
    } catch (err) {
      console.error('Error loading farms:', err);
      if (err.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setFarmsLoading(false);
    }
  };

  const fetchScans = async (farmId) => {
    setScansLoading(true);
    try {
      const response = await api.get(`/api/v1/scans/farm/${farmId}`);
      setScans(response.data);
      if (response.data.length > 0) {
        setActiveScan(response.data[0]);
      } else {
        setActiveScan(null);
      }
    } catch (err) {
      console.error('Error loading scans:', err);
      if (err.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setScansLoading(false);
    }
  };

  const populateFarmFormState = (farm) => {
    geoSyncSourceRef.current = 'programmatic';
    setFarmAddress(farm.farm_address || '');
    setFarmArea(farm.farm_area || '4.5');
    setFarmCrop(farm.active_crop || 'Corn');
    setFarmState(farm.state || 'Gujarat');
    setFarmDistrict(farm.district || 'Panchmahal');
    setFarmTaluka(farm.taluka || 'Godhra');
    setFarmVillage(farm.village || 'Vavdi');
    setFarmLat(farm.entered_latitude ? String(farm.entered_latitude) : '22.7758');
    setFarmLon(farm.entered_longitude ? String(farm.entered_longitude) : '73.6149');
    setFarmSoil(farm.soil_type || 'Sandy Loam (Goradu)');
    setFarmSeason(farm.season || 'KHARIF');
    setFarmSowingDate(farm.sowing_date || '2026-06-28');
    setScanSowingDate(farm.sowing_date || '2026-06-28');
    setFarmVariety(farm.variety || 'GAYMH-1');
    setTimeout(() => { geoSyncSourceRef.current = null; }, 250);
  };

  const handleSelectFarm = (farm) => {
    setSelectedFarm(farm);
    populateFarmFormState(farm);
    setLocationWarningDismissed(false);
    fetchScans(farm.farm_id);
    setSelectedFile(null);
    setImagePreview(null);
  };

  // Location input handlers with update-source tracking to avoid circular loops
  const handleLatChange = (val) => {
    geoSyncSourceRef.current = 'coords';
    setFarmLat(val);
  };

  const handleLonChange = (val) => {
    geoSyncSourceRef.current = 'coords';
    setFarmLon(val);
  };

  const handleVillageChange = (val) => {
    geoSyncSourceRef.current = 'names';
    setFarmVillage(val);
  };

  const handleTalukaChange = (val) => {
    geoSyncSourceRef.current = 'names';
    setFarmTaluka(val);
  };

  const handleDistrictChange = (val) => {
    geoSyncSourceRef.current = 'names';
    setFarmDistrict(val);
  };

  const handleStateChange = (val) => {
    geoSyncSourceRef.current = 'names';
    setFarmState(val);
  };

  const handleAddressChange = (val) => {
    geoSyncSourceRef.current = 'address';
    setFarmAddress(val);
  };

  // Manual / On-Demand Sync: Coords -> Village, Taluka/City, District, State
  const syncLocationFromCoords = async (manualLat, manualLon) => {
    const latNum = parseFloat(manualLat !== undefined ? manualLat : farmLat);
    const lonNum = parseFloat(manualLon !== undefined ? manualLon : farmLon);
    if (isNaN(latNum) || isNaN(lonNum)) return;
    
    try {
      setIsGeocodingLoading(true);
      setGeocodingFeedback('📍 Resolving location details from coordinates...');
      geoSyncSourceRef.current = 'programmatic';
      const res = await api.get('/api/v1/farms/reverse-geocode', {
        params: { lat: latNum, lon: lonNum }
      });
      const data = res.data;
      if (data && data.status === 'success') {
        if (data.village) setFarmVillage(data.village);
        if (data.taluka || data.city) setFarmTaluka(data.taluka || data.city);
        if (data.district) setFarmDistrict(data.district);
        if (data.state) setFarmState(data.state);
        if (data.formatted_address) {
          setFarmAddress(data.formatted_address);
        } else {
          const parts = [data.village, data.taluka || data.city, data.district, data.state].filter(Boolean);
          if (parts.length > 0) setFarmAddress(parts.join(', '));
        }
        setGeocodingFeedback(`✅ Location resolved: ${data.village ? data.village + ', ' : ''}${data.taluka || data.city || data.district || ''} (${data.source || 'verified'})`);
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
      setGeocodingFeedback('⚠️ Could not resolve location from coordinates');
    } finally {
      setIsGeocodingLoading(false);
      setTimeout(() => { geoSyncSourceRef.current = null; }, 250);
    }
  };

  // Manual / On-Demand Sync: Village, Taluka/City, District, State -> GPS Coords
  const syncCoordsFromLocation = async (customQuery) => {
    try {
      setIsGeocodingLoading(true);
      setGeocodingFeedback('🔍 Finding GPS coordinates from location...');
      geoSyncSourceRef.current = 'programmatic';
      const params = customQuery 
        ? { q: customQuery }
        : {
            village: farmVillage,
            taluka: farmTaluka,
            district: farmDistrict,
            state: farmState
          };
      const res = await api.get('/api/v1/farms/geocode', { params });
      const data = res.data;
      if (data && data.status === 'success' && data.latitude && data.longitude) {
        setFarmLat(String(data.latitude));
        setFarmLon(String(data.longitude));
        if (data.formatted_address) {
          setFarmAddress(data.formatted_address);
        }
        setGeocodingFeedback(`✅ Coordinates synced: ${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)} (${data.source || 'verified'})`);
      }
    } catch (err) {
      console.error('Forward geocode error:', err);
      setGeocodingFeedback('⚠️ Coordinates not found for this location');
    } finally {
      setIsGeocodingLoading(false);
      setTimeout(() => { geoSyncSourceRef.current = null; }, 250);
    }
  };

  // 1. Debounced Reverse Geocode Effect (Coordinates -> Village, City/Taluka, District, State, Address)
  useEffect(() => {
    if (geoSyncSourceRef.current !== 'coords') return;

    const latNum = parseFloat(farmLat);
    const lonNum = parseFloat(farmLon);

    if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsGeocodingLoading(true);
        setGeocodingFeedback('📍 Resolving location details from coordinates...');
        const res = await api.get('/api/v1/farms/reverse-geocode', {
          params: { lat: latNum, lon: lonNum }
        });
        const data = res.data;
        if (data && data.status === 'success') {
          if (data.village) setFarmVillage(data.village);
          if (data.taluka || data.city) setFarmTaluka(data.taluka || data.city);
          if (data.district) setFarmDistrict(data.district);
          if (data.state) setFarmState(data.state);
          if (data.formatted_address) {
            setFarmAddress(data.formatted_address);
          } else {
            const parts = [data.village, data.taluka || data.city, data.district, data.state].filter(Boolean);
            if (parts.length > 0) setFarmAddress(parts.join(', '));
          }
          setGeocodingFeedback(`✅ Location resolved: ${data.village ? data.village + ', ' : ''}${data.taluka || data.city || data.district || ''}`);
        }
      } catch (err) {
        console.error('Reverse geocode debounce error:', err);
        setGeocodingFeedback('⚠️ Could not resolve place names for coordinates');
      } finally {
        setIsGeocodingLoading(false);
        geoSyncSourceRef.current = null;
      }
    }, 650);

    return () => clearTimeout(timer);
  }, [farmLat, farmLon]);

  // 2. Debounced Forward Geocode Effect (Village, Taluka/City, District, State -> GPS Coordinates & Address)
  useEffect(() => {
    if (geoSyncSourceRef.current !== 'names' && geoSyncSourceRef.current !== 'address') return;

    const isAddressSource = geoSyncSourceRef.current === 'address';
    const queryParts = [farmVillage, farmTaluka, farmDistrict, farmState].map(s => (s || '').trim()).filter(Boolean);
    if (!isAddressSource && (queryParts.length === 0 || queryParts.join('').length < 3)) {
      return;
    }
    if (isAddressSource && (!farmAddress || farmAddress.trim().length < 3)) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsGeocodingLoading(true);
        setGeocodingFeedback('🔍 Resolving GPS coordinates from location names...');
        const params = isAddressSource
          ? { q: farmAddress }
          : {
              village: farmVillage,
              taluka: farmTaluka,
              district: farmDistrict,
              state: farmState
            };
        const res = await api.get('/api/v1/farms/geocode', { params });
        const data = res.data;
        if (data && data.status === 'success' && data.latitude && data.longitude) {
          setFarmLat(String(data.latitude));
          setFarmLon(String(data.longitude));
          if (isAddressSource) {
            if (data.village) setFarmVillage(data.village);
            if (data.taluka || data.city) setFarmTaluka(data.taluka || data.city);
            if (data.district) setFarmDistrict(data.district);
            if (data.state) setFarmState(data.state);
          } else if (data.formatted_address) {
            setFarmAddress(data.formatted_address);
          }
          setGeocodingFeedback(`✅ Coordinates synced: ${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`);
        }
      } catch (err) {
        console.error('Forward geocode debounce error:', err);
        setGeocodingFeedback('⚠️ Coordinates not found for this location');
      } finally {
        setIsGeocodingLoading(false);
        geoSyncSourceRef.current = null;
      }
    }, 750);

    return () => clearTimeout(timer);
  }, [farmVillage, farmTaluka, farmDistrict, farmState, farmAddress]);

  const handleOpenEditFarmModal = () => {
    if (selectedFarm) {
      populateFarmFormState(selectedFarm);
    }
    setGeocodingFeedback('');
    setEditFarmModalOpen(true);
  };

  const handleOpenAddFarmModal = () => {
    setGeocodingFeedback('');
    setFarmModalOpen(true);
  };

  // Evaluate Suitability for a Farm
  const evaluateSuitabilityForFarm = async (farm, currentGpsLat, currentGpsLon) => {
    setSuitabilityLoading(true);
    try {
      const payload = {
        state: farm.state || farmState,
        district: farm.district || farmDistrict,
        taluka: farm.taluka || farmTaluka,
        village: farm.village || farmVillage,
        entered_latitude: farm.entered_latitude ? parseFloat(farm.entered_latitude) : parseFloat(farmLat),
        entered_longitude: farm.entered_longitude ? parseFloat(farm.entered_longitude) : parseFloat(farmLon),
        gps_latitude: currentGpsLat !== null ? parseFloat(currentGpsLat) : null,
        gps_longitude: currentGpsLon !== null ? parseFloat(currentGpsLon) : null,
        season: farm.season || farmSeason || 'KHARIF',
        sowing_date: farm.sowing_date || farmSowingDate || '2026-06-28'
      };

      const response = await api.post('/api/v1/suitability/evaluate', payload);
      setSuitabilityEval(response.data);
    } catch (err) {
      console.error('Suitability evaluation failed:', err);
    } finally {
      setSuitabilityLoading(false);
    }
  };

  // Centralized Device GPS Acquisition & Synchronization
  const acquireDeviceGps = ({ applyToForm = false, updateFarmDirectly = false, showPrompt = false } = {}) => {
    if (!navigator.geolocation) {
      if (showPrompt) alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocatingGps(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(5));
        const lon = parseFloat(pos.coords.longitude.toFixed(5));
        
        // 1. Update ref and React GPS state
        currentGpsRef.current = { lat, lon, hasRealGps: true };
        setGpsLat(lat);
        setGpsLon(lon);
        setLocationWarningDismissed(false);

        // 2. If inside Add/Edit modal, apply to form inputs & reverse geocode
        if (applyToForm) {
          handleLatChange(String(lat));
          handleLonChange(String(lon));
          syncLocationFromCoords(lat, lon);
        }

        // 3. If updating active farm directly (e.g. from Mismatch banner)
        if (updateFarmDirectly && selectedFarm) {
          try {
            const updated = {
              ...selectedFarm,
              entered_latitude: lat,
              entered_longitude: lon
            };
            const res = await api.put(`/api/v1/farms/${selectedFarm.farm_id}`, updated);
            setSelectedFarm(res.data);
            populateFarmFormState(res.data);
            setFarms(prev => prev.map(f => f.farm_id === res.data.farm_id ? res.data : f));
            evaluateSuitabilityForFarm(res.data, lat, lon);
            alert(`Farm coordinates updated to match your current GPS location (${lat}, ${lon})!`);
          } catch (err) {
            console.error('Failed to update farm location from GPS:', err);
          }
        } else if (selectedFarm && !applyToForm) {
          // Re-evaluate current farm with newly detected GPS
          evaluateSuitabilityForFarm(selectedFarm, lat, lon);
        }

        if (showPrompt) {
          alert(`Detected GPS Location: ${lat}, ${lon} (Accuracy: ±${Math.round(pos.coords.accuracy)}m)`);
        }
      },
      (error) => {
        setIsLocatingGps(false);
        console.warn('Geolocation error:', error);
        if (showPrompt) {
          alert('Could not acquire device GPS coordinates. Using simulated GPS.');
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Browser Geolocation Detector
  const handleDetectBrowserGps = () => {
    acquireDeviceGps({ updateFarmDirectly: false, applyToForm: false, showPrompt: true });
  };

  // Quick Simulation Preset Loader (Cases A, B, C, D, E)
  const applyCasePreset = (preset) => {
    geoSyncSourceRef.current = 'programmatic';
    setSelectedCasePreset(preset.case_id);
    setFarmState(preset.state);
    setFarmDistrict(preset.district);
    setFarmTaluka(preset.taluka);
    setFarmVillage(preset.village);
    setFarmLat(String(preset.entered_lat));
    setFarmLon(String(preset.entered_lon));
    setFarmSeason(preset.season);
    setFarmSowingDate(preset.sowing_date);
    setFarmAddress(`${preset.village}, ${preset.taluka}, ${preset.district}, ${preset.state}`);
    
    // Set GPS coordinates
    currentGpsRef.current = { lat: preset.gps_lat, lon: preset.gps_lon, hasRealGps: false };
    setGpsLat(preset.gps_lat);
    setGpsLon(preset.gps_lon);
    setLocationWarningDismissed(false);

    // If active farm exists, update it or mock test
    if (selectedFarm) {
      const updatedFarm = {
        ...selectedFarm,
        farm_address: `${preset.village}, ${preset.taluka}, ${preset.district}, ${preset.state}`,
        state: preset.state,
        district: preset.district,
        taluka: preset.taluka,
        village: preset.village,
        entered_latitude: preset.entered_lat,
        entered_longitude: preset.entered_lon,
        season: preset.season,
        sowing_date: preset.sowing_date
      };
      setSelectedFarm(updatedFarm);
      evaluateSuitabilityForFarm(updatedFarm, preset.gps_lat, preset.gps_lon);
    }
    setTimeout(() => { geoSyncSourceRef.current = null; }, 250);
  };

  // 4 GPS Mismatch Action Handlers
  const handleRecheckLocation = () => {
    acquireDeviceGps({ updateFarmDirectly: false, applyToForm: false, showPrompt: true });
  };

  const handleUseCurrentLocation = () => {
    acquireDeviceGps({ updateFarmDirectly: true, applyToForm: true, showPrompt: false });
  };

  const handleEditFarmLocation = () => {
    handleOpenEditFarmModal();
  };

  const handleContinueWithWarning = () => {
    setLocationWarningDismissed(true);
    alert('Location mismatch recorded. Proceeding with diagnostic scan.');
  };

  // Auth Handlers
  const handleLogin = async (e) => {
    e.preventDefault();
    const cleanEmail = (loginEmail || '').trim().toLowerCase();
    const cleanPassword = (loginPassword || '').trim();

    if (!cleanEmail || !cleanPassword) {
      setAuthError('Please enter both email and password.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    const result = await AuthService.login(cleanEmail, cleanPassword);
    setAuthLoading(false);
    if (result.success) {
      setIsAuthenticated(true);
      setCurrentPage('home');
      setLoginEmail('');
      setLoginPassword('');
    } else {
      setAuthError(result.error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regUsername || !regEmail || !regMobile || !regPassword) {
      setAuthError('Please fill in all registration fields.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    const result = await AuthService.register(regUsername, regEmail, regPassword, regMobile);
    setAuthLoading(false);
    if (result.success) {
      alert('Registration successful! Please sign in.');
      setCurrentPage('login');
      setRegUsername('');
      setRegEmail('');
      setRegMobile('');
      setRegPassword('');
    } else {
      setAuthError(result.error);
    }
  };

  // Farm Creation
  const handleCreateFarm = async (e) => {
    e.preventDefault();
    if (!farmAddress || !farmArea) {
      alert('Please fill in required farm profile fields.');
      return;
    }
    setSubmittingFarm(true);
    try {
      const response = await api.post('/api/v1/farms', {
        farm_address: farmAddress,
        farm_area: farmArea,
        active_crop: farmCrop,
        state: farmState,
        district: farmDistrict,
        taluka: farmTaluka,
        village: farmVillage,
        entered_latitude: parseFloat(farmLat) || 22.7758,
        entered_longitude: parseFloat(farmLon) || 73.6149,
        soil_type: farmSoil,
        season: farmSeason,
        sowing_date: farmSowingDate,
        variety: farmVariety
      });

      setFarmModalOpen(false);
      
      // Reload farms list
      const updatedFarms = await api.get('/api/v1/farms');
      setFarms(updatedFarms.data);
      
      const newFarm = updatedFarms.data.find(f => f.farm_id === response.data.farm_id);
      if (newFarm) {
        handleSelectFarm(newFarm);
        const activeGpsLat = currentGpsRef.current.hasRealGps ? currentGpsRef.current.lat : gpsLat;
        const activeGpsLon = currentGpsRef.current.hasRealGps ? currentGpsRef.current.lon : gpsLon;
        evaluateSuitabilityForFarm(newFarm, activeGpsLat, activeGpsLon);
      }
      alert('Farm registered successfully with geographical and sowing parameters!');
    } catch (err) {
      console.error('Error creating farm:', err);
      alert('Failed to register farm profile.');
    } finally {
      setSubmittingFarm(false);
    }
  };

  // Farm Update
  const handleUpdateFarm = async (e) => {
    e.preventDefault();
    if (!selectedFarm) return;
    setSubmittingFarm(true);
    try {
      const payload = {
        farm_address: farmAddress,
        farm_area: farmArea,
        active_crop: farmCrop,
        state: farmState,
        district: farmDistrict,
        taluka: farmTaluka,
        village: farmVillage,
        entered_latitude: parseFloat(farmLat) || 22.7758,
        entered_longitude: parseFloat(farmLon) || 73.6149,
        soil_type: farmSoil,
        season: farmSeason,
        sowing_date: farmSowingDate,
        variety: farmVariety
      };

      const response = await api.put(`/api/v1/farms/${selectedFarm.farm_id}`, payload);
      setEditFarmModalOpen(false);
      setSelectedFarm(response.data);
      populateFarmFormState(response.data);
      setScanSowingDate(response.data.sowing_date || farmSowingDate);
      setFarms(prev => prev.map(f => f.farm_id === response.data.farm_id ? response.data : f));
      
      const activeGpsLat = currentGpsRef.current.hasRealGps ? currentGpsRef.current.lat : gpsLat;
      const activeGpsLon = currentGpsRef.current.hasRealGps ? currentGpsRef.current.lon : gpsLon;
      evaluateSuitabilityForFarm(response.data, activeGpsLat, activeGpsLon);
      alert('Farm location and parameters updated successfully!');
    } catch (err) {
      console.error('Error updating farm:', err);
      alert('Failed to update farm details.');
    } finally {
      setSubmittingFarm(false);
    }
  };

  // Image change handler with strict resolution verification
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          if (w < 300 || h < 300) {
            alert(
              `⚠️ Image Resolution Too Low (${w} × ${h} px)!\n\n` +
              `AgroGuard AI requires a minimum image resolution of 300 × 300 pixels (recommended: 600 × 600 px or higher) ` +
              `so our neural network and OpenCV models can accurately detect foliar lesions and fungal pustules.\n\n` +
              `Please upload a clearer, higher-resolution photo of your crop.`
            );
            setSelectedFile(null);
            setImagePreview(null);
            setImageDimensions(null);
            if (e.target) e.target.value = '';
            return;
          }
          setSelectedFile(file);
          setImagePreview(reader.result);
          setImageDimensions({ width: w, height: h });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Crop Diagnostic Scan
  const handleSubmitScan = async (e) => {
    e.preventDefault();
    if (!scanSowingDate || !scanDate) {
      alert('Please select both Sowing Date and Scan Date.');
      return;
    }

    const sowingObj = new Date(scanSowingDate);
    const scanObj = new Date(scanDate);

    if (scanObj < sowingObj) {
      alert(`❌ Invalid Date: Scan Date (${scanDate}) cannot be earlier than Sowing Date (${scanSowingDate}).`);
      return;
    }

    const computedDas = Math.max(0, Math.floor((scanObj - sowingObj) / (1000 * 60 * 60 * 24)));

    if (!selectedFarm) {
      alert('⚠️ No farm selected. Please add or select a farm parcel first before scanning.');
      return;
    }

    if (!selectedFile) {
      alert('Please upload or select a crop photo.');
      return;
    }

    setSubmittingScan(true);
    const formData = new FormData();
    formData.append('farm_id', selectedFarm.farm_id);
    formData.append('crop_type', selectedFarm.active_crop || 'Corn');
    formData.append('sowing_date', scanSowingDate);
    formData.append('scan_date', scanDate);
    formData.append('day_count', computedDas);
    const rawName = selectedFile.name || 'maize_stalk.jpg';
    const uploadName = (rawName.toLowerCase().includes('corn') || rawName.toLowerCase().includes('maize'))
      ? rawName
      : `corn_${rawName}`;
    formData.append('image', selectedFile, uploadName);
    if (gpsLat !== null) formData.append('gps_latitude', gpsLat);
    if (gpsLon !== null) formData.append('gps_longitude', gpsLon);
    if (selectedFarm.season) formData.append('season', selectedFarm.season);

    try {
      const response = await api.post('/api/v1/scans', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setSelectedFile(null);
      setImagePreview(null);
      
      // Refresh scan list
      const updatedScans = await api.get(`/api/v1/scans/farm/${selectedFarm.farm_id}`);
      setScans(updatedScans.data);
      if (updatedScans.data.length > 0) {
        setActiveScan(updatedScans.data[0]);
      } else {
        setActiveScan(response.data);
      }

      const cropVal = response.data?.crop_validation || {};
      const vStage = cropVal.validation_stage || response.data?.validation_stage;

      if (vStage === 'NOT_A_CROP') {
        alert(`❌ Crop Validation Rejected: Not a Crop!\n\n${cropVal.explanation || 'No agricultural crop detected.'}`);
      } else if (vStage === 'NOT_CORN') {
        alert(`🌾 Species Mismatch: Not Corn!\n\n${cropVal.explanation || 'Crop detected, but it is not Maize/Corn.'}`);
      } else {
        alert('🌽 Authentic Maize Stalk Verified!\n\nVisual week, DAS cross-check, stalk height, and multimodal health analysis completed.');
      }
    } catch (err) {
      console.error('Error processing scan:', err);
      if (err.response?.status === 401) {
        handleLogout();
        alert('⚠️ Session expired or invalid credentials. Please log in again.');
        return;
      }
      const msg = err.response?.data?.detail || err.message || 'Failed to submit crop scan.';
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmittingScan(false);
    }
  };

  // Forgot password handlers
  const handleForgotPasswordStep1 = (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError('Please enter your registered email address.');
      return;
    }
    setForgotError('');
    setForgotStep(2);
  };

  const handleForgotPasswordStep2 = async (e) => {
    e.preventDefault();
    if (!forgotNewPassword || !forgotConfirmPassword) {
      setForgotError('All fields are required.');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotError('Password must be at least 6 characters.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setSubmittingForgot(true);
    setForgotError('');
    try {
      await api.post('/api/v1/auth/reset-password', {
        email: forgotEmail,
        new_password: forgotNewPassword
      });
      alert('Password updated successfully! You can now log in.');
      setForgotModalOpen(false);
      setForgotEmail('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotStep(1);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || 'Failed to update password.';
      setForgotError(msg);
    } finally {
      setSubmittingForgot(false);
    }
  };

  // --- Render Public Home / Landing Page ---
  if (currentPage === 'landing') {
    return (
      <HomePage 
        isAuthenticated={isAuthenticated}
        onLogin={() => { setCurrentPage('login'); setAuthError(''); }}
        onGetStarted={() => { setCurrentPage('register'); setAuthError(''); }}
        onGoToDashboard={() => setCurrentPage('home')}
        onLogout={handleLogout}
      />
    );
  }

  // --- Render Authentication Screen ---
  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <header className="navbar">
          <a href="#" className="nav-brand" onClick={(e) => { e.preventDefault(); setCurrentPage('landing'); }}>
            🌱 Smart AgroGuard
          </a>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '13px' }}
              onClick={() => {
                handleLogout();
                alert('Session reset! You can now log in fresh.');
              }}
            >
              🧹 Reset Session
            </button>
            <button 
              type="button" 
              className="back-to-home-link"
              onClick={() => setCurrentPage('landing')}
            >
              ← Back to Home
            </button>
          </div>
        </header>

        <main className="auth-page">
          {currentPage === 'login' ? (
            <div className="auth-card">
              <div className="auth-header">
                <h2 className="auth-title">Welcome Back</h2>
                <p className="auth-subtitle">Sign in to monitor your farm & crops</p>
              </div>

              {authError && <div className="warning-alert" style={{ marginBottom: '20px' }}><p>{authError}</p></div>}

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="farmer@agroguard.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      className="form-input"
                      style={{ paddingRight: '45px' }}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '16px'
                      }}
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                    >
                      {showLoginPassword ? '👁️' : '🙈'}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-block" disabled={authLoading}>
                  {authLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>

              <div className="auth-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  Don't have an account?{' '}
                  <button className="btn btn-text" onClick={() => { setCurrentPage('register'); setAuthError(''); }}>
                    Register Here
                  </button>
                </div>
                <div>
                  Forgot your password?{' '}
                  <button className="btn btn-text" onClick={() => setForgotModalOpen(true)}>
                    Reset Here
                  </button>
                </div>
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.1))' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '12px', padding: '6px' }}
                    onClick={() => {
                      handleLogout();
                      alert('Session reset! You can now log in fresh.');
                    }}
                  >
                    🧹 Reset Session & Clean Cache
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="auth-card">
              <div className="auth-header">
                <h2 className="auth-title">Register Account</h2>
                <p className="auth-subtitle">Create profiles for your farms and maize cycles</p>
              </div>

              {authError && <div className="warning-alert" style={{ marginBottom: '20px' }}><p>{authError}</p></div>}

              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ramesh Patel"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="farmer@agroguard.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="9876543210"
                    value={regMobile}
                    onChange={(e) => setRegMobile(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showRegPassword ? "text" : "password"}
                      className="form-input"
                      style={{ paddingRight: '45px' }}
                      placeholder="Minimum 6 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '16px'
                      }}
                      onClick={() => setShowRegPassword(!showRegPassword)}
                    >
                      {showRegPassword ? '👁️' : '🙈'}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-block" disabled={authLoading}>
                  {authLoading ? 'Registering...' : 'Register'}
                </button>
              </form>

              <div className="auth-footer">
                Already registered?{' '}
                <button className="btn btn-text" onClick={() => { setCurrentPage('login'); setAuthError(''); }}>
                  Sign In
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- Render Main Application Dashboard ---
  const isGpsMismatch = suitabilityEval?.gps_verification?.status === 'MISMATCH' && !locationWarningDismissed;

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="navbar">
        <div className="navbar-inner">
          <div className="nav-left">
            <a href="#" className="nav-brand" onClick={(e) => { e.preventDefault(); setCurrentPage('home'); }}>
              🌱 Smart AgroGuard
            </a>
            <nav className="nav-tabs">
              <button 
                className={`nav-tab ${currentPage === 'home' ? 'active' : ''}`}
                onClick={() => setCurrentPage('home')}
              >
                Overview
              </button>
              <button 
                className={`nav-tab ${currentPage === 'scan' ? 'active' : ''}`}
                onClick={() => setCurrentPage('scan')}
              >
                AI Scanner
              </button>
              <button 
                className={`nav-tab ${currentPage === 'recommendation' ? 'active' : ''}`}
                onClick={() => setCurrentPage('recommendation')}
              >
                Advisory
              </button>
              <button 
                className={`nav-tab ${currentPage === 'weather' ? 'active' : ''}`}
                onClick={() => setCurrentPage('weather')}
              >
                Weather
              </button>
              <button 
                className={`nav-tab ${currentPage === 'irrigation' ? 'active' : ''}`}
                onClick={() => setCurrentPage('irrigation')}
              >
                Irrigation
              </button>
              <button 
                className={`nav-tab ${currentPage === 'history' ? 'active' : ''}`}
                onClick={() => setCurrentPage('history')}
              >
                History
              </button>
            </nav>
          </div>
          <div className="nav-actions">
            <button 
              type="button"
              className="btn btn-secondary" 
              style={{ padding: '6px 14px', fontSize: '13px' }} 
              onClick={() => setCurrentPage('landing')}
            >
              Home Page
            </button>
            <span className="user-badge">👤 Farmer: Ramesh Patel</span>
            <button className="btn btn-secondary" onClick={handleLogout}>Log Out</button>
          </div>
        </div>
      </header>

      <div className="dashboard">
        {/* SIDEBAR: Farms List & GPS Navigation Tools */}
        <aside className="sidebar">
          <div className="section-card" style={{ marginBottom: '20px' }}>
            <div className="sidebar-header">
              <h3 className="sidebar-title">🌾 My Farm Parcels</h3>
              <button className="btn btn-primary btn-text" onClick={handleOpenAddFarmModal}>+ Add Farm</button>
            </div>

            {farmsLoading ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading farms...</p>
            ) : farms.length > 0 ? (
              <div className="farms-list">
                {farms.map((farm) => {
                  const isActive = selectedFarm?.farm_id === farm.farm_id;
                  return (
                    <button
                      key={farm.farm_id}
                      className={`farm-card ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelectFarm(farm)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 className="farm-crop">{farm.active_crop || 'Corn / Maize'}</h4>
                        <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                          {farm.season || 'KHARIF'}
                        </span>
                      </div>
                      <p className="farm-area">{farm.farm_area || '4.5'} Acres • {farm.variety || 'GAYMH-1'}</p>
                      <p className="farm-address">{farm.district ? `${farm.district}, ${farm.state}` : farm.farm_address}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon">🚜</span>
                <p>Register a farm profile with location coordinates to start validation.</p>
              </div>
            )}
          </div>

          {/* GPS Navigation Live Controller */}
          <div className="section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                📍 Field GPS Status
              </h4>
              <span className={`pillar-badge ${suitabilityEval?.gps_verification?.status === 'VERIFIED' ? 'pass' : 'warning'}`}>
                {suitabilityEval?.gps_verification?.status === 'VERIFIED' ? '✓ In Field' : '⚠ Mismatch'}
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Device Lat:</span>
                <span className="coord-chip">{gpsLat !== null ? gpsLat.toFixed(4) : 'Acquiring...'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Device Lon:</span>
                <span className="coord-chip">{gpsLon !== null ? gpsLon.toFixed(4) : 'Acquiring...'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Field Offset:</span>
                <span style={{ fontWeight: '700', color: suitabilityEval?.gps_verification?.distance_meters < 1000 ? '#10B981' : '#F59E0B' }}>
                  {suitabilityEval?.gps_verification?.distance_meters !== null && suitabilityEval?.gps_verification?.distance_meters !== undefined
                    ? (suitabilityEval.gps_verification.distance_meters < 1000 
                        ? `${Math.round(suitabilityEval.gps_verification.distance_meters)} m` 
                        : `${(suitabilityEval.gps_verification.distance_meters / 1000).toFixed(1)} km`)
                    : 'Calculating...'}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '14px' }}>
              <button 
                className="btn btn-secondary btn-block" 
                style={{ fontSize: '12px', padding: '8px 12px' }}
                onClick={handleDetectBrowserGps}
                disabled={isLocatingGps}
              >
                {isLocatingGps ? 'Detecting Location...' : '🛰️ Refresh Device GPS'}
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN PANEL */}
        <main className="main-content">
          {selectedFarm ? (
            <>
              {/* Farm Details Banner */}
              <div className="farm-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div className="banner-details">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <h2 style={{ margin: 0, fontSize: '22px' }}>{selectedFarm.active_crop || 'Corn'} — {selectedFarm.variety || 'GAYMH-1'}</h2>
                    <span className="pillar-badge pass" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                      {selectedFarm.season || 'KHARIF'} SEASON
                    </span>
                  </div>
                  <div className="banner-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    <span className="farm-meta-pill">📍 <strong>{selectedFarm.district ? `${selectedFarm.district}, ${selectedFarm.state}` : selectedFarm.farm_address}</strong></span>
                    <span className="farm-meta-pill">🌍 Zone: <strong>{suitabilityEval?.area_suitability?.agro_climatic_zone?.name || 'Agro-Climatic Zone'}</strong></span>
                    <span className="farm-meta-pill">📅 Sowing Date: <strong>{selectedFarm.sowing_date || '2026-06-28'}</strong></span>
                    <span className="farm-meta-pill">📐 Area: <strong>{selectedFarm.farm_area || '4.5'} Acres</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={handleOpenEditFarmModal}
                  >
                    ✏️ Edit Farm Parameters
                  </button>
                  {currentPage !== 'home' && (
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '8px 16px', borderRadius: '10px' }} 
                      onClick={() => setCurrentPage('home')}
                    >
                      ← Back to Dashboard
                    </button>
                  )}
                </div>
              </div>

              {/* DASHBOARD MODULE NAVIGATION BAR */}
              <div style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                padding: '4px 0 12px 0',
                borderBottom: '1px solid #1E293B',
                marginBottom: '16px'
              }}>
                {[
                  { id: 'home', label: '📊 Overview & Validation', color: '#38BDF8' },
                  { id: 'scan', label: '📸 AI Diagnostic Scanner', color: '#10B981' },
                  { id: 'dosage', label: '🧪 Knapsack Sprayer & Dilution', color: '#F59E0B' },
                  { id: 'irrigation', label: '💧 FAO-56 Smart Irrigation', color: '#3B82F6' },
                  { id: 'lifecycle', label: '📅 12-Week Roadmap', color: '#10B981' },
                  { id: 'reminders', label: '🔔 Action Reminders', color: '#EC4899' },
                  { id: 'harvest', label: '🌾 Harvest Readiness', color: '#EAB308' },
                  { id: 'weather', label: '⛅ Weather Station', color: '#06B6D4' },
                  { id: 'history', label: '📈 Growth Analytics', color: '#8B5CF6' }
                ].map((tab) => {
                  const isActive = currentPage === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCurrentPage(tab.id)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '700',
                        whiteSpace: 'nowrap',
                        background: isActive ? `${tab.color}22` : '#0F172A',
                        color: isActive ? tab.color : '#94A3B8',
                        border: isActive ? `1.5px solid ${tab.color}` : '1px solid #1E293B',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* LOCATION MISMATCH ALERT BOX (When GPS does NOT match entered farm coordinates) */}
              {isGpsMismatch && (
                <div className="mismatch-alert-box">
                  <div className="mismatch-header">
                    <span style={{ fontSize: '20px' }}>⚠️</span>
                    <span>LOCATION MISMATCH DETECTED</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.5' }}>
                    Your current detected GPS location (<strong>{gpsLat?.toFixed(4)}, {gpsLon?.toFixed(4)}</strong>) 
                    does not appear to match the farm location you entered (<strong>{selectedFarm.entered_latitude}, {selectedFarm.entered_longitude}</strong>). 
                    Distance deviation: <strong>{suitabilityEval?.gps_verification?.distance_meters ? (suitabilityEval.gps_verification.distance_meters / 1000).toFixed(1) : 'Unknown'} km</strong>.
                  </p>
                  
                  <div className="mismatch-actions-row">
                    <button className="btn-mismatch" onClick={handleRecheckLocation}>
                      🔄 Recheck Location
                    </button>
                    <button className="btn-mismatch" onClick={handleUseCurrentLocation}>
                      📍 Use Current Location
                    </button>
                    <button className="btn-mismatch-secondary" onClick={handleEditFarmLocation}>
                      ✏️ Edit Farm Location
                    </button>
                    <button className="btn-mismatch-secondary" onClick={handleContinueWithWarning}>
                      ⚠️ Continue With Warning
                    </button>
                  </div>
                </div>
              )}

              {/* 1. HOME / OVERVIEW DASHBOARD VIEW */}
              {currentPage === 'home' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* AUTOMATED SEASONAL SOWING WINDOW ALERT */}
                  {suitabilityEval?.sowing_period && suitabilityEval.sowing_period.status !== 'SUITABLE' && (
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1.5px solid #F59E0B',
                      borderRadius: '16px',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '28px' }}>⚠️</span>
                        <div>
                          <h4 style={{ color: '#F59E0B', fontSize: '15px', margin: 0, fontWeight: '700' }}>
                            SEASONAL SOWING TIMELINE ALERT ({selectedFarm.district})
                          </h4>
                          <p style={{ color: 'var(--text-main)', fontSize: '13px', margin: '4px 0 0', lineHeight: '1.5' }}>
                            Sowing date (<strong>{selectedFarm.sowing_date}</strong>) is outside the optimal {selectedFarm.season} window for {selectedFarm.district}. 
                            Recommended window: <strong>{suitabilityEval.sowing_period.recommended_start} to {suitabilityEval.sowing_period.recommended_end}</strong> ({suitabilityEval.sowing_period.difference_days} days offset).
                          </p>
                        </div>
                      </div>
                      <button 
                        className="btn btn-secondary" 
                        style={{ fontSize: '12px', padding: '6px 14px', borderColor: '#F59E0B', color: '#FCD34D' }}
                        onClick={handleOpenEditFarmModal}
                      >
                        Adjust Sowing Date
                      </button>
                    </div>
                  )}

                  {/* 4 CORE AGRONOMIC STATUS INDICATORS */}
                  <div>
                    <h3 className="sidebar-title" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📋 Farm Agronomic Readiness & Health Indicators
                    </h3>

                    <div className="validation-card-grid">
                      
                      {/* CARD 1: GPS LOCATION VERIFICATION */}
                      <div className="validation-pillar-card">
                        <div className="validation-pillar-header">
                          <span className="pillar-question-tag">📍 LOCATION CHECK</span>
                          <span className={`pillar-badge ${
                            suitabilityEval?.gps_verification?.status === 'VERIFIED' ? 'pass' : 'warning'
                          }`}>
                            {suitabilityEval?.gps_verification?.status === 'VERIFIED' ? '✓ IN FIELD' : '⚠ MISMATCH'}
                          </span>
                        </div>
                        <h4 className="pillar-title">Field Location</h4>
                        <p className="pillar-content">
                          {suitabilityEval?.gps_verification?.status === 'VERIFIED'
                            ? 'Device GPS confirms presence at registered farm plot.'
                            : 'Detected GPS does not match entered farm plot coordinates.'}
                        </p>
                        <div className="pillar-meta-row">
                          <span>Plot Distance:</span>
                          <strong>
                            {suitabilityEval?.gps_verification?.distance_meters !== null && suitabilityEval?.gps_verification?.distance_meters !== undefined
                              ? `${suitabilityEval.gps_verification.distance_meters < 1000 ? Math.round(suitabilityEval.gps_verification.distance_meters) + ' m' : (suitabilityEval.gps_verification.distance_meters / 1000).toFixed(1) + ' km'}`
                              : 'Computing...'}
                          </strong>
                        </div>
                      </div>

                      {/* CARD 2: AGRICULTURAL AREA SUITABILITY */}
                      <div className="validation-pillar-card">
                        <div className="validation-pillar-header">
                          <span className="pillar-question-tag">🌍 AGRO-CLIMATE</span>
                          <span className={`pillar-badge ${
                            suitabilityEval?.area_suitability?.status === 'SUITABLE' ? 'pass' : 'fail'
                          }`}>
                            {suitabilityEval?.area_suitability?.status === 'SUITABLE' ? '✓ RECOMMENDED' : '❌ NOT RECOMMENDED'}
                          </span>
                        </div>
                        <h4 className="pillar-title">Regional Suitability</h4>
                        <p className="pillar-content">
                          {suitabilityEval?.area_suitability?.status === 'SUITABLE'
                            ? `Maize is recommended for ${suitabilityEval?.area_suitability?.matched_location || selectedFarm.district}.`
                            : suitabilityEval?.area_suitability?.unsuitable_reason || 'Area is not agro-climatically recommended for maize.'}
                        </p>
                        <div className="pillar-meta-row">
                          <span>Data Priority:</span>
                          <strong style={{ color: 'var(--color-primary)' }}>
                            {suitabilityEval?.area_suitability?.data_level || 'DISTRICT LEVEL'}
                          </strong>
                        </div>
                      </div>

                      {/* CARD 3: SEASON & SOWING DATE WINDOW */}
                      <div className="validation-pillar-card">
                        <div className="validation-pillar-header">
                          <span className="pillar-question-tag">📅 SOWING CALENDAR</span>
                          <span className={`pillar-badge ${
                            suitabilityEval?.sowing_period?.status === 'SUITABLE' ? 'pass' : 'warning'
                          }`}>
                            {suitabilityEval?.sowing_period?.status === 'SUITABLE' ? '✓ OPTIMAL TIME' : '⚠ TIMELINE ALERT'}
                          </span>
                        </div>
                        <h4 className="pillar-title">Sowing Window</h4>
                        
                        {/* Visual Sowing Window Progress Bar */}
                        <div className="sowing-window-bar">
                          <div className="sowing-dates-row">
                            <span>Start: {suitabilityEval?.sowing_period?.recommended_start?.substring(5) || '06-15'}</span>
                            <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{selectedFarm.season || 'KHARIF'}</span>
                            <span>End: {suitabilityEval?.sowing_period?.recommended_end?.substring(5) || '07-15'}</span>
                          </div>
                          <div className="sowing-progress-track">
                            <div className="sowing-progress-fill" style={{ width: suitabilityEval?.sowing_period?.status === 'SUITABLE' ? '70%' : '100%', background: suitabilityEval?.sowing_period?.status === 'SUITABLE' ? 'linear-gradient(90deg, #10B981 0%, #3B82F6 100%)' : '#F59E0B' }} />
                          </div>
                        </div>

                        <div className="pillar-meta-row">
                          <span>Sown Date:</span>
                          <strong>{selectedFarm.sowing_date || '2026-06-28'}</strong>
                        </div>
                        {suitabilityEval?.sowing_period?.difference_days > 0 && (
                          <div className="pillar-meta-row" style={{ color: '#F59E0B' }}>
                            <span>Deviation:</span>
                            <strong>{suitabilityEval.sowing_period.difference_days} Days Late</strong>
                          </div>
                        )}
                      </div>

                      {/* CARD 4: CROP CONDITION & AI ADVISORY */}
                      {(() => {
                        const vStage = activeScan?.validation_stage || activeScan?.growth_log?.validation_stage || (activeScan?.growth_log?.crop_match === false ? 'NOT_MAIZE' : (activeScan ? 'VALID_MAIZE' : null));
                        let badgeClass = 'pass';
                        let badgeText = '✓ SCANNED';
                        let contentText = 'Ready for diagnostic scan. Upload a stalk photo to measure height and detect foliar disease.';

                        if (!activeScan) {
                          badgeClass = 'warning';
                          badgeText = 'AWAITING SCAN';
                        } else if (vStage === 'NOT_A_CROP') {
                          badgeClass = 'fail';
                          badgeText = '❌ NOT A CROP';
                          contentText = `Invalid Image: No crop foliage detected (${activeScan.growth_log?.species_info?.detected_type || 'Non-Plant'}).`;
                        } else if (vStage === 'NOT_MAIZE') {
                          badgeClass = 'warning';
                          badgeText = '⚠️ NOT MAIZE';
                          contentText = `Species Mismatch: Uploaded plant is ${activeScan.growth_log?.species_info?.detected_type || 'Non-Maize'}.`;
                        } else {
                          badgeClass = activeScan.disease_log?.detected_disease === 'Healthy' ? 'pass' : 'warning';
                          badgeText = activeScan.disease_log?.detected_disease === 'Healthy' ? '✓ HEALTHY MAIZE' : '⚠️ ISSUE DETECTED';
                          contentText = `Disease: ${activeScan.disease_log?.detected_disease || 'Healthy'} • Height: ${activeScan.growth_log?.measured_height_cm ? activeScan.growth_log.measured_height_cm + ' cm' : 'Measured'}`;
                        }

                        return (
                          <div className="validation-pillar-card">
                            <div className="validation-pillar-header">
                              <span className="pillar-question-tag">🔬 AI DIAGNOSTICS</span>
                              <span className={`pillar-badge ${badgeClass}`}>
                                {badgeText}
                              </span>
                            </div>
                            <h4 className="pillar-title">Crop Health Status</h4>
                            <p className="pillar-content">
                              {contentText}
                            </p>
                            <div className="pillar-meta-row">
                              <span>Crop Cultivar:</span>
                              <strong>{selectedFarm.variety || 'GAYMH-1 Maize'}</strong>
                            </div>
                          </div>
                        );
                      })()}

                    </div>
                  </div>

                  {/* OVERALL SUITABILITY DECISION BANNER */}
                  {suitabilityEval?.decision && (
                    <div 
                      className="section-card" 
                      style={{ 
                        background: `linear-gradient(135deg, ${suitabilityEval.decision.badge_color}15 0%, rgba(15,23,42,0.4) 100%)`, 
                        border: `1px solid ${suitabilityEval.decision.badge_color}`,
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <h3 style={{ color: suitabilityEval.decision.badge_color, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {suitabilityEval.decision.headline}
                        </h3>
                        <span style={{ fontSize: '12px', background: suitabilityEval.decision.badge_color, color: '#000', padding: '3px 10px', borderRadius: '12px', fontWeight: '800' }}>
                          {suitabilityEval.decision.code}
                        </span>
                      </div>
                      <p style={{ fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.6' }}>
                        {suitabilityEval.decision.detail}
                      </p>
                    </div>
                  )}

                  {/* Comprehensive Agronomic Advisory Box (when scan exists) */}
                  {activeScan?.agronomic_advisory && (
                    <div className="advisory-box">
                      <h4 className="advisory-title">🌱 Comprehensive Agronomic Advisory & Guidance</h4>
                      <p className="advisory-text">{activeScan.agronomic_advisory}</p>
                      <div style={{ marginTop: '12px' }}>
                        <VoiceAdvisoryPlayer textToRead={activeScan.agronomic_advisory} title="Listen to Vernacular Advisory" />
                      </div>
                    </div>
                  )}

                  {/* QUICK FARM ACTIONS & TOOLS */}
                  <div>
                    <h3 className="sidebar-title" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      ⚡ Quick Farm Actions & Tools
                    </h3>
                    <div className="quick-actions-grid">
                      <div className="quick-action-card primary" onClick={() => setCurrentPage('scan')} style={{ cursor: 'pointer' }}>
                        <div>
                          <div className="quick-action-icon">📸</div>
                          <h4 className="quick-action-title" style={{ marginTop: '12px' }}>AI Crop Diagnostic</h4>
                          <p className="quick-action-desc">Upload or take a photo of your maize stalk to evaluate plant height, detect diseases, and get instant guidance.</p>
                        </div>
                        <button className="quick-action-btn">
                          Open Scanner →
                        </button>
                      </div>

                      <div className="quick-action-card" onClick={() => setCurrentPage('recommendation')} style={{ cursor: 'pointer' }}>
                        <div>
                          <div className="quick-action-icon">💊</div>
                          <h4 className="quick-action-title" style={{ marginTop: '12px' }}>Treatment & Dosage</h4>
                          <p className="quick-action-desc">Access automated fertilizer dose calculations (N-P-K splits) and chemical/organic prescriptions tailored for your crop stage.</p>
                        </div>
                        <button className="quick-action-btn">
                          View Advisory →
                        </button>
                      </div>

                      <div className="quick-action-card" onClick={() => setCurrentPage('history')} style={{ cursor: 'pointer' }}>
                        <div>
                          <div className="quick-action-icon">📈</div>
                          <h4 className="quick-action-title" style={{ marginTop: '12px' }}>Lifecycle & Analytics</h4>
                          <p className="quick-action-desc">Track plant height progression against ICAR benchmark growth curves across vegetative and reproductive stages.</p>
                        </div>
                        <button className="quick-action-btn">
                          View Analytics →
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* 2. CROP SCAN MODULE 2 VIEW */}
              {currentPage === 'scan' && (
                <div className="scan-panel">
                  {/* Left Form */}
                  <form onSubmit={handleSubmitScan} className="upload-card">
                    <h3 style={{ fontSize: '18px', color: 'var(--text-main)', marginBottom: '16px' }}>Upload Stalk Photo for Diagnostic</h3>
                    
                    {/* Sowing Date & Scan Date Inputs for Deterministic DAS */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '14px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label className="form-label" style={{ fontSize: '12px', margin: 0 }}>Sowing Date</label>
                          <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: '600', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '10px' }}>
                            ✓ Auto from Farm Parameter
                          </span>
                        </div>
                        <input
                          type="date"
                          className="form-input"
                          value={scanSowingDate}
                          readOnly
                          style={{ 
                            background: 'rgba(15, 23, 42, 0.85)', 
                            borderColor: 'rgba(16, 185, 129, 0.35)',
                            cursor: 'default',
                            color: 'var(--text-main)',
                            fontWeight: '600'
                          }}
                          title="Sowing date is automatically retrieved from Farm Parameters"
                          required
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                          Auto-synced from {selectedFarm ? (selectedFarm.village ? `${selectedFarm.village} Parcel` : 'Farm Parameter') : 'Farm Profile'}
                        </span>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label className="form-label" style={{ fontSize: '12px', margin: 0, fontWeight: '700', color: 'var(--color-secondary)' }}>
                            Scan Date (Required) *
                          </label>
                          <span style={{ fontSize: '11px', color: 'var(--color-secondary)', fontWeight: '600', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '2px 8px', borderRadius: '10px' }}>
                            Enter Only This Date
                          </span>
                        </div>
                        <input
                          type="date"
                          className="form-input"
                          value={scanDate}
                          onChange={(e) => setScanDate(e.target.value)}
                          style={{ borderColor: 'var(--color-secondary)' }}
                          required
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                          Enter the date this crop stalk image was captured
                        </span>
                      </div>
                    </div>

                    {/* Calculated DAS Pill */}
                    {(() => {
                      const sObj = new Date(scanSowingDate);
                      const scObj = new Date(scanDate);
                      const isInv = scObj < sObj;
                      const dasVal = isInv ? 0 : Math.max(0, Math.floor((scObj - sObj) / (1000 * 60 * 60 * 24)));
                      return (
                        <div style={{ 
                          background: isInv ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.12)', 
                          border: `1px solid ${isInv ? '#EF4444' : 'var(--color-primary)'}`,
                          borderRadius: '8px',
                          padding: '8px 12px',
                          marginBottom: '14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12px'
                        }}>
                          <span>Exact Deterministic DAS:</span>
                          <strong style={{ color: isInv ? '#EF4444' : 'var(--color-primary)', fontSize: '14px' }}>
                            {isInv ? '⚠ Invalid Date Range' : `${dasVal} Days After Sowing`}
                          </strong>
                        </div>
                      );
                    })()}

                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className="form-label" style={{ margin: 0 }}>Upload Crop Stalk Photo</label>
                        <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: '600' }}>
                          📐 Min: 300 × 300 px
                        </span>
                      </div>
                      {imagePreview ? (
                        <div className="image-preview-container">
                          <img src={imagePreview} className="image-preview" alt="Crop preview" />
                          <div className="image-preview-overlay" />
                          {imageDimensions && (
                            <div style={{
                              position: 'absolute',
                              top: '12px',
                              left: '12px',
                              background: 'rgba(15, 23, 42, 0.85)',
                              backdropFilter: 'blur(4px)',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontSize: '11px',
                              color: '#10B981',
                              fontWeight: '600',
                              zIndex: 5
                            }}>
                              ✓ Resolution: {imageDimensions.width} × {imageDimensions.height} px
                            </div>
                          )}
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ position: 'absolute', bottom: '15px', right: '15px', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', zIndex: 5 }}
                            onClick={() => { setSelectedFile(null); setImagePreview(null); setImageDimensions(null); }}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div>
                          <label className="file-dropzone">
                            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                            <div className="dropzone-icon">📸</div>
                            <p className="dropzone-text">Click to choose or drag stalk photo here</p>
                            <span style={{ fontSize: '11px', color: 'var(--text-dark)' }}>(Supports physical ArUco or base marker for OpenCV height)</span>
                          </label>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center' }}>
                            ℹ️ For reliable AI foliar disease detection, images must be at least <strong>300 × 300 pixels</strong> (recommended: <strong>600 × 600 px+</strong>).
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Quick 1-Tap Realistic Photo Buttons for Live Professor Demonstration */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          borderColor: 'rgba(16, 185, 129, 0.4)',
                          color: '#10B981',
                          padding: '10px',
                          fontSize: '13px',
                          fontWeight: '700',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                        onClick={async () => {
                          try {
                            const res = await fetch('/samples/natural_healthy_maize.jpg');
                            const blob = await res.blob();
                            const file = new File([blob], 'natural_healthy_maize.jpg', { type: 'image/jpeg' });
                            setSelectedFile(file);
                            setImagePreview(URL.createObjectURL(blob));
                            setImageDimensions({ width: 3000, height: 2250 });
                            setScanSowingDate('2026-06-28');
                            setScanDate('2026-07-28');
                          } catch (err) {
                            console.error('Error loading sample:', err);
                          }
                        }}
                      >
                        🌽 Load Healthy Maize
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          borderColor: 'rgba(239, 68, 68, 0.4)',
                          color: '#EF4444',
                          padding: '10px',
                          fontSize: '13px',
                          fontWeight: '700',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                        onClick={async () => {
                          try {
                            const res = await fetch('/samples/natural_infected_maize.jpg');
                            const blob = await res.blob();
                            const file = new File([blob], 'natural_infected_maize.jpg', { type: 'image/jpeg' });
                            setSelectedFile(file);
                            setImagePreview(URL.createObjectURL(blob));
                            setImageDimensions({ width: 612, height: 408 });
                            setScanSowingDate('2026-06-28');
                            setScanDate('2026-07-28');
                          } catch (err) {
                            console.error('Error loading sample:', err);
                          }
                        }}
                      >
                        🚨 Load Infected Maize
                      </button>
                    </div>

                    {/* Collapsible Sample Image Pickers for 10 Controlled Demo Scenarios */}
                    <details className="demo-scenarios-accordion">
                      <summary>
                        <span>🧪 Need a test photo? Click to expand 10 demonstration scenarios</span>
                      </summary>
                      <div className="demo-scenarios-body">
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                          Select any scenario below to auto-load calibrated test data and synthetic stalk visuals:
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px' }}>
                          {/* 1. Healthy Corn */}
                          <button
                            type="button"
                            className="btn-mismatch-secondary"
                            style={{ fontSize: '11px', padding: '6px 8px', textAlign: 'left' }}
                            onClick={() => {
                              setScanSowingDate('2026-06-10');
                              setScanDate('2026-07-22');
                              const canvas = document.createElement('canvas');
                              canvas.width = 224; canvas.height = 224;
                              const ctx = canvas.getContext('2d');
                              ctx.fillStyle = '#1e3a1e'; ctx.fillRect(0, 0, 224, 224);
                              ctx.fillStyle = '#22c55e'; ctx.fillRect(90, 15, 44, 194);
                              canvas.toBlob((blob) => {
                                const file = new File([blob], 'corn_healthy_stalk.jpg', { type: 'image/jpeg' });
                                setSelectedFile(file); setImagePreview(canvas.toDataURL());
                              });
                            }}
                          >
                            🌽 1. Healthy (DAS 42, 110cm)
                          </button>

                          {/* 2. Stunted Corn */}
                          <button
                            type="button"
                            className="btn-mismatch-secondary"
                            style={{ fontSize: '11px', padding: '6px 8px', borderColor: '#F59E0B', textAlign: 'left' }}
                            onClick={() => {
                              setScanSowingDate('2026-06-10');
                              setScanDate('2026-07-22');
                              const canvas = document.createElement('canvas');
                              canvas.width = 224; canvas.height = 224;
                              const ctx = canvas.getContext('2d');
                              ctx.fillStyle = '#3f3518'; ctx.fillRect(0, 0, 224, 224);
                              ctx.fillStyle = '#ca8a04'; ctx.fillRect(95, 80, 34, 130);
                              canvas.toBlob((blob) => {
                                const file = new File([blob], 'corn_stunted_short_moisture_stress.jpg', { type: 'image/jpeg' });
                                setSelectedFile(file); setImagePreview(canvas.toDataURL());
                              });
                            }}
                          >
                            ⚠️ 2. Stunted (DAS 42, 68cm)
                          </button>

                          {/* 3. Other Crop (Wheat) */}
                          <button
                            type="button"
                            className="btn-mismatch-secondary"
                            style={{ fontSize: '11px', padding: '6px 8px', borderColor: '#3B82F6', textAlign: 'left' }}
                            onClick={() => {
                              const canvas = document.createElement('canvas');
                              canvas.width = 224; canvas.height = 224;
                              const ctx = canvas.getContext('2d');
                              ctx.fillStyle = '#166534'; ctx.fillRect(0, 0, 224, 224);
                              ctx.fillStyle = '#eab308'; ctx.fillRect(40, 30, 144, 160);
                              canvas.toBlob((blob) => {
                                const file = new File([blob], 'wheat_crop_field.jpg', { type: 'image/jpeg' });
                                setSelectedFile(file); setImagePreview(canvas.toDataURL());
                              });
                            }}
                          >
                            🌾 3. Other Crop (Wheat)
                          </button>

                          {/* 4. Non-Crop (Car) */}
                          <button
                            type="button"
                            className="btn-mismatch-secondary"
                            style={{ fontSize: '11px', padding: '6px 8px', borderColor: '#EF4444', textAlign: 'left' }}
                            onClick={() => {
                              const canvas = document.createElement('canvas');
                              canvas.width = 224; canvas.height = 224;
                              const ctx = canvas.getContext('2d');
                              ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, 224, 224);
                              ctx.fillStyle = '#475569'; ctx.fillRect(40, 60, 144, 90);
                              canvas.toBlob((blob) => {
                                const file = new File([blob], 'car_vehicle_photo.jpg', { type: 'image/jpeg' });
                                setSelectedFile(file); setImagePreview(canvas.toDataURL());
                              });
                            }}
                          >
                            🚗 4. Non-Crop (Object)
                          </button>

                          {/* 5. Late Stage (Week 11 / DAS 75) */}
                          <button
                            type="button"
                            className="btn-mismatch-secondary"
                            style={{ fontSize: '11px', padding: '6px 8px', textAlign: 'left' }}
                            onClick={() => {
                              setScanSowingDate('2026-05-08');
                              setScanDate('2026-07-22');
                              const canvas = document.createElement('canvas');
                              canvas.width = 224; canvas.height = 224;
                              const ctx = canvas.getContext('2d');
                              ctx.fillStyle = '#1e3a1e'; ctx.fillRect(0, 0, 224, 224);
                              ctx.fillStyle = '#15803d'; ctx.fillRect(90, 10, 44, 204);
                              canvas.toBlob((blob) => {
                                const file = new File([blob], 'corn_mature_dough_stage.jpg', { type: 'image/jpeg' });
                                setSelectedFile(file); setImagePreview(canvas.toDataURL());
                              });
                            }}
                          >
                            🌽 5. Late Stage (Week 11)
                          </button>

                          {/* 6. Common Rust (Infected) */}
                          <button
                            type="button"
                            className="btn-mismatch-secondary"
                            style={{ fontSize: '11px', padding: '6px 8px', borderColor: '#EF4444', textAlign: 'left' }}
                            onClick={() => {
                              setScanSowingDate('2026-06-10');
                              setScanDate('2026-07-22');
                              const canvas = document.createElement('canvas');
                              canvas.width = 224; canvas.height = 224;
                              const ctx = canvas.getContext('2d');
                              ctx.fillStyle = '#1e3a1e'; ctx.fillRect(0, 0, 224, 224);
                              ctx.fillStyle = '#22c55e'; ctx.fillRect(85, 15, 54, 194);
                              // Draw reddish-brown rust pustules
                              ctx.fillStyle = '#c2410c';
                              for (let i = 0; i < 35; i++) {
                                const rx = 90 + Math.random() * 44;
                                const ry = 25 + Math.random() * 170;
                                ctx.beginPath(); ctx.arc(rx, ry, 3.5, 0, Math.PI * 2); ctx.fill();
                              }
                              canvas.toBlob((blob) => {
                                const file = new File([blob], 'corn_leaf_rust_pustules.jpg', { type: 'image/jpeg' });
                                setSelectedFile(file); setImagePreview(canvas.toDataURL());
                              });
                            }}
                          >
                            🍂 6. Common Rust (Infected)
                          </button>

                          {/* 7. Northern Leaf Blight (Infected) */}
                          <button
                            type="button"
                            className="btn-mismatch-secondary"
                            style={{ fontSize: '11px', padding: '6px 8px', borderColor: '#DC2626', textAlign: 'left' }}
                            onClick={() => {
                              setScanSowingDate('2026-06-10');
                              setScanDate('2026-07-22');
                              const canvas = document.createElement('canvas');
                              canvas.width = 224; canvas.height = 224;
                              const ctx = canvas.getContext('2d');
                              ctx.fillStyle = '#1e3a1e'; ctx.fillRect(0, 0, 224, 224);
                              ctx.fillStyle = '#22c55e'; ctx.fillRect(85, 15, 54, 194);
                              // Draw cigar-shaped necrotic lesions
                              ctx.fillStyle = '#78350f';
                              for (let i = 0; i < 6; i++) {
                                const lx = 90 + (i % 2) * 20;
                                const ly = 35 + i * 26;
                                ctx.beginPath(); ctx.ellipse(lx, ly, 7, 20, Math.PI / 8, 0, Math.PI * 2); ctx.fill();
                              }
                              canvas.toBlob((blob) => {
                                const file = new File([blob], 'corn_leaf_blight_cigar_lesions.jpg', { type: 'image/jpeg' });
                                setSelectedFile(file); setImagePreview(canvas.toDataURL());
                              });
                            }}
                          >
                            🍂 7. Leaf Blight (Infected)
                          </button>

                          {/* 8. Gray Leaf Spot (Infected) */}
                          <button
                            type="button"
                            className="btn-mismatch-secondary"
                            style={{ fontSize: '11px', padding: '6px 8px', borderColor: '#B91C1C', textAlign: 'left' }}
                            onClick={() => {
                              setScanSowingDate('2026-06-10');
                              setScanDate('2026-07-22');
                              const canvas = document.createElement('canvas');
                              canvas.width = 224; canvas.height = 224;
                              const ctx = canvas.getContext('2d');
                              ctx.fillStyle = '#1e3a1e'; ctx.fillRect(0, 0, 224, 224);
                              ctx.fillStyle = '#22c55e'; ctx.fillRect(85, 15, 54, 194);
                              // Draw rectangular gray-tan lesions parallel to veins
                              ctx.fillStyle = '#57534e';
                              for (let i = 0; i < 7; i++) {
                                const gx = 92 + (i % 2) * 18;
                                const gy = 30 + i * 22;
                                ctx.fillRect(gx, gy, 10, 18);
                              }
                              canvas.toBlob((blob) => {
                                const file = new File([blob], 'corn_gray_leaf_spot_rectangular.jpg', { type: 'image/jpeg' });
                                setSelectedFile(file); setImagePreview(canvas.toDataURL());
                              });
                            }}
                          >
                            🟤 8. Gray Leaf Spot (Infected)
                          </button>

                          {/* 9. Weed Foliage / Non-Corn Vegetation */}
                          <button
                            type="button"
                            className="btn-mismatch-secondary"
                            style={{ fontSize: '11px', padding: '6px 8px', borderColor: '#854D0E', textAlign: 'left' }}
                            onClick={() => {
                              const canvas = document.createElement('canvas');
                              canvas.width = 224; canvas.height = 224;
                              const ctx = canvas.getContext('2d');
                              ctx.fillStyle = '#14532d'; ctx.fillRect(0, 0, 224, 224);
                              // Draw broad rosette weeds
                              ctx.fillStyle = '#4ade80';
                              for (let i = 0; i < 18; i++) {
                                const wx = 30 + Math.random() * 160;
                                const wy = 30 + Math.random() * 160;
                                ctx.beginPath(); ctx.arc(wx, wy, 12, 0, Math.PI * 2); ctx.fill();
                              }
                              canvas.toBlob((blob) => {
                                const file = new File([blob], 'field_weeds_broadleaf_species.jpg', { type: 'image/jpeg' });
                                setSelectedFile(file); setImagePreview(canvas.toDataURL());
                              });
                            }}
                          >
                            🌿 9. Weeds / Non-Corn Plant
                          </button>

                          {/* 10. Stunted + Rust (Multimodal Composite Case) */}
                          <button
                            type="button"
                            className="btn-mismatch-secondary"
                            style={{ fontSize: '11px', padding: '6px 8px', borderColor: '#DC2626', background: 'rgba(220, 38, 38, 0.1)', textAlign: 'left' }}
                            onClick={() => {
                              setScanSowingDate('2026-06-10');
                              setScanDate('2026-07-22');
                              const canvas = document.createElement('canvas');
                              canvas.width = 224; canvas.height = 224;
                              const ctx = canvas.getContext('2d');
                              ctx.fillStyle = '#2f2315'; ctx.fillRect(0, 0, 224, 224);
                              // Short stunted stalk
                              ctx.fillStyle = '#ca8a04'; ctx.fillRect(95, 80, 34, 130);
                              // Rust pustules on stunted stalk
                              ctx.fillStyle = '#b91c1c';
                              for (let i = 0; i < 25; i++) {
                                const rx = 97 + Math.random() * 30;
                                const ry = 85 + Math.random() * 115;
                                ctx.beginPath(); ctx.arc(rx, ry, 3.2, 0, Math.PI * 2); ctx.fill();
                              }
                              canvas.toBlob((blob) => {
                                const file = new File([blob], 'corn_stunted_short_rust_infection.jpg', { type: 'image/jpeg' });
                                setSelectedFile(file); setImagePreview(canvas.toDataURL());
                              });
                            }}
                          >
                            🚨 10. Stunted + Rust (Composite)
                          </button>
                        </div>
                      </div>
                    </details>

                    <button type="submit" className="btn btn-primary btn-block" disabled={submittingScan || !selectedFile} style={{ padding: '12px', fontSize: '14px', borderRadius: '10px' }}>
                      {submittingScan ? 'Analyzing Crop Stalk & Foliage...' : '🔍 Analyze Stalk Photo'}
                    </button>
                  </form>

                  {/* Diagnostic Evaluation Result Grid - Displayed Below Upload Form */}
                  <div className="report-card">
                    {activeScan ? (() => {
                      const cropVal = activeScan.crop_validation || activeScan.species_info || {};
                      const vStage = cropVal.validation_stage || activeScan.validation_stage || 'CORN';
                      const growth = activeScan.growth || {};
                      const height = activeScan.height || {};
                      const env = activeScan.environment || {};
                      const health = activeScan.health || {};
                      const advisoryList = activeScan.advisory || [];

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          
                          {/* Banner: Top Validation Headline */}
                          {vStage === 'NOT_A_CROP' ? (
                            <div className="alert-not-crop">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4 style={{ color: '#EF4444', fontSize: '16px', fontWeight: 'bold' }}>❌ Stage 1 Rejection: Not an Agricultural Crop</h4>
                                <span className="badge-rejected" style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px' }}>REJECTED</span>
                              </div>
                              <p style={{ fontSize: '13px', color: 'var(--text-main)' }}>{cropVal.explanation || 'No agricultural crop foliage detected.'}</p>
                            </div>
                          ) : vStage === 'NOT_CORN' ? (
                            <div className="alert-not-maize">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4 style={{ color: '#F59E0B', fontSize: '16px', fontWeight: 'bold' }}>🌾 Stage 2 Rejection: Other Crop Detected ({cropVal.detected_crop_type || 'Non-Maize'})</h4>
                                <span className="badge-mismatch" style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px' }}>NOT CORN</span>
                              </div>
                              <p style={{ fontSize: '13px', color: 'var(--text-main)' }}>{cropVal.explanation || 'Plant identified as a non-maize crop. Corn growth models suspended.'}</p>
                            </div>
                          ) : (
                            <div className="alert-valid-maize">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4 style={{ color: '#10B981', fontSize: '16px', fontWeight: 'bold' }}>🌽 Corn Crop Verified & Multimodal Diagnosis Active</h4>
                                <span className="badge-valid-maize" style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px' }}>VERIFIED CORN</span>
                              </div>
                              <p style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                                Authentic Maize (Zea mays L.) stalk verified. Visual evidence, DAS cross-check, stalk height, and weather context synchronized.
                              </p>
                            </div>
                          )}

                          {/* 6 DECOUPLED EVIDENCE CARDS (GRID VIEW) */}
                          <div className="decoupled-grid">
                            
                            {/* CARD 1: CROP SPECIES VALIDATION */}
                            <div className="evidence-card">
                              <div className="evidence-header">
                                <span className="evidence-tag">🌽 CROP FOLIAGE CHECK</span>
                                <span className={`pillar-badge ${vStage === 'CORN' ? 'pass' : 'fail'}`}>
                                  {vStage === 'CORN' ? '✓ CORN' : (vStage === 'NOT_CORN' ? 'OTHER CROP' : 'NOT CROP')}
                                </span>
                              </div>
                              <h4 className="evidence-title">{cropVal.detected_crop_type || (vStage === 'CORN' ? 'Corn / Maize' : 'Non-Plant Object')}</h4>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                                <span>Species Confidence:</span>
                                <strong style={{ color: 'var(--color-primary)' }}>{cropVal.crop_confidence ? `${Math.round(cropVal.crop_confidence * 100)}%` : '96%'}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                                <span>Chlorophyll Foliage Ratio:</span>
                                <strong>{cropVal.foliage_ratio ? `${(cropVal.foliage_ratio * 100).toFixed(1)}%` : 'Active'}</strong>
                              </div>
                            </div>

                            {/* CARD 2: GROWTH STAGE & EXACT DAS (Commented out) */}
                            {false && (
                            <div className="evidence-card">
                              <div className="evidence-header">
                                <span className="evidence-tag">🌱 GROWTH STAGE & AGE</span>
                                <span className="coord-chip">DAS: {growth.das !== undefined ? growth.das : activeScan.day_count} Days</span>
                              </div>
                              <h4 className="evidence-title">
                                {vStage === 'CORN' ? (growth.visual_week || activeScan.growth_log?.detected_stage || 'Week 6') : 'N/A (Skipped)'}
                              </h4>
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {vStage === 'CORN' ? (growth.biological_phase || 'Active vegetative growth & collar elongation') : 'Crop analysis skipped for non-corn images.'}
                              </p>
                              {vStage === 'CORN' && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                                  <span>Visual Model Confidence:</span>
                                  <strong style={{ color: 'var(--color-primary)' }}>{growth.visual_confidence ? `${Math.round(growth.visual_confidence * 100)}%` : '85%'}</strong>
                                </div>
                              )}
                            </div>
                            )}

                            {/* CARD 3: STALK HEIGHT MEASUREMENT */}
                            <div className="evidence-card">
                              <div className="evidence-header">
                                <span className="evidence-tag">📏 MEASURED PLANT HEIGHT</span>
                                <span className={`pillar-badge ${
                                  height.height_status === 'BELOW_EXPECTED' ? 'warning' : 'pass'
                                }`}>
                                  {height.height_status || (vStage === 'CORN' ? 'WITHIN EXPECTED' : 'N/A')}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)' }}>
                                  {vStage === 'CORN' ? (height.measured_height_cm ? `${height.measured_height_cm} cm` : (activeScan.growth_log?.measured_height_cm ? `${activeScan.growth_log.measured_height_cm} cm` : '110 cm')) : 'N/A'}
                                </span>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  Expected: <strong style={{ color: 'var(--color-primary)' }}>{height.expected_range_str || activeScan.growth_log?.expected_height_range || '80–120 cm'}</strong>
                                </span>
                              </div>

                              {/* Visual Height Gauge Bar */}
                              {vStage === 'CORN' && (
                                <div className="height-gauge-container">
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                                    <span>Min: {height.expected_range_cm?.min || 80}cm</span>
                                    <span>Source: {height.measurement_source || 'ARUCO_CALIBRATED'}</span>
                                    <span>Max: {height.expected_range_cm?.max || 120}cm</span>
                                  </div>
                                  <div className="height-bar-track">
                                    <div 
                                      className="height-bar-fill" 
                                      style={{ 
                                        width: height.height_status === 'BELOW_EXPECTED' ? '45%' : '80%', 
                                        background: height.height_status === 'BELOW_EXPECTED' ? '#F59E0B' : '#10B981' 
                                      }} 
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* CARD 4: FINAL AGRONOMIC HEALTH INTERPRETATION */}
                            <div className="evidence-card">
                              <div className="evidence-header">
                                <span className="evidence-tag">❤️ HEALTH & DISEASE STATUS</span>
                                <span className={`pillar-badge ${
                                  health.growth_status === 'STUNTED_AND_INFECTED' ? 'fail' :
                                  health.growth_status === 'INFECTED' ? 'fail' :
                                  health.growth_status === 'STUNTED' ? 'warning' :
                                  health.growth_status === 'MONITOR_SCOUT' ? 'warning' : 'pass'
                                }`}>
                                  {health.growth_status === 'STUNTED_AND_INFECTED' ? '🚨 CRITICAL (STUNTED + INFECTED)' :
                                   health.growth_status === 'INFECTED' ? '❌ INFECTED' :
                                   health.growth_status === 'STUNTED' ? '⚠️ STUNTED' :
                                   health.growth_status === 'MONITOR_SCOUT' ? '🔍 SCOUTING ACTIVE' :
                                   (health.growth_status || (vStage === 'CORN' ? 'NORMAL' : 'REJECTED'))}
                                </span>
                              </div>
                              <h4 className="evidence-title" style={{ fontSize: '15px' }}>
                                {health.health_headline || (vStage === 'CORN' ? '✓ Healthy / Within Expected Range' : 'Assessment Suspended')}
                              </h4>
                              
                              {/* Contributing Factors */}
                              {health.contributing_factors && health.contributing_factors.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Contributing Root Factors:</span>
                                  {health.contributing_factors.map((factor, idx) => (
                                    <div key={idx} className="factor-chip">
                                      <span>•</span> <span>{factor}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="factor-chip-optimal">
                                  ✓ All biological growth metrics and environmental conditions align within optimal range.
                                </div>
                              )}

                              {/* Rich Disease Diagnostic Telemetry */}
                              {(() => {
                                const diag = health.disease_diagnosis || activeScan.disease_log || {};
                                const dName = diag.detected_disease || 'Healthy';
                                const isDis = dName !== 'Healthy' && dName !== 'INCONCLUSIVE' && dName !== 'Visual Scouting Recommended';
                                const isInc = dName === 'INCONCLUSIVE';
                                const dColor = isDis ? '#EF4444' : isInc ? '#F59E0B' : '#10B981';
                                const dEngine = diag.engine || 'CV_SCOUTING_ANALYZER';
                                const ev = diag.evidence || {};

                                return (
                                  <div style={{
                                    marginTop: '8px',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    background: isDis ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                                    border: `1px solid ${dColor}40`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Foliar Condition:</span>
                                      <strong style={{ color: dColor, fontSize: '13px' }}>{dName}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CV Severity:</span>
                                      <span style={{ fontSize: '11px', color: dColor, fontWeight: 'bold' }}>{diag.severity || 'None'}</span>
                                    </div>

                                    {/* Visual Evidence Telemetry (if available from CV Scouting) */}
                                    {ev && (ev.rust_evidence !== undefined || ev.necrotic_area_ratio !== undefined) && (
                                      <div style={{
                                        display: 'flex',
                                        gap: '6px',
                                        flexWrap: 'wrap',
                                        marginTop: '6px',
                                        paddingTop: '6px',
                                        borderTop: '1px solid rgba(255,255,255,0.06)',
                                        fontSize: '10px',
                                        color: 'var(--text-muted)'
                                      }}>
                                        <span>Rust: <strong style={{ color: ev.rust_evidence > 0.04 ? '#EF4444' : 'var(--text-main)' }}>{(ev.rust_evidence * 100).toFixed(1)}%</strong></span>
                                        <span>•</span>
                                        <span>Necrosis: <strong style={{ color: ev.necrotic_area_ratio > 0.05 ? '#F59E0B' : 'var(--text-main)' }}>{(ev.necrotic_area_ratio * 100).toFixed(1)}%</strong></span>
                                        <span>•</span>
                                        <span>Chlorosis: <strong style={{ color: ev.chlorosis_ratio > 0.06 ? '#EAB308' : 'var(--text-main)' }}>{(ev.chlorosis_ratio * 100).toFixed(1)}%</strong></span>
                                        <span>•</span>
                                        <span>Green: <strong style={{ color: '#10B981' }}>{(ev.green_foliage_ratio * 100).toFixed(1)}%</strong></span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            {/* CARD 5: FARM & ENVIRONMENTAL CONTEXT */}
                            <div className="evidence-card">
                              <div className="evidence-header">
                                <span className="evidence-tag">🌦️ FIELD MICRO-ENVIRONMENT</span>
                                <span className="coord-chip">{env.source || 'LIVE_GPS'}</span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                                <div className="weather-metric-tile">
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>TEMP</div>
                                  <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{env.temperature_c !== undefined ? `${env.temperature_c}°C` : '29.5°C'}</strong>
                                </div>
                                <div className="weather-metric-tile">
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>HUMIDITY</div>
                                  <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{env.humidity_percent !== undefined ? `${env.humidity_percent}%` : '72%'}</strong>
                                </div>
                                <div className="weather-metric-tile">
                                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>RAINFALL</div>
                                  <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{env.rainfall_mm !== undefined ? `${env.rainfall_mm} mm` : '5.2 mm'}</strong>
                                </div>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                Location: <strong>{selectedFarm.district}, {selectedFarm.state}</strong> • Soil: <strong>{selectedFarm.soil_type}</strong> • Variety: <strong>{selectedFarm.variety || 'GAYMH-1'}</strong>
                              </div>
                            </div>

                            {/* CARD 6: ACTIONABLE AGRONOMIC ADVISORY */}
                            <div className="evidence-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px 20px', minHeight: '140px' }}>
                              <div className="evidence-header" style={{ width: '100%', marginBottom: '16px' }}>
                                <span className="evidence-tag">💊 TREATMENT & ADVISORY</span>
                                <span className="coord-chip">AVAILABLE</span>
                              </div>
                              <button 
                                type="button" 
                                className="btn btn-primary btn-block" 
                                style={{ padding: '14px 20px', fontSize: '14px', fontWeight: '700', borderRadius: '12px' }}
                                onClick={() => setCurrentPage('recommendation')}
                              >
                                💊 View Treatment & Advisory →
                              </button>
                            </div>

                          </div>
                        </div>
                      );
                    })() : (
                      <div className="empty-state" style={{ height: '100%', justifyContent: 'center' }}>
                        <span className="empty-state-icon">📊</span>
                        <p>No scans uploaded yet. Choose an image or click a quick demo test button on the left to analyze your crop.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. DOSAGE RECOMMENDATIONS MODULE 3 VIEW */}
              {currentPage === 'recommendation' && (
                <div className="section-card">
                  <h3 className="sidebar-title" style={{ marginBottom: '20px' }}>💊 Fertilizer & Pesticide Dosage recommendation</h3>
                  
                  {activeScan ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                      <div className="warning-alert" style={{ background: 'rgba(59, 130, 246, 0.05)', borderColor: 'var(--color-secondary)' }}>
                        <h4 style={{ color: 'var(--color-secondary)' }}>Active Prescription:</h4>
                        <p style={{ fontSize: '15px', color: 'var(--text-main)', marginTop: '8px', lineHeight: '1.6' }}>
                          {activeScan.dosage_details}
                        </p>
                      </div>
                      
                      <div>
                        <h4 style={{ fontSize: '16px', color: 'var(--text-main)', marginBottom: '12px' }}>Standard Maize Agronomic Guidelines ({selectedFarm.variety || 'GAYMH-1'}):</h4>
                        <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '16px', fontSize: '13px', lineHeight: '1.7', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <p>🌱 <strong>Weeks 1–2 (Early vegetative):</strong> Starter Nitrogen (20 kg/acre) & N:P:K 10-26-26. Focus on phosphorus for deep root anchoring.</p>
                          <p>🌿 <strong>Weeks 3–5 (Mid vegetative):</strong> Side-dress Urea (40 kg/acre) in split dose. Hand weed or shallow hoe around bases.</p>
                          <p>🌽 <strong>Weeks 6–8 (Tasseling/Silking):</strong> Critical water & Potassium phase. Maintain moisture above 45% for complete cob pollination.</p>
                          <p>⚠️ <strong>Fungicidal Protection:</strong> In case of diagnosed Rust or Leaf Blight, apply Azoxystrobin (100g/acre) or Chlorothalonil immediately.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <span className="empty-state-icon">📊</span>
                      <p>Run a diagnostic scan first to receive dynamic prescription calculations.</p>
                      <button className="btn btn-primary" onClick={() => setCurrentPage('scan')}>Go to Scanner</button>
                    </div>
                  )}
                </div>
              )}

              {/* 4. WEATHER & FROST ALERTS MODULE 4 VIEW */}
              {currentPage === 'weather' && (
                selectedFarm ? (
                  <Module4WeatherDashboard farmId={selectedFarm.farm_id} farm={selectedFarm} />
                ) : (
                  <div className="section-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>🌾</div>
                    <h3 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>No Farm Selected</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      Please select a farm from the left sidebar to view its live meteorological intelligence and frost hazard alerts.
                    </p>
                  </div>
                )
              )}

              {/* 5. PRECISION KNAPSACK DOSAGE MODULE 3 VIEW */}
              {currentPage === 'dosage' && (
                <TankDilutionCalculator selectedFarm={selectedFarm} />
              )}

              {/* 6. SMART IRRIGATION FAO-56 MODULE 3/5 VIEW */}
              {currentPage === 'irrigation' && (
                <IrrigationDashboard selectedFarm={selectedFarm} />
              )}

              {/* 7. 12-WEEK LIFECYCLE ROADMAP MODULE 6 VIEW */}
              {currentPage === 'lifecycle' && (
                <LifecycleTimeline selectedFarm={selectedFarm} onTriggerScan={() => setCurrentPage('scan')} />
              )}

              {/* 8. PROACTIVE REMINDERS & MISSED ACTIONS VIEW */}
              {currentPage === 'reminders' && (
                <ActionReminderCenter selectedFarm={selectedFarm} />
              )}

              {/* 9. OPTIMAL HARVEST READINESS MODULE 6 VIEW */}
              {currentPage === 'harvest' && (
                <HarvestReadinessCard selectedFarm={selectedFarm} />
              )}

              {/* 6. MODULE 6: CROP LIFECYCLE HISTORY & TEMPORAL ANALYTICS VIEW (PLACED AT LAST) */}
              {currentPage === 'history' && (
                <Module4LifecycleHistory
                  farmId={selectedFarm?.farm_id}
                  farm={selectedFarm}
                />
              )}
            </>
          ) : (
            <div className="section-card empty-state" style={{ padding: '80px 20px' }}>
              <span className="empty-state-icon" style={{ fontSize: '64px' }}>🚜</span>
              <h2>No active crop cycles registered</h2>
              <p style={{ maxWidth: '400px', marginTop: '8px' }}>Register a new farm profile with geographical location coordinates to start validation.</p>
              <button className="btn btn-primary" style={{ marginTop: '24px' }} onClick={handleOpenAddFarmModal}>
                Add Farm Profile
              </button>
            </div>
          )}
        </main>
      </div>

      {/* --- ADD / REGISTER FARM MODAL --- */}
      {farmModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="modal-title">Register Farm Location & Crop Cycle</h3>
            
            {/* Geocoding & Bidirectional Location Sync Banner */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>🔄</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#93C5FD' }}>
                    Bidirectional GPS & Location Auto-Sync
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 10px', height: 'auto' }}
                    onClick={() => syncLocationFromCoords()}
                    title="Resolve Village, Taluka/City, District from current Coordinates"
                  >
                    📍 Coords → Place
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 10px', height: 'auto' }}
                    onClick={() => syncCoordsFromLocation()}
                    title="Resolve GPS Coordinates from Village & Taluka"
                  >
                    🔍 Place → Coords
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', borderColor: '#10B981', color: '#6EE7B7' }}
                    onClick={() => acquireDeviceGps({ applyToForm: true, showPrompt: false })}
                    title="Fetch device GPS location and auto-populate village & taluka"
                  >
                    🛰️ Use Device GPS
                  </button>
                </div>
              </div>

              {(isGeocodingLoading || geocodingFeedback) && (
                <div style={{
                  fontSize: '12px',
                  color: isGeocodingLoading ? '#93C5FD' : '#A7F3D0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  paddingTop: '4px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  {isGeocodingLoading && <span className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></span>}
                  <span>{geocodingFeedback || (isGeocodingLoading ? 'Resolving location...' : '')}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleCreateFarm}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    className="form-input"
                    value={farmState}
                    onChange={(e) => handleStateChange(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">District</label>
                  <input
                    type="text"
                    className="form-input"
                    value={farmDistrict}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Taluka / City / Block</label>
                  <input
                    type="text"
                    className="form-input"
                    value={farmTaluka}
                    onChange={(e) => handleTalukaChange(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Village Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={farmVillage}
                    onChange={(e) => handleVillageChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Farm Full Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={farmAddress}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Farm Latitude (GPS Coords)</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    value={farmLat}
                    onChange={(e) => handleLatChange(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Farm Longitude (GPS Coords)</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    value={farmLon}
                    onChange={(e) => handleLonChange(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Total Area (Acres)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={farmArea}
                    onChange={(e) => setFarmArea(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cultivated Crop</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ background: '#1E293B' }}
                    value="Corn / Maize"
                    disabled
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Cultivation Season</label>
                  <select
                    className="form-input"
                    value={farmSeason}
                    onChange={(e) => setFarmSeason(e.target.value)}
                  >
                    <option value="KHARIF">Kharif (Monsoon)</option>
                    <option value="RABI">Rabi (Winter)</option>
                    <option value="SUMMER">Summer / Zaid</option>
                    <option value="SPRING">Spring</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sowing Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={farmSowingDate}
                    onChange={(e) => setFarmSowingDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Soil Type</label>
                  <input
                    type="text"
                    className="form-input"
                    value={farmSoil}
                    onChange={(e) => setFarmSoil(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Maize Hybrid Variety</label>
                  <input
                    type="text"
                    className="form-input"
                    value={farmVariety}
                    onChange={(e) => setFarmVariety(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setFarmModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingFarm}>
                  {submittingFarm ? 'Registering...' : 'Register Farm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT FARM MODAL --- */}
      {editFarmModalOpen && selectedFarm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="modal-title">Edit Farm Location & Sowing Parameters</h3>

            {/* Geocoding & Bidirectional Location Sync Banner */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>🔄</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#93C5FD' }}>
                    Bidirectional GPS & Location Auto-Sync
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 10px', height: 'auto' }}
                    onClick={() => syncLocationFromCoords()}
                    title="Resolve Village, Taluka/City, District from current Coordinates"
                  >
                    📍 Coords → Place
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 10px', height: 'auto' }}
                    onClick={() => syncCoordsFromLocation()}
                    title="Resolve GPS Coordinates from Village & Taluka"
                  >
                    🔍 Place → Coords
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', borderColor: '#10B981', color: '#6EE7B7' }}
                    onClick={() => acquireDeviceGps({ applyToForm: true, showPrompt: false })}
                    title="Fetch device GPS location and auto-populate village & taluka"
                  >
                    🛰️ Use Device GPS
                  </button>
                </div>
              </div>

              {(isGeocodingLoading || geocodingFeedback) && (
                <div style={{
                  fontSize: '12px',
                  color: isGeocodingLoading ? '#93C5FD' : '#A7F3D0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  paddingTop: '4px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  {isGeocodingLoading && <span className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></span>}
                  <span>{geocodingFeedback || (isGeocodingLoading ? 'Resolving location...' : '')}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleUpdateFarm}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    className="form-input"
                    value={farmState}
                    onChange={(e) => handleStateChange(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">District</label>
                  <input
                    type="text"
                    className="form-input"
                    value={farmDistrict}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Taluka / City / Block</label>
                  <input
                    type="text"
                    className="form-input"
                    value={farmTaluka}
                    onChange={(e) => handleTalukaChange(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Village Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={farmVillage}
                    onChange={(e) => handleVillageChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Farm Full Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={farmAddress}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="e.g. Vavdi, Godhra, Panchmahal, Gujarat"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Latitude (GPS Coords)</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    value={farmLat}
                    onChange={(e) => handleLatChange(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude (GPS Coords)</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    value={farmLon}
                    onChange={(e) => handleLonChange(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Season</label>
                  <select
                    className="form-input"
                    value={farmSeason}
                    onChange={(e) => setFarmSeason(e.target.value)}
                  >
                    <option value="KHARIF">Kharif (Monsoon)</option>
                    <option value="RABI">Rabi (Winter)</option>
                    <option value="SUMMER">Summer / Zaid</option>
                    <option value="SPRING">Spring</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sowing Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={farmSowingDate}
                    onChange={(e) => setFarmSowingDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditFarmModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingFarm}>
                  {submittingFarm ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- FORGOT PASSWORD MODAL --- */}
      {forgotModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <h3 className="modal-title">Reset Password</h3>
            
            {forgotError && (
              <div className="warning-alert" style={{ marginBottom: '20px', padding: '10px 14px' }}>
                <p style={{ fontSize: '12px' }}>{forgotError}</p>
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleForgotPasswordStep1}>
                <div className="form-group">
                  <label className="form-label">Enter Registered Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="farmer@agroguard.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => { setForgotModalOpen(false); setForgotEmail(''); setForgotError(''); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Next
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotPasswordStep2}>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--color-primary)' }}>Email: {forgotEmail}</label>
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Minimum 6 characters"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setForgotStep(1)}>
                    Back
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submittingForgot}>
                    {submittingForgot ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Progressive Web App Install & Offline Handler */}
      <PwaInstallPrompt />
    </div>
  );
}
