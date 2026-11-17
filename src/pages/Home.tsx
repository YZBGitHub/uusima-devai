import React, { useState, useEffect, type FormEvent } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  ArrowRight,
  Play,
  CornerDownLeft,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { triggerAIAssistant } from '../components/AIAssistantWidget';
import {
  INITIAL_SYSTEM_AGENTS,
  getHotAgents,
  getTenantPublishedCustomAgents,
  getAgentOpenCount,
  formatOpenCount,
  recordAgentOpen,
  getResolvedConnectionFields,
  AGENT_OPEN_COUNT_UPDATED_EVENT,
  AGENT_DESIGN_UPDATED_EVENT,
  type HardwareAgentItem,
} from '../data/agents';
import { getActiveTenant, TENANT_UPDATED_EVENT } from '../components/UserTenantMenu';
import {
  loadDefaultKbConfig,
  collectDefaultCommandsFromTree,
  flattenCommandsFromTree,
  DEFAULT_KB_UPDATED_EVENT,
} from '../lib/defaultKnowledgeBase';
import DeviceConnectPreModal from '../components/DeviceConnectPreModal';

const industryBadgeStyles: Record<string, string> = {
  物联网: 'bg-blue-50 text-blue-700 border-blue-200',
  工业互联网: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  人工智能: 'bg-purple-50 text-purple-700 border-purple-200',
  智慧农业: 'bg-amber-50 text-amber-700 border-amber-200',
};

interface PresetCommandChip {
  id: string;
  label: string;
  query: string;
}

function loadPresetCommandsFromConfig(): PresetCommandChip[] {
  const cfg = loadDefaultKbConfig();
  const defaults = collectDefaultCommandsFromTree(cfg.commandTree).map(({ node }) => ({
    id: node.id,
    label: node.label,
    query: node.prompt || node.label,
  }));
  if (defaults.length > 0) return defaults;
  return flattenCommandsFromTree(cfg.commandTree)
    .slice(0, 4)
    .map((node) => ({
      id: node.id,
      label: node.label,
      query: node.prompt || node.label,
    }));
}

export default function Home() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [pendingAgent, setPendingAgent] = useState<HardwareAgentItem | null>(null);
  const [presetCommands, setPresetCommands] = useState<PresetCommandChip[]>(() =>
    loadPresetCommandsFromConfig()
  );
  const [hotAgents, setHotAgents] = useState<HardwareAgentItem[]>(() =>
    getHotAgents(getActiveTenant().name)
  );
  const [totalPublishedCount, setTotalPublishedCount] = useState<number>(
    () => INITIAL_SYSTEM_AGENTS.length + getTenantPublishedCustomAgents(getActiveTenant().name).length
  );

  useEffect(() => {
    const syncPreset = () => setPresetCommands(loadPresetCommandsFromConfig());
    const syncAgents = () => {
      const tenantName = getActiveTenant().name;
      setHotAgents(getHotAgents(tenantName));
      setTotalPublishedCount(
        INITIAL_SYSTEM_AGENTS.length + getTenantPublishedCustomAgents(tenantName).length
      );
    };

    window.addEventListener(DEFAULT_KB_UPDATED_EVENT, syncPreset);
    window.addEventListener(AGENT_OPEN_COUNT_UPDATED_EVENT, syncAgents);
    window.addEventListener(AGENT_DESIGN_UPDATED_EVENT, syncAgents);
    window.addEventListener(TENANT_UPDATED_EVENT, syncAgents);
    window.addEventListener('storage', syncPreset);
    window.addEventListener('storage', syncAgents);
    return () => {
      window.removeEventListener(DEFAULT_KB_UPDATED_EVENT, syncPreset);
      window.removeEventListener(AGENT_OPEN_COUNT_UPDATED_EVENT, syncAgents);
      window.removeEventListener(AGENT_DESIGN_UPDATED_EVENT, syncAgents);
      window.removeEventListener(TENANT_UPDATED_EVENT, syncAgents);
      window.removeEventListener('storage', syncPreset);
      window.removeEventListener('storage', syncAgents);
    };
  }, []);

  const handleSelectPreset = (cmd: PresetCommandChip) => {
    setInputValue(cmd.query);
    triggerAIAssistant(cmd.query, undefined, undefined, { centered: true });
  };

  const handleOpenAgent = (agent: HardwareAgentItem) => {
    recordAgentOpen(agent.id);
    setPendingAgent(agent);
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const query = inputValue.trim();
    setInputValue('');
    triggerAIAssistant(query, undefined, undefined, { centered: true });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between relative bg-gradient-to-b from-white via-slate-50/50 to-slate-100/60 p-4 sm:p-6 lg:p-8">
      {/* Subtle Background Glows */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-purple-200/25 via-indigo-200/20 to-sky-200/20 blur-3xl pointer-events-none -z-10" />

      {/* Main Content Area (Centered & Elegant) */}
      <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col justify-center items-center text-center py-4">
        {/* Minimalist Catchphrase */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 flex flex-col items-center"
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-900">
            智引硬件实训 · 唤醒万物互联
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium">
            面向新工科的 AI 硬件大模型与设备协同平台
          </p>
        </motion.div>

        {/* Large AI Chat / Search Input Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full relative"
        >
          <form
            onSubmit={handleFormSubmit}
            className="w-full bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-xl shadow-purple-500/5 hover:border-purple-300 focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-500/10 transition-all p-2 sm:p-3"
          >
            <div className="flex items-center gap-3 px-2 sm:px-3">
              <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="询问硬件排错方案、配置参数或直接唤醒设备智能体..."
                className="w-full py-2.5 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => setInputValue('')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="h-10 px-4 sm:px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium text-xs sm:text-sm hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-md shadow-purple-500/20 shrink-0 whitespace-nowrap"
              >
                <span>发 送</span>
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Preset Commands from Platform System Config */}
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            {presetCommands.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className="text-xs px-3 py-1.5 rounded-full bg-white text-slate-600 border border-slate-200 hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50/50 shadow-2xs transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* 4 Popular Hardware Agents (Sorted by open count descending) */}
      <div className="max-w-5xl w-full mx-auto shrink-0 mb-3">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">热门设备智能体</h3>
          </div>
          <Link
            to="/agents"
            className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1"
          >
            <span>全部设备 ({totalPublishedCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {hotAgents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => handleOpenAgent(agent)}
              className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs hover:shadow-md hover:border-purple-300 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                {/* Device Image Showcase */}
                <div className="aspect-[16/9] w-full rounded-xl bg-gradient-to-b from-[#eef4fd] to-[#dfeafc] p-2.5 flex items-center justify-center relative overflow-hidden mb-2.5">
                  <span
                    className={cn(
                      'absolute top-2 left-2 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded border backdrop-blur-xs',
                      industryBadgeStyles[agent.industry] ||
                        'bg-slate-50 text-slate-700 border-slate-200'
                    )}
                  >
                    {agent.industry}
                  </span>
                  <span className="absolute top-2 right-2 z-10 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/85 text-slate-600 border border-slate-200/70 backdrop-blur-xs">
                    {formatOpenCount(getAgentOpenCount(agent))} 次打开
                  </span>
                  <img
                    src={agent.deviceImage}
                    alt={agent.name}
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain drop-shadow-xs group-hover:scale-105 transition-transform duration-200"
                  />
                </div>

                <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors line-clamp-1">
                  {agent.name}
                </div>
                <div className="text-[11px] text-slate-400 line-clamp-1 mb-0.5">
                  {agent.shortTitle || agent.model}
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1">{agent.desc}</p>
              </div>

              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-mono truncate">
                  {agent.port}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAgent(agent);
                  }}
                  className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-purple-600 text-white text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>立即体验</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 设备连接前置弹窗 */}
      <DeviceConnectPreModal
        open={Boolean(pendingAgent)}
        agentName={pendingAgent?.name}
        fields={getResolvedConnectionFields(pendingAgent)}
        onSkipConnect={() => {
          if (!pendingAgent) return;
          const targetId = pendingAgent.id;
          setPendingAgent(null);
          navigate(`/agents/${targetId}`, { state: { connectMode: 'skip' } });
        }}
        onStartWithConnect={(_, summary) => {
          if (!pendingAgent) return;
          const targetId = pendingAgent.id;
          setPendingAgent(null);
          navigate(`/agents/${targetId}`, {
            state: { connectMode: 'connect', connectSummary: summary },
          });
        }}
        onCancel={() => setPendingAgent(null)}
      />
    </div>
  );
}
