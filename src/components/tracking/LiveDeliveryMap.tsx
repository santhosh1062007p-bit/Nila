'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bike, Navigation, MapPin, Store, Compass, RefreshCw, AlertCircle } from 'lucide-react';
import { BAKERY_COORDINATES } from '@/data/initial-data';
import { DeliveryPartner, DeliveryLocationUpdate } from '@/types';
import 'leaflet/dist/leaflet.css';

interface LiveDeliveryMapProps {
  orderId: string;
  orderStatus: string;
  customerAddress?: {
    address_line1?: string;
    city?: string;
    pincode?: string;
    area_locality?: string;
  } | null;
  deliveryPartner?: DeliveryPartner | null;
  liveLocation?: DeliveryLocationUpdate | null;
  destinationCoords?: { lat: number; lng: number } | null;
}

// Fallback coordinate lookup for Theni areas if exact GPS not in address
function getTheniDestinationCoords(pincode?: string | null, areaName?: string): { lat: number; lng: number } {
  const pin = pincode?.trim();
  if (pin === '625512') return { lat: 10.0160, lng: 77.4850 }; // Allinagaram
  if (pin === '625534') return { lat: 10.1180, lng: 77.5480 }; // Periyakulam
  if (pin === '625516') return { lat: 10.0110, lng: 77.3490 }; // Bodinayakanur
  if (pin === '625513') return { lat: 9.8400, lng: 77.3820 };  // Chinnamanur
  if (pin === '625517') return { lat: 9.7340, lng: 77.2810 };  // Cumbum
  if (pin === '625530') return { lat: 9.8050, lng: 77.3320 };  // Uthamapalayam
  return { lat: 10.0145, lng: 77.4810 }; // Default Theni Town Destination
}

export default function LiveDeliveryMap({
  orderId,
  orderStatus,
  customerAddress,
  deliveryPartner,
  liveLocation,
  destinationCoords,
}: LiveDeliveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const riderMarkerRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(liveLocation?.distance_remaining_km ?? null);
  const [etaMins, setEtaMins] = useState<number | null>(liveLocation?.eta_minutes ?? null);
  const [lastUpdate, setLastUpdate] = useState<string>(liveLocation?.timestamp || '');

  const bakeryLat = BAKERY_COORDINATES.lat;
  const bakeryLng = BAKERY_COORDINATES.lng;

  const destCoords =
    destinationCoords ||
    getTheniDestinationCoords(customerAddress?.pincode, customerAddress?.area_locality);

  // Active rider coordinates (fallback to intermediate point if rider assigned but no GPS update yet)
  const isOutForDelivery =
    orderStatus === 'Out for Delivery' ||
    orderStatus === 'Arriving Soon' ||
    orderStatus === 'Picked Up';

  const riderLat = liveLocation?.lat ?? deliveryPartner?.current_lat ?? (isOutForDelivery ? 10.0120 : bakeryLat);
  const riderLng = liveLocation?.lng ?? deliveryPartner?.current_lng ?? (isOutForDelivery ? 77.4785 : bakeryLng);

  useEffect(() => {
    let isMounted = true;

    async function initLeaflet() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = await import('leaflet');

      if (!isMounted || !mapContainerRef.current) return;

      // Fix default Leaflet icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Initialize map centered between bakery and customer
      const midLat = (bakeryLat + destCoords.lat) / 2;
      const midLng = (bakeryLng + destCoords.lng) / 2;

      const map = L.map(mapContainerRef.current, {
        center: [midLat, midLng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap standard tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // 1. Bakery Custom Marker
      const bakeryIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div style="background-color: #831843; color: white; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(131, 24, 67, 0.45); border: 2.5px solid white;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      L.marker([bakeryLat, bakeryLng], { icon: bakeryIcon })
        .addTo(map)
        .bindPopup(`<strong>${BAKERY_COORDINATES.name}</strong><br/>Fresh Bakery Kitchen`);

      // 2. Customer Destination Custom Marker
      const destIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div style="background-color: #047857; color: white; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(4, 120, 87, 0.45); border: 2.5px solid white;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      L.marker([destCoords.lat, destCoords.lng], { icon: destIcon })
        .addTo(map)
        .bindPopup(`<strong>Delivery Destination</strong><br/>${customerAddress?.address_line1 || 'Customer Address'}`);

      // 3. Delivery Rider Moving Marker
      const riderIcon = L.divIcon({
        className: 'custom-map-icon rider-pulse-marker',
        html: `
          <div style="position: relative;">
            <div style="position: absolute; top: -6px; left: -6px; width: 52px; height: 52px; border-radius: 50%; background: rgba(234, 88, 12, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="background-color: #ea580c; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.5); border: 3px solid white; position: relative; z-index: 2;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const riderMarker = L.marker([riderLat, riderLng], { icon: riderIcon }).addTo(map);
      riderMarker.bindPopup(`<strong>${deliveryPartner?.name || 'Delivery Partner'}</strong><br/>Vehicle: ${deliveryPartner?.vehicle_number || 'Cake Delivery'}`);
      riderMarkerRef.current = riderMarker;

      // 4. Connecting Route Line
      const routeLine = L.polyline(
        [
          [bakeryLat, bakeryLng],
          [riderLat, riderLng],
          [destCoords.lat, destCoords.lng],
        ],
        {
          color: '#e11d48',
          weight: 4,
          opacity: 0.8,
          dashArray: '8, 8',
          lineCap: 'round',
        }
      ).addTo(map);
      routePolylineRef.current = routeLine;

      // Fit bounds to show bakery, rider, and destination
      map.fitBounds([
        [bakeryLat, bakeryLng],
        [riderLat, riderLng],
        [destCoords.lat, destCoords.lng],
      ], { padding: [40, 40] });

      mapInstanceRef.current = map;
      setMapLoaded(true);
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Smoothly update rider marker position and polyline when liveLocation props change
  useEffect(() => {
    if (!mapInstanceRef.current || !riderMarkerRef.current || !liveLocation) return;

    const newLatLng = [liveLocation.lat, liveLocation.lng];
    riderMarkerRef.current.setLatLng(newLatLng);

    if (routePolylineRef.current) {
      routePolylineRef.current.setLatLngs([
        [bakeryLat, bakeryLng],
        newLatLng,
        [destCoords.lat, destCoords.lng],
      ]);
    }

    if (liveLocation.distance_remaining_km !== undefined && liveLocation.distance_remaining_km !== null) {
      setDistanceKm(liveLocation.distance_remaining_km);
    }
    if (liveLocation.eta_minutes !== undefined && liveLocation.eta_minutes !== null) {
      setEtaMins(liveLocation.eta_minutes);
    }
    if (liveLocation.timestamp) {
      setLastUpdate(new Date(liveLocation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, [liveLocation, bakeryLat, bakeryLng, destCoords.lat, destCoords.lng]);

  const hasLiveGps = Boolean(liveLocation && liveLocation.lat && isOutForDelivery);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-rose-100 shadow-md bg-stone-50">
      {/* Top Floating Live GPS Pill */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-rose-100 shadow-sm">
        <div className="flex items-center gap-2">
          {hasLiveGps ? (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          ) : (
            <span className="h-3 w-3 rounded-full bg-amber-400"></span>
          )}
          <span className="text-xs font-bold text-gray-900 tracking-tight">
            {hasLiveGps ? 'Live GPS Tracking Active' : 'Real-Time Delivery Route'}
          </span>
        </div>

        {deliveryPartner && (
          <div className="flex items-center gap-2 text-xs text-gray-700 bg-rose-50/80 px-2.5 py-1 rounded-lg border border-rose-100">
            <Bike className="w-3.5 h-3.5 text-rose-600" />
            <span className="font-semibold text-rose-950">{deliveryPartner.name}</span>
            <span className="text-[10px] text-rose-600/80">({deliveryPartner.vehicle_number})</span>
          </div>
        )}
      </div>

      {/* Leaflet Map Div */}
      <div ref={mapContainerRef} className="w-full h-72 sm:h-96 z-0" />

      {/* Bottom Live Metrics Banner */}
      <div className="p-3.5 bg-white border-t border-rose-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-rose-600" />
            <div>
              <div className="text-[10px] text-gray-700 uppercase font-bold tracking-wider">Remaining</div>
              <div className="text-sm font-black text-gray-900">
                {distanceKm !== null ? `${distanceKm} km` : isOutForDelivery ? '1.8 km' : 'At Bakery'}
              </div>
            </div>
          </div>

          <div className="h-7 w-[1px] bg-rose-100" />

          <div className="flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-emerald-600" />
            <div>
              <div className="text-[10px] text-gray-700 uppercase font-bold tracking-wider">Estimated Arrival</div>
              <div className="text-sm font-black text-emerald-700">
                {etaMins !== null ? `${etaMins} mins` : isOutForDelivery ? '6-8 mins' : 'Preparing'}
              </div>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] text-gray-700">Theni Bakery Kitchen</div>
          <div className="text-[11px] font-semibold text-rose-800 flex items-center gap-1 justify-end">
            <Store className="w-3 h-3 text-rose-600" />
            Nila&apos;s Treat
          </div>
        </div>
      </div>
    </div>
  );
}
