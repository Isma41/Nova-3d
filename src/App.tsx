import React, { useState, useCallback, useEffect } from "react";
import { MainCanvas } from "./components/Canvas3D";
import { Sidebar } from "./components/Sidebar";
import { SceneObject, createDefaultObject } from "./types";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "motion/react";
import { Boxes, Zap, Menu, FileText, Search, Settings, Cpu, HardDrive, Wifi, Layers, Download, Trash2, Plus, LogIn, LogOut, User as UserIcon } from "lucide-react";
import * as THREE from 'three';
import { OBJExporter, STLExporter } from 'three-stdlib';
import { useAuth } from "./contexts/AuthContext";
import { signInWithGoogle, logout, db } from "./lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

const App: React.FC = () => {
  const { user } = useAuth();
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<SceneObject | null>(null);
  const [sceneName, setSceneName] = useState("ESCENA_PRIMARIA");
  const [isConverting, setIsConverting] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [appMode, setAppMode] = useState<"modeling" | "generative">("modeling");
  const [showGrid, setShowGrid] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmNewSceneOpen, setConfirmNewSceneOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check if already installed or standalone
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
       setIsStandalone(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
       // If running in iframe, alert the user to open in new tab
       if (window !== window.top) {
         showNotification("Abre la app en una nueva pestaña (ícono ↗) para instalar", "error");
       } else {
         showNotification("Para instalar: toca Compartir y luego 'Añadir a pantalla de inicio'", "error");
       }
       return;
    }
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      showNotification("App instalada");
    }
  };

  // Firestore Error Handler
  const handleFirestoreError = (error: any, operation: OperationType, path: string) => {
    const errInfo = {
      error: error.message || String(error),
      operation,
      path,
      userId: user?.uid
    };
    console.error("Firestore Error:", errInfo);
    showNotification("Error de base de datos", "error");
  };

  // Load persistence
  useEffect(() => {
    if (!user) {
      setObjects([]);
      setIsLoaded(true);
      return;
    }

    const loadScene = async () => {
      const docRef = doc(db, "scenes", user.uid);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setObjects(data.objects || []);
          setSceneName(data.name || "ESCENA_PERSISTENTE");
          showNotification("Escena cargada");
        } else {
          setObjects([]);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `scenes/${user.uid}`);
      } finally {
        setIsLoaded(true);
      }
    };

    loadScene();
  }, [user]);

  // Save persistence (auto-save)
  useEffect(() => {
    if (!user || !isLoaded) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      const docRef = doc(db, "scenes", user.uid);
      try {
        await setDoc(docRef, {
          name: sceneName,
          objects: objects,
          ownerId: user.uid,
          updatedAt: serverTimestamp()
        }, { merge: true });
        console.log("Scene auto-saved");
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `scenes/${user.uid}`);
      } finally {
        setIsSaving(false);
      }
    }, 2000); // Debounce saves

    return () => clearTimeout(timer);
  }, [objects, sceneName, user, isLoaded]);

  const handleAddObject = (type: SceneObject["type"]) => {
    const newObj = createDefaultObject(type);
    setObjects(prev => [...prev, newObj]);
    setSelectedId(newObj.id);
    showNotification(`Added: ${type}`);
  };

  const handleRemoveObject = (id: string) => {
    setObjects(prev => prev.filter(o => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleUpdateObject = useCallback((id: string, updates: Partial<SceneObject>) => {
    setObjects(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  }, []);

  const handleCopy = () => {
    const obj = objects.find(o => o.id === selectedId);
    if (obj) {
      setClipboard({ ...obj });
      showNotification("Copiado al portapapeles");
    }
  };

  const handleCut = () => {
    const obj = objects.find(o => o.id === selectedId);
    if (obj) {
      setClipboard({ ...obj });
      handleRemoveObject(obj.id);
      showNotification("Cortado al portapapeles");
    }
  };

  const handlePaste = () => {
    if (clipboard) {
      const newObj: SceneObject = {
        ...clipboard,
        id: uuidv4(),
        position: [clipboard.position[0] + 0.5, clipboard.position[1], clipboard.position[2] + 0.5],
        name: `${clipboard.name} (Copia)`
      };
      setObjects(prev => [...prev, newObj]);
      setSelectedId(newObj.id);
      showNotification("Objeto pegado");
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleNewScene = () => {
    setConfirmNewSceneOpen(true);
  };

  const handleClearScene = () => {
    setConfirmClearOpen(true);
  };

  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `nova3d_render_${Date.now()}.png`;
      link.click();
      showNotification("Screenshot saved");
    }
  };

  const createThreeScene = () => {
    const scene = new THREE.Scene();
    objects.forEach(obj => {
      let geometry;
      switch(obj.type) {
        case 'box': geometry = new THREE.BoxGeometry(); break;
        case 'sphere': geometry = new THREE.SphereGeometry(1, 32, 32); break;
        case 'cylinder': geometry = new THREE.CylinderGeometry(1, 1, 2, 32); break;
        case 'cone': geometry = new THREE.ConeGeometry(1, 2, 32); break;
        case 'plane': geometry = new THREE.PlaneGeometry(1, 1); break;
        default: geometry = new THREE.BoxGeometry();
      }
      const material = new THREE.MeshStandardMaterial({ color: obj.color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...obj.position);
      mesh.rotation.set(...obj.rotation);
      mesh.scale.set(...obj.scale);
      mesh.name = obj.name;
      scene.add(mesh);
    });
    return scene;
  };

  const handleExportSTL = () => {
    if (objects.length === 0) {
      showNotification("No hay objetos para exportar", "error");
      return;
    }

    try {
      const exporter = new STLExporter();
      const scene = createThreeScene();
      const result = exporter.parse(scene, { binary: true });
      const blob = new Blob([result], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sceneName}.stl`;
      link.click();
      showNotification("Escena exportada como .STL");
    } catch (err) {
      console.error(err);
      showNotification("Error exportando STL", "error");
    }
  };

  const handleExportOBJ = () => {
    if (objects.length === 0) {
      showNotification("No hay objetos para exportar", "error");
      return;
    }

    try {
      const exporter = new OBJExporter();
      const scene = createThreeScene();
      const result = exporter.parse(scene);
      const blob = new Blob([result], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sceneName}.obj`;
      link.click();
      showNotification("Escena exportada como .OBJ");
    } catch (err) {
      console.error(err);
      showNotification("Error exportando OBJ", "error");
    }
  };

  const handleConvertTo3D = async (file: File) => {
    setIsConverting(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const response = await fetch("/api/convert-to-3d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          mimeType: file.type
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error desconocido en el servidor" }));
        throw new Error(errorData.error || "Error en la conversión de IA");
      }

      const data = await response.json();
      
      const newObjects = data.objects.map((obj: any) => ({
        ...obj,
        id: uuidv4(),
      }));

      setObjects(prev => [...prev, ...newObjects]);
      showNotification(`${newObjects.length} AI objects generated`);
    } catch (error: any) {
      console.error(error);
      showNotification(error.message, 'error');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 font-sans text-white">
      {/* Top Navigation */}
      <nav className="h-14 nav-blur flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)] group-hover:scale-110 transition-transform">
              <span className="font-black text-xl">N</span>
            </div>
            <span className="font-semibold tracking-tight text-lg">Nova3D</span>
          </div>
          <div className="flex gap-1 bg-white/5 p-1 rounded-full border border-white/5">
            <button 
              onClick={() => setAppMode("modeling")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${appMode === 'modeling' ? 'bg-white/10 border border-white/10' : 'text-white/50 hover:text-white'}`}
            >
              Modeling
            </button>
            <button 
              onClick={() => setAppMode("generative")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${appMode === 'generative' ? 'bg-white/10 border border-white/10' : 'text-white/50 hover:text-white'}`}
            >
              Generative
            </button>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-4 text-xs font-medium text-white/40">
            <button onClick={handleNewScene} className="hover:text-white cursor-pointer transition-colors bg-transparent border-none uppercase tracking-tighter">File</button>
            <button onClick={handleClearScene} className="hover:text-white cursor-pointer transition-colors bg-transparent border-none uppercase tracking-tighter">Edit</button>
            <button onClick={() => setShowGrid(!showGrid)} className={`hover:text-white cursor-pointer transition-colors bg-transparent border-none uppercase tracking-tighter ${!showGrid ? 'text-indigo-400' : ''}`}>View</button>
            <button onClick={handleScreenshot} className="hover:text-white cursor-pointer transition-colors bg-transparent border-none uppercase tracking-tighter">Render</button>
          </div>
          
          <div className="h-6 w-px bg-white/10 mx-2" />

          {(!isStandalone) && (
            <button 
              onClick={handleInstallClick}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-full border border-indigo-500/30 text-[10px] font-bold uppercase tracking-widest transition-all mr-2"
            >
              <Download size={14} />
              Instalar App
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <span className="text-[10px] font-medium text-white/60 hidden sm:block uppercase tracking-wider">{user.email?.split('@')[0]}</span>
              </div>
              <button 
                onClick={logout}
                className="p-1.5 text-white/40 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-widest transition-all"
            >
              <LogIn size={14} className="text-indigo-400" />
              Sign In
            </button>
          )}

          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportOBJ}
              className="bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              <Download size={12} /> OBJ
            </button>
            <button 
              onClick={handleExportSTL}
              className="bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 rounded text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              <Download size={12} /> STL
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <aside className="w-16 border-r border-white/10 flex flex-col items-center py-6 gap-6 bg-zinc-900 z-10">
          <div className="p-2 rounded-xl bg-white/5 text-indigo-400 cursor-pointer border border-indigo-500/30 hover:bg-indigo-500/20 transition-all">
            <Menu size={24} />
          </div>
          <div className="p-2 text-white/40 hover:text-white cursor-pointer transition-colors">
            <FileText size={24} />
          </div>
          <div className="p-2 text-white/40 hover:text-white cursor-pointer transition-colors">
            <Search size={24} />
          </div>
          <div className="p-2 text-white/40 hover:text-white cursor-pointer transition-colors">
            <Layers size={24} />
          </div>
          <div className="mt-auto p-2 text-white/20 hover:text-indigo-400 cursor-pointer transition-all">
            <Settings size={24} />
          </div>
        </aside>

        {/* Main Viewport Area */}
        <main className="flex-1 relative canvas-bg">
          {/* Overlay Labels */}
          <div className="absolute top-6 left-6 pointer-events-none z-10">
            <div className="text-xs text-indigo-400 font-mono mb-1 tracking-widest uppercase">PERSPECTIVE_VIEW</div>
            <input 
              className="text-2xl font-light tracking-widest opacity-80 uppercase bg-transparent border-none p-0 focus:ring-0 w-full"
              value={sceneName}
              onChange={(e) => setSceneName(e.target.value.toUpperCase())}
            />
          </div>

          {/* AI Banner */}
          {isConverting && (
            <div className="absolute top-6 right-6 z-10">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-indigo-600 px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20"
              >
                <Zap size={14} className="animate-pulse" />
                IA PROCESANDO IMAGEN...
              </motion.div>
            </div>
          )}

          <MainCanvas
            objects={objects}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdateObject={handleUpdateObject}
            showGrid={showGrid}
          />

          {/* Bottom Floating Panel for Image-to-3D when converting */}
          <AnimatePresence>
            {isConverting && (
              <motion.div 
                initial={{ opacity: 0, y: 50, x: "-50%" }}
                animate={{ opacity: 1, y: 0, x: "-50%" }}
                exit={{ opacity: 0, y: 50, x: "-50%" }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 glass-panel p-4 rounded-2xl flex items-center gap-6 w-[600px] z-20"
              >
                <div className="w-24 h-24 bg-black/40 border border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center">
                   <Zap size={24} className="text-indigo-400 animate-pulse" />
                   <span className="text-[10px] text-white/40 mt-2 uppercase">Vision Engine</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Converting Image to Mesh...</span>
                    <span className="text-xs text-indigo-400 animate-pulse">ACTIVE</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: "84%" }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1]"
                    />
                  </div>
                  <p className="text-[10px] text-white/40 mt-2 uppercase tracking-tighter">AI-driven photogrammetry engine v3.0 active</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Right Properties Sidebar */}
        <Sidebar
          objects={objects}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={handleAddObject}
          onRemove={handleRemoveObject}
          onUpdate={handleUpdateObject}
          onConvert={handleConvertTo3D}
          onCopy={handleCopy}
          onCut={handleCut}
          onPaste={handlePaste}
          onClearAll={handleClearScene}
          isConverting={isConverting}
          appMode={appMode}
        />
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-10 border-t border-white/10 bg-zinc-950 px-4 flex items-center justify-between text-[10px] text-white/40 z-20">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5"><Cpu size={12} className="text-indigo-500" /> GPU ACCELERATION: ACTIVE</span>
          <span className="flex items-center gap-1.5"><HardDrive size={12} /> OBJECTS: {objects.length}</span>
          <span className="flex items-center gap-1.5 flex-nowrap">
            <Wifi size={12} className={user ? "text-green-500" : "text-white/20"} /> 
            CLOUD SYNC: {user ? (isSaving ? "SAVING..." : "SYNCED") : "OFFLINE"}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[9px] tracking-tight">
          <div className="flex items-center gap-2">
            <a href="https://ai.studio" className="hover:text-white transition-colors duration-200">NOVA 3D</a>
            <span>© 2026 BY</span>
            <a href="#" className="text-white hover:text-indigo-400 font-bold transition-colors duration-200">ISMAEL INZIRILLO</a>
          </div>
          <div className="flex items-center gap-2 border-l border-white/10 pl-4">
            <span className="opacity-60 uppercase">Licensed under</span>
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
              CC BY-SA 4.0
              <img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="CC" className="w-3 h-3 opacity-60" />
              <img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="BY" className="w-3 h-3 opacity-60" />
              <img src="https://mirrors.creativecommons.org/presskit/icons/sa.svg" alt="SA" className="w-3 h-3 opacity-60" />
            </a>
          </div>
        </div>
      </footer>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`fixed bottom-12 right-6 px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-3 glass-panel ${
              notification.type === 'success' ? 'border-indigo-500/50' : 'border-red-500/50'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-indigo-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs font-bold uppercase tracking-widest">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Clear Modal */}
      <AnimatePresence>
        {confirmClearOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center gap-3 text-red-400">
                <Trash2 size={20} />
                <span className="font-extrabold text-xs uppercase tracking-wider">Limpiar Escena Completa</span>
              </div>
              <p className="text-[11px] text-white/60 leading-relaxed uppercase tracking-wide">
                ¿Estás seguro de que deseas eliminar TODOS los objetos de la escena? Esta acción se guardará en la nube y no se puede deshacer.
              </p>
              <div className="flex gap-2 justify-end pt-2">
                <button 
                  onClick={() => setConfirmClearOpen(false)}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    setObjects([]);
                    setSelectedId(null);
                    setConfirmClearOpen(false);
                    showNotification("Escena limpiada por completo");
                  }}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-lg active:scale-95 text-white"
                >
                  Borrar Todo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation New Scene Modal */}
      <AnimatePresence>
        {confirmNewSceneOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center gap-3 text-indigo-400">
                <Plus size={20} />
                <span className="font-extrabold text-xs uppercase tracking-wider">¿Iniciar Nueva Escena?</span>
              </div>
              <p className="text-[11px] text-white/60 leading-relaxed uppercase tracking-wide">
                ¿Deseas crear una nueva escena vacía? Los objetos y cambios de esta sesión serán reemplazados.
              </p>
              <div className="flex gap-2 justify-end pt-2">
                <button 
                  onClick={() => setConfirmNewSceneOpen(false)}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    setObjects([]);
                    setSelectedId(null);
                    setSceneName("NUEVA_ESCENA_" + Math.floor(Math.random() * 100));
                    setConfirmNewSceneOpen(false);
                    showNotification("Nueva escena creada");
                  }}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-lg active:scale-95 text-white"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
