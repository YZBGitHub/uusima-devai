import React, { useState, type FormEvent } from 'react';
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
import { getHotAgents, type HardwareAgentItem } from '../data/agents';
import DeviceConnectPreModal from '../components/DeviceConnectPreModal';

const industryBadgeStyles: Record<string, string> = {
  物联网: 'bg-blue-50 text-blue-700 border-blue-200',
  工业互联网: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  人工智能: 'bg-purple-50 text-purple-700 border-purple-200',
  智慧农业: 'bg-amber-50 text-amber-700 border-amber-200',
};

// Presets for Quick AI Input
const quickPrompts = [
  {
    label: 'USR-410s 串口丢包自愈',
    query: 'USR-TCP232-410s 串口服务器波特率不匹配导致丢包，如何排查？',
    steps: [
      'MCP 连接通道 192.168.1.101:8234 (正常)',
      '检测发现当前通信波特率 9600 与控制器 115200 不一致',
      '建议方案: 切换为 115200bps，无校验位，数据位 8',
    ],
    mcpAction: '一键同步推荐参数到终端',
  },
  {
    label: 'ECU-1251 Modbus 协议解析',
    query: 'ECU-1251 读取温湿度从站提示 Modbus CRC 校验错误。',
    steps: [
      'RS485 物理总线阻抗分析: 反射波形畸变率 31%',
      '诊断归因: 未开启终端匹配电阻',
      '建议方案: 闭合网关侧板 S1 开关(120Ω 负载)并刷新采集',
    ],
    mcpAction: '下发虚拟负载自检指令',
  },
  {
    label: '视觉分拣台机械臂零位校准',
    query: '视觉分拣台机械臂每次上电抓取偏离 5mm，如何校准？',
    steps: [
      '读取视觉九点标定坐标矩阵与轴2编码器零点',
      '检测到轴2零位脉冲偏移 +124 counts',
      '建议方案: 运行一键回零宏指令并同步视觉标定补偿',
    ],
    mcpAction: '执行智能九点自标定',
  },
  {
    label: '大棚传感器数据断流修复',
    query: '智慧大棚 3 号节点土壤湿度传感器数据中断超过 20 分钟。',
    steps: [
      'ZigBee 拓扑探测: 节点 0x3F1A 供电跌至 2.4V',
      '已激活光伏冗余供电回路并重新握手',
      '建议方案: 维持当前低功耗上报策略，数据链路已恢复',
    ],
    mcpAction: '下发拓扑自愈指令',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [pendingAgent, setPendingAgent] = useState<HardwareAgentItem | null>(null);
  const hotAgents = getHotAgents();

  const handleSelectPrompt = (prompt: typeof quickPrompts[0]) => {
    setInputValue(prompt.query);
    triggerAIAssistant(prompt.query, prompt.steps, prompt.mcpAction, { centered: true });
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

          {/* Quick Prompts */}
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPrompt(p)}
                className="text-xs px-3 py-1.5 rounded-full bg-white text-slate-600 border border-slate-200 hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50/50 shadow-2xs transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* 4 Popular Hardware Agents */}
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
            <span>全部设备 (48+)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {hotAgents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => setPendingAgent(agent)}
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
                    setPendingAgent(agent);
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
