
import React, { useState, useEffect, useRef } from 'react';
import { SettlementState, Choice, GameHistory, TurnData, Survivor, PlayerCommander } from './types';
import { INITIAL_STATE } from './constants';
import { generateTurn, regenerateTurnImage, generateSurvivorPortrait } from './services/geminiService';
import ResourceBar from './components/ResourceBar';
import ChoiceCard from './components/ChoiceCard';
import MapView from './components/MapView';
import VillageView from './components/VillageView';
import GuidedIntro from './components/GuidedIntro';
import CharacterCreator from './components/CharacterCreator';

const App: React.FC = () => {
  const [state, setState] = useState<SettlementState>(INITIAL_STATE);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [currentTurnData, setCurrentTurnData] = useState<TurnData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isPreparingSouls, setIsPreparingSouls] = useState<boolean>(false);
  const [soulProgress, setSoulProgress] = useState<{ current: number; total: number; name: string; error?: string }>({ current: 0, total: 0, name: "" });
  const [isRegeneratingImage, setIsRegeneratingImage] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedTile, setHighlightedTile] = useState<{ x: number, y: number } | null>(null);
  const [creedShifted, setCreedShifted] = useState<string | null>(null);
  
  // Resource Trends (Delta between turns)
  const [resourceTrends, setResourceTrends] = useState<Record<string, number>>({});
  const prevResourcesRef = useRef<any>(null);

  // Game Flow States
  const [showIntro, setShowIntro] = useState<boolean>(true);
  const [showCharacterCreator, setShowCharacterCreator] = useState<boolean>(false);
  const [viewTab, setViewTab] = useState<'map' | 'village'>('map');
  
  const [customAction, setCustomAction] = useState<string>("");
  const [imagesEnabled, setImagesEnabled] = useState<boolean>(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialCallMade = useRef(false);
  const prevStructuresLength = useRef(state.structures.length);

  const startNewTurn = async (previousChoiceText?: string) => {
    if (loading) return;
    
    // Capture current state before generating new one for trend comparison
    prevResourcesRef.current = {
      food: state.resources.food,
      wood: state.resources.wood,
      stone: state.resources.stone,
      iron: state.resources.iron,
      morale: state.morale,
      health: state.health,
      resolve: state.resolve,
      friction: state.friction,
      defense: state.defense,
      population: state.population.adults + state.population.children
    };

    setLoading(true);
    setError(null);
    setHighlightedTile(null);
    setCreedShifted(null);
    setCustomAction("");
    prevStructuresLength.current = state.structures.length;
    
    try {
      const data = await generateTurn(state, history, imagesEnabled, previousChoiceText);
      
      if (currentTurnData && !previousChoiceText?.includes("Wait")) {
        setHistory(prev => [...prev, {
          turn: state.turn,
          narrative: currentTurnData.narrative,
          choiceTaken: previousChoiceText
        }]);
      }

      setState(prevState => {
        if (data.stateUpdate?.ideology && data.stateUpdate.ideology !== prevState.ideology) {
          setCreedShifted(data.stateUpdate.ideology);
        }

        if (data.stateUpdate?.mapGrid) {
            for (let y = 0; y < 5; y++) {
                for (let x = 0; x < 5; x++) {
                    if (prevState.mapGrid[y][x] === '?' && data.stateUpdate.mapGrid[y][x] !== '?') {
                        setHighlightedTile({ x, y });
                        // If map changes, switch to map view to show discovery
                        setViewTab('map');
                        break;
                    }
                }
            }
        }

        const updatedStructures = data.stateUpdate?.structures || prevState.structures;
        const structuresChanged = updatedStructures.length !== prevState.structures.length || 
            updatedStructures.some((s, i) => s !== prevState.structures[i]);

        if (structuresChanged) {
          setViewTab('village');
        }

        const updatedPop = { ...prevState.population, ...data.stateUpdate?.population };
        const updatedRes = { ...prevState.resources, ...data.stateUpdate?.resources };
        
        let nextSurvivors = [...prevState.survivors];
        if (data.stateUpdate?.survivors) {
          data.stateUpdate.survivors.forEach((apiS: Survivor) => {
            const idx = nextSurvivors.findIndex(s => s.name === apiS.name);
            if (idx !== -1) {
              nextSurvivors[idx] = {
                ...nextSurvivors[idx],
                ...apiS,
                portraitUrl: nextSurvivors[idx].portraitUrl || apiS.portraitUrl 
              };
            } else {
              nextSurvivors.push(apiS);
            }
          });
        }

        let nextDeceased = [...prevState.deceased];
        if (data.stateUpdate?.deceased) {
          data.stateUpdate.deceased.forEach((deadS: Survivor) => {
            const livingIdx = nextSurvivors.findIndex(s => s.name === deadS.name);
            const alreadyFallen = nextDeceased.some(d => d.name === deadS.name);
            
            if (livingIdx !== -1 && !alreadyFallen) {
              const soul = nextSurvivors[livingIdx];
              nextDeceased.push({
                ...soul,
                ...deadS,
                status: 'Deceased',
                portraitUrl: soul.portraitUrl || deadS.portraitUrl
              });
              nextSurvivors.splice(livingIdx, 1);
            } else if (!alreadyFallen) {
              nextDeceased.push({ ...deadS, status: 'Deceased' });
            }
          });
        }

        const newState: SettlementState = {
          ...prevState,
          ...data.stateUpdate,
          structures: updatedStructures,
          population: updatedPop,
          resources: updatedRes,
          survivors: nextSurvivors,
          deceased: nextDeceased,
          turn: data.stateUpdate?.turn ?? (previousChoiceText && !previousChoiceText.includes("Wait") ? prevState.turn + 1 : prevState.turn),
        };

        // Calculate trends
        if (prevResourcesRef.current) {
          const newTotalPop = newState.population.adults + newState.population.children;
          const trends = {
             food: newState.resources.food - prevResourcesRef.current.food,
             wood: newState.resources.wood - prevResourcesRef.current.wood,
             stone: newState.resources.stone - prevResourcesRef.current.stone,
             iron: newState.resources.iron - prevResourcesRef.current.iron,
             morale: newState.morale - prevResourcesRef.current.morale,
             health: newState.health - prevResourcesRef.current.health,
             resolve: newState.resolve - prevResourcesRef.current.resolve,
             friction: newState.friction - prevResourcesRef.current.friction,
             defense: newState.defense - prevResourcesRef.current.defense,
             population: newTotalPop - prevResourcesRef.current.population
          };
          setResourceTrends(trends);
        }
        
        const totalPop = newState.population.adults + newState.population.children;
        if (totalPop <= 0) setGameOver(true);
        
        return newState;
      });

      setCurrentTurnData(data);
    } catch (err) {
      setError("The record is blurred.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAction.trim() || loading) return;
    startNewTurn(customAction);
  };

  const prepareAllPortraits = async (commander: PlayerCommander) => {
    setIsPreparingSouls(true);
    setSoulProgress({ current: 0, total: 5, name: commander.name });
    let commanderPortraitUrl = commander.portraitUrl || "";
    
    if (!commanderPortraitUrl) {
      try {
        commanderPortraitUrl = await generateSurvivorPortrait({
          name: commander.name,
          role: commander.origin,
          story: commander.philosophy,
          visualDescription: commander.visualDescription,
          status: 'Healthy',
          traits: [],
          afflictions: []
        });
      } catch (err) { console.warn("Commander portrait generation failed"); }
    }

    const topCount = 4;
    const survivorsToProcess = state.survivors.slice(0, topCount);
    const updatedSurvivors = [...state.survivors];

    for (let i = 0; i < survivorsToProcess.length; i++) {
      const survivor = survivorsToProcess[i];
      setSoulProgress({ current: i + 1, total: 5, name: survivor.name });
      
      if (survivor.portraitUrl) {
        updatedSurvivors[i] = survivor;
        continue;
      }

      try {
        const portraitUrl = await generateSurvivorPortrait(survivor);
        updatedSurvivors[i] = { ...survivor, portraitUrl };
        await new Promise(r => setTimeout(r, 4000)); 
      } catch (err) {
        console.warn(`Initial portrait generation failed for ${survivor.name}:`, err);
      }
    }
    
    setState(prev => ({ 
      ...prev, 
      commander: { ...commander, portraitUrl: commanderPortraitUrl },
      survivors: updatedSurvivors 
    }));
    setIsPreparingSouls(false);
    await new Promise(r => setTimeout(r, 1000));
    startNewTurn();
  };

  const handleSkipAndStart = () => {
    setIsPreparingSouls(false);
    startNewTurn();
  };

  const handleUpdateSurvivor = (updatedSurvivor: Survivor) => {
    setState(prev => {
      const isLiving = prev.survivors.some(s => s.name === updatedSurvivor.name);
      if (isLiving) {
        return {
          ...prev,
          survivors: prev.survivors.map(s => s.name === updatedSurvivor.name ? updatedSurvivor : s)
        };
      } else {
        return {
          ...prev,
          deceased: prev.deceased.map(s => s.name === updatedSurvivor.name ? updatedSurvivor : s)
        };
      }
    });
  };

  const handleAddSurvivor = async (newSurvivor: Survivor) => {
    setState(prev => ({
      ...prev,
      survivors: [...prev.survivors, newSurvivor],
      population: {
        ...prev.population,
        adults: prev.population.adults + 1
      }
    }));
  };

  const finishIntro = () => {
    setShowIntro(false);
    setShowCharacterCreator(true);
  };

  const finishCharacterCreator = (commander: PlayerCommander) => {
    setShowCharacterCreator(false);
    
    let bonusUpdate: Partial<SettlementState> = { commander };
    switch (commander.origin) {
      case "Former Magistrate": bonusUpdate.morale = state.morale + 20; break;
      case "Company Captain": bonusUpdate.defense = state.defense + 10; break;
      case "Archivist": bonusUpdate.resolve = state.resolve + 15; break;
      case "Feral Scavenger": bonusUpdate.resources = { ...state.resources, food: state.resources.food + 15 }; break;
    }
    bonusUpdate.ideology = commander.philosophy;

    setState(prev => ({ ...prev, ...bonusUpdate }));
    
    if (!initialCallMade.current) {
      initialCallMade.current = true;
      prepareAllPortraits(commander);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentTurnData, loading]);

  const handleChoice = (choice: Choice) => {
    startNewTurn(choice.text);
  };

  const restartGame = () => {
    setState(INITIAL_STATE);
    setHistory([]);
    setCurrentTurnData(null);
    setGameOver(false);
    setHighlightedTile(null);
    setCreedShifted(null);
    setResourceTrends({});
    initialCallMade.current = false;
    setShowIntro(true);
    setShowCharacterCreator(false);
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'Morning': return '🌅';
      case 'Afternoon': return '☀️';
      case 'Night': return '🌑';
      default: return '🕰️';
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-[1500px] mx-auto px-8 py-10 md:py-16 relative z-10">
       <div className="fog-container">
          <div className="fog-layer"></div>
          <div className="fog-layer two"></div>
       </div>

      {showIntro ? (
        <GuidedIntro onComplete={finishIntro} />
      ) : showCharacterCreator ? (
        <CharacterCreator onComplete={finishCharacterCreator} />
      ) : isPreparingSouls ? (
        <div className="min-h-screen bg-black/50 flex items-center justify-center p-6">
          <div className="max-w-4xl w-full text-center space-y-12 fade-in parchment stone-border p-20">
            <h1 className="text-6xl md:text-8xl sepia-text mb-4 medieval-font animate-pulse">Consulting the Ledger</h1>
            <div className="space-y-6">
              <div className="w-full bg-stone-900 h-4 border border-stone-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-700 transition-all duration-1000 shadow-[0_0_15px_rgba(180,83,9,0.5)]"
                  style={{ width: `${(soulProgress.current / soulProgress.total) * 100}%` }}
                ></div>
              </div>
              <p className="text-stone-400 text-2xl font-serif italic">
                Reviewing the profile of <span className="text-amber-200 font-bold">{soulProgress.name || "the chosen"}</span>...
              </p>
              <button onClick={handleSkipAndStart} className="text-stone-700 hover:text-stone-400 text-sm uppercase tracking-[0.6em] medieval-font border-b border-stone-900 hover:border-stone-600 transition-all mt-10">
                [ Begin Assignment ]
              </button>
            </div>
          </div>
        </div>
      ) : gameOver ? (
        <div className="min-h-screen bg-black/50 flex items-center justify-center p-6">
          <div className="max-w-4xl w-full text-center space-y-12 fade-in parchment stone-border p-20">
            <h1 className="text-7xl md:text-9xl blood-text mb-4 medieval-font">Settlement Lost</h1>
            <div className="text-stone-300 italic text-3xl md:text-4xl leading-relaxed font-serif">
              {currentTurnData?.narrative || "The camp is silent. The smog has claimed all."}
            </div>
            <button onClick={restartGame} className="px-12 py-5 border-2 border-stone-700 hover:border-stone-400 hover:text-white transition-all text-stone-500 uppercase tracking-[0.5em] text-2xl medieval-font">
              Retry Survival
            </button>
          </div>
        </div>
      ) : (
        <>
          <header className="flex flex-col md:flex-row justify-between items-center mb-16 border-b-2 border-stone-900 pb-10">
            <div className="text-center md:text-left flex items-center gap-10">
              {state.commander?.portraitUrl && (
                 <div className="w-32 h-32 border-2 border-stone-800 rounded-full overflow-hidden shadow-2xl hidden md:block">
                    <img src={state.commander.portraitUrl} alt="Commander" className="w-full h-full object-cover" />
                 </div>
              )}
              <div>
                <h1 className="text-7xl md:text-9xl tracking-tighter text-stone-100 medieval-font mb-2 text-shadow-lg">EBONFALL</h1>
                <p className="text-stone-400 text-2xl uppercase tracking-[0.2em] font-bold medieval-font flex items-center gap-3">
                  <span>{state.tier}</span> ◈ <span>{state.season}</span> ◈ <span>Day {state.turn}</span> ◈ 
                  <span className="text-amber-600 flex items-center gap-1">{getPhaseIcon(state.phase)} {state.phase}</span>
                </p>
              </div>
            </div>
            <div className="mt-6 md:mt-0 flex flex-col items-end gap-3">
              <div className="flex items-center gap-4 bg-stone-900/50 p-3 border border-stone-800 rounded-sm">
                <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Observer Vision:</span>
                <button 
                  onClick={() => setImagesEnabled(!imagesEnabled)}
                  className={`w-12 h-6 rounded-full transition-all relative ${imagesEnabled ? 'bg-amber-900/60' : 'bg-stone-800'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full transition-all bg-stone-100 ${imagesEnabled ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>
              <div className="text-amber-200 text-sm italic font-serif text-right hidden md:block max-w-sm">
                Commander {state.commander?.name || "Guardian"} ◈ {state.commander?.origin}
              </div>
            </div>
          </header>

          <main className="flex-1 flex flex-col lg:flex-row gap-20 min-h-0">
            <div className="lg:w-2/3 flex flex-col min-h-0">
              <ResourceBar 
                state={state} 
                trends={resourceTrends}
                onUpdateSurvivor={handleUpdateSurvivor} 
                onAddSurvivor={handleAddSurvivor} 
              />
              
              <div ref={scrollRef} className="flex-1 overflow-y-auto pr-8 space-y-16 scroll-smooth pb-32 custom-scroll" style={{ maxHeight: '80vh' }}>
                {history.map((h, i) => (
                  <div key={i} className="opacity-15 border-l-4 border-stone-800 pl-10 transition-opacity hover:opacity-40">
                    <p className="text-stone-600 text-lg uppercase tracking-[0.3em] mb-3 font-bold medieval-font">Day {h.turn}</p>
                    <div className="text-stone-400 text-xl leading-relaxed italic font-serif" dangerouslySetInnerHTML={{ __html: h.narrative }}></div>
                  </div>
                ))}

                {loading ? (
                  <div className="flex flex-col items-center justify-center h-[600px] fade-in text-center parchment stone-border rounded-lg">
                    <p className="sepia-text text-5xl font-serif italic animate-pulse tracking-wide medieval-font">Compiling Records...</p>
                  </div>
                ) : currentTurnData && (
                  <div className="fade-in space-y-16">
                    {creedShifted && (
                      <div className="p-8 border-2 border-amber-900 bg-amber-950/20 text-center rounded-sm animate-pulse shadow-[0_0_30px_rgba(255,191,0,0.1)]">
                        <p className="text-xs uppercase tracking-[0.5em] text-amber-600 font-bold medieval-font mb-2">Social Policy Update</p>
                        <p className="text-4xl medieval-font text-amber-200">New Philosophy: {creedShifted}</p>
                      </div>
                    )}

                    {imagesEnabled && currentTurnData.imageUrl && (
                      <div className="relative group">
                        <div className="absolute -inset-3 bg-stone-900 opacity-50 stone-border"></div>
                        <img 
                          src={currentTurnData.imageUrl} 
                          alt="Vision" 
                          className="w-full aspect-[21/9] object-cover rounded-sm border-2 border-stone-800 shadow-[0_0_80px_rgba(0,0,0,1)] brightness-90 grayscale-[10%]"
                        />
                      </div>
                    )}

                    <div className="space-y-12">
                      {currentTurnData.eventOccurred && (
                        <div className="text-lg font-bold blood-text uppercase tracking-[0.5em] bg-red-950/30 py-4 px-10 border-2 border-red-900/40 inline-block rounded-sm shadow-xl medieval-font">
                          ◈ {currentTurnData.eventOccurred} ◈
                        </div>
                      )}
                      
                      <div className="text-stone-200 text-3xl md:text-4xl leading-[1.8] dropcap whitespace-pre-line font-serif" 
                           dangerouslySetInnerHTML={{ __html: currentTurnData.narrative }}>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <aside className="lg:w-1/3 flex flex-col gap-12">
              <div className="flex gap-1 border-b-2 border-stone-800 pb-1">
                <button 
                  onClick={() => setViewTab('map')}
                  className={`flex-1 py-2 text-sm uppercase tracking-widest font-bold transition-all ${viewTab === 'map' ? 'text-amber-500 border-b-2 border-amber-600 bg-amber-950/20' : 'text-stone-600 hover:text-stone-400'}`}
                >
                  World Map
                </button>
                <button 
                  onClick={() => setViewTab('village')}
                  className={`flex-1 py-2 text-sm uppercase tracking-widest font-bold transition-all ${viewTab === 'village' ? 'text-amber-500 border-b-2 border-amber-600 bg-amber-950/20' : 'text-stone-600 hover:text-stone-400'}`}
                >
                  Village
                </button>
              </div>

              <div className="relative h-[450px]">
                {viewTab === 'map' ? (
                  <div className="animate-in fade-in zoom-in-95 duration-300 absolute inset-0">
                    <MapView grid={state.mapGrid} highlightedCoords={highlightedTile} />
                  </div>
                ) : (
                  <div className="animate-in fade-in zoom-in-95 duration-300 absolute inset-0">
                    <VillageView structures={state.structures} tier={state.tier} />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-8">
                <h2 className="text-3xl font-bold text-stone-500 uppercase tracking-[0.4em] px-2 flex justify-between border-b border-stone-900 pb-6 medieval-font">
                  <span>Path of Action</span>
                </h2>
                
                <div className="flex flex-col gap-8">
                  {currentTurnData?.choices.map((choice) => (
                    <ChoiceCard 
                      key={choice.id} 
                      choice={choice} 
                      onSelect={handleChoice} 
                      disabled={loading}
                      influencer={state.survivors.find(s => s.name === choice.influencedBy)}
                    />
                  ))}

                  {!loading && !gameOver && currentTurnData && (
                    <div className="mt-4 p-8 parchment stone-border group relative overflow-hidden transition-all hover:shadow-[0_0_40px_rgba(251,191,36,0.1)]">
                      <h3 className="text-2xl font-bold medieval-font text-amber-600 uppercase tracking-[0.3em] mb-4">Direct Command</h3>
                      <form onSubmit={handleCustomActionSubmit} className="space-y-4">
                        <textarea 
                          value={customAction}
                          onChange={(e) => setCustomAction(e.target.value)}
                          placeholder="I order the scouts to search the old warehouses..."
                          className="w-full h-32 bg-black/40 border border-stone-800 text-amber-100 p-4 font-serif text-lg outline-none"
                        />
                        <button 
                          type="submit"
                          disabled={!customAction.trim()}
                          className={`w-full py-4 medieval-font text-2xl uppercase tracking-[0.4em] border-2 transition-all ${
                            customAction.trim() 
                            ? 'border-amber-900 text-amber-200 bg-amber-950/20' 
                            : 'border-stone-900 text-stone-700 cursor-not-allowed'
                          }`}
                        >
                          Issue Order
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </main>

          <footer className="mt-24 pt-12 border-t-2 border-stone-950 text-sm text-stone-800 uppercase tracking-[0.8em] flex flex-col md:flex-row justify-between items-center gap-8 medieval-font">
            <span>© Ebonfall Survival Log</span>
          </footer>
        </>
      )}
    </div>
  );
};

export default App;
