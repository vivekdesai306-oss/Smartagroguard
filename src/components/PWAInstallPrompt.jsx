import React, { useState, useEffect } from 'react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineToast, setShowOnlineToast] = useState(false);

  useEffect(() => {
    // Check if already running in standalone / installed mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
    setIsIOS(isAppleDevice);

    // Capture Chrome/Android/Desktop install event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // App installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Network connectivity listeners
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineToast(true);
      setTimeout(() => setShowOnlineToast(false), 3500);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <>
      {/* Offline Status Pill */}
      {!isOnline && (
        <div style={{
          position: 'fixed',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: 'rgba(239, 68, 68, 0.95)',
          color: '#ffffff',
          padding: '8px 18px',
          borderRadius: '9999px',
          boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 600,
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}>
          <span style={{ fontSize: '16px' }}>⚡</span>
          <span>Offline Mode Active • Cached agricultural data available</span>
        </div>
      )}

      {/* Reconnected Toast */}
      {showOnlineToast && (
        <div style={{
          position: 'fixed',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: 'rgba(16, 185, 129, 0.95)',
          color: '#ffffff',
          padding: '8px 18px',
          borderRadius: '9999px',
          boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 600,
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <span>🟢</span>
          <span>Connection restored • Live farm sensors syncing</span>
        </div>
      )}

      {/* Floating PWA Install Banner (When installable or on iOS without standalone) */}
      {!isInstalled && (isInstallable || (isIOS && !isInstalled)) && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99990,
          width: 'calc(100% - 32px)',
          maxWidth: '520px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '20px',
          padding: '14px 18px',
          boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.7), 0 0 20px 0 rgba(16, 185, 129, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          animation: 'slideUp 0.4s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <img
              src="/pwa-192x192.png"
              alt="AgroGuard Icon"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                flexShrink: 0
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{
                color: '#F8FAFC',
                fontWeight: 700,
                fontSize: '14px',
                letterSpacing: '0.3px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>AgroGuard Mobile App</span>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34D399',
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontWeight: 600
                }}>PWA</span>
              </div>
              <div style={{
                color: '#94A3B8',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                Install for offline scan & real-time weather
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={handleInstallClick}
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '9px 16px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span>📲</span>
              <span>Install</span>
            </button>

            <button
              onClick={() => {
                setIsInstallable(false);
                setIsIOS(false);
              }}
              aria-label="Dismiss"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#94A3B8',
                border: 'none',
                borderRadius: '10px',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* iOS Installation Instructions Modal */}
      {showIosGuide && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#0F172A',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '24px 24px 20px 20px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            color: '#F8FAFC',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            animation: 'slideUp 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/pwa-192x192.png" alt="AgroGuard" style={{ width: '36px', height: '36px', borderRadius: '10px' }} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#34D399' }}>Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#94A3B8',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer'
                }}
              >✕</button>
            </div>

            <p style={{ color: '#94A3B8', fontSize: '13px', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Apple Safari lets you install AgroGuard directly without the App Store:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                padding: '12px 14px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  background: '#10B981',
                  color: '#0F172A',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '13px'
                }}>1</div>
                <div style={{ fontSize: '13px', color: '#E2E8F0' }}>
                  Tap the <strong style={{ color: '#38BDF8' }}>Share</strong> button (box with an arrow pointing up) at the bottom of Safari.
                </div>
              </div>

              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                padding: '12px 14px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  background: '#10B981',
                  color: '#0F172A',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '13px'
                }}>2</div>
                <div style={{ fontSize: '13px', color: '#E2E8F0' }}>
                  Scroll down and tap <strong style={{ color: '#34D399' }}>"Add to Home Screen" ➕</strong>.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              style={{
                width: '100%',
                marginTop: '18px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Global CSS animation helpers */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </>
  );
}
