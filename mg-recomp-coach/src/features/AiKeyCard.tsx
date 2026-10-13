// Connect the optional AI coach with the user's own Anthropic API key.
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { AI_MODEL, getApiKey, setApiKey, testApiKey } from '../services/aiCoach';
import { useApp } from '../store/useApp';
import { Banner, Button, Card, Field, Row, T, ToggleRow } from '../ui/kit';
import { useTheme } from '../ui/theme';

const CONSOLE_KEYS_URL = 'https://console.anthropic.com/settings/keys';

export function useHasApiKey(): [boolean | null, (v: boolean) => void] {
  const [has, setHas] = useState<boolean | null>(null);
  useEffect(() => {
    getApiKey().then((k) => setHas(!!k));
  }, []);
  return [has, setHas];
}

export function AiKeyCard({ onChange }: { onChange?: (connected: boolean) => void }) {
  const { c } = useTheme();
  const aiEnabled = useApp((s) => s.data.settings.aiEnabled);
  const setSettings = useApp((s) => s.setSettings);
  const [hasKey, setHasKey] = useHasApiKey();
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'success' | 'danger' | 'info'; text: string } | null>(null);

  const saveAndTest = async () => {
    const k = key.trim();
    if (!k.startsWith('sk-ant-')) {
      setMsg({ tone: 'danger', text: 'That doesn’t look like an Anthropic key. Keys start with sk-ant-.' });
      return;
    }
    setBusy(true);
    setMsg({ tone: 'info', text: 'Checking the key…' });
    const res = await testApiKey(k);
    setBusy(false);
    if (!res.ok) {
      setMsg({ tone: 'danger', text: res.error });
      return;
    }
    await setApiKey(k);
    setSettings({ aiEnabled: true });
    setHasKey(true);
    setEditing(false);
    setKey('');
    setMsg({ tone: 'success', text: 'Connected. Ask the coach anything below.' });
    onChange?.(true);
  };

  const paste = async () => {
    const t = (await Clipboard.getStringAsync()).trim();
    if (t) setKey(t);
  };

  if (hasKey === null) return null;

  if (hasKey && !editing) {
    return (
      <Card tone="success">
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="bodyStrong">AI coach connected ✓</T>
          <T v="caption" muted>{AI_MODEL}</T>
        </Row>
        <ToggleRow label="Use the AI coach for questions" sub="Off = offline answers only" value={aiEnabled} onChange={(v) => setSettings({ aiEnabled: v })} />
        {msg ? <Banner tone={msg.tone === 'danger' ? 'danger' : msg.tone === 'success' ? 'success' : 'info'} text={msg.text} /> : null}
        <Row>
          <Button label="Replace key" small variant="secondary" onPress={() => { setEditing(true); setMsg(null); }} flex />
          <Button
            label="Remove key"
            small
            variant="ghost"
            flex
            onPress={async () => {
              await setApiKey(null);
              setSettings({ aiEnabled: false });
              setHasKey(false);
              setMsg(null);
              onChange?.(false);
            }}
          />
        </Row>
      </Card>
    );
  }

  return (
    <Card tone="alt">
      <T v="heading">Connect the AI coach (optional)</T>
      <T>Use your own Anthropic API key to ask real questions about your data. Without it, the coach still works offline.</T>
      <T v="label">1. Create a key on the Anthropic Console (Settings → API keys) and copy it.</T>
      <Button label="Open Anthropic Console" small variant="secondary" icon="right" onPress={() => Linking.openURL(CONSOLE_KEYS_URL)} />
      <T v="label">2. Paste it here and tap Save.</T>
      <Field label="API key" value={key} onChange={(v) => { setKey(v); setMsg(null); }} keyboard="default" secure placeholder="sk-ant-..." />
      <Row>
        <Button label="Paste" small variant="ghost" icon="copy" onPress={paste} flex />
        <Button label="Save and test" small icon="check" onPress={saveAndTest} disabled={busy || key.trim().length < 20} flex />
      </Row>
      {busy ? <ActivityIndicator color={c.primary} /> : null}
      {msg ? <Banner tone={msg.tone === 'danger' ? 'danger' : msg.tone === 'success' ? 'success' : 'info'} text={msg.text} /> : null}
      {hasKey ? <Button label="Cancel" small variant="ghost" onPress={() => { setEditing(false); setMsg(null); }} /> : null}
      <T v="caption" muted>
        The key is kept in the phone’s secure storage. Usage is billed to your Anthropic account (roughly 1-3 US cents per question). Your data
        leaves the phone only when you press Send: a 14-day summary plus your question.
      </T>
    </Card>
  );
}
