import { motion } from 'framer-motion';
import { Clock, Star, MapPin, Crosshair, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { MapView } from '@/components/Map';
import { useMemo, useRef, useState } from 'react';
import { ridesAPI } from '@/services/api';

export default function RidesPage() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const pickupMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const dropMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  const [pickup, setPickup] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoff, setDropoff] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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

  const initialCenter = useMemo(() => ({ lat: 28.6139, lng: 77.209 }), []);

  const renderRoute = async (p: { lat: number; lng: number }, d: { lat: number; lng: number }) => {
    if (!mapRef.current || !window.google?.maps) return;
    const directionsService = new window.google.maps.DirectionsService();
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({ map: mapRef.current, suppressMarkers: true });
    }
    const res = await directionsService.route({
      origin: p,
      destination: d,
      travelMode: window.google.maps.TravelMode.DRIVING,
    });
    directionsRendererRef.current.setDirections(res);
  };

  const updateMarker = (
    which: 'pickup' | 'dropoff',
    point: { lat: number; lng: number }
  ) => {
    if (!mapRef.current || !window.google?.maps?.marker?.AdvancedMarkerElement) return;
    const marker = new window.google.maps.marker.AdvancedMarkerElement({
      map: mapRef.current,
      position: point,
      title: which === 'pickup' ? 'Pickup' : 'Dropoff',
    });
    if (which === 'pickup') {
      if (pickupMarkerRef.current) pickupMarkerRef.current.map = null;
      pickupMarkerRef.current = marker;
    } else {
      if (dropMarkerRef.current) dropMarkerRef.current.map = null;
      dropMarkerRef.current = marker;
    }
  };

  const runEstimate = async (p: { lat: number; lng: number }, d: { lat: number; lng: number }) => {
    setIsLoading(true);
    try {
      const resp = await ridesAPI.getFareEstimate(p, d);
      setQuotes(resp.quotes || []);
    } catch {
      setQuotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-yellow-50/30 to-white">
      <Header />

      {/* Hero */}
      <section className="py-16 bg-gradient-to-r from-yellow-400 to-amber-400 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.3),transparent)]" />
        </div>

        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              🚗 Book Rides, Save Big
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Compare fares across Uber, Ola, Rapido, and ONDC in real-time
            </p>
            <div className="text-white/90 text-sm">
              Click on the map to set pickup and drop. Then we fetch fare + ETA.
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-10 bg-white border-b border-yellow-100">
        <div className="container">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/3">
              <h2 className="text-2xl font-bold mb-2">Trip</h2>
              <p className="text-sm text-muted-foreground mb-4">
                1st click = pickup, 2nd click = dropoff. Click again to reset.
              </p>

              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    navigator.geolocation?.getCurrentPosition(
                      (pos) => {
                        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                        setPickup(next);
                        updateMarker('pickup', next);
                        mapRef.current?.setCenter(next);
                      },
                      () => {
                        return;
                      }
                    );
                  }}
                >
                  <Crosshair className="w-4 h-4" />
                  Set pickup to me
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    setPickup(null);
                    setDropoff(null);
                    setQuotes([]);
                    if (pickupMarkerRef.current) pickupMarkerRef.current.map = null;
                    if (dropMarkerRef.current) dropMarkerRef.current.map = null;
                    if (directionsRendererRef.current) directionsRendererRef.current.setMap(null);
                    directionsRendererRef.current = null;
                  }}
                >
                  Reset
                </Button>
              </div>

              <div className="rounded-xl border border-yellow-100 bg-yellow-50/30 p-4 text-sm space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>Pickup: {pickup ? `${pickup.lat.toFixed(5)}, ${pickup.lng.toFixed(5)}` : 'not set'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Navigation className="w-4 h-4" />
                  <span>Drop: {dropoff ? `${dropoff.lat.toFixed(5)}, ${dropoff.lng.toFixed(5)}` : 'not set'}</span>
                </div>
              </div>
            </div>

            <div className="lg:w-2/3">
              <MapView
                initialCenter={initialCenter}
                initialZoom={13}
                className="h-[420px] rounded-2xl overflow-hidden border border-yellow-100"
                onMapReady={(map) => {
                  mapRef.current = map;
                  map.addListener('click', async (e: google.maps.MapMouseEvent) => {
                    if (!e.latLng) return;
                    const point = { lat: e.latLng.lat(), lng: e.latLng.lng() };

                    if (!pickup || (pickup && dropoff)) {
                      setPickup(point);
                      setDropoff(null);
                      setQuotes([]);
                      updateMarker('pickup', point);
                      if (dropMarkerRef.current) dropMarkerRef.current.map = null;
                      if (directionsRendererRef.current) directionsRendererRef.current.setMap(null);
                      directionsRendererRef.current = null;
                      return;
                    }

                    setDropoff(point);
                    updateMarker('dropoff', point);
                    await renderRoute(pickup, point);
                    await runEstimate(pickup, point);
                  });
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '⚡',
                title: 'Instant Comparison',
                description: 'Compare fares from all platforms instantly',
              },
              {
                icon: '📉',
                title: 'Surge Prediction',
                description: 'Get notified about surge pricing patterns',
              },
              {
                icon: '⭐',
                title: 'Driver Ratings',
                description: 'Choose based on ratings and reviews',
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-6 rounded-xl bg-yellow-50 border border-yellow-100 text-center"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Rides */}
      <section className="py-12">
        <div className="container">
          <h2 className="text-3xl font-bold mb-2">Fare comparison</h2>
          <p className="text-sm text-muted-foreground mb-8">
            {isLoading ? 'Fetching quotes…' : 'Sorted by lowest fare.'}
          </p>

          {!isLoading && pickup && dropoff && quotes.length === 0 && (
            <div className="py-10 text-center text-muted-foreground">No quotes returned.</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quotes.map((ride, idx) => (
              <motion.div
                key={ride.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-xl border border-yellow-100 overflow-hidden hover:shadow-lg transition-all duration-300 bg-white"
              >
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-8 text-center relative">
                  <div className="text-6xl mb-4">🚕</div>
                  {ride.surgeMultiplier && (
                    <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      Surge x{ride.surgeMultiplier}
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="font-bold text-lg mb-1">{ride.type.toUpperCase()}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{ride.provider} • {ride.distanceKm} km</p>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        ETA
                      </span>
                      <span className="font-semibold">{ride.etaMinutes} min</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        Rating
                      </span>
                      <span className="font-semibold">{ride.driverRating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Platform</span>
                      <span className="font-semibold">{ride.provider}</span>
                    </div>
                  </div>

                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      ₹{ride.fare.toLocaleString()}
                    </p>
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
                    onClick={() => window.open(ride.deeplinkUrl, '_blank')}
                  >
                    Book Ride
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
