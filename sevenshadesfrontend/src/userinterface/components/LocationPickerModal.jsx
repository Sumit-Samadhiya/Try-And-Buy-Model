import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { reverseGeocode } from '../../services/reverseGeocodeService';

const createDraggableIcon = () =>
  L.divIcon({
    className: 'custom-picker-pin',
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
      ">
        <div style="
          width: 38px;
          height: 38px;
          border-radius: 50% 50% 50% 0;
          background: #ef4444;
          transform: rotate(-45deg);
          border: 2px solid #ffffff;
          box-shadow: 0 4px 14px rgba(239, 68, 68, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #ffffff;
          "></div>
        </div>
        <div style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(0,0,0,0.3);
          margin-top: -4px;
          filter: blur(1px);
        "></div>
      </div>
    `,
    iconSize: [38, 48],
    iconAnchor: [0, 0],
  });

// Quick shortcut hubs for DoorDrape's active areas (Jhansi region)
const JHANSI_HUBS = [
  { label: '📍 Baragaon (284121)', lat: 25.5184, lng: 78.6821 },
  { label: '📍 Sadar Bazar (284001)', lat: 25.4384, lng: 78.5721 },
  { label: '📍 Sipri Bazar (284002)', lat: 25.4542, lng: 78.5582 },
  { label: '📍 Medical College (284003)', lat: 25.4215, lng: 78.5492 },
  { label: '📍 Babina Cantt (284128)', lat: 25.2372, lng: 78.4732 },
];

export default function LocationPickerModal({
  open,
  onClose,
  initialLat,
  initialLng,
  initialCity,
  onConfirmLocation,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Default to Jhansi Baragaon if coords are missing or default
  const defaultLat = initialLat && !isNaN(initialLat) ? Number(initialLat) : 25.5184;
  const defaultLng = initialLng && !isNaN(initialLng) ? Number(initialLng) : 78.6821;

  const [currentCoords, setCurrentCoords] = useState({ lat: defaultLat, lng: defaultLng });
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const [resolving, setResolving] = useState(false);

  // Reverse geocode when coords change
  const resolveLocationDetails = useCallback(async (lat, lng) => {
    try {
      setResolving(true);
      const res = await reverseGeocode(lat, lng);
      setResolvedAddress(res);
    } catch (err) {
      console.warn('Map reverse geocode notice:', err);
    } finally {
      setResolving(false);
    }
  }, []);

  // Update marker position and reverse geocode
  const setPinPosition = useCallback(
    (lat, lng, panMap = true) => {
      setCurrentCoords({ lat, lng });
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
      if (panMap && mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], 15);
      }
      resolveLocationDetails(lat, lng);
    },
    [resolveLocationDetails]
  );

  // Initialize Map
  useEffect(() => {
    if (!open || !mapContainerRef.current) return;

    if (!mapInstanceRef.current && !mapContainerRef.current._leaflet_id) {
      try {
        const map = L.map(mapContainerRef.current, {
          center: [defaultLat, defaultLng],
          zoom: 14,
          zoomControl: false,
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        const marker = L.marker([defaultLat, defaultLng], {
          icon: createDraggableIcon(),
          draggable: true,
        }).addTo(map);

        marker.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          setPinPosition(newPos.lat, newPos.lng, false);
        });

        map.on('click', (e) => {
          setPinPosition(e.latlng.lat, e.latlng.lng, false);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;

        // Resolve initial position
        resolveLocationDetails(defaultLat, defaultLng);
      } catch (err) {
        console.warn('Picker map initialization note:', err);
      }
    }

    setTimeout(() => {
      try {
        mapInstanceRef.current?.invalidateSize();
      } catch (_) {}
    }, 200);
  }, [open, defaultLat, defaultLng, setPinPosition, resolveLocationDetails]);

  // Teardown map on modal close
  useEffect(() => {
    if (!open && mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (_) {}
      mapInstanceRef.current = null;
      markerRef.current = null;
    }
  }, [open]);

  const handleConfirm = () => {
    onConfirmLocation({
      latitude: currentCoords.lat,
      longitude: currentCoords.lng,
      city: resolvedAddress?.city || initialCity || 'Jhansi',
      state: resolvedAddress?.state || 'Uttar Pradesh',
      postcode: resolvedAddress?.postcode || '',
      street: resolvedAddress?.street || '',
      formattedAddress: resolvedAddress?.formattedAddress || '',
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: '#ffffff',
        },
      }}
    >
      <DialogTitle sx={{ p: 2, bgcolor: '#0f172a', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <PlaceRoundedIcon sx={{ color: '#ef4444' }} />
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#f8fafc', fontSize: 17 }}>
            Pinpoint Exact Delivery Location
          </Typography>
        </Stack>
        <IconButton size="small" onClick={onClose} sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}>
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Quick Location Shortcuts */}
        <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', display: 'block', mb: 0.8 }}>
            Quick Jump to Hub / Locality (Click to snap):
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
            {JHANSI_HUBS.map((hub) => (
              <Chip
                key={hub.label}
                label={hub.label}
                size="small"
                onClick={() => setPinPosition(hub.lat, hub.lng, true)}
                sx={{
                  bgcolor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#1e293b',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' },
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Map Container */}
        <Box sx={{ position: 'relative', width: '100%', height: 320, bgcolor: '#e2e8f0' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', outline: 'none' }} />
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              zIndex: 900,
              bgcolor: 'rgba(15, 23, 42, 0.85)',
              color: '#f8fafc',
              px: 1.5,
              py: 0.6,
              borderRadius: 2,
              fontSize: 11,
              fontWeight: 600,
              backdropFilter: 'blur(6px)',
            }}
          >
            👆 Click or drag pin to your exact building/gate
          </Box>
        </Box>

        {/* Resolved Location Details Display */}
        <Box sx={{ p: 2, bgcolor: '#ffffff' }}>
          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>
            Selected Doorstep Location:
          </Typography>
          {resolving ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Resolving address from map pin...
              </Typography>
            </Stack>
          ) : (
            <Box sx={{ mt: 0.5 }}>
              <Typography variant="body1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {resolvedAddress?.city || 'Jhansi'}{' '}
                {resolvedAddress?.postcode ? `• PIN ${resolvedAddress.postcode}` : ''}
              </Typography>
              <Typography variant="body2" sx={{ color: '#475569', mt: 0.3 }}>
                {resolvedAddress?.street || 'Pinned Location'} ·{' '}
                <span style={{ color: '#059669', fontWeight: 600 }}>
                  ({Number(currentCoords.lat).toFixed(4)}, {Number(currentCoords.lng).toFixed(4)})
                </span>
              </Typography>
            </Box>
          )}

          <Button
            variant="contained"
            fullWidth
            onClick={handleConfirm}
            startIcon={<CheckCircleRoundedIcon />}
            sx={{
              mt: 2,
              py: 1.2,
              fontWeight: 700,
              bgcolor: '#0f172a',
              borderRadius: 2,
              textTransform: 'none',
              '&:hover': { bgcolor: '#1e293b' },
            }}
          >
            Confirm & Use This Location
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
