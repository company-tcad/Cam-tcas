
export interface CameraSettings {
  exposure: number;
  brightness: number;
  contrast: number;
  saturation: number;
  iso: number;
  shutterSpeed: string;
  whiteBalance: number;
  stabilization: boolean;
  upscale: boolean;
  hdr: boolean;
  bokeh: number;
  glow: number;
  lut: 'none' | 'log-c' | 'cine-teal' | 'vintage';
}

export interface ScanResult {
  vertices: number;
  topologyScore: number;
  uvStatus: string;
  defects: string[];
  suggestedFix: string;
}

export interface SceneAnalysis {
  luminance: number;
  colorTemp: string;
  detectedObjects: string[];
  suggestions: string;
}
