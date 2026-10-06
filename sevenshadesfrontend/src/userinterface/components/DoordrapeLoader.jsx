import { BrandMark } from './BrandLogo';
import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * DoordrapeLoader - Luxury, responsive, branded loading component
 *
 * @param {Object} props
 * @param {boolean} [props.fullPage=false] - If true, renders a centered full-viewport glassmorphic loader
 * @param {boolean} [props.overlay=false] - If true, renders a centered semi-transparent backdrop overlay
 * @param {boolean} [props.dark] - If true, renders deep dark glassmorphism (defaults to true for delivery)
 * @param {string} [props.text] - Custom loading text / status message
 * @param {('storefront'|'admin'|'delivery'|'session')} [props.variant='storefront'] - Brand aesthetic variant
 * @param {string} [props.role='status'] - Accessibility role (defaults to 'status')
 * @param {string} [props.size='medium'] - 'small' | 'medium' | 'large' | 'inline'
 */
export default function DoordrapeLoader({
  fullPage = false,
  overlay = false,
  dark,
  text,
  variant = 'storefront',
  role = 'status',
  size = 'medium',
}) {
  const isDark = dark !== undefined ? dark : variant === 'delivery';
  // Theme configurations based on role/panel
  const configs = {
    storefront: {
      brandTitle: 'DOORDRAPE',
      tagline: 'Try & Buy Fashion at Your Doorstep',
      primaryColor: '#064e3b',
      accentColor: '#10b981',
      secondaryAccent: '#34d399',
      badgeBg: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
      glow: 'rgba(16, 185, 129, 0.35)',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    admin: {
      brandTitle: 'DOORDRAPE ADMIN',
      tagline: 'Enterprise Operations & Order Intelligence',
      primaryColor: '#0f172a',
      accentColor: '#059669',
      secondaryAccent: '#10b981',
      badgeBg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #064e3b 100%)',
      glow: 'rgba(5, 150, 105, 0.35)',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
    delivery: {
      brandTitle: 'DOORDRAPE RIDER',
      tagline: 'Live Route Dispatch & Doorstep Sync',
      primaryColor: '#0369a1',
      accentColor: '#0ea5e9',
      secondaryAccent: '#10b981',
      badgeBg: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 60%, #059669 100%)',
      glow: 'rgba(14, 165, 233, 0.35)',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
    },
    session: {
      brandTitle: 'DOORDRAPE AUTH',
      tagline: 'Securing Your Fashion Journey',
      primaryColor: '#064e3b',
      accentColor: '#10b981',
      secondaryAccent: '#6ee7b7',
      badgeBg: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #0f172a 100%)',
      glow: 'rgba(16, 185, 129, 0.35)',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
  };

  const current = configs[variant] || configs.storefront;
  const isSmall = size === 'small';
  const isLarge = size === 'large';
  const ringSize = isSmall ? 52 : isLarge ? 84 : 68;
  const iconScale = isSmall ? 0.75 : isLarge ? 1.2 : 1;

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: isSmall ? 2 : (fullPage || overlay) ? { xs: 3.5, sm: 4.5 } : 3,
        borderRadius: (fullPage || overlay) ? 4.5 : 3.5,
        bgcolor: (fullPage || overlay)
          ? (isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.94)')
          : 'transparent',
        boxShadow: (fullPage || overlay)
          ? (isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.12)'
              : '0 20px 45px -10px rgba(6, 78, 59, 0.16), 0 0 0 1px rgba(16, 185, 129, 0.1)')
          : 'none',
        backdropFilter: (fullPage || overlay) ? 'blur(16px)' : 'none',
        maxWidth: 420,
        width: '100%',
        position: 'relative',
      }}
    >
      {/* KEYFRAME ANIMATIONS INJECTION */}
      <style>{`
        @keyframes ddSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ddSpinReverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes ddPulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.92; filter: drop-shadow(0 0 8px ${current.glow}); }
          50% { transform: scale(1.06); opacity: 1; filter: drop-shadow(0 0 16px ${current.glow}); }
        }
        @keyframes ddShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes ddDotBounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* DUAL ORBITAL RINGS & CENTER BRAND BADGE */}
      <Box
        sx={{
          position: 'relative',
          width: ringSize,
          height: ringSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2.2,
        }}
      >
        {/* OUTER GLOWING CONTINUOUS SPINNER RING */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: current.accentColor,
            borderRightColor: current.secondaryAccent,
            borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(16, 185, 129, 0.12)',
            animation: 'ddSpin 1.1s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite',
          }}
        />

        {/* INNER COUNTER-ROTATING ACCENT RING */}
        <Box
          sx={{
            position: 'absolute',
            inset: 6,
            borderRadius: '50%',
            border: `2px dashed ${isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(16, 185, 129, 0.35)'}`,
            borderTopColor: current.secondaryAccent,
            animation: 'ddSpinReverse 2.2s linear infinite',
          }}
        />

        {/* CENTER LUXURY BRAND BADGE WITH ICON */}
        <Box
          sx={{
            width: ringSize - 22,
            height: ringSize - 22,
            borderRadius: '50%',
            background: current.badgeBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 14px ${current.glow}`,
            animation: 'ddPulseGlow 2.4s ease-in-out infinite',
            transform: `scale(${iconScale})`,
          }}
        >
          <BrandMark size={28} />
        </Box>
      </Box>

      {/* BRAND TITLE WITH MODERN LETTER-SPACING */}
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 900,
          letterSpacing: 2.5,
          color: isDark ? '#f8fafc' : current.primaryColor,
          fontSize: isSmall ? 11 : 13,
          lineHeight: 1.2,
          textTransform: 'uppercase',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {current.brandTitle}
      </Typography>

      {/* MAIN LOADING MESSAGE OR ACTIVE STATUS */}
      <Typography
        variant="body2"
        sx={{
          mt: 0.6,
          fontWeight: 700,
          color: isDark ? '#94a3b8' : '#334155',
          fontSize: isSmall ? 12 : 14,
        }}
      >
        {text || current.tagline}
      </Typography>

      {/* SLIM NEON SHIMMER PROGRESS BAR */}
      <Box
        sx={{
          width: isSmall ? 100 : 150,
          height: 3,
          bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(16, 185, 129, 0.15)',
          borderRadius: 2,
          mt: 1.8,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '50%',
            background: `linear-gradient(90deg, transparent, ${current.accentColor}, ${current.secondaryAccent}, transparent)`,
            borderRadius: 2,
            animation: 'ddShimmer 1.4s infinite ease-in-out',
          }}
        />
      </Box>

      {/* THREE PULSING DOTS */}
      <Box sx={{ display: 'flex', gap: 0.6, mt: 1 }}>
        <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: current.accentColor, animation: 'ddDotBounce 1.4s infinite ease-in-out', animationDelay: '-0.32s' }} />
        <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: current.accentColor, animation: 'ddDotBounce 1.4s infinite ease-in-out', animationDelay: '-0.16s' }} />
        <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: current.accentColor, animation: 'ddDotBounce 1.4s infinite ease-in-out' }} />
      </Box>
    </Box>
  );

  if (overlay) {
    return (
      <Box
        role={role}
        aria-live="polite"
        aria-label={text || current.tagline}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          bgcolor: isDark ? 'rgba(2, 6, 23, 0.72)' : 'rgba(255, 255, 255, 0.78)',
          backdropFilter: 'blur(8px)',
          zIndex: 1200,
          borderRadius: 'inherit',
        }}
      >
        {content}
      </Box>
    );
  }

  if (fullPage) {
    return (
      <Box
        role={role}
        aria-live="polite"
        aria-label={text || current.tagline}
        sx={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          background: isDark
            ? 'radial-gradient(circle at 50% 30%, #0f172a 0%, #020617 80%, #000000 100%)'
            : 'radial-gradient(circle at 50% 30%, #f0fdf4 0%, #f8fafc 70%, #ffffff 100%)',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }}
      >
        {content}
      </Box>
    );
  }

  return (
    <Box
      role={role}
      aria-live="polite"
      aria-label={text || current.tagline}
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: isSmall ? 2 : 4,
      }}
    >
      {content}
    </Box>
  );
}
