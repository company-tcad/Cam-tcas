
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera as CameraIcon, 
  Settings, 
  Box, 
  Layers, 
  Sliders, 
  Activity, 
  Cpu, 
  ChevronRight,
  CircleStop,
  Play,
  Aperture,
  Scan,
  Smartphone,
  Share2,
  Image as ImageIcon,
  AlertTriangle,
  RotateCcw,
  Zap,
  Waves,
  Eye,
  Lock
} from 'lucide-react';
import { CameraSettings, SceneAnalysis, ScanResult } from './types';
import { analyzeFrame, analyzeTopology } from './services/geminiService';
import ControlSlider from './components/ControlSlider';
import Histogram from './components/Histogram';

const INITIAL_SETTINGS: CameraSettings = {
  exposure: 0,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  iso: 800,
  shutterSpeed: "1/48",
  whiteBalance: 5600,
  stabilization: true,
  upscale: true,
  hdr: true,
  bokeh: 0,
  glow: 10,
  lut: 'none'
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<CameraSettings>(INITIAL_SETTINGS);
  const [mode, setMode] = useState<'camera' | 'scan' | 'relief'>('camera');
  const [isRecording, setIsRecording] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SceneAnalysis | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [histogramData, setHistogramData] = useState<number[]>(Array.from({ length: 24 }, () => 20));

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);

  const initCamera = async () => {
    setCameraError(null);
    try {
      // First attempt: Ideal professional settings (Rear camera, 4K/UHD)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' }, 
          width: { ideal: 3840 }, 
          height: { ideal: 2160 } 
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
          videoRef.current?.play();
        };
      }
    } catch (err: any) {
      console.error("Camera Error:", err);
      // Fallback: Simple constraints if professional setup fails
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.onloadedmetadata = () => videoRef.current?.play();
        }
      } catch (fallbackErr: any) {
        setCameraError(fallbackErr.message || "Could not access rear camera.");
      }
    }
  };

  useEffect(() => {
    initCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const triggerHaptics = (intensity: number | number[] = 10) => {
    if ('vibrate' in navigator) navigator.vibrate(intensity);
  };

  const takePhoto = async () => {
    if (canvasRef.current) {
      triggerHaptics([40, 10, 20]);
      const photo = canvasRef.current.toDataURL('image/jpeg', 1.0);
      setCapturedPhotos(prev => [photo, ...prev].slice(0, 5));
      
      setIsBusy(true);
      const base64 = photo.split(',')[1];
      const res = await analyzeFrame(base64);
      setAnalysis(res);
      setIsBusy(false);
    }
  };

  const processFrame = useCallback(() => {
    if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
      const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        const { width, height } = canvasRef.current;
        
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'source-over';

        if (mode === 'relief') {
          ctx.drawImage(videoRef.current, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;
          
          ctx.fillStyle = '#0a0a0a';
          ctx.fillRect(0, 0, width, height);
          
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 1;
          const step = 20; 
          for (let y = 0; y < height; y += step) {
            ctx.beginPath();
            for (let x = 0; x < width; x += step) {
              const idx = (y * width + x) * 4;
              const brightness = (data[idx] + data[idx+1] + data[idx+2]) / 3;
              const offset = (brightness / 255) * -40; 
              if (x === 0) ctx.moveTo(x, y + offset);
              else ctx.lineTo(x, y + offset);
            }
            ctx.stroke();
          }
        } else {
          let filters = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) blur(${settings.bokeh/40}px)`;
          if (settings.lut === 'cine-teal') filters += ' hue-rotate(180deg) saturate(130%)';
          if (settings.lut === 'vintage') filters += ' sepia(40%) contrast(90%) brightness(95%)';
          
          ctx.filter = filters;
          ctx.drawImage(videoRef.current, 0, 0, width, height);

          if (settings.glow > 0) {
            ctx.globalAlpha = settings.glow / 150;
            ctx.globalCompositeOperation = 'screen';
            ctx.filter = `blur(${settings.glow * 0.8}px) brightness(140%)`;
            ctx.drawImage(canvasRef.current, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
          }

          if (mode === 'scan') {
            ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            for(let i=0; i<width; i+=60) { ctx.moveTo(i, 0); ctx.lineTo(i, height); }
            for(let i=0; i<height; i+=60) { ctx.moveTo(0, i); ctx.lineTo(width, i); }
            ctx.stroke();
            
            ctx.fillStyle = '#22d3ee';
            for(let i=0; i<30; i++) {
              const rx = Math.floor(Math.random() * width);
              const ry = Math.floor(Math.random() * height);
              ctx.fillRect(rx, ry, 3, 3);
            }
          }
        }

        if (Math.random() > 0.85) {
          setHistogramData(prev => prev.map(() => 5 + Math.random() * 95));
        }
      }
    }
    requestRef.current = requestAnimationFrame(processFrame);
  }, [settings, mode]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(processFrame);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [processFrame]);

  const start3DScanAnalysis = async () => {
    if (!canvasRef.current) return;
    setIsBusy(true);
    triggerHaptics([30, 60, 30]);
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
    const res = await analyzeTopology(dataUrl.split(',')[1]);
    setScanResult(res);
    setIsBusy(false);
  };

  const updateSetting = <K extends keyof CameraSettings>(key: K, value: CameraSettings[K]) => {
    triggerHaptics(5);
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden landscape:flex-row">
      
      {/* Permission/Error Overlay */}
      {cameraError && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-20 h-20 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-widest mb-2">Camera Access Restricted</h2>
          <p className="text-zinc-400 text-sm max-w-xs mb-8 leading-relaxed">
            Lumina Cine-Pro requires rear camera permissions for high-fidelity 4D scanning and cinematic capture.
          </p>
          <button 
            onClick={initCamera}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-black px-10 py-4 rounded-full transition-all active:scale-95 flex items-center gap-3"
          >
            <CameraIcon className="w-5 h-5" /> ENABLE REAR CAMERA
          </button>
          <p className="mt-6 text-[10px] font-mono text-zinc-600">ERROR_LOG: {cameraError}</p>
        </div>
      )}

      {/* Mobile Professional HUD Top */}
      <header className="fixed top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-4 bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-zinc-700'}`} />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-widest text-zinc-100 uppercase leading-none">
              {mode === 'camera' ? 'Pro-Cinema' : mode === 'scan' ? 'LiDAR-Scan' : 'Depth-Relief'}
            </span>
            <span className="text-[8px] font-mono text-cyan-500">UHD 10-BIT PRORES</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="hidden sm:flex flex-col items-end">
              <span className="text-[8px] text-zinc-500 uppercase font-bold">Latency</span>
              <span className="text-[10px] font-mono text-green-400">12ms</span>
           </div>
           <div className="bg-zinc-900/90 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[9px] font-black tracking-tight">BRIDGE ACTIVE</span>
           </div>
        </div>
      </header>

      {/* Main Real-time Monitor */}
      <main className="flex-1 relative flex items-center justify-center bg-zinc-950 overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        <canvas 
          ref={canvasRef} 
          width={1920} 
          height={1080} 
          className="w-full h-full object-cover sm:object-contain transition-opacity duration-300"
        />

        {/* Dynamic HUD Overlays */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 pt-16 pb-28 lg:pb-8">
          <div className="flex justify-between items-start">
            <div className="w-36 opacity-70 scale-90 origin-top-left">
              <Histogram data={histogramData} />
            </div>
            
            <div className="flex flex-col gap-2 items-end">
              <div className="bg-black/40 backdrop-blur-xl p-2.5 rounded-lg border border-white/5 text-[9px] font-mono leading-tight">
                <span className="text-zinc-500">ISO</span> <span className="text-cyan-400">{settings.iso}</span><br/>
                <span className="text-zinc-500">SHT</span> <span className="text-cyan-400">{settings.shutterSpeed}</span><br/>
                <span className="text-zinc-500">LUT</span> <span className="text-amber-500 uppercase">{settings.lut}</span>
              </div>
              {isBusy && (
                <div className="flex items-center gap-2 bg-cyan-600 px-2 py-1 rounded text-[8px] font-black animate-bounce">
                  <Cpu className="w-3 h-3" /> GEMINI COMPRESSING
                </div>
              )}
            </div>
          </div>

          {/* Grid Lines Overlay */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-10 pointer-events-none">
            {[...Array(9)].map((_, i) => <div key={i} className="border border-white" />)}
          </div>

          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-3">
              {capturedPhotos.map((img, idx) => (
                <div key={idx} className={`w-14 h-14 rounded-lg border-2 border-white/30 overflow-hidden shadow-2xl transition-transform ${idx === 0 ? 'scale-110' : 'scale-90 opacity-50'}`}>
                  <img src={img} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            
            <div className="max-w-[240px] bg-zinc-900/80 backdrop-blur-xl p-3 rounded-xl border border-white/10">
               <div className="flex items-center gap-2 mb-1.5">
                 <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                 <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Scene Intelligence</span>
               </div>
               <p className="text-[10px] text-zinc-200 leading-relaxed font-medium italic">
                 {analysis?.suggestions || "Point camera at subject for AI grading tips."}
               </p>
            </div>
          </div>
        </div>
      </main>

      {/* Control Surface */}
      <aside className="w-full h-[320px] lg:w-85 lg:h-screen bg-zinc-950 border-t lg:border-t-0 lg:border-l border-zinc-900 p-5 flex flex-col gap-5 overflow-y-auto z-50 safe-area-bottom">
        
        {/* Advanced Mode Toggle */}
        <div className="flex bg-zinc-900/50 rounded-xl p-1.5 gap-1 border border-zinc-800">
           <button 
             onClick={() => { setMode('camera'); triggerHaptics(10); }}
             className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 text-[10px] font-black transition-all ${mode === 'camera' ? 'bg-zinc-100 text-black shadow-lg shadow-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
             <Aperture className="w-4 h-4" /> CINEMA
           </button>
           <button 
             onClick={() => { setMode('scan'); triggerHaptics(10); }}
             className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 text-[10px] font-black transition-all ${mode === 'scan' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
             <Scan className="w-4 h-4" /> 3D SCAN
           </button>
           <button 
             onClick={() => { setMode('relief'); triggerHaptics(10); }}
             className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 text-[10px] font-black transition-all ${mode === 'relief' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
             <Waves className="w-4 h-4" /> 4D DEPTH
           </button>
        </div>

        {mode === 'camera' || mode === 'relief' ? (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid grid-cols-2 gap-3">
              <ControlSlider label="ISO" value={settings.iso} min={100} max={12800} step={100} onChange={v => updateSetting('iso', v)} />
              <ControlSlider label="EXP" value={settings.exposure} min={-100} max={100} onChange={v => updateSetting('exposure', v)} suffix="ev" />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Signal Filters</h3>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <ControlSlider label="BOKEH STRENGTH" value={settings.bokeh} min={0} max={100} onChange={v => updateSetting('bokeh', v)} />
              <ControlSlider label="GLOW AMOUNT" value={settings.glow} min={0} max={100} onChange={v => updateSetting('glow', v)} />
              
              <div className="flex gap-2">
                {(['none', 'log-c', 'cine-teal', 'vintage'] as const).map(l => (
                  <button 
                    key={l}
                    onClick={() => updateSetting('lut', l)}
                    className={`flex-1 py-1.5 text-[8px] font-black rounded border transition-all ${settings.lut === l ? 'bg-zinc-100 border-white text-black' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-2">
               <button onClick={takePhoto} className="flex-1 bg-zinc-100 text-black h-16 rounded-2xl flex flex-col items-center justify-center hover:bg-white active:scale-95 transition-all shadow-xl">
                  <ImageIcon className="w-7 h-7" />
                  <span className="text-[9px] font-black mt-1 uppercase tracking-tighter">Capture Frame</span>
               </button>
               <button onClick={() => { setIsRecording(!isRecording); triggerHaptics(25); }} className={`flex-1 ${isRecording ? 'bg-red-600 shadow-red-600/30' : 'bg-zinc-800 shadow-zinc-900/30'} h-16 rounded-2xl flex flex-col items-center justify-center active:scale-95 transition-all shadow-xl border border-white/5`}>
                  {isRecording ? <CircleStop className="w-7 h-7" /> : <Play className="w-7 h-7" />}
                  <span className="text-[9px] font-black mt-1 uppercase tracking-tighter">{isRecording ? 'Stop' : 'Recording'}</span>
               </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
             <div className="bg-cyan-950/20 border border-cyan-500/20 p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                   <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.15em]">Neural Mesh Analyzer</h4>
                   {isBusy && <Activity className="w-4 h-4 text-cyan-500 animate-spin" />}
                </div>
                {scanResult ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                       <span className="text-zinc-500 uppercase">Surface Data</span>
                       <span className="text-zinc-100 font-bold">{scanResult.vertices.toLocaleString()} POLY</span>
                    </div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                       <div className="bg-cyan-500 h-full transition-all duration-1000" style={{ width: `${scanResult.topologyScore}%` }} />
                    </div>
                    {scanResult.defects.length > 0 && (
                      <div className="bg-red-900/30 p-2.5 rounded-lg border border-red-500/20 flex gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        <p className="text-[9px] text-red-100 leading-tight font-medium">Gemini Mesh Error: {scanResult.defects[0]}</p>
                      </div>
                    )}
                    <button onClick={start3DScanAnalysis} className="w-full py-2.5 bg-zinc-800 rounded-lg text-[9px] font-black hover:bg-zinc-700 flex items-center justify-center gap-2 transition-colors">
                      <RotateCcw className="w-3.5 h-3.5" /> RE-CALIBRATE POINT CLOUD
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-400 italic leading-relaxed">Ensure rear-camera LiDAR distance of 0.5m - 2.0m. Gemini will optimize the topology real-time.</p>
                )}
             </div>

             <button 
               onClick={start3DScanAnalysis} 
               disabled={isBusy}
               className="w-full py-7 bg-cyan-600 text-white rounded-[2rem] flex flex-col items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-50 shadow-2xl shadow-cyan-600/20"
             >
                <Box className="w-9 h-9" />
                <span className="text-sm font-black uppercase tracking-widest mt-1">Generate 3D Scan</span>
                <span className="text-[9px] font-bold opacity-60 uppercase">Gemini-Neural Mesh Bake</span>
             </button>

             <div className="grid grid-cols-2 gap-3 mt-2">
                <button className="bg-zinc-900 p-4 rounded-2xl flex flex-col items-center border border-zinc-800 active:bg-zinc-800 transition-colors">
                   <Share2 className="w-5 h-5 text-zinc-400 mb-1" />
                   <span className="text-[8px] font-black uppercase text-zinc-500">Cloud Link</span>
                </button>
                <button className="bg-zinc-900 p-4 rounded-2xl flex flex-col items-center border border-zinc-800 active:bg-zinc-800 transition-colors">
                   <Eye className="w-5 h-5 text-zinc-400 mb-1" />
                   <span className="text-[8px] font-black uppercase text-zinc-500">Live Preview</span>
                </button>
             </div>
          </div>
        )}

        {/* Global Status Footer */}
        <div className="mt-auto pt-6 border-t border-zinc-900 flex justify-between items-center px-1">
           <div className="flex gap-3">
              <button className="p-2.5 bg-zinc-900 rounded-xl text-zinc-400 hover:text-white transition-colors"><Layers className="w-5 h-5" /></button>
              <button className="p-2.5 bg-zinc-900 rounded-xl text-zinc-400 hover:text-white transition-colors"><Sliders className="w-5 h-5" /></button>
           </div>
           <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 mb-0.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                 <span className="text-[9px] font-black text-zinc-300">SYSTEM STABLE</span>
              </div>
              <span className="text-[8px] font-mono text-zinc-500 uppercase">Bridge ID: Lum-74x-v2</span>
           </div>
        </div>
      </aside>
    </div>
  );
};

export default App;
