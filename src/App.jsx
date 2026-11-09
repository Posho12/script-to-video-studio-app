import { useEffect, useMemo, useState } from 'react';

const demoScript = `Open with a close-up of a desk at sunrise.

A freelancer begins their workday with coffee and a laptop.

The camera slowly moves across a clean workspace and a notebook filled with ideas.

A voice explains how simple routines can create consistent results.

Cut to a wide shot of the city waking up, then back to the creator writing a new plan.`;

const sceneImages = [
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1200&q=80',
];

function splitScriptIntoScenes(script) {
  const sentences = script
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!sentences.length) {
    return [{
      id: Date.now(),
      title: 'Scene 1',
      narration: 'Add your script here to generate scenes.',
      imagePrompt: 'Minimal cinematic office scene, soft lighting, high detail',
      caption: 'Add your script here to generate scenes.',
      style: 'cinematic',
      imageUrl: sceneImages[0],
    }];
  }

  return sentences.map((sentence, index) => ({
    id: `${Date.now()}-${index}`,
    title: `Scene ${index + 1}`,
    narration: sentence,
    imagePrompt: `Cinematic shot for: ${sentence.slice(0, 80)}`,
    caption: sentence,
    style: index % 2 === 0 ? 'cinematic' : 'storytelling',
    imageUrl: sceneImages[index % sceneImages.length],
  }));
}

function choosePreferredVoice(voices) {
  const englishVoices = voices.filter((voice) => voice.lang?.toLowerCase().startsWith('en'));
  const candidates = englishVoices.length ? englishVoices : voices;
  const preferred = candidates.find((voice) =>
    /natural|neural|google us english|jenny|aria|samantha/i.test(voice.name)
  );
  return preferred || candidates.find((voice) => voice.default) || candidates[0];
}

export default function App() {
  const [script, setScript] = useState(demoScript);
  const [scenes, setScenes] = useState(() => splitScriptIntoScenes(demoScript));
  const [status, setStatus] = useState('Ready');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const [voiceName, setVoiceName] = useState('');
  const [speechRate, setSpeechRate] = useState('0.95');

  useEffect(() => {
    if (!('speechSynthesis' in window)) return undefined;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      setVoiceName((currentName) => {
        if (currentName && availableVoices.some((voice) => voice.name === currentName)) {
          return currentName;
        }
        return choosePreferredVoice(availableVoices)?.name || '';
      });
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const projectSummary = useMemo(() => {
    const words = script.trim().split(/\s+/).filter(Boolean).length;
    return `${scenes.length} scenes • ${words} words`;
  }, [script, scenes]);

  const handleGenerateScenes = () => {
    if (!script.trim()) {
      setStatus('Add a script first');
      return;
    }
    setStatus('Generating scenes...');
    const nextScenes = splitScriptIntoScenes(script);
    setScenes(nextScenes);
    setStatus('Scenes ready');
  };

  const handleAddScene = () => {
    const nextScene = {
      id: `${Date.now()}`,
      title: `Scene ${scenes.length + 1}`,
      narration: 'Write a scene description here.',
      imagePrompt: 'Clean visual concept for a faceless YouTube scene',
      caption: 'Write a scene description here.',
      style: 'cinematic',
      imageUrl: sceneImages[scenes.length % sceneImages.length],
    };

    setScenes((current) => [...current, nextScene]);
  };

  const updateScene = (id, field, value) => {
    setScenes((current) =>
      current.map((scene) => (scene.id === id ? { ...scene, [field]: value } : scene))
    );
  };

  const speakNarration = (text) => {
    if (!('speechSynthesis' in window)) {
      setStatus('Speech playback is not supported in this browser');
      return;
    }
    if (!text.trim()) {
      setStatus('Add narration text first');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    const selectedVoice = voices.find((voice) => voice.name === voiceName);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = 'en-US';
    }
    utterance.rate = Number(speechRate);
    utterance.pitch = 1;
    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatus('Playing narration');
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setStatus('Ready');
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setStatus('Could not play narration. Try another voice.');
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopNarration = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setStatus('Ready');
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">AI video workflow</p>
          <h1>Script to Video Studio</h1>
        </div>
        <button className="primary-button">Export project</button>
      </header>

      <section className="panel summary-panel">
        <div>
          <p className="label">Project status</p>
          <strong>{status}</strong>
        </div>
        <div>
          <p className="label">Timeline</p>
          <strong>{projectSummary}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>1. Script input</h2>
          <div className="button-row">
            <button className="secondary-button" onClick={handleGenerateScenes}>
              Generate scenes
            </button>
            <button className="voice-button" onClick={() => speakNarration(script)} disabled={isSpeaking}>
              {isSpeaking ? 'Speaking...' : 'Play all'}
            </button>
            {isSpeaking && (
              <button className="voice-button danger" onClick={stopNarration}>
                Stop
              </button>
            )}
          </div>
        </div>

        <textarea
          value={script}
          onChange={(event) => setScript(event.target.value)}
          placeholder="Paste your YouTube script here..."
          rows={8}
        />

        <div className="voice-settings">
          <label>
            Free device voice
            <select
              value={voiceName}
              onChange={(event) => setVoiceName(event.target.value)}
              disabled={!voices.length}
            >
              {voices.length ? voices.map((voice) => (
                <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                  {voice.name} ({voice.lang}){voice.default ? ' — device default' : ''}
                </option>
              )) : <option value="">Loading available voices…</option>}
            </select>
          </label>
          <label>
            Narration pace: {Number(speechRate).toFixed(2)}×
            <input
              type="range"
              min="0.8"
              max="1.1"
              step="0.05"
              value={speechRate}
              onChange={(event) => setSpeechRate(event.target.value)}
            />
          </label>
          <p className="voice-note">
            Uses voices installed on this device for free. Voice options and naturalness depend on your browser and device.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>2. Scene planner</h2>
          <button className="secondary-button" onClick={handleAddScene}>
            Add scene
          </button>
        </div>

        <div className="scene-list">
          {scenes.map((scene) => (
            <article key={scene.id} className="scene-card">
              <div
                className="scene-preview"
                style={{ backgroundImage: `url(${scene.imageUrl})` }}
              >
                <div className="scene-overlay">
                  <span>{scene.title}</span>
                </div>
              </div>

              <div className="scene-header">
                <input
                  value={scene.title}
                  onChange={(event) => updateScene(scene.id, 'title', event.target.value)}
                />
                <select
                  value={scene.style}
                  onChange={(event) => updateScene(scene.id, 'style', event.target.value)}
                >
                  <option value="cinematic">Cinematic</option>
                  <option value="storytelling">Storytelling</option>
                  <option value="minimal">Minimal</option>
                  <option value="vlog">Vlog</option>
                </select>
              </div>

              <label>
                Narration
                <textarea
                  rows={3}
                  value={scene.narration}
                  onChange={(event) => updateScene(scene.id, 'narration', event.target.value)}
                />
              </label>

              <label>
                Image prompt
                <textarea
                  rows={2}
                  value={scene.imagePrompt}
                  onChange={(event) => updateScene(scene.id, 'imagePrompt', event.target.value)}
                />
              </label>

              <label>
                Captions
                <textarea
                  rows={2}
                  value={scene.caption}
                  onChange={(event) => updateScene(scene.id, 'caption', event.target.value)}
                />
              </label>

              <div className="button-row">
                <button className="voice-button" onClick={() => speakNarration(scene.narration)} disabled={isSpeaking}>
                  Speak scene
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
