export interface WireEndpoint {
  componentId: string;
  portId: string;
}

export interface Waypoint {
  /** World Coordinate x */
  x: number;
  /** World Coordinate y */
  y: number;
}

export interface WireStyle {
  color?: string;
  width?: number;
  lineStyle?: "solid" | "dashed" | "dotted";
}

export interface Wire {
  id: string;
  projectId?: string;
  drawingId?: string;
  source: WireEndpoint;
  target: WireEndpoint;
  /** World Coordinate Waypoints */
  waypoints: Waypoint[];
  label?: string;
  colorCode?: string; // e.g. "R/B 2.0sq"
  strokeColor?: string;
  strokeWidth?: number;
  lineStyle?: "solid" | "dashed" | "dotted";
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}
