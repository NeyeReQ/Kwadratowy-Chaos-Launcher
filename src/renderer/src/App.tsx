/// <reference path="../../preload/index.d.ts" />
import { useEffect, useMemo, useState } from "react";
import { Activity, Blocks, Check, ChevronRight, Cpu, Download, ExternalLink, Gamepad2, HardDrive, MessageCircle, Monitor, Play, RefreshCw, Settings2, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import type { BootstrapState, LauncherProgress, LauncherSettings } from "../../shared/types";

type Page = "home" | "mods" | "settings";
const ONBOARDING_VERSION = 3;
const initial: BootstrapState = { settings: { memoryMb: 6144, gamePath: "", onboardingCompleted: false, onboardingVersion: 0 }, manifest: null, manifestError: null, appVersion: "0.1.5" };

export default function App() {
  const [state, setState] = useState(initial);
  const [page, setPage] = useState<Page>("home");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<LauncherProgress | null>(null);
  const [notice, setNotice] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [draft, setDraft] = useState<LauncherSettings>(initial.settings);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [ramCheckBusy, setRamCheckBusy] = useState(false);
  const [ramCheckError, setRamCheckError] = useState("");
  const [ramAnalysis, setRamAnalysis] = useState<{ detectedGb: number; allocatedGb: number } | null>(null);
  const manifest = state.manifest;
  const mods = useMemo(() => manifest?.files.filter((f) => f.path.startsWith("mods/")).length || 0, [manifest]);
  const managed = manifest?.files.length || 0;

  async function refresh() {
    const next = await window.launcher.getBootstrapState();
    setState(next); setDraft(next.settings); setOnboardingReady(true);
  }
  useEffect(() => {
    void refresh().catch((e) => { setNotice(e instanceof Error ? e.message : "Nie udało się wczytać launchera."); setOnboardingReady(true); });
    const a = window.launcher.onProgress(setProgress);
    const b = window.launcher.onUpdateStatus(setUpdateMessage);
    return () => { a(); b(); };
  }, []);

  async function run(action: () => Promise<unknown>, success?: string) {
    setBusy(true); setNotice("");
    try { await action(); if (success) setNotice(success); await refresh(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Operacja nie powiodła się."); setProgress({ phase: "error", current: 0, total: 0, message: "Błąd operacji" }); }
    finally { setBusy(false); }
  }
  async function completeOnboarding() {
    setBusy(true);
    setNotice("");
    try {
      const saved = await window.launcher.saveSettings({ onboardingCompleted: true, onboardingVersion: ONBOARDING_VERSION });
      setState((current) => ({ ...current, settings: saved }));
      setDraft(saved);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nie udało się zapisać ustawień powitalnych.";
      setRamCheckError(message);
      setNotice(message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function checkAndSetRam() {
    setRamCheckBusy(true);
    setRamCheckError("");
    setRamAnalysis(null);
    try {
      // Keep the analysis screen visible long enough to make the action clear.
      await new Promise<void>((resolve) => setTimeout(resolve, 1100));
      const result = await window.launcher.getSystemMemory();
      if (!Number.isFinite(result.totalBytes) || result.totalBytes <= 0) {
        throw new Error("Nie udało się odczytać ilości pamięci RAM.");
      }

      const totalGb = Math.max(1, Math.round(result.totalBytes / (1024 ** 3)));
      const recommendedGb = Math.min(10, Math.max(2, Math.floor(totalGb / 4) * 2));

      const saved = await window.launcher.saveSettings({ memoryMb: recommendedGb * 1024 });
      setState((current) => ({ ...current, settings: saved }));
      setDraft(saved);
      setRamAnalysis({ detectedGb: totalGb, allocatedGb: recommendedGb });
    } catch (error) {
      setRamCheckError(error instanceof Error ? error.message : "Nie udało się sprawdzić pamięci RAM.");
    } finally {
      setRamCheckBusy(false);
    }
  }

  const onboardingOpen = onboardingReady && !(state.settings.onboardingCompleted === true && state.settings.onboardingVersion >= ONBOARDING_VERSION);
  const title = page === "home" ? "Witaj w Kwadratowym Chaosie" : page === "mods" ? "Twoja paczka" : "Ustawienia";

  return <div className="app-shell">
    {onboardingOpen && <div className="onboarding-overlay">
      <section className="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="onboarding-brand">
          <div className="brand-mark"><span>K</span><i/></div>
          <div><strong>KWADRATOWY CHAOS</strong><small>KRÓTKI PRZEWODNIK</small></div>
        </div>
        <div className="onboarding-progress">
          {[
            { label: "Start", icon: Gamepad2 },
            { label: "Paczka modów", icon: Blocks },
            { label: "Ustawienia", icon: Settings2 }
          ].map(({ label, icon: StepIcon }, step) => (
            <div key={label} className={`onboarding-progress-step ${step < onboardingStep ? "done" : ""} ${step === onboardingStep ? "active" : ""}`}>
              <span className="onboarding-step-icon"><StepIcon size={17}/></span>
              <span className="onboarding-step-label">{label}</span>
              <span className="onboarding-step-check">{step < onboardingStep ? <Check size={13}/> : `0${step + 1}`}</span>
            </div>
          ))}
        </div>
        <div className="onboarding-kicker">PIERWSZE URUCHOMIENIE · KROK 0{onboardingStep + 1} / 03</div>
        {onboardingStep === 0 && <div className="onboarding-content">
          <div className="onboarding-icon"><Gamepad2 size={25}/></div>
          <h1 id="onboarding-title">Witaj, drogi Streamerze!</h1>
          <p>Dziękujemy za zaufanie i pobranie naszego oprogramowania!</p>
          <div className="onboarding-info">
            <strong>Jak działa launcher?</strong>
            <p>W zakładce <b>Start</b> przycisk <b>„Przygotuj grę”</b> konfiguruje profil Minecraft za pomocą naszego oprogramowania i otwiera klienta Minecraft. Możesz traktować go jak przycisk <b>„Graj”</b>.</p>
          </div>
        </div>}
        {onboardingStep === 1 && <div className="onboarding-content">
          <div className="onboarding-icon"><Blocks size={25}/></div>
          <h1 id="onboarding-title">Paczka modów zawsze aktualna</h1>
          <p>Nie musisz samodzielnie szukać ani instalować nowych wersji modów.</p>
          <div className="onboarding-info">
            <strong>Jak pobierać aktualizacje?</strong>
            <p>W zakładce <b>„Paczka modów”</b> znajdziesz aktualizacje. Gdy na serwerze pojawi się zmiana, kliknij <b>„Sprawdź aktualizacje”</b>, a launcher automatycznie pobierze nowe lub zmienione mody.</p>
          </div>
        </div>}
        {onboardingStep === 2 && <div className={`onboarding-content ${ramCheckBusy ? "onboarding-loading" : ""}`}>
          {ramCheckBusy ? <>
            <div className="ram-analysis-spinner"><span/></div>
            <h1 id="onboarding-title">Analizowanie RAMu</h1>
            <p>Sprawdzamy pamięć komputera i dobieramy odpowiednią wartość dla Minecrafta.</p>
          </> : ramAnalysis ? <>
            <div className="onboarding-icon onboarding-success-icon"><Check size={25}/></div>
            <h1 id="onboarding-title">Gotowe! RAM został sprawdzony.</h1>
            <div className="ram-result-grid">
              <div><span>WYKRYTA PAMIĘĆ</span><strong>{ramAnalysis.detectedGb} GB</strong></div>
              <div><span>PRZYDZIELAMY MINECRAFTOWI</span><strong>{ramAnalysis.allocatedGb} GB</strong></div>
            </div>
            <p className="ram-result-note">Ustawienie zostało zapisane. Możesz je w dowolnym momencie zmienić w zakładce „Ustawienia”.</p>
          </> : <>
            <div className="onboarding-icon"><Settings2 size={25}/></div>
            <h1 id="onboarding-title">Ustawienia i pamięć RAM</h1>
            <p>W zakładce <b>„Ustawienia”</b> możesz zmienić ilość RAM-u przydzielonego Minecraftowi i zobaczyć aktualny katalog danych paczki.</p>
            <div className="onboarding-info">
              <strong>Dobór pamięci dla Minecrafta</strong>
              <p>Możesz pozwolić nam sprawdzić ilość pamięci RAM w komputerze i automatycznie dobrać odpowiednią wartość dla gry. To opcjonalne — ustawienie możesz później zmienić w dowolnym momencie.</p>
            </div>
            {ramCheckError && <div className="onboarding-error">{ramCheckError}</div>}
          </>}
        </div>}
        <div className="onboarding-footer">
          <div className="onboarding-dots"><span className={onboardingStep === 0 ? "active" : ""}/><span className={onboardingStep === 1 ? "active" : ""}/><span className={onboardingStep === 2 ? "active" : ""}/></div>
          {onboardingStep === 0 && <button className="play-button onboarding-next" onClick={() => setOnboardingStep(1)}>DALEJ <ChevronRight size={16}/></button>}
          {onboardingStep === 1 && <div className="onboarding-actions"><button className="secondary-button" onClick={() => setOnboardingStep(0)}>WSTECZ</button><button className="play-button onboarding-next" onClick={() => setOnboardingStep(2)}>DALEJ <ChevronRight size={16}/></button></div>}
          {onboardingStep === 2 && ramCheckBusy && <span className="onboarding-wait-label">ANALIZOWANIE RAMU…</span>}
          {onboardingStep === 2 && !ramCheckBusy && <div className="onboarding-actions">
            {!ramAnalysis && <button className="secondary-button" disabled={busy} onClick={() => setOnboardingStep(1)}>WSTECZ</button>}
            {ramAnalysis ? (
              <button className="play-button onboarding-next" disabled={busy} onClick={() => void completeOnboarding()}>ZAKOŃCZ <Check size={16}/></button>
            ) : <>
              <button className="secondary-button onboarding-skip" disabled={busy} onClick={() => void completeOnboarding()}>NIE DZIĘKUJĘ</button>
              <button className="play-button onboarding-next" disabled={busy} onClick={() => void checkAndSetRam()}>SPRAWDŹ MÓJ RAM <ChevronRight size={16}/></button>
            </>}
          </div>}
        </div>
        <div className="onboarding-footnote">Twoje ustawienia możesz zmienić później w dowolnym momencie.</div>
      </section>
    </div>}
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><span>K</span><i/></div><div><strong>KWADRATOWY</strong><small>CHAOS / LAUNCHER</small></div></div>
      <div className="sidebar-caption">MENU GŁÓWNE</div>
      <nav className="nav-list">
        <button className={page === "home" ? "nav-item active" : "nav-item"} onClick={() => setPage("home")}><Gamepad2 size={18}/>Start</button>
        <button className={page === "mods" ? "nav-item active" : "nav-item"} onClick={() => setPage("mods")}><Blocks size={18}/>Paczka modów <span className="nav-count">{mods}</span></button>
        <button className={page === "settings" ? "nav-item active" : "nav-item"} onClick={() => setPage("settings")}><Settings2 size={18}/>Ustawienia</button>
      </nav>
      <div className="sidebar-spacer"/>
      <div className="community-card"><div className="community-orb"><MessageCircle size={19}/></div><strong>Dołącz do społeczności</strong><p>Wpadnij na Discorda i bądź na bieżąco.</p><button className="community-link" onClick={() => void window.launcher.openExternal("https://discord.com/")}>Otwórz Discord <ExternalLink size={13}/></button></div>
      <div className="sidebar-foot"><span className="status-dot"/>Launcher v{state.appVersion}<span className="build-label">BETA</span></div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumb"><span>KWADRATOWY CHAOS</span><ChevronRight size={13}/><b>{page === "home" ? "CENTRUM GRY" : page === "mods" ? "PACZKA MODÓW" : "KONFIGURACJA"}</b></div>
        <div className="top-actions">
          {updateMessage && <button className="update-pill" onClick={() => void window.launcher.installUpdate()}><Download size={14}/>{updateMessage}</button>}
          <button className="login-button" onClick={() => void run(() => window.launcher.openOfficialLauncher(), "Mody są aktualne. Oficjalny launcher został otwarty.")} disabled={busy}><ExternalLink size={16}/> Sprawdź mody i otwórz launcher</button>
        </div>
      </header>

      <div className="content-wrap">
        <div className="page-heading"><div><div className="eyebrow"><Sparkles size={13}/> TWOJE MIEJSCE DO GRY</div><h1>{title}</h1></div><div className="connection"><span className="status-dot"/> SYSTEM GOTOWY</div></div>

        {page === "home" && <>
          <section className="hero-card">
            <div className="hero-grid"/>
            <div className="hero-copy"><div className="hero-kicker"><span>OFICJALNY LAUNCHER</span><i/> KWADRATOWY CHAOS</div>
              <h2>Wskakuj do<br/><em>kwadratowego</em> świata.</h2>
              <p>Jedna paczka. Jedno kliknięcie. Wszystkie mody zawsze aktualne.</p>
              <div className="hero-buttons">
                <button className="play-button" disabled={busy || !manifest} onClick={() => void run(() => window.launcher.prepareGame(), "Paczka przygotowana. Wybierz profil „Kwadratowy Chaos” w oficjalnym launcherze i kliknij Graj.")}>{busy ? <RefreshCw size={18}/> : <Play size={18} fill="currentColor"/>}{busy ? "PRZYGOTOWYWANIE…" : "PRZYGOTUJ GRĘ"}</button>
                <button className="secondary-button" onClick={() => setPage("mods")}><Blocks size={16}/> Zobacz paczkę</button>
              </div>
              <div className="hero-hint"><ShieldCheck size={14}/> Logowanie i uruchomienie Minecrafta odbywają się w oficjalnym launcherze.</div>
            </div>
            <div className="hero-art" aria-hidden="true"><div className="cube cube-back"/><div className="cube cube-main"><span>K</span></div><div className="cube cube-small"/><div className="art-ring ring-one"/><div className="art-ring ring-two"/><div className="art-label"><span>KC</span><small>PLAY<br/>YOUR WAY</small></div></div>
            <div className="hero-bottom"><span><i/> AUTOMATYCZNE AKTUALIZACJE</span><span>01 / 03</span></div>
          </section>

          <section className="stats-grid">
            <div className="stat-card"><div className="stat-icon purple"><Blocks size={18}/></div><div><small>MODÓW W PACZCE</small><strong>{mods}</strong><span>{manifest ? "Pliki zarządzane przez launcher" : "Oczekiwanie na manifest"}</span></div></div>
            <div className="stat-card"><div className="stat-icon pink"><Activity size={18}/></div><div><small>WERSJA PACZKI</small><strong>{manifest?.packVersion || "—"}</strong><span>{manifest?.minecraftVersion ? "Minecraft " + manifest.minecraftVersion : "Nie skonfigurowano"}</span></div></div>
            <div className="stat-card"><div className="stat-icon cyan"><Users size={18}/></div><div><small>LOGOWANIE</small><strong className="stat-name">Microsoft</strong><span>Obsługiwane przez oficjalny launcher</span></div></div>
          </section>
          <section className="lower-grid">
            <div className="panel news-panel"><div className="panel-heading"><div><span className="panel-label">AKTUALNOŚCI</span><h3>Co nowego?</h3></div><span className="new-tag">NA BIEŻĄCO</span></div>
              {manifest?.news?.length ? manifest.news.slice(0,3).map((item,i) => <article className="news-item" key={item.title+i}><div className="news-date">{item.date || "KC"}<span>{item.tag || "INFO"}</span></div><div><strong>{item.title}</strong><p>{item.body}</p></div><ChevronRight size={16}/></article>)
                : <div className="empty-news"><div className="news-spark"><Sparkles size={20}/></div><div><strong>Nowości pojawią się tutaj</strong><p>Aktualności serwera będą pobierane razem z manifestem paczki.</p></div></div>}
            </div>
            <div className="panel quick-panel"><div className="panel-heading"><div><span className="panel-label">SZYBKI DOSTĘP</span><h3>Twoje centrum</h3></div><Settings2 size={18}/></div>
              <button className="quick-row" onClick={() => setPage("mods")}><span className="quick-icon"><Blocks size={17}/></span><span><b>Pliki paczki</b><small>{managed} plików pod kontrolą launchera</small></span><ChevronRight size={16}/></button>
              <button className="quick-row" onClick={() => setPage("settings")}><span className="quick-icon"><Cpu size={17}/></span><span><b>Pamięć RAM</b><small>{(state.settings.memoryMb/1024).toFixed(1)} GB przydzielone dla gry</small></span><ChevronRight size={16}/></button>
              <button className="quick-row" onClick={() => void run(() => window.launcher.checkForUpdates())}><span className="quick-icon"><RefreshCw size={17}/></span><span><b>Aktualizacje launchera</b><small>{updateMessage || "Sprawdź dostępność nowej wersji"}</small></span><ChevronRight size={16}/></button>
            </div>
          </section>
        </>}

        {page === "mods" && <section className="panel page-panel">
          <div className="panel-heading"><div><span className="panel-label">SYNCHRONIZACJA PACZKI</span><h3>Wszystko zawsze aktualne</h3><p className="panel-subtitle">Launcher porównuje sumy SHA-512, pobiera zmienione pliki i usuwa stare pliki zarządzane przez paczkę.</p></div><span className="mod-version">v{manifest?.packVersion || "—"}</span></div>
          <div className="mod-overview"><div><small>ŁĄCZNIE PLIKÓW</small><strong>{managed}</strong></div><div><small>MODÓW</small><strong>{mods}</strong></div><div><small>LOADER</small><strong>{manifest?.loader.type.toUpperCase() || "—"}</strong></div><div><small>MINECRAFT</small><strong>{manifest?.minecraftVersion || "—"}</strong></div></div>
          {state.manifestError && <div className="warning-box"><ShieldCheck size={17}/>{state.manifestError}</div>}
          <div className="sync-box"><div className="sync-symbol"><RefreshCw size={23}/></div><div className="sync-copy"><strong>{progress?.message || "Paczka jest gotowa do sprawdzenia"}</strong><span>{progress ? `${progress.current} / ${progress.total} • ${progress.phase.toUpperCase()}` : "Synchronizacja uruchamia się automatycznie przed przygotowaniem gry i otwarciem oficjalnego launchera."}</span></div><button className="sync-button" disabled={busy} onClick={() => void run(() => window.launcher.syncPack(), "Paczka została sprawdzona.")}><RefreshCw size={15}/> SPRAWDŹ AKTUALIZACJE</button></div>
          {progress && <div className="progress-track"><div style={{width:`${progress.total ? Math.min(100,progress.current/progress.total*100):0}%`}}/></div>}
          <div className="note-box"><ShieldCheck size={17}/><span>Światy, screenshoty, logi i ustawienia użytkownika pozostają nietknięte. Launcher zmienia tylko pliki wskazane w manifeście oraz usuwa pliki, którymi sam wcześniej zarządzał.</span></div>
          <div className="file-groups">
            <div><Blocks size={17}/><span><b>Mody i biblioteki</b><small>mods/</small></span><strong>{mods} plików</strong></div>
            <div><Settings2 size={17}/><span><b>Konfiguracje</b><small>config/ • defaultconfigs/</small></span><strong>{manifest?.files.filter(f => f.path.startsWith("config/") || f.path.startsWith("defaultconfigs/")).length || 0} plików</strong></div>
            <div><Monitor size={17}/><span><b>Resource packi i shadery</b><small>resourcepacks/ • shaderpacks/</small></span><strong>{manifest?.files.filter(f => f.path.startsWith("resourcepacks/") || f.path.startsWith("shaderpacks/")).length || 0} plików</strong></div>
          </div>
        </section>}

        {page === "settings" && <section className="panel page-panel settings-panel">
          <div className="panel-heading"><div><span className="panel-label">KONFIGURACJA GRY</span><h3>Dostosuj launcher</h3><p className="panel-subtitle">Ustawienia są zapisywane lokalnie na tym komputerze.</p></div><Settings2 size={22}/></div>
          <div className="setting-block"><div className="setting-title"><div className="setting-icon"><Cpu size={18}/></div><div><strong>Pamięć RAM</strong><small>Ilość pamięci przeznaczonej dla Minecrafta</small></div><b>{(draft.memoryMb/1024).toFixed(1)} GB</b></div><input className="ram-slider" type="range" min="2048" max="10240" step="512" value={draft.memoryMb} onChange={(e) => setDraft({...draft,memoryMb:Number(e.target.value)})}/><div className="slider-labels"><span>2 GB</span><span>10 GB</span></div></div>
          <div className="setting-block"><div className="setting-title"><div className="setting-icon"><HardDrive size={18}/></div><div><strong>Katalog danych paczki</strong><small>Osobny folder na mody, konfiguracje, światy i screenshoty</small></div></div><input className="text-input" placeholder="Domyślny katalog launchera" value={draft.gamePath} onChange={(e) => setDraft({...draft,gamePath:e.target.value})}/></div>
          <div className="settings-footer"><span>Zmiany zaczną obowiązywać przy następnym uruchomieniu gry.</span><button className="play-button save-button" disabled={busy} onClick={() => void run(async () => {const value=await window.launcher.saveSettings(draft);setState(s=>({...s,settings:value}));},"Ustawienia zapisane.")}><Check size={17}/> ZAPISZ USTAWIENIA</button></div>
        </section>}

        {(notice || state.manifestError) && <div className={state.manifestError && !notice ? "notice warning" : "notice"}><span>{notice || state.manifestError}</span><button onClick={() => setNotice("")}><X size={15}/></button></div>}
      </div>
      <footer className="bottom-bar"><span><i className="status-dot"/>Gotowy do przygotowania gry</span><span>{manifest?.name || "Kwadratowy Chaos"} <i/> {manifest?.minecraftVersion ? "Minecraft "+manifest.minecraftVersion : "Konfiguracja oczekuje na manifest"}</span></footer>
    </main>

    {busy && <div className="busy-indicator"><span className="spinner"/><span>{progress?.message || "Przetwarzanie…"}</span></div>}
  </div>;
}