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

export default function App() {
  const [script, setScript] = useState(demoScript);
  const [scenes, setScenes] = useState(() => splitScriptIntoScenes(demoScript));
  const [status, setStatus] = useState('Ready');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const projectSummary = useMemo(() => {
    const words = script.trim().split(/\s+/).filter(Boolean).length;
    return `${scenes.length} scenes • ${words} words`;
  }, [script, scenes]);

  const handleGenerateScenes = () => {
    setStatus('Generating scenes...');
    const nextScenes = splitScriptIntoScenes(script);
    setScenes(nextScenes);
    setTimeout(() => setStatus('Scenes ready'), 250);
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
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1.1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopNarration = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
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
            <button className="voice-button" onClick={() => speakNarration(script)}>
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
                <button className="voice-button" onClick={() => speakNarration(scene.narration)}>
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
