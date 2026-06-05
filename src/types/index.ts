import { v4 as uuidv4 } from "uuid";

export interface SceneObject {
  id: string;
  type: "box" | "sphere" | "cylinder" | "cone" | "plane" | "text";
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  name: string;
  text?: string;
}

export const createDefaultObject = (type: SceneObject["type"]): SceneObject => ({
  id: uuidv4(),
  type,
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
  color: "#3b82f6",
  name: `New ${type}`,
});
