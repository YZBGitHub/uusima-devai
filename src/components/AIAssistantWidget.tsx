import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  Sparkles,
  X,
  Send,
  RefreshCw,
  Minimize2,
  Maximize2,
  Trash2,
  Cpu,
  Check,
  Plus,
  Wrench,
  CheckCircle2,
  ArrowRight,
  Database,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import {
  type McpProtocol,
  type McpToolItem,
  buildProtocolAiTools,
  generateMcpToolsFromPrompt,
} from '../lib/mcpTemplates';
import {
  type DefaultAiConfig,
  DEFAULT_KB_UPDATED_EVENT,
  loadDefaultKbConfig,
  retrieveDefaultKbMatches,
  collectDefaultCommandsFromTree,
  flattenCommandsFromTree,
} from '../lib/defaultKnowledgeBase';

export interface GeneratedAgentDraft {
  name: string;
  hardwareModel: string;
  desc: string;
  protocol: McpProtocol;
  tools: McpToolItem[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  steps?: string[];
  mcpAction?: string;
  generatedTools?: {
    protocol: McpProtocol;
    tools: McpToolItem[];
    appliedMode?: 'replace' | 'append' | null;
  };
  generatedAgent?: GeneratedAgentDraft & { created?: boolean };
  kbCitations?: Array<{ kbName: string; docName: string; fileType: string }>;
  timestamp: string;
}

type AssistantMode = 'general' | 'mcp_config' | 'agent_create';

interface McpAssistContext {
  agentName: string;
  hardwareModel: string;
  protocol: McpProtocol;
  existingToolsCount: number;
}

const PROTOCOL_QUICK_CHIPS: Record<McpProtocol, Array<{ label: string; q: string }>> = {
  MQTT: [
    { label: '温湿度上报订阅', q: '生成一个上报温度和湿度的 MQTT 订阅主题与 Payload' },
    { label: '远程控制下发', q: '生成一个远程控制继电器开关的 MQTT 发布指令' },
    { label: '告警事件上报', q: '生成一个设备异常告警上报的 MQTT 订阅接口' },
  ],
  TCP: [
    { label: 'HEX 采集报文', q: '生成 TCP HEX 十六进制数据采集请求报文' },
    { label: 'JSON 心跳探测', q: '生成 TCP JSON 格式设备心跳探测指令' },
    { label: '控制继电器帧', q: '生成 TCP HEX 继电器开关控制指令帧' },
  ],
  HTTP: [
    { label: 'GET 状态查询', q: '生成 HTTP GET 查询设备实时温湿度与在线状态接口' },
    { label: 'POST 控制下发', q: '生成 HTTP POST /api/v1/relay 控制继电器开关接口' },
    { label: '设备重启接口', q: '生成 HTTP POST 设备远程重启指令接口' },
  ],
  RS232: [
    { label: 'AT+INFO 版本查询', q: '生成 AT+INFO? 串口设备版本号查询指令' },
    { label: 'AT+RST 串口复位', q: '生成 AT+RST 串口软复位控制指令' },
    { label: '传感器状态读取', q: '生成 AT+SENSOR? 串口传感器读取指令' },
  ],
  RS485: [
    { label: '0x03 读温湿度寄存器', q: '生成 RS485 Modbus 0x03 读取 0x0020 温湿度寄存器指令' },
    { label: '0x05 控制继电器线圈', q: '生成 RS485 0x05 写单个线圈 0x0001 控制继电器' },
    { label: '0x06 修改站号参数', q: '生成 RS485 0x06 写寄存器修改站号配置指令' },
  ],
};

const AGENT_CREATE_CHIPS = [
  {
    label: 'STM32 温湿度 MQTT 智能体',
    q: '创建一个基于 MQTT 协议的 STM32F407 温湿度监控智能体，支持上报订阅与告警',
  },
  {
    label: '智能电表 RS485 智能体',
    q: '创建一个适配 DTSU666-M 三相电表的 RS485 Modbus 抄表与故障排查智能体',
  },
  {
    label: '智慧灯控 HTTP 智能体',
    q: '创建一个通过 HTTP 接口控制的智慧实验室灯光与电源管理智能体',
  },
  {
    label: '工业机械臂 TCP 智能体',
    q: '创建一个采用 TCP Socket 通信的 ELITE-EC66 机械臂状态监测与控制智能体',
  },
];

function parseAgentCreationFromPrompt(prompt: string): GeneratedAgentDraft {
  const text = prompt.trim();
  let protocol: McpProtocol = 'MQTT';
  if (/http|rest|webhook|api/i.test(text)) protocol = 'HTTP';
  else if (/tcp|socket/i.test(text)) protocol = 'TCP';
  else if (/rs232|232|at\+/i.test(text)) protocol = 'RS232';
  else if (/rs485|485|modbus|电表|寄存器/i.test(text)) protocol = 'RS485';
  else if (/mqtt|订阅|上报|物联网/i.test(text)) protocol = 'MQTT';

  const modelMatch = text.match(/\b([A-Z]{2,}[A-Z0-9_-]{2,})\b/);
  const hardwareModel =
    modelMatch?.[1] ||
    (protocol === 'RS485'
      ? 'DTSU666-M'
      : protocol === 'HTTP'
        ? 'NL-HTTP-CTRL-V2'
        : protocol === 'TCP'
          ? 'ELITE-EC66'
          : protocol === 'RS232'
            ? 'NL-UART-232'
            : 'STM32F407-IOT');

  const isTemp = /温湿度|环境|大棚|温度|气象/.test(text);
  const isMeter = /电表|能耗|电力|电压/.test(text);
  const isArm = /机械臂|分拣|伺服/.test(text);
  const isLight = /灯|电源|门禁|照明/.test(text);

  let name = '自定义硬件实训智能体';
  if (isTemp) name = `${hardwareModel} 温湿度监测与排错智能体`;
  else if (isMeter) name = `${hardwareModel} 智能电表采集诊断智能体`;
  else if (isArm) name = `${hardwareModel} 机械臂运动控制智能体`;
  else if (isLight) name = `${hardwareModel} 智慧电源控制智能体`;
  else if (text.length > 4 && text.length <= 28) {
    name = text.replace(/^(请|帮我)?创建(一个)?/, '').replace(/智能体$/, '') + '智能体';
  } else {
    name = `${hardwareModel} ${protocol} 智能体`;
  }

  const desc = `基于 ${protocol} 协议接入 ${hardwareModel} 设备，支持实时数据交互、MCP 工具调用与实验教学故障排查。`;
  const tools = buildProtocolAiTools(protocol, hardwareModel);

  return {
    name,
    hardwareModel,
    desc,
    protocol,
    tools,
  };
}

export function triggerAIAssistant(
  query: string,
  steps?: string[],
  action?: string,
  options?: { centered?: boolean }
) {
  window.dispatchEvent(
    new CustomEvent('open-ai-assistant', {
      detail: { query, steps, action, centered: options?.centered ?? true },
    })
  );
}

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCentered, setIsCentered] = useState(false);
  const [dockSide, setDockSide] = useState<'left' | 'right'>('right');
  const [mode, setMode] = useState<AssistantMode>('general');
  const [mcpContext, setMcpContext] = useState<McpAssistContext | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [defaultAiConfig, setDefaultAiConfig] = useState<DefaultAiConfig>(() =>
    loadDefaultKbConfig()
  );
  const defaultAiConfigRef = useRef<DefaultAiConfig>(defaultAiConfig);
  defaultAiConfigRef.current = defaultAiConfig;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const initCfg = loadDefaultKbConfig();
    return [
      {
        id: 'welcome',
        sender: 'assistant',
        content: initCfg.welcomeMessage,
        timestamp: '刚刚',
      },
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const syncDefaultConfig = (nextCfg?: DefaultAiConfig) => {
      const latest = nextCfg || loadDefaultKbConfig();
      setDefaultAiConfig(latest);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === 'welcome' ? { ...m, content: latest.welcomeMessage } : m
        )
      );
    };

    const onCustomUpdate = (e: Event) => {
      const detail = (e as CustomEvent<DefaultAiConfig>).detail;
      syncDefaultConfig(detail);
    };
    const onStorageUpdate = () => {
      syncDefaultConfig();
    };

    window.addEventListener(DEFAULT_KB_UPDATED_EVENT, onCustomUpdate);
    window.addEventListener('storage', onStorageUpdate);
    return () => {
      window.removeEventListener(DEFAULT_KB_UPDATED_EVENT, onCustomUpdate);
      window.removeEventListener('storage', onStorageUpdate);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping, isCentered, dockSide]);

  useEffect(() => {
    if (!actionToast) return;
    const timer = setTimeout(() => setActionToast(null), 2600);
    return () => clearTimeout(timer);
  }, [actionToast]);

  const buildGeneralAssistantReply = (
    query: string,
    overrideSteps?: string[]
  ): Omit<ChatMessage, 'id' | 'sender' | 'timestamp'> => {
    const cfg = defaultAiConfigRef.current;
    const allCmds = flattenCommandsFromTree(cfg.commandTree);
    const qLower = query.trim().toLowerCase();
    const matchedCmd = allCmds.find(
      (c) =>
        (c.prompt && c.prompt.trim().toLowerCase() === qLower) ||
        c.label.trim().toLowerCase() === qLower ||
        (c.prompt && qLower.includes(c.label.trim().toLowerCase()))
    );

    const kbMatches = retrieveDefaultKbMatches(query, cfg.docs, 3);
    const completedTotal = cfg.docs.filter((d) => d.status === 'completed').length;

    const citations = kbMatches.map((m) => ({
      kbName: cfg.kbName,
      docName: m.doc.name,
      fileType: m.doc.fileType,
    }));

    if (overrideSteps && overrideSteps.length > 0) {
      return {
        content:
          kbMatches.length > 0
            ? `针对您咨询的问题【${query}】，已自动检索默认知识库（${cfg.kbName}）中的 ${kbMatches.length} 篇文档并整理排查方案：`
            : `针对您咨询的问题【${query}】，已结合预设知识指引整理排查步骤（如需连接实体硬件，请前往设备智能体大厅）：`,
        steps:
          kbMatches.length > 0
            ? [...overrideSteps, `知识库参考要点（${kbMatches[0].doc.name}）：${kbMatches[0].snippet}`]
            : overrideSteps,
        kbCitations: citations.length > 0 ? citations : undefined,
      };
    }

    if (matchedCmd || kbMatches.length > 0) {
      const steps: string[] = [];
      if (matchedCmd?.expectedReply) {
        steps.push(`预设指令参考方案（${matchedCmd.label}）：${matchedCmd.expectedReply}`);
      }
      kbMatches.forEach((m) => {
        steps.push(`【${m.doc.name}】${m.snippet}`);
      });
      if (steps.length === 1) {
        steps.push('核对终端供电状态与物理接线，确认波特率/协议参数匹配；如需实机调试，请前往设备智能体大厅连接设备。');
      }

      const leadContent =
        kbMatches.length > 0
          ? `已自动检索「${cfg.kbName}」（共 ${completedTotal} 篇已向量化文档），为您命中 ${kbMatches.length} 篇相关知识文件${
              matchedCmd ? `及预设指令【${matchedCmd.label}】` : ''
            }：`
          : `已匹配平台系统配置的预设指令【${matchedCmd?.label}】，知识指引如下：`;

      return {
        content: leadContent,
        steps,
        kbCitations: citations.length > 0 ? citations : undefined,
      };
    }

    return {
      content: `已自动检索「${cfg.kbName}」（${completedTotal} 篇已向量化文档），暂未命中完全匹配的专项条目，为您提供通用排查思路：`,
      steps: [
        '核对硬件设备供电电压、总线接线极性及通信波特率参数是否与实训手册一致',
        '检查默认知识库中是否已录入对应设备型号的技术手册与排错说明',
        '通用助手不支持直接对接实体硬件，如需连接设备或下发控制指令，请前往「设备智能体大厅」开启对应设备智能体',
      ],
    };
  };

  // Listen to general open-ai-assistant event
  useEffect(() => {
    const handleOpenAssistant = (e: Event) => {
      const { query, steps, centered } = (e as CustomEvent).detail || {};
      setMode('general');
      setMcpContext(null);
      setDockSide('right');
      setIsOpen(true);
      setIsCentered(centered !== undefined ? centered : true);

      if (query) {
        const userMsg: ChatMessage = {
          id: String(Date.now()),
          sender: 'user',
          content: query,
          timestamp: '刚刚',
        };

        setMessages((prev) => [...prev, userMsg]);
        setIsTyping(true);

        setTimeout(() => {
          const replyPayload = buildGeneralAssistantReply(query, steps);
          const aiMsg: ChatMessage = {
            id: String(Date.now() + 1),
            sender: 'assistant',
            ...replyPayload,
            timestamp: '刚刚',
          };
          setMessages((prev) => [...prev, aiMsg]);
          setIsTyping(false);
        }, 450);
      }
    };

    // Listen to MCP config assistant from bottom-left
    const handleOpenMcpAssistant = (e: Event) => {
      const detail = (e as CustomEvent<McpAssistContext>).detail;
      if (!detail) return;
      setMode('mcp_config');
      setMcpContext(detail);
      setDockSide('left');
      setIsCentered(false);
      setIsOpen(true);

      const introMsg: ChatMessage = {
        id: `mcp-welcome-${Date.now()}`,
        sender: 'assistant',
        content: `已接入「${detail.agentName}（${detail.hardwareModel}）」的 MCP 工具配置面板，正在为您生成 ${detail.protocol} 协议的接口与指令配置...`,
        timestamp: '刚刚',
      };
      setMessages([introMsg]);
      setIsTyping(true);

      setTimeout(() => {
        const tools = buildProtocolAiTools(detail.protocol, detail.hardwareModel);
        const resultMsg: ChatMessage = {
          id: `mcp-gen-${Date.now()}`,
          sender: 'assistant',
          content: `已结合 ${detail.hardwareModel} 生成 ${tools.length} 个 ${detail.protocol} 协议配置（包含对应的${
            detail.protocol === 'MQTT'
              ? '上报/订阅 Topic 与 Payload'
              : detail.protocol === 'HTTP'
                ? '请求地址、Headers 与请求数据'
                : detail.protocol === 'TCP'
                  ? 'Socket 端点与报文指令'
                  : detail.protocol === 'RS485'
                    ? '从站地址、功能码与 HEX 指令帧'
                    : 'AT 串口指令与应答规则'
          }）。您可直接应用，或继续输入需求进行定制：`,
          generatedTools: {
            protocol: detail.protocol,
            tools,
            appliedMode: null,
          },
          timestamp: '刚刚',
        };
        setMessages((prev) => [...prev, resultMsg]);
        setIsTyping(false);
      }, 450);
    };

    const handleCloseMcpAssistant = () => {
      setMode((prevMode) => {
        if (prevMode === 'mcp_config') {
          setIsOpen(false);
          setDockSide('right');
          return 'general';
        }
        return prevMode;
      });
    };

    // Listen to AI create custom agent assistant
    const handleOpenAgentCreateAssistant = () => {
      setMode('agent_create');
      setMcpContext(null);
      setDockSide('right');
      setIsCentered(true);
      setIsOpen(true);
      setMessages([
        {
          id: `create-welcome-${Date.now()}`,
          sender: 'assistant',
          content:
            '您好！我是 AI 智能体创建助手。请告诉我您想接入的硬件设备型号、通信协议（MQTT / TCP / HTTP / RS232 / RS485）或教学排查场景，我将为您自动生成智能体基础信息与对应的 MCP 工具配置，也可点击下方快捷模板快速创建：',
          timestamp: '刚刚',
        },
      ]);
    };

    window.addEventListener('open-ai-assistant', handleOpenAssistant);
    window.addEventListener('open-mcp-ai-assistant', handleOpenMcpAssistant);
    window.addEventListener('close-mcp-ai-assistant', handleCloseMcpAssistant);
    window.addEventListener('open-agent-create-assistant', handleOpenAgentCreateAssistant);
    return () => {
      window.removeEventListener('open-ai-assistant', handleOpenAssistant);
      window.removeEventListener('open-mcp-ai-assistant', handleOpenMcpAssistant);
      window.removeEventListener('close-mcp-ai-assistant', handleCloseMcpAssistant);
      window.removeEventListener('open-agent-create-assistant', handleOpenAgentCreateAssistant);
    };
  }, []);

  const submitQuery = (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      content: query,
      timestamp: '刚刚',
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      if (mode === 'mcp_config' && mcpContext) {
        const { summary, tools } = generateMcpToolsFromPrompt(
          mcpContext.protocol,
          mcpContext.hardwareModel,
          query
        );
        const aiMsg: ChatMessage = {
          id: String(Date.now() + 1),
          sender: 'assistant',
          content: summary,
          generatedTools: {
            protocol: mcpContext.protocol,
            tools,
            appliedMode: null,
          },
          timestamp: '刚刚',
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsTyping(false);
        return;
      }

      if (mode === 'agent_create') {
        const draft = parseAgentCreationFromPrompt(query);
        const aiMsg: ChatMessage = {
          id: String(Date.now() + 1),
          sender: 'assistant',
          content: '已为您生成完整的自定义硬件智能体配置方案，确认后即可自动创建：',
          generatedAgent: { ...draft, created: false },
          timestamp: '刚刚',
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsTyping(false);
        return;
      }

      const replyPayload = buildGeneralAssistantReply(query);
      const aiMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        ...replyPayload,
        timestamp: '刚刚',
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 450);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const q = inputValue.trim();
    setInputValue('');
    submitQuery(q);
  };

  const handleApplyGeneratedTools = (
    messageId: string,
    protocol: McpProtocol,
    tools: McpToolItem[],
    applyMode: 'replace' | 'append'
  ) => {
    window.dispatchEvent(
      new CustomEvent('apply-mcp-ai-tools', {
        detail: { protocol, tools, mode: applyMode },
      })
    );
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.generatedTools
          ? { ...m, generatedTools: { ...m.generatedTools, appliedMode: applyMode } }
          : m
      )
    );
    setActionToast(
      applyMode === 'replace'
        ? `已将 ${tools.length} 个 ${protocol} 工具应用到配置列表`
        : `已追加 ${tools.length} 个 ${protocol} 工具到配置列表`
    );
  };

  const handleConfirmCreateAgent = (
    messageId: string,
    draft: GeneratedAgentDraft,
    openDesign: boolean
  ) => {
    window.dispatchEvent(
      new CustomEvent('ai-create-agent-confirm', {
        detail: { ...draft, openDesign },
      })
    );
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.generatedAgent
          ? { ...m, generatedAgent: { ...m.generatedAgent, created: true } }
          : m
      )
    );
    setIsOpen(false);
    setMode('general');
  };

  const clearHistory = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        content:
          mode === 'mcp_config' && mcpContext
            ? `对话已重置。请描述您希望为「${mcpContext.hardwareModel}」生成的 ${mcpContext.protocol} 工具接口或指令配置。`
            : mode === 'agent_create'
              ? '对话已重置。请描述您想要创建的硬件智能体设备型号、通信协议和场景。'
              : defaultAiConfig.welcomeMessage ||
                '对话记录已清空。您可以随时提出新的硬件排错或参数配置问题！',
        timestamp: '刚刚',
      },
    ]);
  };

  const configuredDefaultQuickChips = collectDefaultCommandsFromTree(
    defaultAiConfig.commandTree
  ).map(({ node }) => ({
    label: node.label,
    q: node.prompt || node.label,
  }));

  const quickChips =
    mode === 'mcp_config' && mcpContext
      ? PROTOCOL_QUICK_CHIPS[mcpContext.protocol]
      : mode === 'agent_create'
        ? AGENT_CREATE_CHIPS
        : configuredDefaultQuickChips;

  const completedKbDocsCount = defaultAiConfig.docs.filter(
    (d) => d.status === 'completed'
  ).length;

  const headerTitle =
    mode === 'mcp_config'
      ? 'AI MCP 工具配置助手'
      : mode === 'agent_create'
        ? 'AI 智能体创建助手'
        : defaultAiConfig.assistantName || 'AI 硬件智能助手';

  const headerSubtitle =
    mode === 'mcp_config' && mcpContext
      ? `${mcpContext.agentName} · ${mcpContext.protocol} 协议辅助配置`
      : mode === 'agent_create'
        ? '通过对话快速生成自定义硬件智能体与协议工具'
        : `已读取「${defaultAiConfig.kbName}」（${completedKbDocsCount} 篇文档 · ${configuredDefaultQuickChips.length} 条默认指令）`;

  const renderChatContent = () => (
    <>
      {/* Window Header */}
      <div
        className={cn(
          'px-5 py-3.5 flex items-center justify-between shrink-0 border-b',
          mode === 'mcp_config' || mode === 'agent_create'
            ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white border-indigo-500/30'
            : 'bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white border-slate-800'
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white ring-1 ring-white/20 shrink-0">
            {mode === 'mcp_config' ? (
              <Wrench className="w-4 h-4" />
            ) : mode === 'agent_create' ? (
              <Sparkles className="w-4 h-4" />
            ) : (
              <Bot className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-tight text-white truncate">
                {headerTitle}
              </h3>
              {mode === 'mcp_config' && mcpContext && (
                <span className="text-[10px] px-2 py-0.5 bg-white/20 text-white font-mono font-semibold rounded">
                  {mcpContext.protocol}
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/80 truncate">{headerSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-white/80 shrink-0">
          {mode !== 'mcp_config' && (
            <button
              onClick={() => setIsCentered(!isCentered)}
              className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xs flex items-center gap-1"
              title={isCentered ? '靠右小窗悬浮' : '居中放大显示'}
            >
              {isCentered ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span className="hidden md:inline text-[11px]">小窗</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden md:inline text-[11px]">放大</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={clearHistory}
            className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="清空对话记录"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              if (mode !== 'general') setMode('general');
              setDockSide('right');
            }}
            className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Chips Bar */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[11px] text-slate-500 shrink-0 font-medium flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>{mode === 'mcp_config' ? '快捷生成:' : mode === 'agent_create' ? '快捷模板:' : '快捷排查:'}</span>
        </span>
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => submitQuery(chip.q)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-white text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 shrink-0 transition-colors whitespace-nowrap font-medium"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Inline Action Toast */}
      {actionToast && (
        <div className="px-4 py-1.5 bg-emerald-50 border-b border-emerald-200 text-emerald-700 text-[11px] font-medium flex items-center gap-1.5 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex flex-col gap-1.5 max-w-[94%]',
              msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
            )}
          >
            {msg.sender === 'user' ? (
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl rounded-tr-xs px-3.5 py-2 text-xs leading-relaxed shadow-xs">
                {msg.content}
              </div>
            ) : (
              <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-3.5 text-xs shadow-xs text-slate-800 space-y-2.5 w-full">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 text-indigo-700 font-bold">
                    <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      {msg.generatedTools
                        ? `${msg.generatedTools.protocol} 协议配置方案`
                        : msg.generatedAgent
                          ? '自定义智能体创建方案'
                          : '硬件智能体助手'}
                    </span>
                  </div>
                </div>

                <p className="leading-relaxed text-slate-700">{msg.content}</p>

                {/* Generated MCP Tools Card */}
                {msg.generatedTools && (
                  <div className="space-y-2">
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                      {msg.generatedTools.tools.map((tool) => (
                        <div
                          key={tool.id}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-800 truncate">{tool.name}</span>
                            {tool.mqttDirection && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium shrink-0">
                                {tool.mqttDirection === 'publish' ? '发布' : '订阅上报'}
                              </span>
                            )}
                            {tool.httpMethod && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-mono font-bold shrink-0">
                                {tool.httpMethod}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-indigo-700 break-all">
                            {tool.addressOrCode}
                          </div>
                          {(tool.payloadTemplate || tool.commandPayload) && (
                            <pre className="text-[10px] font-mono text-slate-600 bg-white border border-slate-200/70 rounded-lg p-1.5 whitespace-pre-wrap break-all max-h-20 overflow-y-auto">
                              {tool.payloadTemplate || tool.commandPayload}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleApplyGeneratedTools(
                            msg.id,
                            msg.generatedTools!.protocol,
                            msg.generatedTools!.tools,
                            'replace'
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] flex items-center gap-1 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {msg.generatedTools.appliedMode === 'replace'
                            ? '已应用并替换'
                            : '应用并替换当前列表'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleApplyGeneratedTools(
                            msg.id,
                            msg.generatedTools!.protocol,
                            msg.generatedTools!.tools,
                            'append'
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          {msg.generatedTools.appliedMode === 'append'
                            ? '已追加'
                            : '追加到列表'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Generated Custom Agent Creation Card */}
                {msg.generatedAgent && (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {msg.generatedAgent.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-mono font-bold shrink-0">
                          {msg.generatedAgent.protocol}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        适配硬件型号：<span className="font-mono font-semibold text-slate-800">{msg.generatedAgent.hardwareModel}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {msg.generatedAgent.desc}
                      </p>
                      <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/70">
                        已自动配齐 <b className="text-indigo-700">{msg.generatedAgent.tools.length}</b> 个 {msg.generatedAgent.protocol} 协议 MCP 工具与默认连接/诊断指令库
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleConfirmCreateAgent(msg.id, msg.generatedAgent!, true)}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <span>确认创建并进入设计</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmCreateAgent(msg.id, msg.generatedAgent!, false)}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>直接创建到列表</span>
                      </button>
                    </div>
                  </div>
                )}

                {msg.steps && msg.steps.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-100">
                    {msg.steps.map((st, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-xs text-slate-600 leading-relaxed">{st}</span>
                      </div>
                    ))}
                  </div>
                )}

                {msg.kbCitations && msg.kbCitations.length > 0 && (
                  <div className="pt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700">
                      <Database className="w-3 h-3" />
                      <span>引用默认知识库：</span>
                    </span>
                    {msg.kbCitations.map((cite, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[10px] font-medium max-w-full"
                        title={`${cite.kbName} / ${cite.docName}`}
                      >
                        <FileText className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate max-w-[200px]">{cite.docName}</span>
                      </span>
                    ))}
                  </div>
                )}

                {(msg.steps?.length || msg.kbCitations?.length) && mode === 'general' && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-400">
                      通用助手基于平台默认知识库检索回答，不支持直接连接硬件
                    </span>
                    <Link
                      to="/agents"
                      onClick={() => setIsOpen(false)}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                    >
                      前往设备智能体大厅连接设备 →
                    </Link>
                  </div>
                )}
              </div>
            )}
            <span className="text-[10px] text-slate-400 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200/80 text-xs text-slate-500 w-fit shadow-xs">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            <span>
              {mode === 'mcp_config'
                ? '正在生成协议接口与报文 Payload 配置...'
                : mode === 'agent_create'
                  ? '正在解析设备型号并生成智能体方案...'
                  : '正在检索平台默认知识库并生成回答...'}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-white border-t border-slate-200/80 shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              mode === 'mcp_config'
                ? `描述需要生成的 ${mcpContext?.protocol || ''} 接口、Topic 或指令...`
                : mode === 'agent_create'
                  ? '输入硬件型号、协议类型与功能场景（如：MQTT 温湿度监控）...'
                  : '输入硬件问题、寄存器、波特率或排错指令...'
            }
            className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-xs shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>发送</span>
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Floating Trigger Button (Bottom-Right when not in left MCP assist mode) */}
      {!(isOpen && dockSide === 'left') && (
        <div className="fixed bottom-6 right-6 z-40">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (!isOpen) {
                setMode('general');
                setDockSide('right');
                setIsCentered(false);
                setIsOpen(true);
              } else {
                setIsOpen(false);
              }
            }}
            className={cn(
              'relative flex items-center gap-2.5 px-4 py-3 rounded-full text-white shadow-xl transition-all duration-200 font-medium text-xs sm:text-sm',
              isOpen
                ? 'bg-slate-900 shadow-slate-900/30'
                : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 shadow-purple-600/30 hover:shadow-purple-600/40 ring-2 ring-white/80'
            )}
            title="AI 硬件智能助手"
          >
            <div className="relative flex items-center justify-center">
              {isOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Bot className="w-5 h-5 text-white" />
              )}
            </div>

            <span className="font-semibold tracking-wide">
              {isOpen ? '收起助手' : 'AI 智能助手'}
            </span>
          </motion.button>
        </div>
      )}

      {/* Floating AI Chat Window: Centered Modal, Bottom-Left Docked (MCP Assist), or Bottom-Right Docked */}
      <AnimatePresence>
        {isOpen &&
          (isCentered ? (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-3xl h-[680px] max-h-[88vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden"
              >
                {renderChatContent()}
              </motion.div>
            </div>
          ) : dockSide === 'left' ? (
            <motion.div
              initial={{ opacity: 0, y: 24, x: -16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, x: -16, scale: 0.94 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-5 left-5 z-[60] w-[92vw] sm:w-[440px] h-[560px] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-indigo-200 flex flex-col overflow-hidden"
            >
              {renderChatContent()}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.94 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-22 right-4 sm:right-6 z-[60] w-[92vw] sm:w-[460px] h-[600px] max-h-[calc(100vh-7rem)] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden"
            >
              {renderChatContent()}
            </motion.div>
          ))}
      </AnimatePresence>
    </>
  );
}
