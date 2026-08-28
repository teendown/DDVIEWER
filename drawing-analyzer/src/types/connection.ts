export interface Connection {
  id: string;
  projectId: string;
  drawingId?: string;
  wireId?: string;
  fromObjectId: string; // Component or Connector ID
  toObjectId: string;   // Component or Connector ID
  fromPin?: string;
  toPin?: string;
  signalName?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
