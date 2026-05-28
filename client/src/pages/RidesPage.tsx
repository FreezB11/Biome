import { Bell, Clock, Crosshair, Home, MapPin, Menu, Mic, RotateCcw, Star, ShoppingCart, Briefcase, House, Pizza, User, CarFront, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OsmMapView } from '@/components/Map';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ordersAPI, ridesAPI } from '@/services/api';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import L from 'leaflet';

export default function RidesPage() {
  const [, setLocation] = useLocation();
  const mapRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.CircleMarker | null>(null);
  const dropMarkerRef = useRef<L.CircleMarker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const lastUserMapActionAtRef = useRef(0);

  const [pickup, setPickup] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoff, setDropoff] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupText, setPickupText] = useState('');
  const [dropoffText, setDropoffText] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [activeField, setActiveField] = useState<'pickup' | 'dropoff'>('pickup');
  const [isLoading, setIsLoading] = useState(false);
  const [activeType, setActiveType] = useState<'bike' | 'auto' | 'cab' | 'premium'>('bike');
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [mapReadyTick, setMapReadyTick] = useState(0);
  const [quotes, setQuotes] = useState<
    Array<{
      id: string;
      provider: 'Uber' | 'Ola' | 'Rapido' | 'ONDC';
      type: 'bike' | 'auto' | 'cab' | 'premium';
      fare: number;
      etaMinutes: number;
      driverRating: number;
      distanceKm: number;
      surgeMultiplier?: number;
      deeplinkUrl: string;
    }>
  >([]);

  const initialCenter = useMemo(() => ({ lat: 12.97998, lng: 77.57708 }), []);
  const filteredQuotes = useMemo(() => quotes.filter((q) => q.type === activeType), [quotes, activeType]);
  const selected = useMemo(() => quotes.find((q) => q.id === selectedQuoteId) ?? null, [quotes, selectedQuoteId]);
  const bestPriceId = useMemo(() => {
    let best: { id: string; fare: number } | null = null;
    for (const q of filteredQuotes) {
      if (!best || q.fare < best.fare) best = { id: q.id, fare: q.fare };
    }
    return best?.id ?? null;
  }, [filteredQuotes]);
  const fastestId = useMemo(() => {
    let best: { id: string; eta: number } | null = null;
    for (const q of filteredQuotes) {
      if (!best || q.etaMinutes < best.eta) best = { id: q.id, eta: q.etaMinutes };
    }
    return best?.id ?? null;
  }, [filteredQuotes]);

  const clearRoute = () => {
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }
  };

  const pickupRef = useRef(pickup);
  const dropoffRef = useRef(dropoff);
  useEffect(() => {
    pickupRef.current = pickup;
  }, [pickup]);
  useEffect(() => {
    dropoffRef.current = dropoff;
  }, [dropoff]);

  const selectModeRef = useRef(selectMode);
  const activeFieldRef = useRef(activeField);
  useEffect(() => {
    selectModeRef.current = selectMode;
  }, [selectMode]);
  useEffect(() => {
    activeFieldRef.current = activeField;
  }, [activeField]);

  const updateMarker = (
    which: 'pickup' | 'dropoff',
    point: { lat: number; lng: number }
  ) => {
    if (!mapRef.current) return;
    const marker = L.circleMarker([point.lat, point.lng], {
      radius: 9,
      color: which === 'pickup' ? '#f97316' : '#ef4444',
      weight: 3,
      fillColor: '#ffffff',
      fillOpacity: 1,
    }).addTo(mapRef.current);
    if (which === 'pickup') {
      pickupMarkerRef.current?.remove();
      pickupMarkerRef.current = marker;
    } else {
      dropMarkerRef.current?.remove();
      dropMarkerRef.current = marker;
    }
  };

  const fitToMarkers = (p: { lat: number; lng: number } | null, d: { lat: number; lng: number } | null) => {
    if (!mapRef.current) return;
    if (Date.now() - lastUserMapActionAtRef.current < 900) return;
    if (p && d) {
      const bounds = L.latLngBounds([p.lat, p.lng], [d.lat, d.lng]);
      mapRef.current.fitBounds(bounds, { padding: [42, 42] });
      return;
    }
    const point = p ?? d;
    if (point) mapRef.current.setView([point.lat, point.lng], Math.max(mapRef.current.getZoom(), 15));
  };

  const renderRoute = async (
    p: { lat: number; lng: number },
    d: { lat: number; lng: number },
    opts?: { forceFit?: boolean }
  ) => {
    if (!mapRef.current) return;
    clearRoute();

    let latLngs: Array<[number, number]> = [
      [p.lat, p.lng],
      [d.lat, d.lng],
    ];
    try {
      const data = await ridesAPI.getRoute(p, d);
      const coords = data?.geometry?.coordinates;
      if (Array.isArray(coords) && coords.length > 1) {
        latLngs = coords
          .map((c: any) => (Array.isArray(c) && c.length >= 2 ? [Number(c[1]), Number(c[0])] : null))
          .filter((x: any): x is [number, number] => Array.isArray(x) && Number.isFinite(x[0]) && Number.isFinite(x[1]));
      }
    } catch {
      latLngs = [
        [p.lat, p.lng],
        [d.lat, d.lng],
      ];
    }

    const poly = L.polyline(latLngs, { color: "#111827", weight: 4, opacity: 0.9 }).addTo(mapRef.current);
    routeLineRef.current = poly;
    const allowAutoFit =
      opts?.forceFit === true || Date.now() - lastUserMapActionAtRef.current >= 900;
    if (allowAutoFit) mapRef.current.fitBounds(poly.getBounds(), { padding: [42, 42] });
  };

  const applyPoint = async (
    which: 'pickup' | 'dropoff',
    point: { lat: number; lng: number },
    opts?: { label?: string; doReverse?: boolean; forcePan?: boolean }
  ) => {
    const doReverse = opts?.doReverse ?? false;
    if (which === 'pickup') setPickup(point);
    else setDropoff(point);
    updateMarker(which, point);
    if (opts?.forcePan) lastUserMapActionAtRef.current = 0;
    fitToMarkers(which === 'pickup' ? point : pickupRef.current, which === 'dropoff' ? point : dropoffRef.current);

    if (typeof opts?.label === 'string' && opts.label.trim()) {
      if (which === 'pickup') setPickupText(opts.label);
      else setDropoffText(opts.label);
      return;
    }

    if (!doReverse) return;

    try {
      const r = await ridesAPI.reverseGeocode(point.lat, point.lng);
      const label = typeof r?.display_name === 'string' ? r.display_name : `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
      if (which === 'pickup') setPickupText(label);
      else setDropoffText(label);
    } catch {
      if (which === 'pickup') setPickupText(`${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`);
      else setDropoffText(`${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`);
    }
  };

  const geocodeToPoint = async (q: string): Promise<{ lat: number; lng: number } | null> => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return null;
    const data = await ridesAPI.geocode(trimmed);
    const items = Array.isArray(data?.items) ? (data.items as any[]) : [];
    const first = items[0];
    const lat = first?.lat ? Number(first.lat) : NaN;
    const lng = first?.lon ? Number(first.lon) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  };

  const geocodeToPointWithLabel = async (q: string): Promise<{ point: { lat: number; lng: number }; label?: string } | null> => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return null;
    const data = await ridesAPI.geocode(trimmed);
    const items = Array.isArray(data?.items) ? (data.items as any[]) : [];
    const first = items[0];
    const lat = first?.lat ? Number(first.lat) : NaN;
    const lng = first?.lon ? Number(first.lon) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const label = typeof first?.display_name === 'string' ? first.display_name : undefined;
    return { point: { lat, lng }, label };
  };

  const runEstimate = async (p: { lat: number; lng: number }, d: { lat: number; lng: number }) => {
    setIsLoading(true);
    try {
      const resp = await ridesAPI.getFareEstimate(p, d);
      setQuotes(resp.quotes || []);
      setSelectedQuoteId(null);
    } catch {
      setQuotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!mapRef.current) return;
    if (pickup) updateMarker('pickup', pickup);
    if (dropoff) updateMarker('dropoff', dropoff);
    fitToMarkers(pickup, dropoff);
    if (pickup && dropoff) void renderRoute(pickup, dropoff);
  }, [mapReadyTick]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (pickup) updateMarker('pickup', pickup);
    fitToMarkers(pickup, dropoff);
  }, [pickup?.lat, pickup?.lng]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (dropoff) updateMarker('dropoff', dropoff);
    fitToMarkers(pickup, dropoff);
  }, [dropoff?.lat, dropoff?.lng]);

  useEffect(() => {
    if (!pickup || !dropoff) return;
    if (!mapRef.current) return;
    const t = window.setTimeout(async () => {
      try {
        await renderRoute(pickup, dropoff);
      } catch {
        return;
      }
    }, 100);
    return () => window.clearTimeout(t);
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, mapReadyTick]);

  const pickupTextRef = useRef(pickupText);
  const dropoffTextRef = useRef(dropoffText);
  useEffect(() => {
    pickupTextRef.current = pickupText;
  }, [pickupText]);
  useEffect(() => {
    dropoffTextRef.current = dropoffText;
  }, [dropoffText]);

  useEffect(() => {
    const q = pickupText.trim();
    if (q.length < 2) return;
    const t = window.setTimeout(async () => {
      if (pickupTextRef.current.trim() !== q) return;
      try {
        const result = await geocodeToPointWithLabel(q);
        if (!result) return;
        await applyPoint('pickup', result.point, { label: result.label, doReverse: false });
      } catch {
        return;
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [pickupText]);

  useEffect(() => {
    const q = dropoffText.trim();
    if (q.length < 2) return;
    const t = window.setTimeout(async () => {
      if (dropoffTextRef.current.trim() !== q) return;
      try {
        const result = await geocodeToPointWithLabel(q);
        if (!result) return;
        await applyPoint('dropoff', result.point, { label: result.label, doReverse: false });
      } catch {
        return;
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [dropoffText]);

  return (
    <div className="mobile-stage">
      <div className="fit-shell">
        <div className="phone-screen">
          <section className="screen" style={{ paddingTop: 16, paddingBottom: 28 }}>
            <div className="app-topbar">
              <button className="app-icon-circle" type="button" aria-label="Menu" onClick={() => setLocation('/home')}>
                <Menu size={22} strokeWidth={2.2} />
              </button>
              <div className="app-searchbar" role="search">
                <input className="app-searchbar-input" placeholder="Type briefly what you want" />
                <button className="app-icon-ghost" type="button" aria-label="Voice">
                  <Mic size={18} strokeWidth={2.4} />
                </button>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button className="app-icon-ghost" type="button" aria-label="Notifications" onClick={() => setLocation('/history')}>
                  <Bell size={20} strokeWidth={2.2} />
                </button>
                <button className="app-icon-ghost" type="button" aria-label="Cart" onClick={() => setLocation('/history')}>
                  <ShoppingCart size={20} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="rounded-[34px] bg-white/95 border border-black/5 shadow-[0_22px_60px_rgba(67,46,27,0.16)] p-4">
                <div className="grid gap-3">
                  <button
                    type="button"
                    className={`rounded-2xl bg-slate-100/70 border border-slate-200 px-4 py-4 flex items-center gap-3 text-left ${activeField === 'pickup' ? 'ring-2 ring-orange-400/60' : ''}`}
                    onClick={() => setActiveField('pickup')}
                  >
                    <MapPin className="w-5 h-5 text-orange-600" />
                    <input
                      className="w-full bg-transparent outline-none font-semibold text-foreground placeholder:text-muted-foreground"
                      placeholder="Pickup"
                      value={pickupText}
                      onChange={(e) => setPickupText(e.target.value)}
                      onFocus={() => setActiveField('pickup')}
                      onKeyDown={async (e) => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        try {
                          const p = await geocodeToPoint(pickupText);
                          if (!p) throw new Error('NO_RESULTS');
                          await applyPoint('pickup', p, { doReverse: true });
                        } catch {
                          toast.error('Could not find pickup.');
                        }
                      }}
                    />
                  </button>
                  <button
                    type="button"
                    className={`rounded-2xl bg-slate-100/70 border border-slate-200 px-4 py-4 flex items-center gap-3 text-left ${activeField === 'dropoff' ? 'ring-2 ring-orange-400/60' : ''}`}
                    onClick={() => setActiveField('dropoff')}
                  >
                    <MapPin className="w-5 h-5 text-red-500" />
                    <input
                      className="w-full bg-transparent outline-none font-semibold text-foreground placeholder:text-muted-foreground"
                      placeholder="Drop"
                      value={dropoffText}
                      onChange={(e) => setDropoffText(e.target.value)}
                      onFocus={() => setActiveField('dropoff')}
                      onKeyDown={async (e) => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        try {
                          const p = await geocodeToPoint(dropoffText);
                          if (!p) throw new Error('NO_RESULTS');
                          await applyPoint('dropoff', p, { doReverse: true });
                        } catch {
                          toast.error('Could not find drop.');
                        }
                      }}
                    />
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 rounded-2xl bg-slate-100/70 border border-slate-200 px-3 py-3 font-bold text-sm text-foreground flex items-center justify-center gap-2"
                      onClick={() => {
                        const saved = window.localStorage.getItem('rides_home');
                        if (!saved) return;
                        try {
                          const parsed = JSON.parse(saved) as { lat: number; lng: number; label?: string };
                            void applyPoint(activeField, { lat: parsed.lat, lng: parsed.lng }, { label: parsed.label, doReverse: false });
                          if (parsed.label) {
                            if (activeField === 'pickup') setPickupText(parsed.label);
                            else setDropoffText(parsed.label);
                          }
                        } catch {
                          return;
                        }
                      }}
                    >
                      <Home className="w-4 h-4" /> HOME
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-2xl bg-slate-100/70 border border-slate-200 px-3 py-3 font-bold text-sm text-foreground flex items-center justify-center gap-2"
                      onClick={() => {
                        const saved = window.localStorage.getItem('rides_work');
                        if (!saved) return;
                        try {
                          const parsed = JSON.parse(saved) as { lat: number; lng: number; label?: string };
                            void applyPoint(activeField, { lat: parsed.lat, lng: parsed.lng }, { label: parsed.label, doReverse: false });
                          if (parsed.label) {
                            if (activeField === 'pickup') setPickupText(parsed.label);
                            else setDropoffText(parsed.label);
                          }
                        } catch {
                          return;
                        }
                      }}
                    >
                      <Briefcase className="w-4 h-4" /> WORK
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-2xl bg-slate-100/70 border border-slate-200 px-3 py-3 font-bold text-sm text-foreground flex items-center justify-center gap-2"
                      onClick={() => {
                        const saved = window.localStorage.getItem('rides_last');
                        if (!saved) return;
                        try {
                          const parsed = JSON.parse(saved) as { lat: number; lng: number; label?: string };
                            void applyPoint(activeField, { lat: parsed.lat, lng: parsed.lng }, { label: parsed.label, doReverse: false });
                          if (parsed.label) {
                            if (activeField === 'pickup') setPickupText(parsed.label);
                            else setDropoffText(parsed.label);
                          }
                        } catch {
                          return;
                        }
                      }}
                    >
                      <RotateCcw className="w-4 h-4" /> LAST
                    </button>
                  </div>

                  <div className="grid gap-3">
                    <Button
                      className="w-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-extrabold"
                      disabled={!pickup || !dropoff || isLoading}
                      onClick={async () => {
                        if (!pickup || !dropoff) return;
                        try {
                          await renderRoute(pickup, dropoff, { forceFit: true });
                        } catch {
                          return;
                        }
                        await runEstimate(pickup, dropoff);
                        window.localStorage.setItem('rides_last', JSON.stringify({ ...(dropoff ?? pickup), label: dropoffText || pickupText }));
                      }}
                    >
                      {isLoading ? 'Requesting…' : 'Request a Ride'}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-full bg-black text-white hover:bg-black/90 font-extrabold"
                      type="button"
                      onClick={() => {
                        setSelectMode((v) => !v);
                        setActiveField('pickup');
                      }}
                    >
                      {selectMode ? 'Tap map: pickup then drop' : 'Select from the map'}
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 rounded-full"
                        type="button"
                        onClick={() => {
                          navigator.geolocation?.getCurrentPosition(
                            (pos) => {
                              const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                                void applyPoint('pickup', next, { doReverse: true, forcePan: true });
                              setActiveField('dropoff');
                              mapRef.current?.panTo([next.lat, next.lng]);
                            },
                            () => {
                              return;
                            }
                          );
                        }}
                      >
                        <Crosshair className="w-4 h-4" />
                        Pickup = me
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 rounded-full"
                        type="button"
                        onClick={() => {
                          setPickup(null);
                          setDropoff(null);
                          setPickupText('');
                          setDropoffText('');
                          setQuotes([]);
                          setSelectMode(false);
                          setActiveField('pickup');
                          pickupMarkerRef.current?.remove();
                          pickupMarkerRef.current = null;
                          dropMarkerRef.current?.remove();
                          dropMarkerRef.current = null;
                          clearRoute();
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-3xl overflow-hidden border border-black/10 bg-white">
                <OsmMapView
                  initialCenter={initialCenter}
                  initialZoom={14}
                  className="h-[320px] lg:h-[420px]"
                  onMapReady={(map: L.Map) => {
                    mapRef.current = map;
                    window.setTimeout(() => map.invalidateSize(), 50);
                    setMapReadyTick((t) => t + 1);
                    const touch = () => {
                      lastUserMapActionAtRef.current = Date.now();
                    };
                    map.on('movestart', touch);
                    map.on('zoomstart', touch);
                    map.on('dragstart', touch);
                    map.on('click', async (e: L.LeafletMouseEvent) => {
                      if (!selectModeRef.current) return;
                      const point = { lat: e.latlng.lat, lng: e.latlng.lng };
                      if (activeFieldRef.current === 'pickup') {
                        await applyPoint('pickup', point, { doReverse: true, forcePan: true });
                        setActiveField('dropoff');
                      } else {
                        await applyPoint('dropoff', point, { doReverse: true, forcePan: true });
                        setSelectMode(false);
                      }
                    });
                  }}
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm text-muted-foreground">Recommended for you</div>
              <div className="mt-3 flex items-center justify-between gap-2">
                {(['bike', 'auto', 'cab', 'premium'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`history-filter-pill ${activeType === t ? 'history-filter-pill-active' : ''}`}
                    onClick={() => setActiveType(t)}
                  >
                    {t === 'premium' ? 'SUV' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {!isLoading && pickup && dropoff && filteredQuotes.length === 0 && (
                <div className="py-10 text-center text-muted-foreground">No quotes returned.</div>
              )}

              <div className="mt-4 space-y-3">
                {filteredQuotes
                  .slice()
                  .sort((a, b) => a.fare - b.fare)
                  .map((ride) => {
                    const isBest = ride.id === bestPriceId;
                    const isFastest = ride.id === fastestId;
                    const isSelected = ride.id === selectedQuoteId;
                    const badge = isBest ? 'Best Price' : isFastest ? 'Fastest' : null;
                    return (
                      <div
                        key={ride.id}
                        className={`rounded-3xl border bg-white/95 p-4 shadow-sm transition-colors ${
                          isSelected ? 'border-orange-300 ring-2 ring-orange-200' : 'border-amber-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 grid place-items-center text-foreground font-extrabold">
                              {ride.provider === 'Rapido' ? 'R' : ride.provider === 'Uber' ? 'U' : ride.provider === 'Ola' ? 'O' : 'N'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="font-extrabold text-foreground truncate">{ride.provider}</div>
                                {badge ? (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                                      isBest ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'
                                    }`}
                                  >
                                    <BadgeCheck className="w-3.5 h-3.5" />
                                    {badge}
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5" /> {ride.driverRating.toFixed(1)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> {ride.etaMinutes} min away
                                </span>
                                <span>{ride.distanceKm} km</span>
                                {ride.surgeMultiplier ? <span>Surge x{ride.surgeMultiplier}</span> : null}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-lg font-extrabold text-foreground">₹{ride.fare.toLocaleString()}</div>
                            <Button
                              className="rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                              type="button"
                              onClick={() => {
                                setSelectedQuoteId(ride.id);
                              }}
                            >
                              Select
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {selected && pickup && dropoff ? (
              <div className="fixed inset-x-0 bottom-0 z-50 p-4 lg:p-6">
                <div className="mx-auto w-full max-w-[560px] rounded-[34px] border border-black/10 bg-white/95 shadow-[0_24px_80px_rgba(67,46,27,0.24)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-muted-foreground">Estimated Fare</div>
                      <div className="mt-1 text-2xl font-extrabold text-foreground">₹{selected.fare.toLocaleString()}</div>
                      <div className="mt-1 text-xs text-muted-foreground truncate">
                        {pickupText || 'Pickup'} → {dropoffText || 'Drop'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-foreground"
                      onClick={() => setSelectedQuoteId(null)}
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <Button
                      className="w-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-extrabold"
                      disabled={isConfirming}
                      onClick={async () => {
                        setIsConfirming(true);
                        try {
                          await ordersAPI.createOrder({
                            domain: 'rides',
                            provider: selected.provider,
                            title: `${selected.provider} ${selected.type.toUpperCase()} ride`,
                            itemUrl: selected.deeplinkUrl,
                            amount: { currency: 'INR', amount: Math.max(1, Math.round(selected.fare)) },
                            metadata: {
                              quoteId: selected.id,
                              pickup,
                              dropoff,
                              pickupText,
                              dropoffText,
                              etaMinutes: selected.etaMinutes,
                              distanceKm: selected.distanceKm,
                              surgeMultiplier: selected.surgeMultiplier,
                            },
                          });
                          toast.success(`Confirmed ${selected.provider}.`);
                        } catch {
                          toast.message('Opening provider checkout.', { description: 'Log in to save orders.' });
                        } finally {
                          window.open(selected.deeplinkUrl, '_blank');
                          setIsConfirming(false);
                        }
                      }}
                    >
                      {isConfirming ? `Confirming…` : `Confirm ${selected.provider}`}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <nav className="app-bottom-nav" aria-label="Bottom navigation">
              <div className="app-bottom-nav-inner">
                <button className="app-bottom-nav-item" type="button" onClick={() => setLocation('/home')} aria-label="Home">
                  <span className="app-bottom-nav-bubble">
                    <House size={22} strokeWidth={2.2} />
                  </span>
                </button>
                <button className="app-bottom-nav-item app-bottom-nav-item-active" type="button" aria-label="Rides">
                  <span className="app-bottom-nav-bubble">
                    <CarFront size={22} strokeWidth={2.2} />
                  </span>
                </button>
                <button className="app-bottom-nav-item" type="button" onClick={() => setLocation('/food')} aria-label="Food">
                  <span className="app-bottom-nav-bubble">
                    <Pizza size={22} strokeWidth={2.2} />
                  </span>
                </button>
                <button className="app-bottom-nav-item" type="button" onClick={() => setLocation('/profile')} aria-label="Profile">
                  <span className="app-bottom-nav-bubble">
                    <User size={22} strokeWidth={2.2} />
                  </span>
                </button>
              </div>
            </nav>
          </section>
        </div>
      </div>
    </div>
  );
}
