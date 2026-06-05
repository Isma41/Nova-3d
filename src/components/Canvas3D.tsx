import React, { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { 
  OrbitControls, 
  Grid, 
  TransformControls, 
  Environment,
  ContactShadows,
  Text
} from "@react-three/drei";
import { SceneObject } from "../types";

interface Canvas3DProps {
  objects: SceneObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateObject: (id: string, updates: Partial<SceneObject>) => void;
  showGrid: boolean;
}

const MeshObject = ({ obj, isSelected, onSelect, onUpdate }: any) => {
  const ref = useRef<any>(null);
  const [hovered, setHover] = useState(false);

  return (
    <>
      {obj.type === "text" ? (
        <Text
          ref={ref}
          position={obj.position}
          rotation={obj.rotation}
          scale={obj.scale}
          color={obj.color}
          fontSize={1}
          maxWidth={10}
          lineHeight={1}
          letterSpacing={0.02}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(obj.id);
          }}
          onPointerOver={() => setHover(true)}
          onPointerOut={() => setHover(false)}
        >
          {obj.text || "Text"}
        </Text>
      ) : (
        <mesh
          ref={ref}
          position={obj.position}
          rotation={obj.rotation}
          scale={obj.scale}
          castShadow
          receiveShadow
          onPointerOver={() => setHover(true)}
          onPointerOut={() => setHover(false)}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(obj.id);
          }}
        >
          {obj.type === "box" && <boxGeometry />}
          {obj.type === "sphere" && <sphereGeometry args={[1, 32, 32]} />}
          {obj.type === "cylinder" && <cylinderGeometry args={[1, 1, 2, 32]} />}
          {obj.type === "cone" && <coneGeometry args={[1, 2, 32]} />}
          {obj.type === "plane" && <planeGeometry args={[1, 1]} />}
          <meshStandardMaterial 
            color={obj.color} 
            roughness={0.4}
            metalness={0.2}
            emissive={isSelected ? "#0055ff" : hovered ? "#222" : "#000"}
            emissiveIntensity={isSelected ? 0.5 : hovered ? 0.2 : 0}
          />
        </mesh>
      )}
      
      {isSelected && ref.current && (
        <TransformControls
          object={ref.current}
          onMouseUp={() => {
            if (ref.current) {
              const { position, rotation, scale } = ref.current;
              onUpdate(obj.id, {
                position: [position.x, position.y, position.z],
                rotation: [rotation.x, rotation.y, rotation.z],
                scale: [scale.x, scale.y, scale.z],
              });
            }
          }}
        />
      )}
    </>
  );
};

export const MainCanvas: React.FC<Canvas3DProps> = ({ 
  objects, 
  selectedId, 
  onSelect,
  onUpdateObject,
  showGrid
}) => {
  return (
    <div className="canvas-container bg-zinc-950 h-full w-full">
      <Canvas 
        shadows 
        dpr={[1, 2]} 
        camera={{ position: [10, 10, 10], fov: 45 }} 
        gl={{ preserveDrawingBuffer: true }}
        onPointerMissed={() => onSelect(null)}
      >
        <OrbitControls makeDefault />
        
        <ambientLight intensity={1.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        
        <Environment preset="city" />

        {showGrid && (
          <Grid
            infiniteGrid
            fadeDistance={50}
            fadeStrength={5}
            cellSize={1}
            sectionSize={5}
            sectionColor="#333"
          />
        )}

        {objects.map((obj) => (
          <MeshObject
            key={obj.id}
            obj={obj}
            isSelected={selectedId === obj.id}
            onSelect={onSelect}
            onUpdate={onUpdateObject}
          />
        ))}

        <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={20} blur={2} far={4.5} />
      </Canvas>
    </div>
  );
};
