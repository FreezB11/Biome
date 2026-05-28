import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CarFront, History, House, Menu, Mic, Pizza, Plus, Bell, User } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import apiClient from '@/services/api';
import type { BackendSearchResult } from '@/types';

type ActivePage = 'home' | 'history' | 'food' | 'rides';

const RECENT_CHATS = ['Book a ride to airport', 'Order pizza near me', 'Best phone under 30k', 'Compare iPhone 15 prices'];

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isDesktop;
}

function useAutosizeTextarea(inputRef: React.MutableRefObject<HTMLTextAreaElement | null>, value: string) {
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const resize = () => {
      const maxHeight = 78;
      input.style.height = '26px';
      input.style.height = `${Math.min(input.scrollHeight, maxHeight)}px`;
      if (input.scrollHeight > maxHeight) input.scrollTop = input.scrollHeight;
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [inputRef, value]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input || document.activeElement !== input) return;
    input.setSelectionRange(input.value.length, input.value.length);
  }, [inputRef, value]);
}

export default function SearchPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BackendSearchResult | null>(null);
  const [promptText, setPromptText] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [location, setLocation] = useLocation();

  const isDesktop = useIsDesktop();
  useAutosizeTextarea(inputRef, promptText);

  const handleSearch = async (query: string) => {
    const q = query.trim();
    if (!q) return;
    setIsLoading(true);
    setError(null);
    try {
      const resp = await apiClient.post<BackendSearchResult>('/search', { query: q });
      setResult(resp.data);
    } catch (e) {
      setResult(null);
      setError('Search failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const recommendations = result?.ai.recommendations ?? [];

  const activePage: ActivePage = useMemo(() => {
    if (location.startsWith('/history')) return 'history';
    if (location.startsWith('/food')) return 'food';
    if (location.startsWith('/rides')) return 'rides';
    return 'home';
  }, [location]);

  const sidebarOpen = isDesktop || showSidebar;

  const Sidebar = (
    <aside className="home-sidebar">
      <div>
        <h3 className="home-sidebar-title">Deepenk</h3>
      </div>
      <nav className="home-sidebar-nav" aria-label="Sidebar navigation">
        <Link
          className={`home-sidebar-link ${activePage === 'home' ? 'home-sidebar-link-active' : ''}`}
          href="/home"
          onClick={() => setShowSidebar(false)}
        >
          <House size={22} strokeWidth={2.1} />
          <span>Home</span>
        </Link>
        <Link
          className={`home-sidebar-link ${activePage === 'history' ? 'home-sidebar-link-active' : ''}`}
          href="/history"
          onClick={() => setShowSidebar(false)}
        >
          <History size={22} strokeWidth={2.1} />
          <span>History</span>
        </Link>
        <Link
          className={`home-sidebar-link ${activePage === 'food' ? 'home-sidebar-link-active' : ''}`}
          href="/food"
          onClick={() => setShowSidebar(false)}
        >
          <Pizza size={22} strokeWidth={2.1} />
          <span>Food</span>
        </Link>
        <Link
          className={`home-sidebar-link ${activePage === 'rides' ? 'home-sidebar-link-active' : ''}`}
          href="/rides"
          onClick={() => setShowSidebar(false)}
        >
          <CarFront size={22} strokeWidth={2.1} />
          <span>Rides</span>
        </Link>
      </nav>
      <div className="mt-2">
        <div className="text-sm font-semibold text-foreground mb-2">Recent</div>
        <div className="space-y-2">
          {RECENT_CHATS.map((c) => (
            <button
              key={c}
              type="button"
              className="w-full text-left rounded-lg px-2 py-2 text-sm text-foreground hover:bg-amber-50"
              onClick={() => {
                setPromptText(c);
                if (!isDesktop) setShowSidebar(false);
                window.requestAnimationFrame(() => inputRef.current?.focus());
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-auto">
        <button
          type="button"
          className="w-full rounded-full border border-amber-200 bg-white px-4 py-3 font-semibold text-foreground"
          onClick={() => {
            setShowSidebar(false);
            setLocation('/profile');
          }}
        >
          Profile
        </button>
        {!isDesktop ? (
          <button
            type="button"
            className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-muted-foreground"
            onClick={() => setShowSidebar(false)}
          >
            <ArrowLeft className="w-4 h-4" />
            Close
          </button>
        ) : null}
      </div>
    </aside>
  );

  return (
    <div className="mobile-stage">
      <div className="fit-shell">
        <div className="phone-screen">
          <section className={`screen home-screen ${sidebarOpen ? 'sidebar-open' : ''}`}>
            <div className="home-main">
              <header className="home-header">
                <button
                  aria-label="Open sidebar"
                  className="home-menu-button home-menu-button-primary"
                  type="button"
                  onClick={() => setShowSidebar(true)}
                >
                  <Menu size={26} strokeWidth={2.1} />
                </button>
                <div className="home-header-right">
                  <button
                    aria-label="Notifications"
                    className="home-menu-button"
                    type="button"
                    onClick={() => setLocation('/history')}
                  >
                    <Bell size={24} strokeWidth={2.1} />
                  </button>
                </div>
              </header>

              <div className="home-content">
                <div className="home-copy">
                  <h2 className="home-title">
                    <span>What do you want to</span>
                    <span className="home-title-accent">choose today?</span>
                  </h2>
                </div>

                <form
                  className="home-prompt-wrap"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearch(promptText);
                    inputRef.current?.focus();
                  }}
                >
                  <div className="home-prompt-card">
                    <button className="home-prompt-icon" type="button" aria-label="Add" onClick={() => inputRef.current?.focus()}>
                      <Plus size={18} strokeWidth={2.4} />
                    </button>
                    <textarea
                      className="home-prompt-input"
                      ref={inputRef}
                      onChange={(e) => setPromptText(e.target.value)}
                      placeholder="Ask Deepenk"
                      rows={1}
                      value={promptText}
                    />
                    <button
                      className="home-prompt-icon"
                      type="button"
                      aria-label="Voice"
                      onClick={() => {
                        inputRef.current?.focus();
                      }}
                    >
                      <Mic size={18} strokeWidth={2.4} />
                    </button>
                    <button className="home-prompt-send" disabled={!promptText.trim() || isLoading} type="submit">
                      <ArrowRight size={22} strokeWidth={2.5} />
                    </button>
                  </div>
                </form>

                {error ? <div className="mt-6 text-sm text-red-600">{error}</div> : null}
                {isLoading ? <div className="mt-6 text-sm text-muted-foreground">Thinking…</div> : null}

                {!isLoading && recommendations.length > 0 && (
                  <div className="mt-6 w-full max-w-[620px] text-left">
                    <div className="rounded-2xl border border-amber-100 bg-white/90 p-4 shadow-sm">
                      <div className="text-sm font-semibold text-foreground">Best picks</div>
                      <div className="mt-3 space-y-2">
                        {recommendations.slice(0, 5).map((rec) => (
                          <button
                            key={rec.item.id}
                            type="button"
                            className="w-full rounded-xl border border-amber-100 bg-white px-3 py-3 text-left hover:bg-amber-50 transition-colors"
                            onClick={() => window.open(rec.item.itemUrl, '_blank')}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-foreground">{rec.item.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{rec.item.provider}</div>
                              </div>
                              <div className="flex-none font-bold text-foreground">
                                ₹{rec.item.finalPrice.amount.toLocaleString()}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">
                        cache: {result?.cache.hit ? 'HIT' : 'MISS'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <nav className="app-bottom-nav" aria-label="Bottom navigation">
                <div className="app-bottom-nav-inner">
                  <Link className={`app-bottom-nav-item ${activePage === 'home' ? 'app-bottom-nav-item-active' : ''}`} href="/home">
                    <span className="app-bottom-nav-bubble">
                      <House size={22} strokeWidth={2.2} />
                    </span>
                  </Link>
                  <Link className={`app-bottom-nav-item ${activePage === 'rides' ? 'app-bottom-nav-item-active' : ''}`} href="/rides">
                    <span className="app-bottom-nav-bubble">
                      <CarFront size={22} strokeWidth={2.2} />
                    </span>
                  </Link>
                  <Link className={`app-bottom-nav-item ${activePage === 'food' ? 'app-bottom-nav-item-active' : ''}`} href="/food">
                    <span className="app-bottom-nav-bubble">
                      <Pizza size={22} strokeWidth={2.2} />
                    </span>
                  </Link>
                  <button className="app-bottom-nav-item" type="button" onClick={() => setLocation('/profile')} aria-label="Profile">
                    <span className="app-bottom-nav-bubble">
                      <User size={22} strokeWidth={2.2} />
                    </span>
                  </button>
                </div>
              </nav>

      <p className="home-footer-note">Engineered by Deepenk</p>
            </div>

            {!isDesktop && showSidebar ? (
              <button aria-label="Close sidebar" className="home-sidebar-overlay" type="button" onClick={() => setShowSidebar(false)} />
            ) : null}

            {sidebarOpen ? Sidebar : null}
          </section>
        </div>
      </div>
    </div>
  );
}
