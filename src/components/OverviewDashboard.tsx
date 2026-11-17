import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Server,
  Wifi,
  Clock,
  History,
  Trophy,
  Cpu,
  TrendingUp,
  BarChart3,
  Search,
  RotateCcw,
  Maximize2,
  Minimize2,
  RefreshCw,
  Calendar,
  Building,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { HardwareAgentItem } from '../data/agents';

export interface OverviewTerminalInput {
  id: number;
  name: string;
  loginAccount: string;
  status: 'online' | 'offline';
  sn: string;
  model: string;
  schoolName: string;
  assetName?: string;
}

export interface OverviewCustomAgentInput {
  id: number;
  name: string;
  hardwareModel: string;
  userCount: number;
  callCount: number;
  status: 'published' | 'draft';
  schoolName: string;
}

interface OverviewDashboardProps {
  isPlatformScope: boolean;
  terminals: OverviewTerminalInput[];
  customAgents: OverviewCustomAgentInput[];
  systemAgents: HardwareAgentItem[];
  availableSchools?: string[];
}

type RangePreset = '7d' | '15d' | '30d' | '90d' | 'custom';

interface DailyTelemetryPoint {
  date: string;
  shortDate: string;
  weekday: string;
  onlineHours: number;
  peakOnlineTerminals: number;
  avgPerTerminalHours: number;
  systemTokens: number;
  customTokens: number;
  totalTokens: number;
  callCount: number;
}

function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDaysAgoYMD(daysAgo: number, baseDate = new Date()): string {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  d.setDate(d.getDate() - daysAgo);
  return formatDateYMD(d);
}

function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN');
}

function formatTokenCount(tokens: number): string {
  if (tokens >= 10000) {
    return `${(tokens / 10000).toFixed(2)} 万`;
  }
  return tokens.toLocaleString('zh-CN');
}

function seededWave(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function generateDailySeries(
  startStr: string,
  endStr: string,
  terminalCount: number,
  onlineCount: number,
  refreshSeed: number
): DailyTelemetryPoint[] {
  const start = parseYMD(startStr);
  const end = parseYMD(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return [];
  }

  const maxSpan = 180;
  const points: DailyTelemetryPoint[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const baseScale = Math.max(6, terminalCount);

  let guard = 0;
  while (cursor <= end && guard < maxSpan) {
    guard += 1;
    const ymd = formatDateYMD(cursor);
    const dayIdx = Math.floor(cursor.getTime() / 86400000);
    const dow = cursor.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const weekdayFactor = isWeekend ? 0.54 : 1.0 + (dow === 2 || dow === 4 ? 0.14 : 0.04);

    const wave1 = seededWave(dayIdx + refreshSeed * 7);
    const wave2 = seededWave(dayIdx * 3 + 19 + refreshSeed * 11);

    const activeRatio = Math.min(0.95, Math.max(0.45, (onlineCount / Math.max(1, terminalCount)) * 0.88 + wave1 * 0.22));
    const peakOnlineTerminals = Math.max(
      1,
      Math.min(Math.max(1, terminalCount), Math.round(baseScale * activeRatio * (isWeekend ? 0.72 : 1)))
    );

    const avgHours = Number((5.2 + wave1 * 3.8 * weekdayFactor).toFixed(1));
    const onlineHours = Number((peakOnlineTerminals * avgHours).toFixed(1));

    const systemTokens = Math.round((14500 + wave1 * 18500) * weekdayFactor * (baseScale / 12));
    const customTokens = Math.round((8200 + wave2 * 13400) * weekdayFactor * (baseScale / 12));
    const totalTokens = systemTokens + customTokens;
    const callCount = Math.round(totalTokens / 315);

    points.push({
      date: ymd,
      shortDate: ymd.slice(5),
      weekday: WEEKDAY_LABELS[dow],
      onlineHours,
      peakOnlineTerminals,
      avgPerTerminalHours: avgHours,
      systemTokens,
      customTokens,
      totalTokens,
      callCount,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return points;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    dataKey?: string;
    payload?: DailyTelemetryPoint;
  }>;
  label?: string;
}

const OnlineDurationTooltip: React.FC<ChartTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;
  return (
    <div className="bg-white/95 border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs text-slate-800 space-y-1 backdrop-blur-sm">
      <div className="font-semibold text-blue-700 flex items-center justify-between gap-4 border-b border-slate-100 pb-1">
        <span>{pt.date}</span>
        <span className="text-slate-400 font-normal">{pt.weekday}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-500">当日在线总时长</span>
        <span className="font-mono font-bold text-blue-600 tabular-nums">{pt.onlineHours.toFixed(1)} 小时</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-500">峰值在线终端</span>
        <span className="font-mono font-semibold text-emerald-600 tabular-nums">{pt.peakOnlineTerminals} 台</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-500">单台日均时长</span>
        <span className="font-mono text-slate-700 tabular-nums">{pt.avgPerTerminalHours.toFixed(1)} 小时</span>
      </div>
    </div>
  );
};

const TokenUsageTooltip: React.FC<ChartTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;
  return (
    <div className="bg-white/95 border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs text-slate-800 space-y-1 backdrop-blur-sm">
      <div className="font-semibold text-indigo-700 flex items-center justify-between gap-4 border-b border-slate-100 pb-1">
        <span>{pt.date}</span>
        <span className="text-slate-400 font-normal">{pt.weekday}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-slate-500">Token 总消耗</span>
        <span className="font-mono font-bold text-slate-900 tabular-nums">{formatNumber(pt.totalTokens)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-blue-600">系统预置智能体</span>
        <span className="font-mono font-semibold text-blue-600 tabular-nums">{formatNumber(pt.systemTokens)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-emerald-600">自定义硬件智能体</span>
        <span className="font-mono font-semibold text-emerald-600 tabular-nums">{formatNumber(pt.customTokens)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100">
        <span className="text-slate-400">累计推理调用</span>
        <span className="font-mono text-amber-600 tabular-nums">{formatNumber(pt.callCount)} 次</span>
      </div>
    </div>
  );
};

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  isPlatformScope,
  terminals,
  customAgents,
  systemAgents,
  availableSchools,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string>('全部学校');
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  });

  const schoolOptions = useMemo(() => {
    if (availableSchools && availableSchools.length > 0) {
      return availableSchools;
    }
    const set = new Set<string>();
    terminals.forEach((t) => t.schoolName && set.add(t.schoolName));
    customAgents.forEach((a) => a.schoolName && set.add(a.schoolName));
    return ['全部学校', ...Array.from(set)];
  }, [availableSchools, terminals, customAgents]);

  const activeSchool = isPlatformScope && schoolOptions.includes(selectedSchool) ? selectedSchool : '全部学校';

  const scopedTerminals = useMemo(() => {
    if (!isPlatformScope || activeSchool === '全部学校') return terminals;
    return terminals.filter((t) => t.schoolName === activeSchool);
  }, [isPlatformScope, activeSchool, terminals]);

  const scopedCustomAgents = useMemo(() => {
    if (!isPlatformScope || activeSchool === '全部学校') return customAgents;
    return customAgents.filter((a) => a.schoolName === activeSchool);
  }, [isPlatformScope, activeSchool, customAgents]);

  const schoolSeedOffset = useMemo(() => {
    if (!isPlatformScope || activeSchool === '全部学校') return 0;
    return activeSchool.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 97;
  }, [isPlatformScope, activeSchool]);

  // 模块2：终端在线时长排行维度切换
  const [terminalRankMode, setTerminalRankMode] = useState<'history' | 'today'>('history');

  // 模块3：硬件智能体使用排行筛选
  const [agentRankFilter, setAgentRankFilter] = useState<'all' | 'custom' | 'system'>('all');

  // 模块4：终端在线时长折线图时间范围（默认最近30天）
  const defaultEnd = useMemo(() => getDaysAgoYMD(0), []);
  const defaultStart30 = useMemo(() => getDaysAgoYMD(29), []);

  const [durationPreset, setDurationPreset] = useState<RangePreset>('30d');
  const [durationStartInput, setDurationStartInput] = useState(defaultStart30);
  const [durationEndInput, setDurationEndInput] = useState(defaultEnd);
  const [appliedDurationRange, setAppliedDurationRange] = useState({
    start: defaultStart30,
    end: defaultEnd,
  });

  // 模块5：Token消耗柱状图时间范围（默认最近30天）
  const [tokenPreset, setTokenPreset] = useState<RangePreset>('30d');
  const [tokenStartInput, setTokenStartInput] = useState(defaultStart30);
  const [tokenEndInput, setTokenEndInput] = useState(defaultEnd);
  const [appliedTokenRange, setAppliedTokenRange] = useState({
    start: defaultStart30,
    end: defaultEnd,
  });

  const handleRefresh = () => {
    setRefreshSeed((s) => s + 1);
    const now = new Date();
    setLastRefreshedAt(
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    );
  };

  // ---------------- 模块1 & 模块2：终端基础统计与时长计算 ----------------
  const terminalTelemetryList = useMemo(() => {
    return scopedTerminals.map((t) => {
      const seedA = seededWave(t.id * 17 + 3 + refreshSeed);
      const seedB = seededWave(t.id * 29 + 7 + refreshSeed);
      const isOnline = t.status === 'online';
      const todayHours = isOnline
        ? Number((4.6 + seedA * 6.8).toFixed(1))
        : Number((0.4 + seedA * 2.1).toFixed(1));
      const historyHours = Number((620 + seedB * 1480 + (isOnline ? 260 : 0)).toFixed(1));

      return {
        ...t,
        todayHours,
        historyHours,
      };
    });
  }, [scopedTerminals, refreshSeed]);

  const kpiStats = useMemo(() => {
    const totalCount = terminalTelemetryList.length;
    const onlineCount = terminalTelemetryList.filter((t) => t.status === 'online').length;
    const onlineRate = totalCount > 0 ? ((onlineCount / totalCount) * 100).toFixed(1) : '0.0';
    const todayTotalHours = Number(
      terminalTelemetryList.reduce((sum, t) => sum + t.todayHours, 0).toFixed(1)
    );
    const historyTotalHours = Number(
      terminalTelemetryList.reduce((sum, t) => sum + t.historyHours, 0).toFixed(1)
    );
    const avgTodayHours = totalCount > 0 ? (todayTotalHours / totalCount).toFixed(1) : '0.0';

    return {
      totalCount,
      onlineCount,
      offlineCount: totalCount - onlineCount,
      onlineRate,
      todayTotalHours,
      historyTotalHours,
      avgTodayHours,
    };
  }, [terminalTelemetryList]);

  // 模块2：终端在线时长排行（前10）
  const top10Terminals = useMemo(() => {
    return [...terminalTelemetryList]
      .sort((a, b) =>
        terminalRankMode === 'history'
          ? b.historyHours - a.historyHours
          : b.todayHours - a.todayHours
      )
      .slice(0, 10);
  }, [terminalTelemetryList, terminalRankMode]);

  const maxTerminalHours = useMemo(() => {
    if (top10Terminals.length === 0) return 1;
    const top = top10Terminals[0];
    return Math.max(1, terminalRankMode === 'history' ? top.historyHours : top.todayHours);
  }, [top10Terminals, terminalRankMode]);

  // ---------------- 模块3：硬件智能体使用排行（前10，包含自定义硬件智能体） ----------------
  const combinedAgentRanking = useMemo(() => {
    const presetWeights = [2860, 2340, 1980, 1650, 1320, 940, 780, 620, 510, 390];
    const schoolRatio =
      isPlatformScope && activeSchool !== '全部学校'
        ? Math.max(0.18, scopedTerminals.length / Math.max(1, terminals.length))
        : 1;
    const scopeBonus = (isPlatformScope ? 1.35 : 1) * schoolRatio;

    const systemList = systemAgents.map((agent, idx) => {
      const baseCalls = presetWeights[idx] ?? Math.max(300, agent.popularity * 12);
      const calls = Math.max(
        12,
        Math.round(baseCalls * scopeBonus + seededWave(agent.id + refreshSeed + schoolSeedOffset) * 45 * schoolRatio)
      );
      const users = Math.max(2, Math.round(calls / 6.8));
      return {
        key: `sys-${agent.id}`,
        name: agent.shortTitle || agent.name,
        fullName: agent.name,
        category: 'system' as const,
        categoryLabel: '系统预置',
        model: agent.model,
        callCount: calls,
        userCount: users,
      };
    });

    const customList = scopedCustomAgents.map((agent) => ({
      key: `custom-${agent.id}`,
      name: agent.name,
      fullName: agent.name,
      category: 'custom' as const,
      categoryLabel: '自定义',
      model: agent.hardwareModel,
      callCount: Math.round(
        agent.callCount * (isPlatformScope && activeSchool === '全部学校' ? 1.35 : 1) +
          seededWave(agent.id + refreshSeed + schoolSeedOffset) * 28
      ),
      userCount: agent.userCount,
    }));

    const merged = [...systemList, ...customList];
    const filtered =
      agentRankFilter === 'all'
        ? merged
        : merged.filter((item) => item.category === agentRankFilter);

    return filtered.sort((a, b) => b.callCount - a.callCount).slice(0, 10);
  }, [
    systemAgents,
    scopedCustomAgents,
    scopedTerminals.length,
    terminals.length,
    agentRankFilter,
    isPlatformScope,
    activeSchool,
    refreshSeed,
    schoolSeedOffset,
  ]);

  const maxAgentCallCount = useMemo(() => {
    if (combinedAgentRanking.length === 0) return 1;
    return Math.max(1, combinedAgentRanking[0].callCount);
  }, [combinedAgentRanking]);

  // ---------------- 模块4：终端在线时长折线图 ----------------
  const applyDurationPreset = (preset: Exclude<RangePreset, 'custom'>) => {
    const days = preset === '7d' ? 6 : preset === '15d' ? 14 : preset === '30d' ? 29 : 89;
    const start = getDaysAgoYMD(days);
    const end = getDaysAgoYMD(0);
    setDurationPreset(preset);
    setDurationStartInput(start);
    setDurationEndInput(end);
    setAppliedDurationRange({ start, end });
  };

  const handleSearchDurationRange = () => {
    if (!durationStartInput || !durationEndInput) return;
    const s = durationStartInput <= durationEndInput ? durationStartInput : durationEndInput;
    const e = durationStartInput <= durationEndInput ? durationEndInput : durationStartInput;
    setDurationStartInput(s);
    setDurationEndInput(e);
    setDurationPreset('custom');
    setAppliedDurationRange({ start: s, end: e });
  };

  const durationChartData = useMemo(
    () =>
      generateDailySeries(
        appliedDurationRange.start,
        appliedDurationRange.end,
        kpiStats.totalCount,
        kpiStats.onlineCount,
        refreshSeed + schoolSeedOffset
      ),
    [appliedDurationRange, kpiStats.totalCount, kpiStats.onlineCount, refreshSeed, schoolSeedOffset]
  );

  const durationSummary = useMemo(() => {
    if (durationChartData.length === 0) {
      return { totalHours: 0, avgHours: 0 };
    }
    const total = durationChartData.reduce((acc, p) => acc + p.onlineHours, 0);
    return {
      totalHours: Number(total.toFixed(1)),
      avgHours: Number((total / durationChartData.length).toFixed(1)),
    };
  }, [durationChartData]);

  // ---------------- 模块5：Token消耗柱状图 ----------------
  const applyTokenPreset = (preset: Exclude<RangePreset, 'custom'>) => {
    const days = preset === '7d' ? 6 : preset === '15d' ? 14 : preset === '30d' ? 29 : 89;
    const start = getDaysAgoYMD(days);
    const end = getDaysAgoYMD(0);
    setTokenPreset(preset);
    setTokenStartInput(start);
    setTokenEndInput(end);
    setAppliedTokenRange({ start, end });
  };

  const handleSearchTokenRange = () => {
    if (!tokenStartInput || !tokenEndInput) return;
    const s = tokenStartInput <= tokenEndInput ? tokenStartInput : tokenEndInput;
    const e = tokenStartInput <= tokenEndInput ? tokenEndInput : tokenStartInput;
    setTokenStartInput(s);
    setTokenEndInput(e);
    setTokenPreset('custom');
    setAppliedTokenRange({ start: s, end: e });
  };

  const tokenChartData = useMemo(
    () =>
      generateDailySeries(
        appliedTokenRange.start,
        appliedTokenRange.end,
        kpiStats.totalCount,
        kpiStats.onlineCount,
        refreshSeed + 3 + schoolSeedOffset
      ),
    [appliedTokenRange, kpiStats.totalCount, kpiStats.onlineCount, refreshSeed, schoolSeedOffset]
  );

  const tokenSummary = useMemo(() => {
    if (tokenChartData.length === 0) {
      return { totalTokens: 0, avgTokens: 0, customShare: '0.0' };
    }
    const total = tokenChartData.reduce((acc, p) => acc + p.totalTokens, 0);
    const customTotal = tokenChartData.reduce((acc, p) => acc + p.customTokens, 0);
    return {
      totalTokens: total,
      avgTokens: Math.round(total / tokenChartData.length),
      customShare: total > 0 ? ((customTotal / total) * 100).toFixed(1) : '0.0',
    };
  }, [tokenChartData]);

  return (
    <div
      className={cn(
        'text-slate-900 flex flex-col gap-2.5 transition-all',
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-100 p-4 overflow-hidden'
          : 'flex-1 min-h-0 lg:h-full lg:overflow-hidden'
      )}
    >
      {/* ==================== 顶部大屏标题栏 (单行紧凑，平台运营支持按学校切换) ==================== */}
      <div className="bg-white border border-slate-200/90 rounded-xl px-4 py-2 shadow-2xs flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <h3 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            硬件智能体运行态势数据总览
          </h3>

          {isPlatformScope && (
            <div className="flex items-center gap-1.5 bg-indigo-50/80 px-2 py-1 rounded-lg border border-indigo-200 text-xs shrink-0">
              <Building className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-indigo-700 font-semibold whitespace-nowrap">切换学校:</span>
              <select
                aria-label="按学校切换数据总览"
                value={activeSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="bg-white px-2 py-0.5 rounded-md border border-indigo-200 text-indigo-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs cursor-pointer"
              >
                {schoolOptions.map((sch) => (
                  <option key={sch} value={sch}>
                    {sch}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline text-xs text-slate-400 font-mono tabular-nums">
            更新于 {lastRefreshedAt}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>刷新</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-medium text-blue-700 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>退出大屏</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>全屏大屏</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ==================== 模块 1：4 个核心指标卡 ==================== */}
      <section aria-label="硬件智能体终端核心指标" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        {/* KPI 1 */}
        <div className="bg-white border border-slate-200/90 rounded-xl px-4 py-2.5 shadow-2xs flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">硬件智能体终端总数量</span>
            <Server className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {formatNumber(kpiStats.totalCount)}
              </span>
              <span className="text-xs text-slate-400">台</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              离线 {kpiStats.offlineCount} 台
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-slate-200/90 rounded-xl px-4 py-2.5 shadow-2xs flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">在线数量</span>
            <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600">
                {formatNumber(kpiStats.onlineCount)}
              </span>
              <span className="text-xs text-slate-400">台在线</span>
            </div>
            <span className="text-[11px] font-mono tabular-nums font-semibold text-emerald-600">
              在线率 {kpiStats.onlineRate}%
            </span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-slate-200/90 rounded-xl px-4 py-2.5 shadow-2xs flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">今日在线总时长</span>
            <Clock className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono tabular-nums text-cyan-700">
                {formatNumber(kpiStats.todayTotalHours)}
              </span>
              <span className="text-xs text-slate-400">小时</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              均 {kpiStats.avgTodayHours} h/台
            </span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-slate-200/90 rounded-xl px-4 py-2.5 shadow-2xs flex flex-col justify-between gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">历史在线总时长</span>
            <History className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono tabular-nums text-amber-600">
                {formatNumber(kpiStats.historyTotalHours)}
              </span>
              <span className="text-xs text-slate-400">小时</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              折合 {(kpiStats.historyTotalHours / 24).toFixed(0)} 天
            </span>
          </div>
        </div>
      </section>

      {/* ==================== 模块 2–5：一屏 2×2 布局（无竖向滚动条） ==================== */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 gap-2.5">
        {/* 模块 2：硬件智能体终端在线时长排行（前10，名称、归属账号） */}
        <section className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-2xs flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                硬件智能体终端在线时长排行（前10）
              </h4>
            </div>

            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setTerminalRankMode('history')}
                className={cn(
                  'px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                  terminalRankMode === 'history'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                历史总时长
              </button>
              <button
                type="button"
                onClick={() => setTerminalRankMode('today')}
                className={cn(
                  'px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                  terminalRankMode === 'today'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                今日时长
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col justify-between pt-1">
            {top10Terminals.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400">暂无终端在线数据</div>
            ) : (
              <table className="w-full h-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="text-[11px] font-medium text-slate-400 border-b border-slate-100">
                    <th className="py-1 w-9">排名</th>
                    <th className="py-1">终端名称</th>
                    <th className="py-1 w-28">归属账号</th>
                    <th className="py-1 w-12 text-center">状态</th>
                    <th className="py-1 w-32 text-right">在线时长</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80 text-[11px]">
                  {top10Terminals.map((item, idx) => {
                    const rank = idx + 1;
                    const hours = terminalRankMode === 'history' ? item.historyHours : item.todayHours;
                    const barPct = Math.max(8, Math.round((hours / maxTerminalHours) * 100));
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/90 transition-colors">
                        <td className="py-0.5">
                          <span
                            className={cn(
                              'inline-flex items-center justify-center w-4 h-4 rounded font-mono font-bold text-[10px] tabular-nums',
                              rank === 1
                                ? 'bg-amber-100 text-amber-700'
                                : rank === 2
                                ? 'bg-slate-200 text-slate-700'
                                : rank === 3
                                ? 'bg-orange-100 text-orange-700'
                                : 'text-slate-400'
                            )}
                          >
                            {rank}
                          </span>
                        </td>
                        <td className="py-0.5 pr-2 font-medium text-slate-800 truncate" title={`${item.name} (${item.model})`}>
                          {item.name}
                        </td>
                        <td className="py-0.5 font-mono text-slate-600 truncate" title={item.loginAccount}>
                          {item.loginAccount}
                        </td>
                        <td className="py-0.5 text-center whitespace-nowrap">
                          <span
                            className={cn(
                              'font-medium',
                              item.status === 'online' ? 'text-emerald-600' : 'text-slate-400'
                            )}
                          >
                            {item.status === 'online' ? '在线' : '离线'}
                          </span>
                        </td>
                        <td className="py-0.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0 hidden sm:block">
                              <div
                                className={cn('h-full rounded-full', rank <= 3 ? 'bg-cyan-500' : 'bg-blue-500')}
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                            <span className="font-mono font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                              {formatNumber(hours)} h
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* 模块 3：硬件智能体使用排行（前10，包含自定义硬件智能体） */}
        <section className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-2xs flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Cpu className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                硬件智能体使用排行（前10）
              </h4>
            </div>

            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg shrink-0">
              {(
                [
                  { id: 'all', label: '全部' },
                  { id: 'custom', label: '自定义' },
                  { id: 'system', label: '系统预置' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAgentRankFilter(tab.id)}
                  className={cn(
                    'px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                    agentRankFilter === tab.id
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col justify-between pt-1">
            {combinedAgentRanking.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400">暂无匹配的智能体使用数据</div>
            ) : (
              <table className="w-full h-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="text-[11px] font-medium text-slate-400 border-b border-slate-100">
                    <th className="py-1 w-9">排名</th>
                    <th className="py-1">智能体名称</th>
                    <th className="py-1 w-20">来源类型</th>
                    <th className="py-1 w-16 text-right">使用人数</th>
                    <th className="py-1 w-32 text-right">调用次数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80 text-[11px]">
                  {combinedAgentRanking.map((item, idx) => {
                    const rank = idx + 1;
                    const barPct = Math.max(8, Math.round((item.callCount / maxAgentCallCount) * 100));
                    return (
                      <tr key={item.key} className="hover:bg-slate-50/90 transition-colors">
                        <td className="py-0.5">
                          <span
                            className={cn(
                              'inline-flex items-center justify-center w-4 h-4 rounded font-mono font-bold text-[10px] tabular-nums',
                              rank === 1
                                ? 'bg-amber-100 text-amber-700'
                                : rank === 2
                                ? 'bg-slate-200 text-slate-700'
                                : rank === 3
                                ? 'bg-orange-100 text-orange-700'
                                : 'text-slate-400'
                            )}
                          >
                            {rank}
                          </span>
                        </td>
                        <td className="py-0.5 pr-2 font-medium text-slate-800 truncate" title={item.fullName}>
                          {item.name}
                        </td>
                        <td className="py-0.5 whitespace-nowrap">
                          <span
                            className={cn(
                              'font-medium',
                              item.category === 'custom' ? 'text-emerald-600' : 'text-blue-600'
                            )}
                          >
                            {item.categoryLabel}
                          </span>
                        </td>
                        <td className="py-0.5 text-right font-mono tabular-nums text-slate-500">
                          {formatNumber(item.userCount)}人
                        </td>
                        <td className="py-0.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0 hidden sm:block">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  item.category === 'custom' ? 'bg-emerald-500' : 'bg-blue-500'
                                )}
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                            <span className="font-mono font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                              {formatNumber(item.callCount)} 次
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* 模块 4：硬件智能体终端在线时长折线图（时间范围搜索，默认最近30天） */}
        <section className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-2xs flex flex-col min-h-0 overflow-hidden">
          <div className="flex flex-col gap-1.5 pb-1.5 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  硬件智能体终端在线时长折线图
                </h4>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2 shrink-0">
                <span>
                  累计 <strong className="font-mono text-cyan-700 tabular-nums">{formatNumber(durationSummary.totalHours)}h</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  日均 <strong className="font-mono text-slate-800 tabular-nums">{formatNumber(durationSummary.avgHours)}h</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg">
                {(
                  [
                    { id: '7d', label: '7天' },
                    { id: '15d', label: '15天' },
                    { id: '30d', label: '近30天' },
                    { id: '90d', label: '90天' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyDurationPreset(p.id)}
                    className={cn(
                      'px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                      durationPreset === p.id
                        ? 'bg-white text-cyan-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5">
                  <Calendar className="w-3 h-3 text-slate-400 shrink-0 hidden xl:block" />
                  <input
                    type="date"
                    aria-label="在线时长开始日期"
                    value={durationStartInput}
                    max={defaultEnd}
                    onChange={(e) => setDurationStartInput(e.target.value)}
                    className="bg-transparent text-[11px] font-mono text-slate-700 focus:outline-none [color-scheme:light] w-[104px]"
                  />
                  <span className="text-slate-400 text-[10px]">-</span>
                  <input
                    type="date"
                    aria-label="在线时长结束日期"
                    value={durationEndInput}
                    max={defaultEnd}
                    onChange={(e) => setDurationEndInput(e.target.value)}
                    className="bg-transparent text-[11px] font-mono text-slate-700 focus:outline-none [color-scheme:light] w-[104px]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchDurationRange}
                  className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-medium rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Search className="w-3 h-3" />
                  <span>查询</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyDurationPreset('30d')}
                  title="重置为最近30天"
                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[140px] pt-1.5">
            {durationChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                所选时间范围内暂无在线时长数据
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={durationChartData} margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="onlineDurationLightFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0891B2" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="#0891B2" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="shortDate"
                    stroke="#94A3B8"
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    minTickGap={22}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v}h`}
                    width={42}
                  />
                  <Tooltip content={<OnlineDurationTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="onlineHours"
                    name="终端在线时长"
                    stroke="#0891B2"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#onlineDurationLightFill)"
                    activeDot={{ r: 4, fill: '#0891B2', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* 模块 5：硬件智能体 Token 消耗柱状图（时间范围搜索，默认最近30天） */}
        <section className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-2xs flex flex-col min-h-0 overflow-hidden">
          <div className="flex flex-col gap-1.5 pb-1.5 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <BarChart3 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  硬件智能体 Token 消耗柱状图
                </h4>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2 shrink-0">
                <span>
                  累计 <strong className="font-mono text-blue-600 tabular-nums">{formatTokenCount(tokenSummary.totalTokens)}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  自定义占比 <strong className="font-mono text-emerald-600 tabular-nums">{tokenSummary.customShare}%</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg">
                {(
                  [
                    { id: '7d', label: '7天' },
                    { id: '15d', label: '15天' },
                    { id: '30d', label: '近30天' },
                    { id: '90d', label: '90天' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyTokenPreset(p.id)}
                    className={cn(
                      'px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                      tokenPreset === p.id
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5">
                  <Calendar className="w-3 h-3 text-slate-400 shrink-0 hidden xl:block" />
                  <input
                    type="date"
                    aria-label="Token消耗开始日期"
                    value={tokenStartInput}
                    max={defaultEnd}
                    onChange={(e) => setTokenStartInput(e.target.value)}
                    className="bg-transparent text-[11px] font-mono text-slate-700 focus:outline-none [color-scheme:light] w-[104px]"
                  />
                  <span className="text-slate-400 text-[10px]">-</span>
                  <input
                    type="date"
                    aria-label="Token消耗结束日期"
                    value={tokenEndInput}
                    max={defaultEnd}
                    onChange={(e) => setTokenEndInput(e.target.value)}
                    className="bg-transparent text-[11px] font-mono text-slate-700 focus:outline-none [color-scheme:light] w-[104px]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchTokenRange}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Search className="w-3 h-3" />
                  <span>查询</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTokenPreset('30d')}
                  title="重置为最近30天"
                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[140px] pt-1.5">
            {tokenChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                所选时间范围内暂无 Token 消耗数据
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tokenChartData} margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="shortDate"
                    stroke="#94A3B8"
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    minTickGap={22}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}K` : String(v))}
                    width={42}
                  />
                  <Tooltip content={<TokenUsageTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.06)' }} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '2px', color: '#475569' }}
                    iconSize={8}
                  />
                  <Bar
                    dataKey="systemTokens"
                    name="系统预置智能体"
                    stackId="tokens"
                    fill="#3B82F6"
                    maxBarSize={20}
                  />
                  <Bar
                    dataKey="customTokens"
                    name="自定义硬件智能体"
                    stackId="tokens"
                    fill="#10B981"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default OverviewDashboard;
