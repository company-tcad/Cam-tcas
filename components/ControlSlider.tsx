
import React from 'react';

interface ControlSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  suffix?: string;
}

const ControlSlider: React.FC<ControlSliderProps> = ({ label, value, min, max, step = 1, onChange, suffix = "" }) => {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{label}</label>
        <span className="text-[11px] font-mono text-cyan-400">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
      />
    </div>
  );
};

export default ControlSlider;
