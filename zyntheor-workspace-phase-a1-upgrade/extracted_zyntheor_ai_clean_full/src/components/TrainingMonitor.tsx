import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Download,
  Flame,
  Gauge,
  LineChart,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Square,
  Timer,
  TrendingDown,
  Zap
} from 'lucide-react';

export interface TrainingStepData {
  step: number;
  epoch: number;
  trainLoss: number;
  valLoss?: number;
  learningRate: number;
  tokensPerSec: number;
  samplesPerSec: number;
  timestamp: string;
}

export interface TrainingEventLog {
  id: string;
  timestamp: string;
  level: 'info' | 'metric' | 'warn' | 'error' | 'epoch';
  message: string;
  step?: number;
  epoch?: number;
  metrics?: {
    trainLoss?: number;
    valLoss?: number;
    learningRate?: number;
    tokensPerSec?: number;
    samplesPerSec?: number;
  };
}

export interface TrainingJob {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'cancelled';
  targetModel: string;
  baseModel: string;
  method: string;
  currentStep: number;
  totalSteps: number;
  currentEpoch: number;
  totalEpochs: number;
  currentLoss: number;
  initialLoss: number;
  valLoss: number;
  learningRate: number;
  tokensPerSec: number;
  samplesPerSec: number;
  startTime: number;
  elapsedSeconds: number;
  estimatedRemainingSeconds: number;
  lossHistory: TrainingStepData[];
  eventLogs?: TrainingEventLog[];
  mode: 'gpu' | 'cpu_smoke_test';
  checkpointCreated: boolean;
  checkpointReason: string;
}

export interface D3LossChartProps {
  history: TrainingStepData[];
  totalSteps: number;
  isTraining: boolean;
  hoveredPoint: TrainingStepData | null;
  setHoveredPoint: (pt: TrainingStepData | null) => void;
}

export function D3LossChart({
  history,
  totalSteps,
  isTraining,
  hoveredPoint,
  setHoveredPoint
}: D3LossChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 680;
    const height = 220;
    const margin = { top: 22, right: 35, bottom: 30, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Definitions
    const defs = svg.append('defs');

    const trainGrad = defs
      .append('linearGradient')
      .attr('id', 'd3TrainGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    trainGrad.append('stop').attr('offset', '0%').attr('stop-color', '#38bdf8').attr('stop-opacity', 0.28);
    trainGrad.append('stop').attr('offset', '100%').attr('stop-color', '#38bdf8').attr('stop-opacity', 0.0);

    if (history.length === 0) {
      const gEmpty = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);
      gEmpty
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('fill', '#64748b')
        .attr('font-size', '11px')
        .attr('font-family', 'sans-serif')
        .text('No telemetry datapoints yet. Click "Start LoRA Run" to begin fine-tuning.');
      return;
    }

    // Determine scale domains
    const maxStep = Math.max(totalSteps || 10, history[history.length - 1].step, 1);
    const minStep = 1;

    const allLosses = [
      ...history.map(d => d.trainLoss),
      ...history.filter(d => d.valLoss !== undefined).map(d => d.valLoss as number)
    ];
    const rawMin = Math.min(...allLosses);
    const rawMax = Math.max(...allLosses);
    const minLoss = Math.max(0, Math.floor(rawMin * 10) / 10 - 0.1);
    const maxLoss = Math.ceil(rawMax * 10) / 10 + 0.1;

    // D3 Scales
    const xScale = d3
      .scaleLinear()
      .domain([minStep, maxStep])
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleLinear()
      .domain([minLoss, maxLoss])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const chartGroup = svg.append('g').attr('class', 'chart-content');

    // Horizontal Grid Lines
    const yTicks = yScale.ticks(5);
    const gridGroup = chartGroup.append('g').attr('class', 'grid-lines');

    yTicks.forEach(tickVal => {
      const yPos = yScale(tickVal);
      gridGroup
        .append('line')
        .attr('x1', margin.left)
        .attr('y1', yPos)
        .attr('x2', width - margin.right)
        .attr('y2', yPos)
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');
    });

    // Target threshold line (1.20)
    const targetLoss = 1.2;
    if (targetLoss >= minLoss && targetLoss <= maxLoss) {
      const targetY = yScale(targetLoss);
      chartGroup
        .append('line')
        .attr('x1', margin.left)
        .attr('y1', targetY)
        .attr('x2', width - margin.right)
        .attr('y2', targetY)
        .attr('stroke', '#475569')
        .attr('stroke-width', 1.2)
        .attr('stroke-dasharray', '4,4');

      chartGroup
        .append('text')
        .attr('x', width - margin.right)
        .attr('y', targetY - 4)
        .attr('text-anchor', 'end')
        .attr('fill', '#94a3b8')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .text('Target 1.20');
    }

    // D3 Area Generator (Train Loss)
    const trainAreaGenerator = d3
      .area<TrainingStepData>()
      .x(d => xScale(d.step))
      .y0(height - margin.bottom)
      .y1(d => yScale(d.trainLoss))
      .curve(d3.curveMonotoneX);

    chartGroup
      .append('path')
      .datum(history)
      .attr('fill', 'url(#d3TrainGrad)')
      .attr('d', trainAreaGenerator);

    // D3 Line Generator (Train Loss)
    const trainLineGenerator = d3
      .line<TrainingStepData>()
      .x(d => xScale(d.step))
      .y(d => yScale(d.trainLoss))
      .curve(d3.curveMonotoneX);

    chartGroup
      .append('path')
      .datum(history)
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2.2)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', trainLineGenerator);

    // D3 Line Generator (Validation Loss, if available)
    const valData = history.filter(d => d.valLoss !== undefined);
    if (valData.length > 1) {
      const valLineGenerator = d3
        .line<TrainingStepData>()
        .x(d => xScale(d.step))
        .y(d => yScale(d.valLoss as number))
        .curve(d3.curveMonotoneX);

      chartGroup
        .append('path')
        .datum(valData)
        .attr('fill', 'none')
        .attr('stroke', '#34d399')
        .attr('stroke-width', 1.8)
        .attr('stroke-dasharray', '4,3')
        .attr('stroke-linecap', 'round')
        .attr('d', valLineGenerator);
    }

    // D3 Axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.min(8, Math.max(3, history.length)))
      .tickFormat(d => `Step ${d}`);

    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat(d => (+d).toFixed(2));

    const xAxisGroup = svg
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(xAxis);

    xAxisGroup.select('.domain').attr('stroke', '#334155');
    xAxisGroup.selectAll('.tick line').attr('stroke', '#334155');
    xAxisGroup
      .selectAll('.tick text')
      .attr('fill', '#64748b')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace');

    const yAxisGroup = svg
      .append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxis);

    yAxisGroup.select('.domain').attr('stroke', '#334155');
    yAxisGroup.selectAll('.tick line').attr('stroke', '#334155');
    yAxisGroup
      .selectAll('.tick text')
      .attr('fill', '#64748b')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace');

    // Validation Loss Data Points
    valData.forEach(pt => {
      chartGroup
        .append('circle')
        .attr('cx', xScale(pt.step))
        .attr('cy', yScale(pt.valLoss as number))
        .attr('r', hoveredPoint?.step === pt.step ? 6 : 4)
        .attr('fill', '#34d399')
        .attr('stroke', '#090d16')
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .on('mouseenter', () => setHoveredPoint(pt))
        .on('mouseleave', () => setHoveredPoint(null));
    });

    // Train Loss Data Points
    history.forEach((pt, i) => {
      const isLatest = i === history.length - 1;
      const isHovered = hoveredPoint?.step === pt.step;

      // Pulse ring for the latest active training step
      if (isLatest && isTraining) {
        chartGroup
          .append('circle')
          .attr('cx', xScale(pt.step))
          .attr('cy', yScale(pt.trainLoss))
          .attr('r', 8)
          .attr('fill', 'none')
          .attr('stroke', '#38bdf8')
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.7);
      }

      chartGroup
        .append('circle')
        .attr('cx', xScale(pt.step))
        .attr('cy', yScale(pt.trainLoss))
        .attr('r', isHovered ? 5.5 : 3)
        .attr('fill', isHovered ? '#ffffff' : '#38bdf8')
        .attr('stroke', '#090d16')
        .attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .on('mouseenter', () => setHoveredPoint(pt))
        .on('mouseleave', () => setHoveredPoint(null));
    });

    // Bisector for interactive mouse hover overlay
    const bisectStep = d3.bisector((d: TrainingStepData) => d.step).center;

    // Crosshair line
    if (hoveredPoint) {
      chartGroup
        .append('line')
        .attr('class', 'crosshair')
        .attr('x1', xScale(hoveredPoint.step))
        .attr('x2', xScale(hoveredPoint.step))
        .attr('y1', margin.top)
        .attr('y2', height - margin.bottom)
        .attr('stroke', '#60a5fa')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');
    }

    // Transparent overlay for bisector interaction
    svg
      .append('rect')
      .attr('class', 'overlay-catcher')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all')
      .on('mousemove', event => {
        const [mouseX] = d3.pointer(event);
        const currentStepVal = xScale.invert(mouseX);
        const index = bisectStep(history, currentStepVal);
        const nearest = history[index];
        if (nearest) {
          setHoveredPoint(nearest);
        }
      })
      .on('mouseleave', () => {
        setHoveredPoint(null);
      });
  }, [history, totalSteps, isTraining, hoveredPoint, setHoveredPoint]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 680 220"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '220px' }}
    />
  );
}

function CustomRechartsTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload as TrainingStepData;
  if (!data) return null;

  return (
    <div
      style={{
        background: '#090d16',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '11px',
        color: '#f8fafc',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
      }}
    >
      <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '6px', borderBottom: '1px solid #1e293b', paddingBottom: '4px' }}>
        Step {data.step} · Epoch {data.epoch}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '4px 12px', fontFamily: 'monospace' }}>
        <span style={{ color: '#94a3b8' }}>Train Loss:</span>
        <span style={{ color: '#38bdf8', fontWeight: 700 }}>{data.trainLoss.toFixed(4)}</span>
        {data.valLoss !== undefined && (
          <>
            <span style={{ color: '#94a3b8' }}>Val Loss:</span>
            <span style={{ color: '#34d399', fontWeight: 700 }}>{data.valLoss.toFixed(4)}</span>
          </>
        )}
        <span style={{ color: '#94a3b8' }}>Learning Rate:</span>
        <span style={{ color: '#c084fc' }}>{data.learningRate ? data.learningRate.toExponential(2) : '2.00e-4'}</span>
        <span style={{ color: '#94a3b8' }}>Throughput:</span>
        <span style={{ color: '#fbbf24' }}>{data.tokensPerSec || 0} tok/s</span>
      </div>
    </div>
  );
}

export interface RechartsLossChartProps {
  history: TrainingStepData[];
  totalSteps: number;
  totalEpochs: number;
  isTraining: boolean;
}

export function RechartsTrainingLossAndEpochChart({
  history,
  totalSteps,
  totalEpochs,
  isTraining,
}: RechartsLossChartProps) {
  if (history.length === 0) {
    return (
      <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px' }}>
        No telemetry datapoints yet. Click "Start LoRA Run" to begin fine-tuning.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Chart 1: Training & Validation Loss Curves */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
          <span style={{ color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
            Recharts Loss Curve (Train & Validation Loss)
          </span>
          <span style={{ color: '#64748b', fontFamily: 'monospace' }}>
            Target: 1.20 · Backprop steps: {history.length}/{totalSteps}
          </span>
        </div>
        <div style={{ width: '100%', height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={history} margin={{ top: 10, right: 25, left: -15, bottom: 5 }}>
              <defs>
                <linearGradient id="rechartsTrainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="step" tickFormatter={(s) => `Step ${s}`} stroke="#64748b" fontSize={10} />
              <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={10} tickFormatter={(val) => Number(val).toFixed(2)} />
              <Tooltip content={<CustomRechartsTooltip />} />
              <ReferenceLine y={1.2} label={{ value: 'Target 1.20', fill: '#94a3b8', fontSize: 10, position: 'right' }} stroke="#475569" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="trainLoss" name="Train Loss" stroke="#38bdf8" strokeWidth={2.5} fill="url(#rechartsTrainGrad)" />
              <Line type="monotone" dataKey="valLoss" name="Val Loss" stroke="#34d399" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 4, fill: '#34d399' }} activeDot={{ r: 6 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Epoch Progression over Time & Learning Rate Annealing */}
      <div style={{ borderTop: '1px solid #1e293b', paddingTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
          <span style={{ color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
            Epoch Progression & Learning Rate Annealing
          </span>
          <span style={{ color: '#14b8a6', fontFamily: 'monospace' }}>
            Epochs: 1 → {totalEpochs || 3}
          </span>
        </div>
        <div style={{ width: '100%', height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={history} margin={{ top: 10, right: 25, left: -15, bottom: 5 }}>
              <defs>
                <linearGradient id="epochGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="step" tickFormatter={(s) => `Step ${s}`} stroke="#64748b" fontSize={10} />
              <YAxis yAxisId="left" domain={[0, totalEpochs || 3]} stroke="#38bdf8" fontSize={10} tickFormatter={(e) => `Ep ${e}`} />
              <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} stroke="#14b8a6" fontSize={10} tickFormatter={(lr) => Number(lr).toExponential(1)} />
              <Tooltip content={<CustomRechartsTooltip />} />
              <Area yAxisId="left" type="stepAfter" dataKey="epoch" name="Epoch" stroke="#38bdf8" strokeWidth={2} fill="url(#epochGrad)" />
              <Line yAxisId="right" type="monotone" dataKey="learningRate" name="Learning Rate" stroke="#14b8a6" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

interface TrainingMonitorProps {
  initialJob?: TrainingJob | null;
  onRefreshParent?: () => void;
}

export function TrainingMonitor({ initialJob, onRefreshParent }: TrainingMonitorProps) {
  const [job, setJob] = useState<TrainingJob | null>(initialJob || null);
  const [isTraining, setIsTraining] = useState<boolean>(initialJob?.status === 'running');
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'metrics' | 'table' | 'logs'>('metrics');
  const [chartEngine, setChartEngine] = useState<'recharts' | 'd3'>('recharts');
  const [hoveredPoint, setHoveredPoint] = useState<TrainingStepData | null>(null);
  const [selectedLog, setSelectedLog] = useState<TrainingEventLog | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // Sync when parent passes new job
  useEffect(() => {
    if (initialJob) {
      setJob(initialJob);
      setIsTraining(initialJob.status === 'running');
    }
  }, [initialJob]);

  // Polling loop when training is running
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/training/metrics');
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.job) {
            setJob(data.job);
            setIsTraining(data.isTraining);
          }
        }
      } catch (err) {
        // Silently continue polling
      }
    };

    if (isTraining) {
      timer = setInterval(fetchMetrics, 1100);
    } else {
      // If idle, do an occasional light poll or initial fetch
      fetchMetrics();
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTraining]);

  async function handleStartTraining() {
    setLoadingAction(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/training/start', { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.job) {
        setJob(data.job);
        setIsTraining(true);
        if (onRefreshParent) onRefreshParent();
      } else {
        setErrorMsg(data.message || 'Failed to initialize training job');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error communicating with training engine');
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleStopTraining() {
    setLoadingAction(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/training/stop', { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.job) {
        setJob(data.job);
        setIsTraining(false);
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error stopping training job');
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleRefresh() {
    setLoadingAction(true);
    try {
      const res = await fetch('/api/training/metrics');
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.job) {
          setJob(data.job);
          setIsTraining(data.isTraining);
        }
      }
    } finally {
      setLoadingAction(false);
    }
  }

  function handleDownloadLogs() {
    const payload = {
      exportTimestamp: new Date().toISOString(),
      jobId: job?.id || 'idle',
      targetModel: job?.targetModel || 'ZYNTHEOR CORE 0.10.0-foundation',
      baseModel: job?.baseModel || 'Qwen/Qwen2.5-Coder-7B-Instruct',
      method: job?.method || 'LoRA (r=16, alpha=32)',
      status: job?.status || 'idle',
      mode: job?.mode || 'cpu_smoke_test',
      currentStep: job?.currentStep ?? 0,
      totalSteps: job?.totalSteps ?? 24,
      currentEpoch: job?.currentEpoch ?? 1,
      totalEpochs: job?.totalEpochs ?? 3,
      currentLoss: job?.currentLoss ?? null,
      initialLoss: job?.initialLoss ?? null,
      valLoss: job?.valLoss ?? null,
      learningRate: job?.learningRate ?? null,
      tokensPerSec: job?.tokensPerSec ?? null,
      samplesPerSec: job?.samplesPerSec ?? null,
      elapsedSeconds: job?.elapsedSeconds ?? 0,
      estimatedRemainingSeconds: job?.estimatedRemainingSeconds ?? 0,
      checkpointCreated: job?.checkpointCreated ?? false,
      checkpointReason: job?.checkpointReason ?? 'No checkpoint created',
      lossHistory: job?.lossHistory || [],
      eventLogs: job?.eventLogs || []
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(payload, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `zyntheor-core-training-metrics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  // Loss chart calculations
  const history = useMemo(() => job?.lossHistory || [], [job?.lossHistory]);
  // Calculate training percentage from training job metadata state
  const trainingPercentage = useMemo(() => {
    if (!job || typeof job.totalSteps !== 'number' || job.totalSteps <= 0) return 0;
    const current = Math.max(0, job.currentStep || 0);
    const total = job.totalSteps;
    const pct = (current / total) * 100;
    return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
  }, [job?.currentStep, job?.totalSteps]);

  // Backward compatibility alias
  const progressPercent = Math.round(trainingPercentage);

  const lossReductionPercent = useMemo(() => {
    if (!job || !job.initialLoss || !job.currentLoss) return 0;
    const diff = job.initialLoss - job.currentLoss;
    return Math.round((diff / job.initialLoss) * 100);
  }, [job]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="surface-card training-monitor-card" style={{ marginBottom: '24px', border: '1px solid #3b82f6' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 0 15px rgba(59, 130, 246, 0.35)' }}>
            <Activity size={20} className={isTraining ? 'spin-slow' : ''} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <b style={{ fontSize: '15px', color: '#f8fafc' }}>LoRA Fine-Tuning Monitor</b>
              <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', fontWeight: 600 }}>
                {job?.method || 'LoRA (r=16, alpha=32)'}
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
              Base Target: <b style={{ color: '#cbd5e1' }}>{job?.baseModel || 'Qwen/Qwen2.5-Coder-7B-Instruct'}</b> · Real-time backprop telemetry
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isTraining ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 11px', borderRadius: '99px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #059669', color: '#34d399', fontSize: '11px', fontWeight: 700 }}>
              <span className="status-led green" style={{ width: '8px', height: '8px', animation: 'dotPulse 1.2s infinite' }} />
              TRAINING IN PROGRESS ({trainingPercentage.toFixed(1)}%)
            </div>
          ) : job?.status === 'completed' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 11px', borderRadius: '99px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid #0284c7', color: '#38bdf8', fontSize: '11px', fontWeight: 700 }}>
              <CheckCircle2 size={13} />
              RUN COMPLETED (100%)
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 11px', borderRadius: '99px', background: '#1e293b', border: '1px solid #475569', color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>
              STANDBY
            </div>
          )}

          {isTraining ? (
            <button className="secondary-button" onClick={handleStopTraining} disabled={loadingAction} style={{ borderColor: '#ef4444', color: '#fca5a5' }}>
              <Square size={13} fill="#ef4444" /> Abort Run
            </button>
          ) : (
            <button className="primary-button" onClick={handleStartTraining} disabled={loadingAction} style={{ background: '#2563eb' }}>
              <Play size={13} fill="#fff" /> {job?.status === 'completed' ? 'Rerun Fine-Tuning' : 'Start LoRA Run'}
            </button>
          )}

          <button
            className="secondary-button"
            onClick={handleRefresh}
            disabled={loadingAction}
            title="Refresh training metrics and status"
            aria-label="Refresh training metrics"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease' }}
          >
            <RefreshCw size={13} className={loadingAction ? 'spin' : ''} style={{ transition: 'transform 0.3s ease' }} />
            <span style={{ fontSize: '11px' }}>{loadingAction ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          <button
            className="secondary-button"
            onClick={handleDownloadLogs}
            title="Download training metrics and telemetry history as JSON"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={13} />
            <span>Download Logs</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ marginBottom: '14px', padding: '8px 12px', borderRadius: '6px', background: '#451a1a', border: '1px solid #b91c1c', color: '#fca5a5', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={14} /> {errorMsg}
        </div>
      )}

      {/* Training Progress Bar & Metadata State Visualization */}
      <div
        className="training-progress-card"
        style={{
          marginBottom: '16px',
          padding: '14px 16px',
          borderRadius: '8px',
          background: '#090d16',
          border: '1px solid #1e293b',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Training Job Progress
            </span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: isTraining ? '#38bdf8' : job?.status === 'completed' ? '#34d399' : '#94a3b8',
                fontFamily: 'monospace',
                background: '#0d1525',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #1e293b',
              }}
            >
              {trainingPercentage.toFixed(1)}%
            </span>
            <span style={{ fontSize: '11px', color: isTraining ? '#34d399' : '#94a3b8', fontWeight: 600 }}>
              {isTraining
                ? '• Active backpropagation (LoRA weights updating)'
                : job?.status === 'completed'
                ? '• 100% Complete (Validation convergence met)'
                : '• Standby'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px' }}>
            <span style={{ color: '#94a3b8' }}>
              Step: <b style={{ color: '#f1f5f9' }}>{job?.currentStep ?? 0}</b> / {job?.totalSteps ?? 24}
            </span>
            <span style={{ color: '#64748b' }}>•</span>
            <span style={{ color: '#94a3b8' }}>
              Epoch: <b style={{ color: '#f1f5f9' }}>{job?.currentEpoch ?? 1}</b> / {job?.totalEpochs ?? 3}
            </span>
            <span style={{ color: '#64748b' }}>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Timer size={12} style={{ color: '#818cf8' }} />
              <span style={{ color: '#94a3b8' }}>Elapsed:</span> <b style={{ color: '#e2e8f0' }}>{formatSeconds(job?.elapsedSeconds ?? 0)}</b>
            </span>
            {isTraining && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#94a3b8' }}>ETA:</span> <b style={{ color: '#38bdf8' }}>{formatSeconds(job?.estimatedRemainingSeconds ?? 0)}</b>
              </span>
            )}
          </div>
        </div>

        {/* The Visual Progress Bar */}
        <div
          role="progressbar"
          aria-valuenow={trainingPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Fine-tuning progress: ${trainingPercentage}%`}
          style={{
            height: '14px',
            background: '#0f172a',
            borderRadius: '999px',
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid #1e293b',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {/* Background Milestone markers */}
          <div style={{ position: 'absolute', left: '25%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.08)', zIndex: 1 }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.08)', zIndex: 1 }} />
          <div style={{ position: 'absolute', left: '75%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.08)', zIndex: 1 }} />

          {/* Progress fill */}
          <div
            style={{
              height: '100%',
              width: `${Math.max(0, Math.min(100, trainingPercentage))}%`,
              background: isTraining
                ? 'linear-gradient(90deg, #2563eb, #38bdf8, #10b981)'
                : job?.status === 'completed'
                ? '#10b981'
                : '#3b82f6',
              borderRadius: '999px',
              transition: 'width 0.4s ease-out',
              boxShadow: isTraining ? '0 0 12px rgba(56, 189, 248, 0.4)' : 'none',
              position: 'relative',
            }}
          />
        </div>

        {/* Milestone Tick Labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', marginTop: '6px', fontFamily: 'monospace' }}>
          <span>0% (Init)</span>
          <span style={{ transform: 'translateX(25%)' }}>25% (Warmup)</span>
          <span>50% (Mid-Epoch)</span>
          <span style={{ transform: 'translateX(-25%)' }}>75% (Annealing)</span>
          <span>100% (Checkpoint)</span>
        </div>
      </div>

      {/* Primary Telemetry Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '18px' }}>
        {/* Train Loss */}
        <div style={{ padding: '12px', borderRadius: '8px', background: '#0d131f', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Loss</span>
            <TrendingDown size={14} style={{ color: '#38bdf8' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            {job?.currentLoss ? job.currentLoss.toFixed(4) : '—'}
          </div>
          <div style={{ fontSize: '10px', color: lossReductionPercent > 0 ? '#34d399' : '#94a3b8', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
            {lossReductionPercent > 0 ? `↓ ${lossReductionPercent}% reduction` : `Initial: ${job?.initialLoss?.toFixed(4) || '2.4500'}`}
          </div>
        </div>

        {/* Validation Loss */}
        <div style={{ padding: '12px', borderRadius: '8px', background: '#0d131f', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Val Loss</span>
            <CheckCircle2 size={14} style={{ color: '#34d399' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#34d399', letterSpacing: '-0.02em' }}>
            {job?.valLoss ? job.valLoss.toFixed(4) : '—'}
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>
            Evaluated every 4 steps
          </div>
        </div>

        {/* Training Throughput */}
        <div style={{ padding: '12px', borderRadius: '8px', background: '#0d131f', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Throughput</span>
            <Gauge size={14} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#fbbf24', letterSpacing: '-0.02em' }}>
            {job?.tokensPerSec ? `${job.tokensPerSec.toFixed(1)}` : '—'}
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#94a3b8', marginLeft: '4px' }}>tok/s</span>
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>
            ~{job?.samplesPerSec?.toFixed(1) || '2.0'} samples/sec
          </div>
        </div>

        {/* Learning Rate */}
        <div style={{ padding: '12px', borderRadius: '8px', background: '#0d131f', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Learning Rate</span>
            <Zap size={14} style={{ color: '#38bdf8' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8', letterSpacing: '-0.02em' }}>
            {job?.learningRate ? job.learningRate.toExponential(2) : '2.00e-4'}
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>
            Cosine decay with warmup
          </div>
        </div>
      </div>

      {/* Tabs: Visual Chart vs History Table vs Raw Event Logs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('metrics')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              background: activeTab === 'metrics' ? '#1e293b' : 'transparent',
              color: activeTab === 'metrics' ? '#38bdf8' : '#94a3b8',
              border: activeTab === 'metrics' ? '1px solid #334155' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <LineChart size={13} /> Real-Time Loss Curves
          </button>
          <button
            onClick={() => setActiveTab('table')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              background: activeTab === 'table' ? '#1e293b' : 'transparent',
              color: activeTab === 'table' ? '#38bdf8' : '#94a3b8',
              border: activeTab === 'table' ? '1px solid #334155' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Telemetry History ({history.length} steps)
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              background: activeTab === 'logs' ? '#1e293b' : 'transparent',
              color: activeTab === 'logs' ? '#38bdf8' : '#94a3b8',
              border: activeTab === 'logs' ? '1px solid #334155' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Activity size={13} /> Raw Event Logs ({(job?.eventLogs || []).length})
          </button>
        </div>

        {/* Legend */}
        {activeTab === 'metrics' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '10px', color: '#94a3b8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '3px', background: '#38bdf8', borderRadius: '2px' }} />
              Train Loss
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', background: '#34d399', borderRadius: '50%' }} />
              Val Loss
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '1px', background: '#64748b', borderTop: '1px dashed #64748b' }} />
              Target Baseline
            </span>
          </div>
        )}
      </div>

      {/* Chart / Table / Raw Event Log Views */}
      {activeTab === 'metrics' ? (
        <div style={{ position: 'relative', background: '#0a0e17', borderRadius: '8px', border: '1px solid #1e293b', padding: '12px', overflow: 'hidden' }}>
          {/* Header indicator & Chart Engine Toggle inside chart */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px', fontSize: '10px', color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }} />
              {chartEngine === 'recharts' ? 'Recharts Responsive Telemetry · Loss Curves & Epoch Progression' : 'D3.js Dynamic Loss Curve · Monotone Interpolation'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setChartEngine('recharts')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  background: chartEngine === 'recharts' ? '#2563eb' : '#1e293b',
                  color: chartEngine === 'recharts' ? '#ffffff' : '#94a3b8',
                  border: `1px solid ${chartEngine === 'recharts' ? '#3b82f6' : '#334155'}`,
                  cursor: 'pointer',
                }}
              >
                Recharts (Loss & Epoch)
              </button>
              <button
                type="button"
                onClick={() => setChartEngine('d3')}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  background: chartEngine === 'd3' ? '#2563eb' : '#1e293b',
                  color: chartEngine === 'd3' ? '#ffffff' : '#94a3b8',
                  border: `1px solid ${chartEngine === 'd3' ? '#3b82f6' : '#334155'}`,
                  cursor: 'pointer',
                }}
              >
                D3 Vector Loss
              </button>
            </div>
          </div>

          {chartEngine === 'recharts' ? (
            <RechartsTrainingLossAndEpochChart
              history={history}
              totalSteps={job?.totalSteps || 24}
              totalEpochs={job?.totalEpochs || 3}
              isTraining={isTraining}
            />
          ) : (
            <>
              <D3LossChart
                history={history}
                totalSteps={job?.totalSteps || 24}
                isTraining={isTraining}
                hoveredPoint={hoveredPoint}
                setHoveredPoint={setHoveredPoint}
              />

              {/* Interactive Hover Tooltip for D3 */}
              {hoveredPoint && (
                <div
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(15, 23, 42, 0.92)',
                    border: '1px solid #334155',
                    backdropFilter: 'blur(8px)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#f8fafc',
                    pointerEvents: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  }}
                >
                  <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '2px' }}>
                    Step {hoveredPoint.step} · Epoch {hoveredPoint.epoch}
                  </div>
                  <div>Train Loss: <b style={{ color: '#f1f5f9' }}>{hoveredPoint.trainLoss.toFixed(4)}</b></div>
                  {hoveredPoint.valLoss !== undefined && (
                    <div>Val Loss: <b style={{ color: '#34d399' }}>{hoveredPoint.valLoss.toFixed(4)}</b></div>
                  )}
                  <div style={{ color: '#94a3b8', fontSize: '10px' }}>
                    Speed: {hoveredPoint.tokensPerSec} tok/s · LR: {hoveredPoint.learningRate.toExponential(2)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : activeTab === 'table' ? (
        /* Table View */
        <div style={{ maxHeight: '220px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #1e293b', background: '#0a0e17' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b', color: '#94a3b8', background: '#0f172a' }}>
                <th style={{ padding: '8px 10px' }}>Step</th>
                <th style={{ padding: '8px 10px' }}>Epoch</th>
                <th style={{ padding: '8px 10px' }}>Train Loss</th>
                <th style={{ padding: '8px 10px' }}>Val Loss</th>
                <th style={{ padding: '8px 10px' }}>Throughput</th>
                <th style={{ padding: '8px 10px' }}>Learning Rate</th>
                <th style={{ padding: '8px 10px' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                    No steps recorded.
                  </td>
                </tr>
              ) : (
                [...history].reverse().map((stepItem, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #141f32', color: '#cbd5e1' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 700, color: '#f8fafc' }}>#{stepItem.step}</td>
                    <td style={{ padding: '7px 10px' }}>Ep {stepItem.epoch}</td>
                    <td style={{ padding: '7px 10px', color: '#38bdf8', fontFamily: 'monospace' }}>{stepItem.trainLoss.toFixed(4)}</td>
                    <td style={{ padding: '7px 10px', color: stepItem.valLoss ? '#34d399' : '#64748b', fontFamily: 'monospace' }}>
                      {stepItem.valLoss ? stepItem.valLoss.toFixed(4) : '—'}
                    </td>
                    <td style={{ padding: '7px 10px', color: '#fbbf24', fontFamily: 'monospace' }}>{stepItem.tokensPerSec.toFixed(1)} tok/s</td>
                    <td style={{ padding: '7px 10px', color: '#c084fc', fontFamily: 'monospace' }}>{stepItem.learningRate.toExponential(2)}</td>
                    <td style={{ padding: '7px 10px', color: '#64748b', fontSize: '10px' }}>{new Date(stepItem.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Raw Event Log Viewer — deep inspection of epoch metrics */
        <div style={{ display: 'grid', gridTemplateColumns: selectedLog ? '1fr 280px' : '1fr', gap: '12px' }}>
          <div
            style={{
              maxHeight: '280px',
              overflowY: 'auto',
              borderRadius: '8px',
              border: '1px solid #1e293b',
              background: '#0a0e17',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '11px',
            }}
          >
            {(job?.eventLogs || []).length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                No raw training event logs yet. Start a LoRA run to populate the event stream.
              </div>
            ) : (
              (job?.eventLogs || []).map((log) => {
                const levelColor =
                  log.level === 'error' ? '#f87171' :
                  log.level === 'warn' ? '#fbbf24' :
                  log.level === 'epoch' ? '#34d399' :
                  log.level === 'metric' ? '#38bdf8' : '#94a3b8';
                const isSelected = selectedLog?.id === log.id;
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(isSelected ? null : log)}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #141f32',
                      cursor: 'pointer',
                      background: isSelected ? '#132033' : 'transparent',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ color: '#475569', minWidth: '64px', flexShrink: 0 }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: `${levelColor}22`,
                        color: levelColor,
                        textTransform: 'uppercase',
                        minWidth: '48px',
                        textAlign: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {log.level}
                    </span>
                    <span style={{ color: '#e2e8f0', wordBreak: 'break-word' }}>{log.message}</span>
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>

          {selectedLog && (
            <div
              style={{
                borderRadius: '8px',
                border: '1px solid #334155',
                background: '#0f172a',
                padding: '12px',
                fontSize: '11px',
                maxHeight: '280px',
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <b style={{ color: '#f1f5f9', fontSize: '12px' }}>Epoch / Step Inspection</b>
                <button
                  onClick={() => setSelectedLog(null)}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '11px' }}
                >
                  Close
                </button>
              </div>
              <div style={{ color: '#94a3b8', marginBottom: '6px' }}>
                Level: <b style={{ color: '#e2e8f0' }}>{selectedLog.level}</b>
              </div>
              <div style={{ color: '#94a3b8', marginBottom: '6px' }}>
                Time: <b style={{ color: '#e2e8f0' }}>{new Date(selectedLog.timestamp).toLocaleString()}</b>
              </div>
              {selectedLog.step !== undefined && (
                <div style={{ color: '#94a3b8', marginBottom: '6px' }}>
                  Step: <b style={{ color: '#38bdf8' }}>#{selectedLog.step}</b>
                  {selectedLog.epoch !== undefined && (
                    <> · Epoch: <b style={{ color: '#34d399' }}>{selectedLog.epoch}</b></>
                  )}
                </div>
              )}
              <div style={{ color: '#cbd5e1', marginBottom: '10px', lineHeight: 1.4 }}>{selectedLog.message}</div>
              {selectedLog.metrics && (
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Attached Metrics
                  </div>
                  {selectedLog.metrics.trainLoss !== undefined && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#94a3b8' }}>Train Loss</span>
                      <b style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{selectedLog.metrics.trainLoss.toFixed(4)}</b>
                    </div>
                  )}
                  {selectedLog.metrics.valLoss !== undefined && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#94a3b8' }}>Val Loss</span>
                      <b style={{ color: '#34d399', fontFamily: 'monospace' }}>{selectedLog.metrics.valLoss.toFixed(4)}</b>
                    </div>
                  )}
                  {selectedLog.metrics.learningRate !== undefined && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#94a3b8' }}>Learning Rate</span>
                      <b style={{ color: '#c084fc', fontFamily: 'monospace' }}>{selectedLog.metrics.learningRate.toExponential(2)}</b>
                    </div>
                  )}
                  {selectedLog.metrics.tokensPerSec !== undefined && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#94a3b8' }}>Throughput</span>
                      <b style={{ color: '#fbbf24', fontFamily: 'monospace' }}>{selectedLog.metrics.tokensPerSec.toFixed(1)} tok/s</b>
                    </div>
                  )}
                  {selectedLog.metrics.samplesPerSec !== undefined && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Samples/s</span>
                      <b style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{selectedLog.metrics.samplesPerSec.toFixed(2)}</b>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer notes */}
      <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '10px', color: '#64748b' }}>
        <span>
          Hyperparameters: <b>r=16, α=32, dropout=0.05</b> · Batch Size: <b>16</b> · Target Modules: <b>q, k, v, o, gate, up, down</b>
        </span>
        <span style={{ color: job?.mode === 'gpu' ? '#34d399' : '#e2e8f0' }}>
          Mode: <b>{job?.mode === 'gpu' ? 'NVIDIA GPU Acceleration' : 'CPU Smoke-Test Engine'}</b>
        </span>
      </div>
    </div>
  );
}
