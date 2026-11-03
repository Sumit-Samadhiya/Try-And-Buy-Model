import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import NavigationRoundedIcon from '@mui/icons-material/NavigationRounded';
import TwoWheelerRoundedIcon from '@mui/icons-material/TwoWheelerRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { postData } from '../../services/FetchDjangoApiServices';
import useOrderEvents from '../../services/useOrderEvents';

// Haversine distance calculator in kilometers
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Custom modern SVG-based DivIcons for crisp display without missing PNG assets
const createBikeIcon = (heading = 0) =>
  L.divIcon({
    className: 'custom-leaflet-bike-marker',
    html: `
      <div style="
        position: relative;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(2, 132, 199, 0.25);
          animation: pulse-ring 2s infinite ease-out;
        "></div>
        <div style="
          position: relative;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #0284c7;
          border: 2px solid #ffffff;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${heading || 0}deg);
          transition: transform 0.4s ease;
        ">
          <span style="font-size: 18px; line-height: 1;">🛵</span>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });

const createCustomerIcon = () =>
  L.divIcon({
    className: 'custom-leaflet-home-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #16a34a;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 12px rgba(22, 163, 74, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="font-size: 17px; line-height: 1;">🏠</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });

export default function LiveRiderTrackingMap({
  orderId,
  open = true,
  onClose = () => {},
  embedded = false,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const routeLineRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderData, setOrderData] = useState(null);
  const [customerCoords, setCustomerCoords] = useState(null);
  const [riderCoords, setRiderCoords] = useState(null);
  const [riderInfo, setRiderInfo] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [routePolyline, setRoutePolyline] = useState(null);
  const [roadEtaDisplay, setRoadEtaDisplay] = useState(null);
  const [routingEngine, setRoutingEngine] = useState(null);

  // Load initial order and rider details
  const fetchTrackingDetails = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const res = await postData('settlement_detail', { order_id: orderId });
      if (res && res.status && res.data) {
        const d = res.data;
        setOrderData(d);

        // Extract customer coords
        if (d.customer_location?.latitude && d.customer_location?.longitude) {
          setCustomerCoords({
            lat: Number(d.customer_location.latitude),
            lng: Number(d.customer_location.longitude),
            address: d.customer_location.address_text || d.try_order?.address_text,
          });
        } else if (d.try_order?.latitude && d.try_order?.longitude) {
          setCustomerCoords({
            lat: Number(d.try_order.latitude),
            lng: Number(d.try_order.longitude),
            address: d.try_order.address_text,
          });
        }

        // Extract rider info & coords
        if (d.rider_info) {
          setRiderInfo(d.rider_info);
          if (d.rider_info.latitude && d.rider_info.longitude) {
            setRiderCoords({
              lat: Number(d.rider_info.latitude),
              lng: Number(d.rider_info.longitude),
              heading: 0,
            });
            setLastUpdated(d.rider_info.updated_at || new Date().toISOString());
          }
          if (d.rider_info.route_polyline && d.rider_info.route_polyline.length > 1) {
            setRoutePolyline(d.rider_info.route_polyline);
          }
          if (d.rider_info.eta_display) {
            setRoadEtaDisplay(d.rider_info.eta_display);
          }
          if (d.rider_info.routing_engine) {
            setRoutingEngine(d.rider_info.routing_engine);
          }
        }
      } else {
        setError(res?.message || 'Unable to load order tracking details.');
      }
    } catch (err) {
      setError('Connection error loading tracking map.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (open && orderId) {
      fetchTrackingDetails();
    }
  }, [open, orderId, fetchTrackingDetails]);

  // Fetch road turn-by-turn route and scooter ETA from OSRM
  const fetchRoadRoute = useCallback(async (rLat, rLng, cLat, cLng) => {
    if (!rLat || !rLng || !cLat || !cLng) return;
    try {
      const res = await postData('route_eta', {
        start_lat: rLat,
        start_lng: rLng,
        dest_lat: cLat,
        dest_lng: cLng,
      });
      if (res && res.status && res.data) {
        if (res.data.route_polyline && res.data.route_polyline.length > 1) {
          setRoutePolyline(res.data.route_polyline);
        }
        if (res.data.eta_display) {
          setRoadEtaDisplay(res.data.eta_display);
        }
        if (res.data.routing_engine) {
          setRoutingEngine(res.data.routing_engine);
        }
      }
    } catch (_) {}
  }, []);

  // Handle incoming live location broadcast over Django Channels WebSockets
  const handleOrderEvent = useCallback(
    (eventData, eventType) => {
      if (
        eventType === 'RIDER_LOCATION_UPDATED' ||
        (eventData && (eventData.lat !== undefined || eventData.latitude !== undefined))
      ) {
        const lat = Number(eventData.lat ?? eventData.latitude);
        const lng = Number(eventData.lng ?? eventData.longitude);
        const heading = Number(eventData.heading || 0);

        if (!isNaN(lat) && !isNaN(lng)) {
          setRiderCoords({ lat, lng, heading });
          setLastUpdated(new Date().toISOString());

          if (customerCoords?.lat && customerCoords?.lng) {
            fetchRoadRoute(lat, lng, customerCoords.lat, customerCoords.lng);
          }

          if (eventData.rider_name || eventData.bike_number || eventData.phone) {
            setRiderInfo((prev) => ({
              ...(prev || {}),
              name: eventData.rider_name || prev?.name,
              bike_number: eventData.bike_number || prev?.bike_number,
              phone: eventData.phone || prev?.phone,
            }));
          }
        }
      }
    },
    [customerCoords, fetchRoadRoute]
  );

  // Subscribe to order channel
  useOrderEvents(handleOrderEvent, open && !!orderId, orderId);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!open) return;
    if (!mapContainerRef.current) return;

    // Check if Leaflet map is already initialized on this DOM element
    if (!mapInstanceRef.current && !mapContainerRef.current._leaflet_id) {
      try {
        const defaultCenter = customerCoords
          ? [customerCoords.lat, customerCoords.lng]
          : riderCoords
          ? [riderCoords.lat, riderCoords.lng]
          : [28.6139, 77.209]; // Default Delhi NCR

        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 14,
          zoomControl: false,
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Tile layer: Geoapify Vector/Raster map if key is set, else OpenStreetMap
        const geoapifyKey = process.env.REACT_APP_GEOAPIFY_API_KEY;
        const tileUrl = geoapifyKey
          ? `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${geoapifyKey}`
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        L.tileLayer(tileUrl, {
          maxZoom: 19,
          attribution: geoapifyKey
            ? 'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | &copy; OpenStreetMap'
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        mapInstanceRef.current = map;
      } catch (e) {
        console.warn('Map initialization note:', e);
      }
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Invalidate size once visible
    setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (_) {}
    }, 200);

    // Update Customer Marker
    if (customerCoords) {
      const custLatLng = [customerCoords.lat, customerCoords.lng];
      if (!customerMarkerRef.current) {
        customerMarkerRef.current = L.marker(custLatLng, { icon: createCustomerIcon() })
          .addTo(map)
          .bindPopup(`<b>Delivery Address</b><br/>${customerCoords.address || 'Your home'}`);
      } else {
        customerMarkerRef.current.setLatLng(custLatLng);
      }
    }

    // Update Rider Marker
    if (riderCoords) {
      const riderLatLng = [riderCoords.lat, riderCoords.lng];
      if (!riderMarkerRef.current) {
        riderMarkerRef.current = L.marker(riderLatLng, {
          icon: createBikeIcon(riderCoords.heading),
        })
          .addTo(map)
          .bindPopup(`<b>🛵 DoorDrape Rider</b><br/>${riderInfo?.name || 'Assigned Rider'}`);
      } else {
        riderMarkerRef.current.setLatLng(riderLatLng);
        riderMarkerRef.current.setIcon(createBikeIcon(riderCoords.heading));
      }
    }

    // Draw turn-by-turn road route or straight dashed preview line and adjust bounds
    if (customerCoords && riderCoords) {
      const isTurnByTurn = routePolyline && routePolyline.length > 2;
      const latlngs = isTurnByTurn
        ? routePolyline
        : [
            [riderCoords.lat, riderCoords.lng],
            [customerCoords.lat, customerCoords.lng],
          ];

      if (!routeLineRef.current) {
        routeLineRef.current = L.polyline(latlngs, {
          color: '#0284c7',
          weight: isTurnByTurn ? 5 : 4,
          opacity: 0.85,
          dashArray: isTurnByTurn ? null : '8, 8',
        }).addTo(map);
      } else {
        routeLineRef.current.setLatLngs(latlngs);
        routeLineRef.current.setStyle({
          dashArray: isTurnByTurn ? null : '8, 8',
          weight: isTurnByTurn ? 5 : 4,
        });
      }

      try {
        map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50], maxZoom: 16 });
      } catch (_) {}
    } else if (customerCoords) {
      map.setView([customerCoords.lat, customerCoords.lng], 15);
    } else if (riderCoords) {
      map.setView([riderCoords.lat, riderCoords.lng], 15);
    }

    return () => {
      // Map cleanup on unmount
    };
  }, [open, customerCoords, riderCoords, riderInfo, routePolyline]);

  // Teardown map on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (_) {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const distanceKm =
    customerCoords && riderCoords
      ? calculateDistanceKm(
          riderCoords.lat,
          riderCoords.lng,
          customerCoords.lat,
          customerCoords.lng
        )
      : null;

  const content = (
    <Box sx={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      {/* Top Header & Status Banner */}
      <Box
        sx={{
          p: 2,
          bgcolor: '#0f172a',
          color: '#ffffff',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <TwoWheelerRoundedIcon sx={{ color: '#38bdf8' }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#f8fafc', fontSize: { xs: 16, sm: 18 } }}>
                Live Doorstep Delivery Tracking
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Order #{orderId} • Free OpenStreetMap Real-Time Radar
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              size="small"
              onClick={fetchTrackingDetails}
              sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}
              title="Refresh Location"
            >
              <RefreshRoundedIcon fontSize="small" />
            </IconButton>
            {!embedded && (
              <IconButton
                size="small"
                onClick={onClose}
                sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}
              >
                <CloseRoundedIcon />
              </IconButton>
            )}
          </Stack>
        </Stack>

        {/* Rider details & Distance strip */}
        <Box
          sx={{
            mt: 1.5,
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                Delivery Partner
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#f8fafc' }}>
                {riderInfo?.name || 'Partner Assigned'}
                {riderInfo?.bike_number ? ` • ${riderInfo.bike_number}` : ''}
              </Typography>
            </Grid>

            <Grid item xs={7} sm={4}>
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                Estimated Road ETA & Distance
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 800,
                  color: distanceKm !== null && distanceKm < 0.3 ? '#34d399' : '#38bdf8',
                }}
              >
                {distanceKm !== null && distanceKm < 0.1
                  ? 'Arriving at doorstep now!'
                  : roadEtaDisplay
                  ? roadEtaDisplay
                  : distanceKm !== null
                  ? `${distanceKm} km away`
                  : riderCoords
                  ? 'Tracking live coordinates...'
                  : 'Awaiting rider dispatch signal'}
              </Typography>
              {orderData?.try_order?.delivery_slot && (
                <Typography variant="caption" sx={{ color: '#38bdf8', display: 'block', fontSize: 11, mt: 0.3 }}>
                  Slot: {orderData.try_order.delivery_slot} • 15m Doorstep Trial
                </Typography>
              )}
            </Grid>

            <Grid item xs={5} sm={2} sx={{ textAlign: 'right' }}>
              {riderInfo?.phone && (
                <Button
                  component="a"
                  href={`tel:${riderInfo.phone}`}
                  size="small"
                  variant="outlined"
                  startIcon={<CallRoundedIcon fontSize="small" />}
                  sx={{
                    color: '#34d399',
                    borderColor: 'rgba(52, 211, 153, 0.4)',
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 2,
                    '&:hover': {
                      borderColor: '#34d399',
                      bgcolor: 'rgba(52, 211, 153, 0.1)',
                    },
                  }}
                >
                  Call
                </Button>
              )}
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Live Map Box */}
      <Box sx={{ position: 'relative', width: '100%', height: { xs: 340, sm: 420 }, bgcolor: '#e2e8f0' }}>
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(15, 23, 42, 0.65)',
              zIndex: 1000,
            }}
          >
            <CircularProgress size={36} sx={{ color: '#38bdf8' }} />
          </Box>
        )}

        {/* Map DOM Element */}
        <div
          ref={mapContainerRef}
          style={{ width: '100%', height: '100%', outline: 'none' }}
        />

        {/* Live indicator overlay */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            zIndex: 900,
          }}
        >
          <Chip
            size="small"
            label={
              riderCoords
                ? `🟢 Live GPS Active ${lastUpdated ? `· ${new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}`
                : '🟡 Awaiting Rider En-Route Coordinates'
            }
            sx={{
              bgcolor: 'rgba(15, 23, 42, 0.85)',
              color: '#f8fafc',
              fontWeight: 700,
              fontSize: 12,
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          />
        </Box>
      </Box>

      {/* Footer Info / Safety note */}
      <Box sx={{ p: 2, bgcolor: '#ffffff', borderTop: '1px solid #e5e7eb' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <HomeRoundedIcon sx={{ color: '#16a34a', fontSize: 20 }} />
          <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600 }}>
            {customerCoords?.address || orderData?.try_order?.address_text || 'Doorstep Delivery Location'}
          </Typography>
        </Stack>
      </Box>
    </Box>
  );

  if (embedded) {
    return (
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {content}
      </Paper>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
          bgcolor: '#0f172a',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>{content}</DialogContent>
    </Dialog>
  );
}
