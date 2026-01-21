
import React, { useState, useMemo, useRef } from 'react';
import { SettlementState, Survivor } from '../types';
import { generateSurvivorPortrait } from '../services/geminiService';

interface ResourceBarProps {
  state: SettlementState;
  trends?: Record<string, number>; // Maps resource key to delta (e.g., food: -5)
  onUpdateSurvivor?: (updatedSurvivor: Survivor) => void;
  onAddSurvivor?: (newSurvivor: Survivor) => void;
}

const ResourceBar: React.FC<ResourceBarProps> = ({ state, trends, onUpdateSurvivor, onAddSurvivor }) => {
  const [showChronicle, setShowChronicle] = useState(false);
  const [viewTab, setViewTab] = useState<'living' | 'fallen'>('living');
  const [selectedSurvivorName, setSelectedSurvivorName] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
  const [portraitError, setPortraitError] = useState<string | null>(null);
  
  const [editData, setEditData] = useState<{ 
    name: string; 
    role: string; 
    story: string; 
    visualDescription: string;
    portraitUrl?: string;
  }>({ 
    name: '', 
    role: '', 
    story: '', 
    visualDescription: '' 
  });
  
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const totalPop = state.population.adults + state.population.children;
  const livingList = state.survivors || [];
  const fallenList = state.deceased || [];
  const activeList = viewTab === 'living' ? livingList : fallenList;

  const featuredLeader = useMemo(() => {
    return livingList.find(s => s.role.toLowerCase().includes('chronicler')) || livingList[0];
  }, [livingList]);

  const currentSurvivor = useMemo(() => {
    if (isAdding) return null;
    if (!selectedSurvivorName) return activeList[0] || null;
    return activeList.find(s => s.name === selectedSurvivorName) || activeList[0] || null;
  }, [selectedSurvivorName, activeList, isAdding]);

  const getCreedClass = (creed: string) => {
    const c = creed.toLowerCase();
    if (c.includes('hope') || c.includes('zeal')) return 'creed-badge-hope';
    if (c.includes('steel') || c.includes('pragmatism') || c.includes('merciless')) return 'creed-badge-steel';
    if (c.includes('despair') || c.includes('nihil')) return 'creed-badge-despair';
    return 'sepia-text';
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Healthy': return 'text-green-500';
      case 'Wounded': return 'text-orange-500 animate-pulse';
      case 'Sick': return 'text-purple-400';
      case 'Grim': return 'text-stone-500';
      case 'Deceased': return 'text-red-700';
      default: return 'text-stone-400';
    }
  };

  const openChronicle = (name?: string, tab: 'living' | 'fallen' = 'living') => {
    setViewTab(tab);
    if (name) setSelectedSurvivorName(name);
    setShowChronicle(true);
    setIsEditing(false);
    setIsAdding(false);
    setPortraitError(null);
  };

  const startEditing = () => {
    if (currentSurvivor) {
      setEditData({
        name: currentSurvivor.name,
        role: currentSurvivor.role,
        story: currentSurvivor.story,
        visualDescription: currentSurvivor.visualDescription || '',
        portraitUrl: currentSurvivor.portraitUrl
      });
      setIsEditing(true);
      setIsAdding(false);
    }
  };

  const startAdding = () => {
    setEditData({
      name: '',
      role: '',
      story: '',
      visualDescription: '',
      portraitUrl: undefined
    });
    setIsAdding(true);
    setIsEditing(false);
    setSelectedSurvivorName(null);
    setPortraitError(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditData(prev => ({ ...prev, portraitUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importText);
      setEditData({
        name: data.name || "",
        role: data.role || "",
        story: data.story || "",
        visualDescription: data.visualDescription || "",
        portraitUrl: data.portraitUrl
      });
      setShowImport(false);
      setImportText("");
    } catch (err) {
      alert("Invalid profile JSON.");
    }
  };

  const handleSave = () => {
    if (isAdding && onAddSurvivor) {
      const newSurvivor: Survivor = {
        name: editData.name || "Unnamed Wanderer",
        role: editData.role || "Wanderer",
        story: editData.story || "They emerged from the smog with no past, only a name.",
        visualDescription: editData.visualDescription || "A figure cloaked in tattered rags, features hidden by shadows.",
        status: 'Healthy',
        traits: ["Smog-Born"],
        afflictions: [],
        portraitUrl: editData.portraitUrl
      };
      onAddSurvivor(newSurvivor);
      setIsAdding(false);
      setSelectedSurvivorName(newSurvivor.name);
    } else if (currentSurvivor && onUpdateSurvivor) {
      onUpdateSurvivor({
        ...currentSurvivor,
        name: editData.name,
        role: editData.role,
        story: editData.story,
        visualDescription: editData.visualDescription,
        portraitUrl: editData.portraitUrl
      });
      setIsEditing(false);
    }
  };

  const handleGeneratePortrait = async () => {
    if (!currentSurvivor || !onUpdateSurvivor) return;
    setIsGeneratingPortrait(true);
    setPortraitError(null);
    try {
      const portraitUrl = await generateSurvivorPortrait(currentSurvivor);
      onUpdateSurvivor({ ...currentSurvivor, portraitUrl });
    } catch (err: any) {
      console.error("Portrait generation failed:", err);
      setPortraitError("The record is blurred. Try again later.");
    } finally {
      setIsGeneratingPortrait(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-12">
        <button onClick={() => openChronicle()} className="group transition-all">
          <StatBox label="Survivors" value={totalPop} subValue={`${state.population.children} youth`} icon="👥" isClickable trend={trends?.population} />
        </button>

        {featuredLeader && (
          <button onClick={() => openChronicle(featuredLeader.name)} className="group transition-all hidden lg:block">
            <StatBox label="Leader" value={featuredLeader.name.split(' ')[0]} subValue={featuredLeader.role} icon="👤" isClickable color="text-amber-500" />
          </button>
        )}

        <StatBox label="Food" value={state.resources.food} icon="🍞" color={state.resources.food < totalPop ? 'blood-text' : ''} trend={trends?.food} />
        <StatBox label="Fuel" value={state.resources.wood} icon="🪵" color={state.resources.wood < 10 ? 'blood-text' : ''} trend={trends?.wood} />
        <StatBox label="Creed" value={state.ideology || "None"} icon="📜" color={getCreedClass(state.ideology || "")} subValue="Social Order" />
        <StatBox label="Defense" value={`${state.defense}%`} icon="🛡️" trend={trends?.defense} />
        <StatBox label="Health" value={`${state.health}%`} icon="➕" color={state.health < 30 ? 'blood-text' : ''} trend={trends?.health} />
        <StatBox label="Morale" value={`${state.morale}%`} icon="🕯️" trend={trends?.morale} />
        <StatBox label="Resolve" value={state.resolve} icon="⚖️" trend={trends?.resolve} />
        <StatBox label="Friction" value={state.friction} icon="🔥" color={state.friction > 50 ? 'text-orange-600' : ''} trend={trends?.friction} inverseTrend />
      </div>

      {showChronicle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/95 backdrop-blur-md fade-in">
          <div className="parchment stone-border max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_150px_rgba(0,0,0,1)] relative animate-in zoom-in-95 duration-300">
            
            {showImport && (
               <div className="absolute inset-0 z-[110] bg-black/98 flex items-center justify-center p-20">
                  <div className="max-w-2xl w-full space-y-8">
                    <h2 className="text-4xl medieval-font sepia-text text-center uppercase tracking-widest">Import Profile</h2>
                    <textarea 
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder='{ "name": "...", "role": "...", "story": "...", "portraitUrl": "..." }'
                      className="w-full h-80 bg-stone-900 border border-stone-800 p-6 text-amber-100 font-mono text-xs outline-none focus:border-amber-700"
                    />
                    <div className="flex gap-4">
                      <button onClick={() => setShowImport(false)} className="flex-1 py-4 border border-stone-800 text-stone-500 medieval-font text-2xl uppercase hover:text-white">Discard</button>
                      <button onClick={handleImport} className="flex-1 py-4 bg-amber-900/40 border border-amber-800 text-amber-200 medieval-font text-2xl uppercase hover:bg-amber-800">Seal Import</button>
                    </div>
                  </div>
               </div>
            )}

            <div className="p-8 border-b-4 border-stone-800 flex flex-col md:flex-row justify-between items-center bg-black/60 gap-8">
              <div className="flex flex-col gap-2">
                <h2 className="text-6xl medieval-font sepia-text tracking-[0.2em]">The Ledger of Souls</h2>
                <div className="flex gap-6">
                  <button onClick={() => { setViewTab('living'); setSelectedSurvivorName(null); setIsEditing(false); setIsAdding(false); setPortraitError(null); }} className={`text-sm uppercase tracking-[0.3em] font-bold px-6 py-2 border-2 transition-all ${viewTab === 'living' ? 'border-amber-900/60 text-amber-200 bg-amber-950/20 shadow-[0_0_15px_rgba(251,191,36,0.1)]' : 'border-stone-800 text-stone-600 hover:border-stone-700 hover:text-stone-400'}`}>The Living ({livingList.length})</button>
                  <button onClick={() => { setViewTab('fallen'); setSelectedSurvivorName(null); setIsEditing(false); setIsAdding(false); setPortraitError(null); }} className={`text-sm uppercase tracking-[0.3em] font-bold px-6 py-2 border-2 transition-all ${viewTab === 'fallen' ? 'border-red-900 text-red-600 bg-red-950/20 shadow-[0_0_15px_rgba(150,0,0,0.15)]' : 'border-stone-800 text-stone-600 hover:border-stone-700 hover:text-stone-400'}`}>The Fallen ({fallenList.length})</button>
                </div>
              </div>
              <button onClick={() => setShowChronicle(false)} className="text-stone-700 hover:text-blood-text transition-all transform hover:rotate-90 text-7xl medieval-font p-4">✥</button>
            </div>
            
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              <div className={`w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r-4 border-stone-800 overflow-y-auto custom-scroll p-6 space-y-3 bg-black/40 ${viewTab === 'fallen' ? 'grayscale-[0.3]' : ''}`}>
                {viewTab === 'living' && (
                  <button 
                    onClick={startAdding}
                    className={`w-full text-left p-4 transition-all border-2 rounded-sm group relative overflow-hidden bg-amber-900/10 border-amber-900/40 hover:border-amber-700 mb-6 ${isAdding ? 'ring-2 ring-amber-500' : ''}`}
                  >
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="text-2xl medieval-font text-amber-500 uppercase tracking-widest">+ Enroll Citizen</span>
                      <span className="text-amber-800 text-xl">✥</span>
                    </div>
                  </button>
                )}
                
                {activeList.map((s) => (
                  <button key={s.name} onClick={() => { setSelectedSurvivorName(s.name); setIsEditing(false); setIsAdding(false); setPortraitError(null); }} className={`w-full text-left p-4 transition-all border-2 rounded-sm group relative overflow-hidden ${currentSurvivor?.name === s.name ? (viewTab === 'living' ? 'bg-amber-950/10 border-amber-800 shadow-xl' : 'bg-red-950/20 border-red-900 shadow-xl') : 'border-stone-900/40 hover:bg-stone-800/20 hover:border-stone-700'}`}>
                    <div className="relative z-10 flex flex-col">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-2xl medieval-font transition-colors truncate ${currentSurvivor?.name === s.name ? (viewTab === 'living' ? 'text-amber-200' : 'text-red-600') : 'text-stone-500'}`}>{s.name}</span>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(s.status).includes('text-green') ? 'bg-green-600' : getStatusColor(s.status).includes('text-orange') ? 'bg-orange-600 animate-pulse' : 'bg-stone-600'}`}></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase tracking-widest text-stone-600 font-bold font-sans">{s.role}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className={`flex-1 overflow-y-auto p-12 lg:p-20 custom-scroll bg-[#1c1917] relative ${viewTab === 'fallen' ? 'bg-red-950/5' : ''}`}>
                <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]"></div>

                {isAdding || isEditing ? (
                  <div className="fade-in space-y-12 max-w-3xl mx-auto relative z-10">
                    <div className="border-b-4 border-amber-900/40 pb-10 flex justify-between items-end">
                      <h3 className="text-6xl medieval-font text-amber-200">{isAdding ? 'Enroll New Citizen' : `Updating ${currentSurvivor?.name}`}</h3>
                      <button onClick={() => setShowImport(true)} className="px-3 py-1 border border-stone-800 text-[10px] uppercase tracking-widest text-stone-500 hover:text-amber-200 transition-all">Import Profile</button>
                    </div>

                    <div className="flex gap-10 items-start">
                       <div className="relative group/editPortrait">
                          <div 
                            className="w-48 h-48 border-4 border-stone-800 bg-black flex items-center justify-center cursor-pointer overflow-hidden shadow-2xl"
                            onClick={() => fileInputRef.current?.click()}
                          >
                             {editData.portraitUrl ? (
                               <img src={editData.portraitUrl} alt="Likeness" className="w-full h-full object-cover group-hover/editPortrait:opacity-50 transition-opacity" />
                             ) : (
                               <span className="text-7xl text-stone-900">+</span>
                             )}
                          </div>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                       </div>

                       <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-[0.4em] text-stone-500 font-bold">Name</label>
                          <input 
                            type="text"
                            value={editData.name}
                            onChange={(e) => setEditData({...editData, name: e.target.value})}
                            className="w-full bg-stone-900/50 border border-stone-800 text-amber-100 p-4 medieval-font text-3xl outline-none focus:border-amber-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-[0.4em] text-stone-500 font-bold">Role</label>
                          <input 
                            type="text"
                            value={editData.role}
                            onChange={(e) => setEditData({...editData, role: e.target.value})}
                            className="w-full bg-stone-900/50 border border-stone-800 text-stone-300 p-4 italic font-serif text-xl outline-none focus:border-amber-700"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                       <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-[0.4em] text-stone-500 font-bold">Physical Description</label>
                          <textarea 
                            value={editData.visualDescription}
                            onChange={(e) => setEditData({...editData, visualDescription: e.target.value})}
                            className="w-full h-32 bg-stone-900/50 border border-stone-800 text-stone-400 p-6 font-serif italic text-lg outline-none focus:border-amber-700"
                          />
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-[0.4em] text-stone-500 font-bold">Personal History</label>
                          <textarea 
                            value={editData.story}
                            onChange={(e) => setEditData({...editData, story: e.target.value})}
                            className="w-full h-48 bg-stone-900/50 border border-stone-800 text-stone-200 p-6 font-serif text-xl leading-relaxed outline-none focus:border-amber-700"
                          />
                       </div>
                    </div>

                    <div className="flex justify-end gap-6 pt-10 border-t border-stone-900">
                      <button onClick={() => { setIsAdding(false); setIsEditing(false); }} className="px-8 py-3 text-stone-500 hover:text-white transition-all uppercase tracking-widest text-sm border border-stone-800 hover:border-stone-700">Discard</button>
                      <button onClick={handleSave} className="px-12 py-3 bg-amber-900/40 hover:bg-amber-900/60 border border-amber-800 text-amber-100 transition-all uppercase tracking-[0.3em] font-bold text-sm shadow-lg">
                        Seal Record
                      </button>
                    </div>
                  </div>
                ) : currentSurvivor ? (
                  <div key={currentSurvivor.name} className="fade-in space-y-12 max-w-3xl mx-auto relative z-10">
                    <div className={`border-b-4 pb-10 relative ${viewTab === 'fallen' ? 'border-red-900/40' : 'border-stone-800'}`}>
                      <div className="flex flex-col md:flex-row items-center gap-10 mb-8">
                         <div className="relative group/portrait">
                            <div className="w-48 h-48 border-4 border-stone-800 shadow-2xl overflow-hidden bg-black flex items-center justify-center">
                               {currentSurvivor.portraitUrl ? (
                                  <img src={currentSurvivor.portraitUrl} alt={currentSurvivor.name} className="w-full h-full object-cover" />
                               ) : (
                                  <div className="text-stone-800 text-6xl medieval-font">?</div>
                               )}
                            </div>
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                               <button 
                                 onClick={handleGeneratePortrait}
                                 disabled={isGeneratingPortrait}
                                 className="bg-stone-900 border border-stone-700 px-3 py-1 text-[10px] uppercase tracking-widest text-stone-500 hover:text-amber-200 hover:border-amber-900 transition-all"
                               >
                                 Update Record
                               </button>
                            </div>
                         </div>

                         <div className="flex-1">
                            <div className="flex flex-col md:flex-row justify-between items-baseline gap-4 mb-4">
                              <h3 className={`text-7xl md:text-8xl medieval-font tracking-tight ${viewTab === 'living' ? 'text-amber-100' : 'text-stone-500'}`}>{currentSurvivor.name}</h3>
                              <div className="flex items-center gap-6">
                                 <span className={`text-2xl font-bold uppercase tracking-[0.3em] medieval-font ${getStatusColor(currentSurvivor.status)}`}>{currentSurvivor.status}</span>
                                 {!isEditing && (
                                    <button onClick={startEditing} className="px-4 py-1 text-xs border border-stone-700 hover:border-amber-600 text-stone-500 hover:text-amber-200 transition-all uppercase tracking-widest">Edit</button>
                                 )}
                              </div>
                            </div>
                            <span className="text-3xl text-stone-400 font-serif italic">{currentSurvivor.role}</span>
                         </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                       <div className="space-y-10">
                          <div className="space-y-4">
                             <h4 className="text-lg uppercase tracking-[0.4em] text-amber-900 font-bold medieval-font border-b border-amber-900/20 pb-2">Noted Traits</h4>
                             <div className="flex flex-wrap gap-3">
                                {currentSurvivor.traits?.map((t, i) => (
                                  <div key={i} className="px-4 py-2 bg-stone-900 border border-stone-700 text-stone-300 text-sm italic">{t}</div>
                                ))}
                             </div>
                          </div>
                       </div>

                       <div className="space-y-6 parchment p-8 border-2 border-stone-800/40 shadow-2xl relative">
                        <p className={`text-2xl font-serif italic leading-[1.7] ${viewTab === 'living' ? 'text-stone-300' : 'text-stone-500'}`}>
                          {currentSurvivor.story}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center space-y-6">
                    <p className="italic text-stone-800 font-serif text-3xl tracking-widest uppercase text-center">Consult the Ledger</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const StatBox: React.FC<{ 
  label: string; 
  value: string | number; 
  subValue?: string; 
  icon: string; 
  color?: string; 
  isClickable?: boolean;
  trend?: number; // Positive or negative change
  inverseTrend?: boolean; // If true, positive trend is "bad" (e.g. friction)
}> = ({ label, value, subValue, icon, color, isClickable, trend, inverseTrend }) => {
  
  const getTrendIcon = () => {
    if (!trend || trend === 0) return null;
    
    // Default: Up is good (Green), Down is bad (Red)
    let isGood = trend > 0;
    
    // Inverse: Up is bad (Red), Down is good (Green)
    if (inverseTrend) isGood = !isGood;
    
    const colorClass = isGood ? 'text-green-600' : 'text-red-600';
    const arrow = trend > 0 ? '↑' : '↓';
    
    return (
      <span className={`text-xs ml-2 font-bold ${colorClass} animate-pulse`}>
        {arrow} {Math.abs(trend)}
      </span>
    );
  };

  return (
    <div className={`flex flex-col items-center justify-center p-6 parchment stone-border transition-all min-h-[140px] w-full relative overflow-hidden group/box ${isClickable ? 'hover:border-stone-400 hover:shadow-[0_0_50px_rgba(220,200,164,0.2)] cursor-pointer hover:-translate-y-1' : ''}`}>
      <span className={`text-lg uppercase tracking-[0.15em] text-stone-500 mb-2 font-bold medieval-font`}>{label}</span>
      <div className={`flex flex-col items-center gap-1 ${color || 'sepia-text'}`}>
        <div className="flex items-center justify-center">
           <span className="text-2xl md:text-3xl font-bold heading-font text-center truncate">{value}</span>
           {getTrendIcon()}
        </div>
        {subValue && <span className="text-sm text-stone-600 italic font-serif">{subValue}</span>}
      </div>
      <div className="absolute top-1 right-1 text-stone-800 opacity-20">{icon}</div>
    </div>
  );
};

export default ResourceBar;
