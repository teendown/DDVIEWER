export type ElectricalComponentType =
  | "ecu"
  | "relay"
  | "sensor"
  | "switch"
  | "motor"
  | "solenoid"
  | "fuse"
  | "connector"
  | "ground"
  | "other";

export type HydraulicComponentType =
  | "pump"
  | "valve"
  | "cylinder"
  | "motor"
  | "tank"
  | "filter"
  | "accumulator"
  | "hose"
  | "port"
  | "other";

export type ComponentType = ElectricalComponentType | HydraulicComponentType;

export type PortDirection = "left" | "right" | "top" | "bottom";
export type PortType = "input" | "output" | "bidirectional" | "power" | "ground";

export interface Port {
  id: string;
  name: string;
  componentId: string;
  /** Component 기준의 상대 좌표 (Local Offset px) */
  position: {
    x: number;
    y: number;
  };
  direction: PortDirection;
  type?: PortType;
  pinNumber?: string;
  description?: string;
}

export interface Component {
  id: string;
  projectId: string;
  drawingId: string;
  type: ComponentType;
  name: string;
  reference?: string;
  subtitle?: string;
  /** World Coordinate (도면 원본 픽셀 기준 x, y) */
  x: number;
  y: number;
  width: number;
  height: number;
  ports: Port[];
  pins?: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}
