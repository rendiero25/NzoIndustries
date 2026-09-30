"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker, LeafletMouseEvent } from "leaflet";

import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";

export type LatLng = { lat: number; lng: number };

interface LocationPickerProps {
  value: LatLng | null;
  onChange: (coords: LatLng) => void;
  /** Center to fly to when the user selects an area (only used before a manual pin). */
  center?: LatLng | null;
}

const JAKARTA: LatLng = { lat: -6.2088, lng: 106.8456 };

export function LocationPicker({ value, onChange, center }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const hasManualPinRef = useRef<boolean>(value != null);

  // Init the map once (client-only; Leaflet needs window).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      const start = value ?? center ?? JAKARTA;
      const map = L.map(containerRef.current).setView(
        [start.lat, start.lng],
        value || center ? 15 : 5,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([start.lat, start.lng], { draggable: true, icon }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        hasManualPinRef.current = true;
        onChange({ lat: p.lat, lng: p.lng });
      });
      map.on("click", (e: LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        hasManualPinRef.current = true;
        onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      mapRef.current = map;
      markerRef.current = marker;
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the user picks a new area, recenter — but only if they haven't manually pinned.
  useEffect(() => {
    if (!center || hasManualPinRef.current || !mapRef.current || !markerRef.current) return;
    mapRef.current.setView([center.lat, center.lng], 15);
    markerRef.current.setLatLng([center.lat, center.lng]);
    onChange(center);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.lat, center?.lng]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      hasManualPinRef.current = true;
      mapRef.current?.setView([p.lat, p.lng], 16);
      markerRef.current?.setLatLng([p.lat, p.lng]);
      onChange(p);
    });
  };

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-lg border border-[#e0e0e0]"
      />
      <div className="flex items-center justify-between">
        <Button type="button" variant="secondary" size="sm" onClick={useMyLocation}>
          Pakai lokasi saya
        </Button>
        <span className="text-[11px] text-[#9a9a9a]">
          {value
            ? `Pin: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
            : "Geser pin ke lokasi rumah (opsional)"}
        </span>
      </div>
    </div>
  );
}
