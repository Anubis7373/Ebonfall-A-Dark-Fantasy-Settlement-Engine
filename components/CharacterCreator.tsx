
import React, { useState, useRef, useEffect } from 'react';
import { PlayerCommander } from '../types';
import { describeCharacterFromImage } from '../services/geminiService';

interface CharacterCreatorProps {
  onComplete: (commander: PlayerCommander) => void;
}

const ORIGINS = [
  {
    id: "noble",
    name: "Former Magistrate",
    description: "You once upheld the laws of a thriving city. Now, your authority is only as strong as your ability to provide for the camp.",
    traits: ["Voice of Law", "Bureaucratic Efficiency", "Political Maneuver", "Judicial Gaze"],
    bonus: "Start with +20 Morale"
  },
  {
    id: "mercenary",
    name: "Company Captain",
    description: "You led a professional band of soldiers. Your tactical mind is your greatest asset in a world where everyone is hungry.",
    traits: ["Battle Tactician", "Drill Sergeant", "Logistics Master", "Siege Mind"],
    bonus: "Start with +10 Defense"
  },
  {
    id: "scholar",
    name: "Archivist",
    description: "You hold the practical knowledge of the old world—engineering, medicine, and history. Facts are your shield.",
    traits: ["Old World Polymath", "Tech-Savant", "Medical Theory", "Cartographer"],
    bonus: "Start with +15 Resolve"
  },
  {
    id: "ash_walker",
    name: "Feral Scavenger",
    description: "You've lived on the fringes since the collapse. You know how to find sustenance in the most barren wastes.",
    traits: ["Smog-Adapted", "Master Scrounger", "Shadow-Walker", "Gut of Iron"],
    bonus: "Start with +15 Food"
  }
];

const PHILOSOPHIES = [
  { 
    id: "compassion", 
    name: "Altruism", 
    description: "Every life has intrinsic value. We survive together or not at all.",
    traits: ["Community Bond", "Martyr's Spirit", "Guardian of the Weak"]
  },
  { 
    id: "order", 
    name: "Pragmatism", 
    description: "Rules and discipline are the only things preventing total collapse.",
    traits: ["Utilitarian Calculus", "Iron Discipline", "Efficiency Expert"]
  },
  { 
    id: "survival", 
    name: "Individualism", 
    description: "The weak will fall. We focus resources on those most likely to endure.",
    traits: ["Apex Survivor", "Self-Reliant", "Cull the Weak"]
  }
];

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onComplete }) => {
  const [name, setName] = useState("");
  const [selectedOrigin, setSelectedOrigin] = useState(ORIGINS[0]);
  const [selectedPhilosophy, setSelectedPhilosophy] = useState(PHILOSOPHIES[0]);
  const [customPortrait, setCustomPortrait] = useState<string | undefined>(undefined);
  const [visualDescription, setVisualDescription] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set initial description based on origin
  useEffect(() => {
    if (!visualDescription && !customPortrait) {
        setVisualDescription(`A realistic commander of ${selectedOrigin.name} background, weather-beaten face, wearing practical, worn winter clothing.`);
    }
  }, [selectedOrigin]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const result = reader.result as string;
      setCustomPortrait(result);
      
      // Analyze image to get a text description for future generation
      setIsAnalyzing(true);
      try {
        const desc = await describeCharacterFromImage(result);
        if (desc) {
            setVisualDescription(desc);
        }
      } catch (err) {
        console.warn("Failed to analyze image description");
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importText);
      if (data.name) setName(data.name);
      if (data.origin) {
        const o = ORIGINS.find(ori => ori.name.toLowerCase().includes(data.origin.toLowerCase()));
        if (o) setSelectedOrigin(o);
      }
      if (data.philosophy) {
        const p = PHILOSOPHIES.find(phi => phi.name.toLowerCase().includes(data.philosophy.toLowerCase()));
        if (p) setSelectedPhilosophy(p);
      }
      if (data.portraitUrl) setCustomPortrait(data.portraitUrl);
      if (data.visualDescription) setVisualDescription(data.visualDescription);
      setShowImport(false);
      setImportText("");
    } catch (err) {
      alert("Invalid profile JSON.");
    }
  };

  const handleComplete = () => {
    if (!name.trim()) return;
    
    // Combine traits from Origin and Philosophy
    const combinedTraits = [
      ...selectedOrigin.traits,
      ...selectedPhilosophy.traits
    ];

    onComplete({
      name: name,
      origin: selectedOrigin.name,
      philosophy: selectedPhilosophy.name,
      visualDescription: visualDescription || `A realistic commander of ${selectedOrigin.name} background, weather-beaten face, practical winter clothing.`,
      traits: combinedTraits,
      portraitUrl: customPortrait
    });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 md:p-12 overflow-hidden">
      <div className="max-w-6xl w-full parchment stone-border p-10 md:p-16 relative fade-in flex flex-col md:flex-row gap-16 shadow-[0_0_150px_rgba(0,0,0,1)]">
        
        {showImport && (
          <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center p-10">
            <div className="max-w-2xl w-full space-y-8">
              <h2 className="text-4xl medieval-font sepia-text text-center uppercase tracking-widest">Import Record</h2>
              <textarea 
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full h-64 bg-stone-900/50 border border-stone-800 p-6 text-amber-100 font-mono text-sm outline-none"
              />
              <div className="flex gap-4">
                <button onClick={() => setShowImport(false)} className="flex-1 py-4 border border-stone-800 text-stone-500 medieval-font text-2xl uppercase">Cancel</button>
                <button onClick={handleImport} className="flex-1 py-4 bg-amber-900/40 border border-amber-800 text-amber-200 medieval-font text-2xl uppercase">Import</button>
              </div>
            </div>
          </div>
        )}

        <div className="md:w-1/2 space-y-10 custom-scroll overflow-y-auto max-h-[80vh] pr-4">
          <header className="flex justify-between items-start">
            <div>
              <h1 className="text-6xl md:text-8xl medieval-font sepia-text mb-4 tracking-widest uppercase">The Commander</h1>
              <p className="text-stone-500 font-serif italic text-xl">The survivors need a leader of substance, not myth.</p>
            </div>
          </header>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-xs uppercase tracking-[0.5em] text-stone-600 font-bold medieval-font">Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-900/50 border-b-2 border-stone-800 p-6 text-4xl medieval-font sepia-text outline-none focus:border-amber-900"
              />
            </div>

            <div className="space-y-4">
              <label className="text-xs uppercase tracking-[0.5em] text-stone-600 font-bold medieval-font">Background</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ORIGINS.map((o) => (
                  <button 
                    key={o.id}
                    onClick={() => setSelectedOrigin(o)}
                    className={`text-left p-6 border-2 transition-all relative overflow-hidden group ${selectedOrigin.id === o.id ? 'bg-amber-900/10 border-amber-900' : 'border-stone-900'}`}
                  >
                    <h3 className="text-2xl medieval-font mb-2 sepia-text relative z-10">{o.name}</h3>
                    <div className="flex flex-wrap gap-2 relative z-10">
                      {o.traits.slice(0, 2).map(t => (
                        <span key={t} className="text-[10px] uppercase bg-black/40 border border-stone-800 px-2 py-1 text-stone-400">{t}</span>
                      ))}
                      {o.traits.length > 2 && <span className="text-[10px] uppercase bg-black/40 border border-stone-800 px-2 py-1 text-stone-400">...</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs uppercase tracking-[0.5em] text-stone-600 font-bold medieval-font">Philosophy</label>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-4">
                  {PHILOSOPHIES.map((p) => (
                    <button 
                      key={p.id}
                      onClick={() => setSelectedPhilosophy(p)}
                      className={`px-8 py-3 border-2 transition-all text-sm uppercase tracking-widest font-bold ${selectedPhilosophy.id === p.id ? 'bg-amber-900/20 border-amber-900 text-amber-200' : 'border-stone-900 text-stone-600'}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <div className="text-stone-400 text-sm font-serif italic border-l-2 border-stone-800 pl-4 py-2">
                  <p className="mb-2">{selectedPhilosophy.description}</p>
                  <div className="flex gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-stone-600 font-bold">Imparts:</span>
                    {selectedPhilosophy.traits.map(t => (
                      <span key={t} className="text-[10px] uppercase text-amber-700 font-bold">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="md:w-1/2 flex flex-col justify-between bg-black/40 p-10 border-l-2 border-stone-800 border-dashed">
          <div className="space-y-8 text-center">
            <div className="relative group/portrait w-48 h-48 mx-auto">
                <div 
                className={`w-full h-full border-4 border-stone-800 rounded-full bg-stone-950 overflow-hidden cursor-pointer relative ${isAnalyzing ? 'animate-pulse border-amber-600' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                >
                {customPortrait ? (
                    <img src={customPortrait} alt="Commander" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-7xl text-stone-900 leading-[12rem]">✥</span>
                )}
                
                {isAnalyzing && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-amber-500 font-bold medieval-font tracking-widest">ANALYZING</span>
                    </div>
                )}
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-max">
                     <span className="text-[10px] uppercase tracking-widest text-stone-600">Click to Upload Portrait</span>
                </div>
            </div>
            
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            <h2 className="text-5xl medieval-font sepia-text mt-6">{name || "Unnamed"}</h2>
            
            <div className="space-y-4 text-left">
                <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.4em] text-stone-500 font-bold">Visual Appearance</label>
                    <textarea 
                        value={visualDescription}
                        onChange={(e) => setVisualDescription(e.target.value)}
                        placeholder="Describe your commander's face, hair, scars, and clothing..."
                        className="w-full h-32 bg-stone-900/50 border border-stone-800 text-stone-300 p-4 font-serif italic text-sm outline-none focus:border-amber-900 resize-none"
                    />
                    <p className="text-[10px] text-stone-600 italic">* This description will dictate your appearance in all generated game scenes.</p>
                </div>

                <div className="parchment p-4 border border-stone-800">
                    <h4 className="text-[10px] uppercase tracking-[0.4em] text-stone-500 font-bold mb-2">Active Traits</h4>
                    <div className="flex flex-wrap gap-2">
                    {[...selectedOrigin.traits, ...selectedPhilosophy.traits].map((trait, i) => (
                        <span key={i} className="px-3 py-1 bg-stone-900/80 border border-stone-700 text-stone-300 text-xs uppercase tracking-wide">
                        {trait}
                        </span>
                    ))}
                    </div>
                </div>
            </div>
          </div>

          <button 
            onClick={handleComplete}
            disabled={!name.trim() || isAnalyzing}
            className={`w-full py-8 border-2 transition-all text-3xl medieval-font uppercase tracking-[0.5em] mt-8 ${name.trim() && !isAnalyzing ? 'border-amber-900 text-amber-500 bg-amber-950/20 hover:bg-amber-900/40' : 'border-stone-900 text-stone-800 cursor-not-allowed'}`}
          >
            Take Command
          </button>
        </div>
      </div>
    </div>
  );
};

export default CharacterCreator;
