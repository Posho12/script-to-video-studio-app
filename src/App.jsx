import { useMemo, useState } from 'react';

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
  const sentences = script.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
  if (!sentences.length) return [];

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

function getSavedEndpoint() {
  try {
    return window.localStorage.getItem('ttsApiEndpoint') || '';
  } catch {
    return '';
  }
}

export default function App() {
  const [script, setScript] = useState(demoScript);
  const [scenes, setScenes] = useState(() => splitScriptIntoScenes(demoScript));
  const [status, setStatus] = useState('Ready');
  const [apiEndpoint, setApiEndpoint] = useState(getSavedEndpoint);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioLabel, setAudioLabel] = useState('');

  const projectSummary = useMemo(() => {
    const words = script.trim().split(/\s+/).filter(Boolean).length;
    return `${scenes.length} scenes • ${words} words`;
  }, [script, scenes]);

  const handleGenerateScenes = () => {
    if (!script.trim()) {
      setStatus('Add a script first');
      return;
    }
    const nextScenes = splitScriptIntoScenes(script);
    setScenes(nextScenes);
    setStatus('Scenes ready');
  };

  const handleAddScene = () => {
    setScenes((current) => [...current, {
      id: `${Date.now()}`,
      title: `Scene ${current.length + 1}`,
      narration: 'Write a scene description here.',
      imagePrompt: 'Clean visual concept for a faceless YouTube scene',
      caption: 'Write a scene description here.',
      style: 'cinematic',
      imageUrl: sceneImages[current.length % sceneImages.length],
    }]);
  };

  const updateScene = (id, field, value) => {
    setScenes((current) => current.map((scene) => (scene.id === id ? { ...scene, [field]: value } : scene)));
  };

  const generateNarration = async (text, label) => {
    const endpoint = apiEndpoint.trim().replace(/\/$/, '');
    if (!endpoint) {
      setStatus('Add your secure AI voice API URL first');
      return;
    }
    if (!text.trim()) {
      setStatus('Add narration text first');
      return;
    }
    if (text.length > 5000) {
      setStatus('Narration is too long. Split it into shorter sections (max 5,000 characters).');
      return;
    }

    setIsGeneratingAudio(true);
    setStatus('Generating natural AI narration…');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        throw new Error(details.error || `Voice service returned ${response.status}`);
      }

      const audioBlob = await response.blob();
      if (!audioBlob.size) throw new Error('The voice service returned empty audio.');
      const nextAudioUrl = URL.createObjectURL(audioBlob);
      setAudioUrl((currentUrl) => {
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        return nextAudioUrl;
      });
      setAudioLabel(label);
      setStatus('AI narration ready');
    } catch (error) {
      setStatus(error.message || 'Could not generate narration. Check the API URL and setup.');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const saveEndpoint = (value) => {
    setApiEndpoint(value);
    try {
      window.localStorage.setItem('ttsApiEndpoint', value);
    } catch {
      // The endpoint still works for this page session when storage is unavailable.
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">AI video workflow</p>
          <h1>Script to Video Studio</h1>
        </div>
        <button className="primary-button" type="button">Export project</button>
      </header>

      <section className="panel summary-panel">
        <div><p className="label">Project status</p><strong>{status}</strong></div>
        <div><p className="label">Timeline</p><strong>{projectSummary}</strong></div>
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>1. Script input</h2>
          <div className="button-row">
            <button className="secondary-button" type="button" onClick={handleGenerateScenes}>Generate scenes</button>
            <button className="voice-button" type="button" onClick={() => generateNarration(script, 'Full script')} disabled={isGeneratingAudio}>
              {isGeneratingAudio ? 'Generating voice…' : 'Generate AI voice'}
            </button>
          </div>
        </div>

        <textarea value={script} onChange={(event) => setScript(event.target.value)} placeholder="Paste your YouTube script here..." rows={8} />

        <div className="voice-settings">
          <label>
            Secure AI voice service URL
            <input
              type="url"
              value={apiEndpoint}
              onChange={(event) => saveEndpoint(event.target.value)}
              placeholder="https://your-service.vercel.app/api/tts"
              autoComplete="url"
            />
          </label>
          <p className="voice-note">The voice is generated by a secure ElevenLabs server endpoint. Your API key must stay on the server and is never entered here.</p>
          {audioUrl && (
            <div className="audio-result">
              <strong>{audioLabel} narration</strong>
              <audio controls src={audioUrl}>Your browser cannot play this audio.</audio>
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>2. Scene planner</h2>
          <button className="secondary-button" type="button" onClick={handleAddScene}>Add scene</button>
        </div>

        <div className="scene-list">
          {scenes.map((scene) => (
            <article key={scene.id} className="scene-card">
              <div className="scene-preview" style={{ backgroundImage: `url(${scene.imageUrl})` }}>
                <div className="scene-overlay"><span>{scene.title}</span></div>
              </div>
              <div className="scene-header">
                <input aria-label="Scene title" value={scene.title} onChange={(event) => updateScene(scene.id, 'title', event.target.value)} />
                <select aria-label="Scene style" value={scene.style} onChange={(event) => updateScene(scene.id, 'style', event.target.value)}>
                  <option value="cinematic">Cinematic</option><option value="storytelling">Storytelling</option><option value="minimal">Minimal</option><option value="vlog">Vlog</option>
                </select>
              </div>
              <label>Narration<textarea rows={3} value={scene.narration} onChange={(event) => updateScene(scene.id, 'narration', event.target.value)} /></label>
              <label>Image prompt<textarea rows={2} value={scene.imagePrompt} onChange={(event) => updateScene(scene.id, 'imagePrompt', event.target.value)} /></label>
              <label>Captions<textarea rows={2} value={scene.caption} onChange={(event) => updateScene(scene.id, 'caption', event.target.value)} /></label>
              <div className="button-row">
                <button className="voice-button" type="button" onClick={() => generateNarration(scene.narration, scene.title)} disabled={isGeneratingAudio}>
                  Generate scene voice
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
