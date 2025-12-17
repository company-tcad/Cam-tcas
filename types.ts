
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

export interface FrameStats {
  vertices: number;
  score: number;
  latency: number;
}
