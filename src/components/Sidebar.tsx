import React, { useState } from "react";
import { SceneObject, createDefaultObject } from "../types";
import { 
  Box, 
  Circle, 
  Cone, 
  Cylinder, 
  Square, 
  Trash2, 
  Layers, 
  Image as ImageIcon, 
  Plus,
  Settings2,
  ChevronRight,
  Loader2,
  Move,
  Maximize,
  RotateCw,
  Palette,
  Zap,
  Type,
  Scissors,
  Copy,
  ClipboardPaste
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SidebarProps {
  objects: SceneObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (type: SceneObject["type"]) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<SceneObject>) => void;
  onConvert: (file: File) => Promise<void>;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onClearAll: () => void;
  isConverting: boolean;
  appMode: "modeling" | "generative";
}

export const Sidebar: React.FC<SidebarProps> = ({
  objects,
  selectedId,
  onSelect,
  onAdd,
  onRemove,
  onUpdate,
  onConvert,
  onCopy,
  onCut,
  onPaste,
  onClearAll,
  isConverting,
  appMode
}) => {
  const selectedObject = objects.find(o => o.id === selectedId);

  return (
    <aside className="w-72 bg-zinc-900 border-l border-white/10 flex flex-col h-full z-10 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/5 bg-zinc-900/50">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
          {appMode === "modeling" ? "Modeling Toolkit" : "AI Generative"}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
        {appMode === "modeling" ? (
          <>
            {selectedObject ? (
              <div className="space-y-8">
                {/* Object Header */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                   <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                     {getIcon(selectedObject.type)}
                   </div>
                   <div className="flex-1 min-w-0">
                     <input 
                       className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 w-full"
                       value={selectedObject.name}
                       onChange={(e) => onUpdate(selectedObject.id, { name: e.target.value })}
                     />
                     <div className="text-[10px] text-white/40 uppercase tracking-widest">{selectedObject.type}</div>
                   </div>
                   <div className="flex items-center gap-1">
                     <button 
                       onClick={onCopy}
                       className="p-1.5 text-white/20 hover:text-white hover:bg-white/5 rounded transition-all"
                       title="Copiar"
                     >
                       <Copy size={14} />
                     </button>
                     <button 
                       onClick={onCut}
                       className="p-1.5 text-white/20 hover:text-white hover:bg-white/5 rounded transition-all"
                       title="Cortar"
                     >
                       <Scissors size={14} />
                     </button>
                     <button 
                       onMouseDown={(e) => { e.stopPropagation(); onRemove(selectedObject.id); }}
                       className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                       title="Eliminar"
                     >
                       <Trash2 size={14} />
                     </button>
                   </div>
                </div>

                {/* Transform */}
                <section>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[11px] font-medium text-white/60 flex items-center gap-2">
                      <Move size={12} /> Transform
                    </span>
                    <button className="text-[10px] text-indigo-400 font-bold tracking-tighter hover:text-indigo-300">RESET</button>
                  </div>
                  <div className="space-y-3">
                    {['position', 'rotation', 'scale'].map((transformType) => (
                      <div key={transformType} className="space-y-2">
                        <div className="text-[10px] text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                          {transformType === 'position' && <Move size={10} />}
                          {transformType === 'rotation' && <RotateCw size={10} />}
                          {transformType === 'scale' && <Maximize size={10} />}
                          {transformType}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {['X', 'Y', 'Z'].map((axis, i) => (
                            <div key={axis} className="flex items-center bg-white/5 border border-white/10 rounded overflow-hidden">
                              <span className={`text-[9px] font-mono px-1.5 py-1 ${axis === 'X' ? 'text-red-400' : axis === 'Y' ? 'text-green-400' : 'text-blue-400'}`}>{axis}</span>
                              <input 
                                type="number"
                                step="0.1"
                                className="w-full bg-transparent border-none text-[11px] p-1 focus:ring-0 text-right pr-2"
                                value={Number((selectedObject as any)[transformType][i]).toFixed(1)}
                                onChange={(e) => {
                                  const newVal = parseFloat(e.target.value);
                                  const newArr = [...(selectedObject as any)[transformType]];
                                  newArr[i] = newVal;
                                  onUpdate(selectedObject.id, { [transformType]: newArr } as any);
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Material */}
                <section>
                  <span className="text-[11px] font-medium text-white/60 block mb-4 flex items-center gap-2">
                    <Palette size={12} /> Appearance
                  </span>
                  <div className="space-y-4">
                    {selectedObject.type === "text" && (
                      <div className="space-y-2">
                        <div className="text-[10px] text-white/40 uppercase tracking-widest">Text Content</div>
                        <input 
                          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500/50"
                          value={selectedObject.text || ""}
                          onChange={(e) => onUpdate(selectedObject.id, { text: e.target.value })}
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-xl ring-2 ring-indigo-500 ring-offset-4 ring-offset-zinc-900 shadow-xl"
                        style={{ backgroundColor: selectedObject.color }}
                      />
                      <div className="flex-1 space-y-2">
                         <div className="flex justify-between text-[10px] text-white/40 mb-1">
                            <span className="uppercase tracking-widest text-[9px]">Hex Color</span>
                            <span className="font-mono">{selectedObject.color.toUpperCase()}</span>
                         </div>
                         <input 
                          type="color"
                          className="w-full h-8 bg-white/5 border border-white/10 rounded p-1 cursor-pointer"
                          value={selectedObject.color}
                          onChange={(e) => onUpdate(selectedObject.id, { color: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Quick Actions */}
                <section>
                  <span className="text-[11px] font-medium text-white/60 block mb-4 uppercase tracking-widest">Edición Rápida</span>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={onPaste}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-dashed border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all group"
                    >
                      <ClipboardPaste size={14} className="text-white/40 group-hover:text-indigo-400" />
                      <span className="text-[10px] font-bold text-white/40 group-hover:text-white uppercase tracking-widest font-mono">Pegar Objeto</span>
                    </button>
                    {objects.length > 0 && (
                      <button 
                        onClick={onClearAll}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl transition-all group text-red-400"
                        title="Eliminar todos los objetos 3D"
                      >
                        <Trash2 size={14} className="text-red-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-widest font-mono">Limpiar Escena</span>
                      </button>
                    )}
                  </div>
                </section>

                {/* Add New Objects Grid */}
                <section>
                  <span className="text-[11px] font-medium text-white/60 block mb-4 uppercase tracking-widest">Primitives</span>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { type: "box", name: "Cube", icon: <Box className="text-white/40" /> },
                      { type: "sphere", name: "Sphere", icon: <Circle className="text-white/40" /> },
                      { type: "cylinder", name: "Cylinder", icon: <Cylinder className="text-white/40" /> },
                      { type: "cone", name: "Cone", icon: <Cone className="text-white/40" /> },
                      { type: "plane", name: "Plane", icon: <Square className="text-white/40" /> },
                      { type: "text", name: "Text", icon: <Type className="text-white/40" /> }
                    ].map((item) => (
                      <button
                        key={item.type}
                        onClick={() => onAdd(item.type as any)}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/50 transition-all flex flex-col items-center gap-2 group"
                      >
                        <div className="group-hover:scale-110 group-hover:text-indigo-400 transition-all">
                          {item.icon}
                        </div>
                        <span className="text-[10px] font-bold text-white/40 group-hover:text-white uppercase tracking-tighter transition-colors">
                          {item.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-8">
            {/* AI Generator Section */}
            <section>
              <span className="text-[11px] font-medium text-white/60 block mb-4 uppercase tracking-widest">IA Generativa Vision</span>
              <div className="p-6 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 text-center space-y-6 shadow-2xl">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-2xl relative">
                  <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                  <ImageIcon size={32} className="text-white relative z-10" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-black uppercase tracking-[0.1em] text-white">Imagen a 3D</h4>
                  <p className="text-[10px] text-white/40 leading-relaxed px-2 italic">
                    "Sube una foto de un objeto y nuestra IA lo reconstruirá en el espacio 3D usando primitivas geométricas."
                  </p>
                </div>
                
                <div className="space-y-3">
                  <label className="block w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] cursor-pointer transition-all active:scale-95 disabled:hover:bg-indigo-600 disabled:opacity-50 shadow-lg shadow-indigo-600/20">
                    {isConverting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin" /> PROCESANDO...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <ImageIcon size={14} /> Seleccionar Imagen
                      </span>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      disabled={isConverting}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onConvert(file);
                      }}
                    />
                  </label>
                  <p className="text-[9px] text-white/20 uppercase tracking-widest">Formatos: PNG, JPG, WEBP</p>
                </div>
              </div>
            </section>

            <div className="p-4 bg-zinc-800/50 border border-indigo-500/10 rounded-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                 <Zap size={40} className="text-indigo-400" />
               </div>
               <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <Zap size={12} /> Sugerencia Pro
               </h5>
               <p className="text-[10px] text-white/40 leading-relaxed relative z-10">
                 Para resultados óptimos, usa imágenes con iluminación uniforme y fondos limpios. La IA detectará mejor los volúmenes.
               </p>
            </div>
          </div>
        )}

        {/* Scene Explorer / Layers */}
        <section className="pt-4 border-t border-white/5">
          <span className="text-[11px] font-medium text-white/60 block mb-4 uppercase tracking-widest flex items-center gap-2">
             <Layers size={12} /> Scene Explorer
          </span>
          <div className="space-y-1">
            {objects.length === 0 ? (
              <div className="text-[10px] text-white/20 italic p-4 text-center border border-dashed border-white/5 rounded-xl uppercase tracking-tighter">
                Empty Scene
              </div>
            ) : (
              objects.map((obj) => (
                <button
                  key={obj.id}
                  onClick={() => onSelect(obj.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded text-[11px] transition-all ${
                    selectedId === obj.id 
                      ? "bg-indigo-500/10 border-l-2 border-indigo-500 text-white" 
                      : "text-white/30 hover:text-white hover:bg-white/5 opacity-80"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${selectedId === obj.id ? 'bg-indigo-500' : 'bg-white/20'}`} />
                  <span className="truncate flex-1 text-left">{obj.name}</span>
                  <div className="text-[9px] opacity-40 uppercase font-mono">{obj.type.substring(0, 3)}</div>
                </button>
              ))
            )}
          </div>
        </section>
      </div>


      <div className="p-4 bg-zinc-800/30 border-t border-white/5">
         <div className="flex items-center justify-between text-[9px] text-white/20 font-bold uppercase tracking-[0.15em]">
           <span>Nova OS 1.0</span>
           <span className="text-indigo-400">Stable Build</span>
         </div>
      </div>
    </aside>
  );
};

const getIcon = (type: SceneObject["type"]) => {
  switch (type) {
    case "box": return <Box size={20} />;
    case "sphere": return <Circle size={20} />;
    case "cylinder": return <Cylinder size={20} />;
    case "cone": return <Cone size={20} />;
    case "plane": return <Square size={20} />;
    case "text": return <Type size={20} />;
  }
};
