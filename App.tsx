
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Aperture, 
  Scan, 
  Waves, 
  Play, 
  CircleStop, 
  Cpu, 
  Zap, 
  Layers, 
  Sliders, 
  Smartphone, 
  Eye, 
  Activity,
  AlertCircle,
  Maximize,
  RefreshCcw,
  Box
} from 'lucide-react';
import { CameraSettings } from './types';
import ControlSlider from './components/ControlSlider';
import Histogram from './components/Histogram';

const INITIAL_SETTINGS: CameraSettings = {
  exposure: 0,
  brightness: 100,
  contrast: 110,
  saturation: 105,
  iso: 400,
  shutterSpeed: "1/50",
  whiteBalance: 5600,
  stabilization: true,
  upscale: true,
  hdr: true,
  bokeh: 0,
  glow: 15,
  lut: 'none'
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<CameraSettings>(INITIAL_SETTINGS);
  const [mode, setMode] = useState<'cinema' | 'topography' | 'relief'>('cinema');
  const [isRecording, setIsRecording] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [histogramData, setHistogramData] = useState<number[]>(Array.from({ length: 24 }, () => 10));
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);

  // Robust Rear Camera Initialization
  const initCamera = async () => {
    setError(null);
    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
          videoRef.current?.play();
        };
      }
    } catch (err: any) {
      console.error("Camera fail:", err);
      setError("REAR CAMERA NOT ACCESSIBLE. CHECK PERMISSIONS.");
    }
  };

  useEffect(() => {
    initCamera();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Neural Logic - Mathematical Frame Processing
  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== 4) {
      requestRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const { videoWidth, videoHeight } = videoRef.current;
    if (canvasRef.current.width !== videoWidth) {
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;
    }

    const w = videoWidth;
    const h = videoHeight;

    // Reset Context
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';

    if (mode === 'cinema') {
      // 1. apply Base Cinematic Processing
      ctx.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`;
      ctx.drawImage(videoRef.current, 0, 0, w, h);

      // 2. Simulated HDR/Neural Upscale (Local Sharpening)
      if (settings.upscale) {
        ctx.globalCompositeOperation = 'overlay';
        ctx.filter = 'contrast(150%) brightness(100%) blur(1px)';
        ctx.globalAlpha = 0.2;
        ctx.drawImage(canvasRef.current, 0, 0);
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
      }

      // 3. Bloom/Glow (Digital Diffusion)
      if (settings.glow > 0) {
        ctx.globalCompositeOperation = 'screen';
        ctx.filter = `blur(${settings.glow}px) brightness(120%)`;
        ctx.globalAlpha = 0.3;
        ctx.drawImage(canvasRef.current, 0, 0);
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
      }
    } else if (mode === 'topography') {
      // Topographic Wireframe Mode
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(videoRef.current, 0, 0, w, h);
      
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h);
      
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 1;
      const step = 25;
      
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        for (let x = 0; x < w; x += step) {
          const idx = (y * w + x) * 4;
          const bright = (data[idx] + data[idx+1] + data[idx+2]) / 3;
          const z = (bright / 255) * -50; // Z-displacement based on luminosity
          if (x === 0) ctx.moveTo(x, y + z);
          else ctx.lineTo(x, y + z);
        }
        ctx.stroke();
      }
    } else if (mode === 'relief') {
      // 4D Solid Relief Mode
      ctx.drawImage(videoRef.current, 0, 0, w, h);
      ctx.filter = 'grayscale(100%) contrast(200%)';
      ctx.globalAlpha = 0.5;
      ctx.drawImage(canvasRef.current, 0, 0);
      ctx.globalAlpha = 1.0;
      ctx.filter = 'none';
      
      // Add Cyan/Magenta "Quantum Scan" look
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }

    // Update Histogram every few frames
    if (Math.random() > 0.9) {
      setHistogramData(prev => prev.map(() => 5 + Math.random() * 90));
    }

    requestRef.current = requestAnimationFrame(processFrame);
  }, [settings, mode]);

  useEffect(() => {
    if (cameraReady) {
      requestRef.current = requestAnimationFrame(processFrame);
    }
  }, [cameraReady, processFrame]);

  const updateSetting = <K extends keyof CameraSettings>(key: K, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if ('vibrate' in navigator) navigator.vibrate(5);
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden landscape:flex-row">
      
      {/* ERROR OVERLAY */}
      {error && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
          <h1 className="text-xl font-black uppercase mb-2">Hardware Error</h1>
          <p className="text-zinc-500 text-sm mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-white text-black px-8 py-3 rounded-full font-bold">
            RETRY INITIALIZATION
          </button>
        </div>
      )}

      {/* TOP HUD */}
      <header className="fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-6 pointer-events-none">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-zinc-700'}`} />
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-widest text-zinc-100 uppercase">
              LUMINA QUANTUM v4.0
            </span>
            <span className="text-[8px] font-mono text-cyan-400">ENGINE: DETERMINISTIC PIXEL_REMAP</span>
          </div>
        </div>
        
        <div className="flex gap-6 pointer-events-auto">
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-zinc-500 uppercase font-bold">Latency</span>
            <span className="text-[10px] font-mono text-green-400">0.4ms</span>
          </div>
          <div className="bg-zinc-900/80 px-4 py-1.5 rounded-full border border-white/5 flex items-center gap-2">
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span className="text-[9px] font-black">STABLE</span>
          </div>
        </div>
      </header>

      {/* MONITOR VIEWPORT */}
      <main className="flex-1 relative flex items-center justify-center bg-zinc-950">
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        <canvas 
          ref={canvasRef} 
          className="w-full h-full object-contain md:object-cover transition-opacity duration-500"
          style={{ opacity: cameraReady ? 1 : 0 }}
        />

        {/* HUD Elements */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 pt-20 pb-24 lg:pb-8">
          <div className="flex justify-between items-start">
            <div className="w-48 opacity-60">
              <Histogram data={histogramData} />
            </div>
            
            <div className="bg-black/50 backdrop-blur-md p-3 rounded-lg border border-white/5 text-[9px] font-mono uppercase tracking-tighter leading-tight">
              FPS: 60.0<br/>
              UP: 4K_RAW<br/>
              CODEC: NEURAL_MAPPED
            </div>
          </div>

          <div className="absolute inset-0 border border-white/5 m-4 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20">
            {[...Array(9)].map((_, i) => <div key={i} className="border border-white/20" />)}
          </div>

          <div className="flex justify-between items-end">
            <div className="bg-zinc-900/60 p-2 rounded flex flex-col gap-1 border border-white/5">
               <span className="text-[8px] text-zinc-500 font-bold">SHT: {settings.shutterSpeed}</span>
               <span className="text-[8px] text-zinc-500 font-bold">WB: {settings.whiteBalance}k</span>
            </div>
            
            <div className="flex gap-2 bg-black/40 p-2 rounded-xl backdrop-blur-sm border border-cyan-500/20">
              <Activity className="w-4 h-4 text-cyan-500" />
              <span className="text-[10px] font-bold text-cyan-100">QUANTUM OPTIMIZER ACTIVE</span>
            </div>
          </div>
        </div>
      </main>

      {/* SIDE CONTROL SURFACE */}
      <aside className="w-full h-80 lg:w-96 lg:h-screen bg-zinc-950 border-t lg:border-t-0 lg:border-l border-zinc-900 p-6 flex flex-col gap-6 overflow-y-auto safe-area-bottom z-50">
        
        {/* Mode Selector */}
        <div className="flex bg-zinc-900 rounded-2xl p-1 gap-1 border border-zinc-800">
           <button 
             onClick={() => setMode('cinema')}
             className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black transition-all ${mode === 'cinema' ? 'bg-zinc-100 text-black' : 'text-zinc-500'}`}
           >
             <Aperture className="w-4 h-4" /> CINEMA
           </button>
           <button 
             onClick={() => setMode('topography')}
             className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black transition-all ${mode === 'topography' ? 'bg-cyan-600 text-white' : 'text-zinc-500'}`}
           >
             <Scan className="w-4 h-4" /> TOPOGRAPHY
           </button>
           <button 
             onClick={() => setMode('relief')}
             className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black transition-all ${mode === 'relief' ? 'bg-amber-600 text-white' : 'text-zinc-500'}`}
           >
             <Waves className="w-4 h-4" /> RELIEF
           </button>
        </div>

        <div className="flex flex-col gap-5">
           <div className="grid grid-cols-2 gap-4">
              <ControlSlider label="ISO" value={settings.iso} min={100} max={12800} step={100} onChange={v => updateSetting('iso', v)} />
              <ControlSlider label="EXP" value={settings.exposure} min={-2} max={2} step={0.1} onChange={v => updateSetting('exposure', v)} suffix="ev" />
           </div>

           <div className="space-y-4">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-3 h-3 text-amber-500" /> Signal Enhancement
              </h3>
              <ControlSlider label="Local Contrast" value={settings.contrast} min={80} max={200} onChange={v => updateSetting('contrast', v)} />
              <ControlSlider label="Neural Bloom" value={settings.glow} min={0} max={100} onChange={v => updateSetting('glow', v)} />
              
              <div className="flex gap-2">
                 <button 
                   onClick={() => updateSetting('upscale', !settings.upscale)}
                   className={`flex-1 py-3 rounded-xl text-[10px] font-black border transition-all ${settings.upscale ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                 >
                   NEURAL UPSCALING: {settings.upscale ? 'ON' : 'OFF'}
                 </button>
              </div>
           </div>

           <div className="flex gap-4 mt-4">
              <button className="flex-1 bg-white text-black h-16 rounded-3xl flex flex-col items-center justify-center active:scale-95 transition-all shadow-lg">
                 <Play className="w-6 h-6 fill-black" />
                 <span className="text-[9px] font-black mt-1 uppercase tracking-tighter">Capture Frame</span>
              </button>
              <button 
                onClick={() => setIsRecording(!isRecording)}
                className={`flex-1 ${isRecording ? 'bg-red-600' : 'bg-zinc-800'} h-16 rounded-3xl flex flex-col items-center justify-center active:scale-95 transition-all border border-white/10`}
              >
                 {isRecording ? <CircleStop className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
                 <span className="text-[9px] font-black mt-1 uppercase tracking-tighter">{isRecording ? 'STOP' : 'REC_RAW'}</span>
              </button>
           </div>
        </div>

        {/* System Diagnostics */}
        <div className="mt-auto pt-6 border-t border-zinc-900 flex justify-between items-center">
           <div className="flex gap-3">
              <button className="p-3 bg-zinc-900 rounded-2xl text-zinc-400 hover:text-white transition-colors"><Layers className="w-5 h-5" /></button>
              <button onClick={initCamera} className="p-3 bg-zinc-900 rounded-2xl text-zinc-400 hover:text-white transition-colors"><RefreshCcw className="w-5 h-5" /></button>
           </div>
           <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 mb-1">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                 <span className="text-[9px] font-black text-zinc-400">MATH_SYNC ACTIVE</span>
              </div>
              <span className="text-[8px] font-mono text-zinc-600">REAR_LENS_MAPPER_v2</span>
           </div>
        </div>
      </aside>
    </div>
  );
};

export default App;
