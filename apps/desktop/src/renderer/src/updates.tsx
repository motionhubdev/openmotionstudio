import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, CircleAlert, Download, ExternalLink, Loader, RefreshCw, RotateCw } from 'lucide-react';
import type { StudioUpdate } from '../../shared/api';
import { Logo } from './logo';
import { usePreferences } from './preferences';

const UpdateContext = createContext<StudioUpdate | null>(null);

export function InstalledVersion() {
  const version = useContext(UpdateContext)?.installed;
  // A version is an identifier, never translated: one string, not a "v" the translation check reads as a label.
  return version ? <small className="installed-version">{`v${version}`}</small> : null;
}

function DownloadUpdate() {
  const { t } = usePreferences();
  const [failed, setFailed] = useState(false);
  return <>
    <button className="button primary" onClick={() => {
      setFailed(false);
      void window.studio.openUpdateDownload().catch(() => setFailed(true));
    }}><ExternalLink size={14} />{t('Download update')}</button>
    {failed && <small role="alert">{t('Open openmotion.studio in your browser to download the update.')}</small>}
  </>;
}

function UpdateAction({ state }: { state: StudioUpdate }) {
  const { t } = usePreferences();
  const [pending, setPending] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  if (state.status === 'downloading') return <span className="update-action-progress" role="status"><Loader size={14} className="spin" />{t('Downloading update…')}</span>;
  if (state.status === 'installing') return <span className="update-action-progress" role="status"><Loader size={14} className="spin" />{t('Preparing to restart…')}</span>;
  if (state.status !== 'ready') return <DownloadUpdate />;
  return <>
    <button className="button primary" disabled={pending} onClick={async () => {
      setPending(true);
      setBlocked(null);
      setFailed(false);
      try { setBlocked(await window.studio.installUpdate()); }
      catch { setFailed(true); }
      finally { setPending(false); }
    }}>{pending ? <Loader size={14} className="spin" /> : <RotateCw size={14} />}{t('Restart to update')}</button>
    {blocked && <small role="status">{t('Finish active work and save or discard drafts in {name}, then try again.', { name: blocked })}</small>}
    {failed && <small role="alert">{t('Could not prepare the update. Check for updates to try again.')}</small>}
  </>;
}

declare global {
  interface Window {
    studioUpdateLock?: (locked: boolean) => boolean;
  }
}

export function StudioUpdateProvider({ children }: { children: ReactNode }) {
  const { t } = usePreferences();
  useEffect(() => {
    window.studioUpdateLock = locked => {
      if (locked && document.querySelector('[data-update-draft="true"]')) return false;
      document.body.inert = locked;
      return true;
    };
    return () => {
      delete window.studioUpdateLock;
      document.body.inert = false;
    };
  }, []);
  const [state, setState] = useState<StudioUpdate | null>(null);
  useEffect(() => {
    let acceptSnapshot = true;
    const stop = window.studio.onUpdateChanged(next => {
      acceptSnapshot = false;
      setState(next);
    });
    void window.studio.updateStatus().then(next => { if (acceptSnapshot) setState(next); }).catch(() => {});
    return () => { acceptSnapshot = false; stop(); };
  }, []);
  const version = state?.available;
  return <UpdateContext.Provider value={state}>
    {children}
    {version && version !== state.dismissed && <aside className="toast update-notice" aria-label={t('Studio updates')}>
      <span role="status">{t('OpenMotionStudio {version} is available.', { version })}</span>
      <UpdateAction state={state} />
      {state.status === 'download-error' && <small role="status">{t('Could not prepare the update. Check for updates to try again.')}</small>}
      <button className="button" onClick={() => void window.studio.dismissUpdate(version)}>{t('Later')}</button>
    </aside>}
  </UpdateContext.Provider>;
}

export function UpdateSettings() {
  const { t, preferences, ready, save } = usePreferences();
  const state = useContext(UpdateContext);
  const [checkFailed, setCheckFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => setCheckFailed(false), [state]);
  const checking = state?.status === 'checking';
  const busy = checking || state?.status === 'downloading' || state?.status === 'installing';
  const failed = checkFailed || state?.status === 'error' || state?.status === 'download-error';
  const message = checkFailed ? t('Could not complete this action. Please try again.')
    : state?.status === 'download-error' ? t('Could not prepare the update. Check for updates to try again.')
    : state?.status === 'error' ? t('Could not check for updates. Try again later.')
    : checking ? t('Checking for updates…')
    : state?.status === 'downloading' ? t('Downloading update…')
    : state?.status === 'installing' ? t('Preparing to restart…')
    : state?.available ? t('OpenMotionStudio {version} is available.', { version: state.available })
    : state?.status === 'checked' ? t('You have the latest version.')
    : state ? t('Check for a newer version.')
    : t('Loading update status…');
  const StatusIcon = busy ? Loader : failed ? CircleAlert : state?.status === 'checked' && !state.available ? CheckCircle2 : state?.available ? Download : null;
  return <section className="provider-form general-settings update-settings" aria-labelledby="updates-heading">
    <h2 id="updates-heading">{t('Studio updates')}</h2>
    <p className="note">{t('Keep OpenMotionStudio up to date.')}</p>
    <div className="update-panel">
      <div className="update-summary">
        <span className="update-product-icon" aria-hidden="true"><Logo size={36} /></span>
        <div className="update-copy">
          <div className="update-version-line">
            <strong>OpenMotionStudio</strong>
            {state && <span className="update-version mono">{t('Version {version}', { version: state.installed })}</span>}
          </div>
          <p className={`update-status${failed ? ' bad' : state?.status === 'checked' && !state.available ? ' good' : state?.available ? ' available' : ''}`} role={failed ? 'alert' : 'status'}>
            {StatusIcon && <StatusIcon size={14} className={busy ? 'spin' : undefined} aria-hidden="true" />}
            <span>{message}</span>
          </p>
        </div>
        <div className="update-actions">
          {state?.available && !busy && <UpdateAction state={state} />}
          <button className={`button${state?.available ? ' ghost' : ''}`} disabled={busy} onClick={() => {
            setCheckFailed(false);
            void window.studio.checkForUpdates().catch(() => setCheckFailed(true));
          }}>
            {checking ? <Loader size={14} className="spin" /> : <RefreshCw size={14} />}
            {checking ? t('Checking for updates…') : t('Check for updates')}
          </button>
        </div>
      </div>
    </div>
    <label className="preference-row update-preference">
      <span>
        <strong>{t('Automatically check for updates')}</strong>
        <span className="note">{t('Get notified when a new version is available.')}</span>
        {saving && <span className="note" role="status">{t('Saving…')}</span>}
        {saveFailed && <span className="note error" role="alert">{t('Could not complete this action. Please try again.')}</span>}
      </span>
      <input type="checkbox" role="switch" className="switch" aria-label={t('Automatically check for updates')}
        checked={preferences.checkUpdatesAutomatically !== false} disabled={!ready || saving}
        onChange={async event => {
          const enabled = event.target.checked;
          setSaveFailed(false);
          setSaving(true);
          try { await save({ checkUpdatesAutomatically: enabled }); }
          catch { setSaveFailed(true); }
          finally { setSaving(false); }
        }} />
    </label>
  </section>;
}
