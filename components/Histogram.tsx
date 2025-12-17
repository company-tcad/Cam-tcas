
import React, { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis } from 'recharts';

interface HistogramProps {
  data: number[];
}

const Histogram: React.FC<HistogramProps> = ({ data }) => {
  const chartData = useMemo(() => {
    return data.map((val, i) => ({ x: i, y: val }));
  }, [data]);

  return (
    <div className="h-24 w-full bg-zinc-900/50 rounded p-1 border border-zinc-800">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <Area type="monotone" dataKey="y" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.2} isAnimationActive={false} />
          <XAxis hide />
          <YAxis hide />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Histogram;
