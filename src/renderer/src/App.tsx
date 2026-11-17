/// <reference path="../../preload/index.d.ts" />
import { useEffect, useMemo, useState } from "react";
import { Activity, Blocks, Check, ChevronRight, Cpu, Download, ExternalLink, Gamepad2, HardDrive, LogIn, LogOut, MessageCircle, Monitor, Play, RefreshCw, Settings2, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import type { AccountProfile, BootstrapState, LauncherProgress, LauncherSettings } from "../../shared/types";

type Page = "home" | "mods" | "settings";
const initial: BootstrapState = { account: null, settings: { memoryMb: 6144, javaPath: "", gamePath: "" }, manifest: null, manifestError: null, running: false, appVersion: "0.1.0" };

export default function App() {
  const [state, setState] = useState(initial);
  const [page, setPage] = useState<Page>("home");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<LauncherProgress | null>(null);
  const [notice, setNotice] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [challenge, setChallenge] = useState<{ userCode: string; verificationUri: string } | null>(null);
  const [updateMessage, setUpdateMessage] = useState("");
  const [draft, setDraft] = useState<LauncherSettings>(initial.settings);
  const manifest = state.manifest;
  const mods = useMemo(() => manifest?.files.filter((f) => f.path.startsWith("mods/")).length || 0, [manifest]);
  const managed = manifest?.files.length || 0;

  async function refresh() {
    const next = await window.launcher.getBootstrapState();
    setState(next); setDraft(next.settings);
  }
  useEffect(() => {
    void refresh().catch((e) => setNotice(e instanceof Error ? e.message : "Nie udało się wczytać launchera."));
    const a = window.launcher.onProgress(setProgress);
    const b = window.launcher.onAuthStatus(setAuthMessage);
    const c = window.launcher.onAccountChanged((account: AccountProfile | null) => { setState((s) => ({ ...s, account })); if (account) setChallenge(null); });
    const d = window.launcher.onGameStatus((running) => setState((s) => ({ ...s, running })));
    const e = window.launcher.onUpdateStatus(setUpdateMessage);
    return () => { a(); b(); c(); d(); e(); };
  }, []);

  async function run(action: () => Promise<unknown>, success?: string) {
    setBusy(true); setNotice("");
    try { await action(); if (success) setNotice(success); await refresh(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Operacja nie powiodła się."); setProgress({ phase: "error", current: 0, total: 0, message: "Błąd operacji" }); }
    finally { setBusy(false); }
  }
  async function login() {
    setBusy(true); setNotice("");
    try {
      const result = await window.launcher.beginLogin();
      setChallenge({ userCode: result.userCode, verificationUri: result.verificationUri });
      setAuthMessage("Oczekiwanie na potwierdzenie logowania Microsoft…");
      await window.launcher.openExternal(result.verificationUri);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Nie udało się rozpocząć logowania."); }
    finally { setBusy(false); }
  }
  const title = page === "home" ? "Witaj w Kwadratowym Chaosie" : page === "mods" ? "Twoja paczka" : "Ustawienia";

  return <div className="app-shell">
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
          {state.account ? <div className="user-chip"><img src={`https://minotar.net/avatar/${state.account.name}/40.png`}/><div><strong>{state.account.name}</strong><small>KONTO MICROSOFT</small></div><button title="Wyloguj" onClick={() => void run(() => window.launcher.logout())}><LogOut size={15}/></button></div>
            : <button className="login-button" onClick={() => void login()} disabled={busy}><LogIn size={16}/> Zaloguj przez Microsoft</button>}
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
                <button className="play-button" disabled={busy || state.running || !state.account} onClick={() => void run(() => window.launcher.launchGame())}>{state.running ? <Check size={18}/> : <Play size={18} fill="currentColor"/>}{busy ? "PRZYGOTOWYWANIE…" : state.running ? "GRA URUCHOMIONA" : "GRAJ TERAZ"}</button>
                <button className="secondary-button" onClick={() => setPage("mods")}><Blocks size={16}/> Zobacz paczkę</button>
              </div>
              {!state.account && <div className="hero-hint"><ShieldCheck size={14}/> Zaloguj się kontem Microsoft, aby uruchomić Minecraft Java Edition.</div>}
            </div>
            <div className="hero-art" aria-hidden="true"><div className="cube cube-back"/><div className="cube cube-main"><span>K</span></div><div className="cube cube-small"/><div className="art-ring ring-one"/><div className="art-ring ring-two"/><div className="art-label"><span>KC</span><small>PLAY<br/>YOUR WAY</small></div></div>
            <div className="hero-bottom"><span><i/> AUTOMATYCZNE AKTUALIZACJE</span><span>01 / 03</span></div>
          </section>

          <section className="stats-grid">
            <div className="stat-card"><div className="stat-icon purple"><Blocks size={18}/></div><div><small>MODÓW W PACZCE</small><strong>{mods}</strong><span>{manifest ? "Pliki zarządzane przez launcher" : "Oczekiwanie na manifest"}</span></div></div>
            <div className="stat-card"><div className="stat-icon pink"><Activity size={18}/></div><div><small>WERSJA PACZKI</small><strong>{manifest?.packVersion || "—"}</strong><span>{manifest?.minecraftVersion ? "Minecraft " + manifest.minecraftVersion : "Nie skonfigurowano"}</span></div></div>
            <div className="stat-card"><div className="stat-icon cyan"><Users size={18}/></div><div><small>PROFIL GRACZA</small><strong className="stat-name">{state.account?.name || "Gość"}</strong><span>{state.account ? "Konto Microsoft połączone" : "Brak zalogowanego konta"}</span></div></div>
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
          <div className="sync-box"><div className="sync-symbol"><RefreshCw size={23}/></div><div className="sync-copy"><strong>{progress?.message || "Paczka jest gotowa do sprawdzenia"}</strong><span>{progress ? `${progress.current} / ${progress.total} • ${progress.phase.toUpperCase()}` : "Synchronizacja uruchamia się również automatycznie przed grą."}</span></div><button className="sync-button" disabled={busy} onClick={() => void run(() => window.launcher.syncPack(), "Paczka została sprawdzona.")}><RefreshCw size={15}/> SPRAWDŹ AKTUALIZACJE</button></div>
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
          <div className="setting-block"><div className="setting-title"><div className="setting-icon"><Cpu size={18}/></div><div><strong>Pamięć RAM</strong><small>Ilość pamięci przeznaczonej dla Minecrafta</small></div><b>{(draft.memoryMb/1024).toFixed(1)} GB</b></div><input className="ram-slider" type="range" min="2048" max="16384" step="512" value={draft.memoryMb} onChange={(e) => setDraft({...draft,memoryMb:Number(e.target.value)})}/><div className="slider-labels"><span>2 GB</span><span>16 GB</span></div></div>
          <div className="setting-block"><div className="setting-title"><div className="setting-icon"><HardDrive size={18}/></div><div><strong>Ścieżka Java</strong><small>Pozostaw puste, aby użyć Java z systemu</small></div></div><input className="text-input" placeholder="C:\\Program Files\\Java\\jdk-21\\bin\\java.exe" value={draft.javaPath} onChange={(e) => setDraft({...draft,javaPath:e.target.value})}/></div>
          <div className="setting-block"><div className="setting-title"><div className="setting-icon"><HardDrive size={18}/></div><div><strong>Katalog Minecraft</strong><small>Oddzielna instalacja nie miesza się z oficjalnym launcherem</small></div></div><input className="text-input" placeholder="Domyślny katalog launchera" value={draft.gamePath} onChange={(e) => setDraft({...draft,gamePath:e.target.value})}/></div>
          <div className="settings-footer"><span>Zmiany zaczną obowiązywać przy następnym uruchomieniu gry.</span><button className="play-button save-button" disabled={busy} onClick={() => void run(async () => {const value=await window.launcher.saveSettings(draft);setState(s=>({...s,settings:value}));},"Ustawienia zapisane.")}><Check size={17}/> ZAPISZ USTAWIENIA</button></div>
        </section>}

        {(notice || state.manifestError) && <div className={state.manifestError && !notice ? "notice warning" : "notice"}><span>{notice || state.manifestError}</span><button onClick={() => setNotice("")}><X size={15}/></button></div>}
      </div>
      <footer className="bottom-bar"><span><i className="status-dot"/>{state.running ? "Minecraft działa" : "Launcher gotowy"}</span><span>{manifest?.name || "Kwadratowy Chaos"} <i/> {manifest?.minecraftVersion ? "Minecraft "+manifest.minecraftVersion : "Konfiguracja oczekuje na manifest"}</span></footer>
    </main>

    {challenge && <div className="modal-backdrop"><div className="login-modal"><button className="modal-close" onClick={() => setChallenge(null)}><X size={18}/></button><div className="login-modal-icon"><LogIn size={23}/></div><span className="panel-label">BEZPIECZNE LOGOWANIE</span><h2>Połącz konto Microsoft</h2><p>Otworzyliśmy stronę Microsoft. Wpisz poniższy kod i zaakceptuj dostęp do usług Xbox.</p><div className="device-code">{challenge.userCode}<button onClick={() => void navigator.clipboard.writeText(challenge.userCode)}>KOPIUJ</button></div><button className="play-button modal-action" onClick={() => void window.launcher.openExternal(challenge.verificationUri)}><ExternalLink size={16}/> OTWÓRZ MICROSOFT</button><div className="auth-status"><span className="status-dot"/>{authMessage || "Oczekiwanie na potwierdzenie…"}</div><small className="privacy-note">Launcher nie prosi o hasło Microsoft. Token sesji jest szyfrowany przez Windows.</small></div></div>}
    {busy && <div className="busy-indicator"><span className="spinner"/><span>{progress?.message || "Przetwarzanie…"}</span></div>}
  </div>;
}