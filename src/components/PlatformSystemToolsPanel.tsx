import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Search,
  Plus,
  Sparkles,
  Sliders,
  X,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../lib/utils';
import McpToolFormModal from './McpToolFormModal';
import {
  type McpProtocol,
  type McpToolType,
  type McpToolItem,
  MCP_PROTOCOL_OPTIONS,
  MCP_SCRIPT_TEMPLATES,
  formatMcpTimestamp,
} from '../lib/mcpTemplates';

export const INITIAL_PLATFORM_SYSTEM_TOOLS: McpToolItem[] = [
  {
    id: 'sys-mcp-1',
    name: 'read_holding_registers',
    protocol: 'modbus',
    category: 'modbus',
    version: 1,
    toolType: '系统内置',
    addedAt: '2026-03-25 09:15',
    enabled: true,
    timeout_seconds: 10,
    concurrency: 'parallel',
    risk: 'low',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        slave_id: { type: 'integer', description: 'Modbus 从站地址 (1~247)' },
        start_addr: { type: 'string', description: '起始寄存器十六进制地址，如 0x0001' },
        count: { type: 'integer', description: '连续读取寄存器数量' },
      },
      required: ['slave_id', 'start_addr'],
    },
    script_language: 'python',
    script_entrypoint: 'run',
    script: `def run(p):\n    # 读取 Modbus 从站保持寄存器\n    slave = p.get("slave_id", 1)\n    start = p.get("start_addr", "0x0001")\n    count = p.get("count", 8)\n    return {"slave": slave, "start": start, "count": count, "status": "ok"}`,
    slaveAddress: '0x01',
    modbusFunctionCode: '0x03 读保持寄存器',
    addressOrCode: '0x0001 ~ 0x0010',
    description: '读取工业设备核心状态寄存器、串口波特率及心跳计数，返回解析后的标准运行指标。',
    interfaces: [
      {
        id: 'sys-if-1',
        methodName: 'read_holding_registers',
        paramSpec: 'slave_id: integer, start_addr: string, count: integer',
      },
    ],
  },
  {
    id: 'sys-mcp-2',
    name: 'modbus_reset_channel',
    protocol: 'modbus',
    category: 'control',
    version: 1,
    toolType: '系统内置',
    addedAt: '2026-03-25 09:18',
    enabled: true,
    timeout_seconds: 15,
    concurrency: 'sequential',
    risk: 'medium',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        slave_id: { type: 'integer', description: '目标从站站号' },
        channel: { type: 'integer', description: '待复位继电器或串口通道编号' },
      },
      required: ['slave_id', 'channel'],
    },
    script_language: 'python',
    script_entrypoint: 'run',
    script: MCP_SCRIPT_TEMPLATES.python,
    slaveAddress: '0x01',
    modbusFunctionCode: '0x06 写单个寄存器',
    addressOrCode: '0x0020',
    description: '向设备写入标准通讯波特率并执行指定通道软复位，成功返回握手确认回执。',
    interfaces: [
      {
        id: 'sys-if-2',
        methodName: 'write_single_register',
        paramSpec: 'slave_id: integer, channel: integer',
      },
    ],
  },
  {
    id: 'sys-mcp-3',
    name: 'mqtt_telemetry_subscribe',
    protocol: 'mqtt',
    category: 'telemetry',
    version: 1,
    toolType: '系统内置',
    addedAt: '2026-03-26 14:20',
    enabled: true,
    timeout_seconds: 10,
    concurrency: 'parallel',
    risk: 'low',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        topic: { type: 'string', description: '设备遥测上行 MQTT Topic 路径' },
        qos: { type: 'integer', description: '订阅服务质量等级 0/1/2' },
      },
      required: ['topic'],
    },
    script_language: 'javascript',
    script_entrypoint: 'run',
    script: MCP_SCRIPT_TEMPLATES.javascript,
    mqttDirection: 'subscribe',
    mqttQos: '1',
    addressOrCode: 'iot/+/telemetry/up',
    description: '订阅全网设备上行遥测主题并自动解析温湿度、供电电压与在线状态等 JSON 传感器数据。',
    interfaces: [
      {
        id: 'sys-if-3',
        methodName: 'subscribe_telemetry',
        paramSpec: 'topic: string, qos: integer',
      },
    ],
  },
  {
    id: 'sys-mcp-4',
    name: 'mqtt_publish_message',
    protocol: 'mqtt',
    category: 'mqtt',
    version: 1,
    toolType: '系统内置',
    addedAt: '2026-03-26 14:25',
    enabled: true,
    timeout_seconds: 10,
    concurrency: 'sequential',
    risk: 'high',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        connection_id: { type: 'string', description: '当前已连接的设备会话标识' },
        payload: { type: ['string', 'object'], description: '待发布 JSON 或字符串控制载荷' },
      },
      required: ['connection_id', 'payload'],
    },
    script_language: 'python',
    script_entrypoint: 'run',
    script: MCP_SCRIPT_TEMPLATES.python,
    mqttDirection: 'publish',
    mqttQos: '1',
    addressOrCode: 'iot/+/cmd/down',
    description: '向设备下行控制主题发布开关控制或参数刷新指令，高风险操作需人工二次确认。',
    interfaces: [
      {
        id: 'sys-if-4',
        methodName: 'publish_control_cmd',
        paramSpec: 'connection_id: string, payload: string | object',
      },
    ],
  },
  {
    id: 'sys-mcp-5',
    name: 'http_get_device_status',
    protocol: 'http',
    category: 'http',
    version: 1,
    toolType: '系统内置',
    addedAt: '2026-03-27 11:05',
    enabled: true,
    timeout_seconds: 15,
    concurrency: 'parallel',
    risk: 'low',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        endpoint_url: { type: 'string', description: '设备 REST 状态查询接口地址' },
        include_sensors: { type: 'boolean', description: '是否附带实时传感器快照' },
      },
      required: ['endpoint_url'],
    },
    script_language: 'javascript',
    script_entrypoint: 'run',
    script: MCP_SCRIPT_TEMPLATES.javascript,
    httpMethod: 'GET',
    addressOrCode: 'http://gateway.local:8080/api/v1/device/status',
    description: '调用 HTTP GET 状态接口获取设备在线率、内存占用及实时传感器快照。',
    interfaces: [
      {
        id: 'sys-if-5',
        methodName: 'http_get_device_status',
        paramSpec: 'endpoint_url: string, include_sensors: boolean',
      },
    ],
  },
  {
    id: 'sys-mcp-6',
    name: 'tcp_realtime_frame_query',
    protocol: 'tcp',
    category: 'tcp',
    version: 2,
    toolType: '用户自定义',
    addedAt: '2026-03-28 10:12',
    enabled: true,
    timeout_seconds: 10,
    concurrency: 'parallel',
    risk: 'low',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        host: { type: 'string', description: '设备 TCP Socket IP 地址' },
        port: { type: 'integer', description: 'Socket 服务端口号' },
      },
      required: ['host', 'port'],
    },
    script_language: 'lua',
    script_entrypoint: 'run',
    script: MCP_SCRIPT_TEMPLATES.lua,
    tcpEncoding: 'HEX',
    addressOrCode: '192.168.1.101:8234',
    description: '自定义 Socket 长连接十六进制工况帧查询与 CRC 校验工具。',
    interfaces: [
      {
        id: 'sys-if-6',
        methodName: 'tcp_send_hex_frame',
        paramSpec: 'host: string, port: integer',
      },
    ],
  },
  {
    id: 'sys-mcp-7',
    name: 'websocket_stream_subscribe',
    protocol: 'websocket',
    category: 'telemetry',
    version: 1,
    toolType: '系统内置',
    addedAt: '2026-03-28 11:30',
    enabled: true,
    timeout_seconds: 20,
    concurrency: 'parallel',
    risk: 'low',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ws_url: { type: 'string', description: '网关 WebSocket 数据流地址' },
        channel: { type: 'string', description: '订阅频道标识（如 logs / metrics）' },
      },
      required: ['ws_url'],
    },
    script_language: 'javascript',
    script_entrypoint: 'run',
    script: MCP_SCRIPT_TEMPLATES.javascript,
    addressOrCode: 'ws://gateway.local:9001/stream',
    description: '订阅网关实时 WebSocket 日志流与高频采样数据，支持断线自动重连。',
    interfaces: [
      {
        id: 'sys-if-7',
        methodName: 'subscribe_ws_stream',
        paramSpec: 'ws_url: string, channel: string',
      },
    ],
  },
  {
    id: 'sys-mcp-8',
    name: 'device_ota_check_update',
    protocol: 'http',
    category: 'diagnostic',
    version: 1,
    toolType: '系统内置',
    addedAt: '2026-03-28 14:05',
    enabled: true,
    timeout_seconds: 30,
    concurrency: 'sequential',
    risk: 'medium',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        device_sn: { type: 'string', description: '终端设备序列号' },
        current_version: { type: 'string', description: '当前运行固件版本号' },
      },
      required: ['device_sn', 'current_version'],
    },
    script_language: 'go',
    script_entrypoint: 'Run',
    script: MCP_SCRIPT_TEMPLATES.go,
    httpMethod: 'POST',
    addressOrCode: 'https://ota.platform.local/api/v1/firmware/check',
    description: '比对终端当前固件版本与平台最新稳定版 SHA256 指纹，生成安全的 OTA 升级策略建议。',
    interfaces: [
      {
        id: 'sys-if-8',
        methodName: 'Run',
        paramSpec: 'device_sn: string, current_version: string',
      },
    ],
  },
  {
    id: 'sys-mcp-9',
    name: 'rs232_at_info_query',
    protocol: 'custom',
    category: 'diagnostic',
    version: 1,
    toolType: '用户自定义',
    addedAt: '2026-03-28 15:40',
    enabled: false,
    timeout_seconds: 8,
    concurrency: 'sequential',
    risk: 'low',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        serial_port: { type: 'string', description: '本地或虚拟串口号，如 COM3' },
      },
      required: ['serial_port'],
    },
    script_language: 'bash',
    script_entrypoint: '',
    script: MCP_SCRIPT_TEMPLATES.bash,
    addressOrCode: 'AT+INFO?',
    description: '调试期间停用：通过串口发送 AT+INFO? 指令校验下位机固件版本号与序列号。',
    interfaces: [
      {
        id: 'sys-if-9',
        methodName: 'send_at_query',
        paramSpec: 'serial_port: string',
      },
    ],
  },
  {
    id: 'sys-mcp-10',
    name: 'canbus_frame_diagnostics',
    protocol: 'custom',
    category: 'diagnostic',
    version: 1,
    toolType: '系统内置',
    addedAt: '2026-03-29 09:50',
    enabled: true,
    timeout_seconds: 12,
    concurrency: 'parallel',
    risk: 'medium',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        can_interface: { type: 'string', description: 'CAN 总线网卡标识，如 can0' },
        bitrate: { type: 'integer', description: '总线仲裁段波特率 (bps)' },
      },
      required: ['can_interface'],
    },
    script_language: 'groovy',
    script_entrypoint: 'run',
    script: MCP_SCRIPT_TEMPLATES.groovy,
    addressOrCode: 'can0@500000',
    description: '分析高速 CAN/CAN-FD 总线仲裁冲突、错误帧计数及 120Ω 终端匹配阻抗状态。',
    interfaces: [
      {
        id: 'sys-if-10',
        methodName: 'diagnose_can_bus',
        paramSpec: 'can_interface: string, bitrate: integer',
      },
    ],
  },
];

interface PlatformSystemToolsPanelProps {
  tools: McpToolItem[];
  onChangeTools: React.Dispatch<React.SetStateAction<McpToolItem[]>>;
  onNotify?: (msg: string) => void;
  onRequestConfirm?: (dialog: {
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning';
    onConfirm: () => void;
  }) => void;
}

export default function PlatformSystemToolsPanel({
  tools,
  onChangeTools,
  onNotify,
  onRequestConfirm,
}: PlatformSystemToolsPanelProps) {
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [toolDraft, setToolDraft] = useState<McpToolItem | null>(null);
  const [isNewToolDraft, setIsNewToolDraft] = useState(false);
  const [aiFileStatus, setAiFileStatus] = useState<string | null>(null);

  // 搜索、筛选、分页与批量设置状态
  const [searchQuery, setSearchQuery] = useState('');
  const [protocolFilter, setProtocolFilter] = useState<'all' | string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | McpToolType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);

  // 批量设置弹窗状态
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchEnabledAction, setBatchEnabledAction] = useState<'keep' | 'enable' | 'disable'>('keep');
  const [batchProtocolAction, setBatchProtocolAction] = useState<'keep' | string>('keep');
  const [batchTypeAction, setBatchTypeAction] = useState<'keep' | McpToolType>('keep');
  const [batchRemarkMode, setBatchRemarkMode] = useState<'keep' | 'replace' | 'append'>('keep');
  const [batchRemarkText, setBatchRemarkText] = useState('');

  // 监听左下角 AI 助手生成的 MCP 工具配置
  useEffect(() => {
    const handleApplyAiTools = (e: Event) => {
      const detail = (e as CustomEvent<{
        protocol: McpProtocol;
        tools: McpToolItem[];
        mode: 'replace' | 'append';
      }>).detail;
      if (!detail || !Array.isArray(detail.tools)) return;

      const nowStr = formatMcpTimestamp();
      const normalized = detail.tools.map((t) => ({
        ...t,
        protocol: t.protocol || detail.protocol,
        toolType: t.toolType || ('系统内置' as McpToolType),
        addedAt: t.addedAt || nowStr,
        enabled: t.enabled !== false,
      }));

      onChangeTools((prev) => {
        if (detail.mode === 'append') {
          return [...normalized, ...prev];
        }
        const otherProtocolTools = prev.filter(
          (item) => (item.protocol || '').toLowerCase() !== detail.protocol.toLowerCase()
        );
        return [...normalized, ...otherProtocolTools];
      });
      setPage(1);
      setEditingToolId(null);
      setToolDraft(null);
      setIsNewToolDraft(false);
      setAiFileStatus(`已从 AI 助手应用 ${normalized.length} 个 ${detail.protocol} 系统工具配置`);
      onNotify?.(`已应用 AI 生成的 ${normalized.length} 个 ${detail.protocol} 协议系统工具`);
    };

    window.addEventListener('apply-mcp-ai-tools', handleApplyAiTools);
    return () => {
      window.removeEventListener('apply-mcp-ai-tools', handleApplyAiTools);
      window.dispatchEvent(new CustomEvent('close-mcp-ai-assistant'));
    };
  }, [onChangeTools, onNotify]);

  // 操作方法
  const startAddTool = () => {
    setIsNewToolDraft(true);
    setEditingToolId('__new__');
    setToolDraft(null);
  };

  const startEditTool = (tool: McpToolItem) => {
    setIsNewToolDraft(false);
    setEditingToolId(tool.id);
    setToolDraft({
      ...tool,
      protocol: tool.protocol || 'mqtt',
      toolType: tool.toolType || '系统内置',
      addedAt: tool.addedAt || formatMcpTimestamp(),
      enabled: tool.enabled !== false,
      interfaces: (tool.interfaces || []).map((it) => ({ ...it })),
    });
  };

  const handleSaveToolFromModal = (savedTool: McpToolItem) => {
    if (isNewToolDraft) {
      onChangeTools((prev) => [savedTool, ...prev]);
      setPage(1);
      onNotify?.(`已新增系统工具：${savedTool.name}`);
    } else {
      onChangeTools((prev) => prev.map((t) => (t.id === savedTool.id ? savedTool : t)));
      onNotify?.(`已更新系统工具：${savedTool.name}`);
    }
    setEditingToolId(null);
    setToolDraft(null);
    setIsNewToolDraft(false);
  };

  const cancelToolDraft = () => {
    setEditingToolId(null);
    setToolDraft(null);
    setIsNewToolDraft(false);
  };

  const toggleToolEnabled = (tool: McpToolItem) => {
    const nextEnabled = tool.enabled === false;
    onChangeTools((prev) =>
      prev.map((t) => (t.id === tool.id ? { ...t, enabled: nextEnabled } : t))
    );
    onNotify?.(`${nextEnabled ? '已启用' : '已停用'}系统工具「${tool.name}」`);
  };

  const executeDeleteTool = (tool: McpToolItem) => {
    onChangeTools((prev) => prev.filter((t) => t.id !== tool.id));
    setSelectedToolIds((prev) => prev.filter((x) => x !== tool.id));
    if (editingToolId === tool.id) {
      cancelToolDraft();
    }
    onNotify?.(`已删除系统工具「${tool.name}」`);
  };

  const handleDeleteTool = (tool: McpToolItem) => {
    if (onRequestConfirm) {
      onRequestConfirm({
        title: '确认删除系统工具',
        message: `确定要永久删除系统工具【${tool.name}】吗？删除后平台内关联调用将无法继续使用该工具。`,
        confirmLabel: '确认删除',
        variant: 'danger',
        onConfirm: () => executeDeleteTool(tool),
      });
    } else {
      executeDeleteTool(tool);
    }
  };

  const handleBatchToggleEnabled = (enabled: boolean) => {
    if (selectedToolIds.length === 0) return;
    const count = selectedToolIds.length;
    onChangeTools((prev) =>
      prev.map((t) => (selectedToolIds.includes(t.id) ? { ...t, enabled } : t))
    );
    onNotify?.(`已批量${enabled ? '启用' : '停用'} ${count} 个系统工具`);
  };

  const executeBatchDeleteTools = () => {
    const count = selectedToolIds.length;
    onChangeTools((prev) => prev.filter((t) => !selectedToolIds.includes(t.id)));
    setSelectedToolIds([]);
    onNotify?.(`已批量删除 ${count} 个系统工具`);
  };

  const handleBatchDeleteTools = () => {
    if (selectedToolIds.length === 0) return;
    const count = selectedToolIds.length;
    if (onRequestConfirm) {
      onRequestConfirm({
        title: '确认批量删除系统工具',
        message: `确定要批量删除已选中的 ${count} 个系统工具吗？此操作不可撤销。`,
        confirmLabel: `删除 ${count} 项`,
        variant: 'danger',
        onConfirm: executeBatchDeleteTools,
      });
    } else {
      executeBatchDeleteTools();
    }
  };

  const handleOpenBatchModal = () => {
    if (selectedToolIds.length === 0) return;
    setBatchEnabledAction('keep');
    setBatchProtocolAction('keep');
    setBatchTypeAction('keep');
    setBatchRemarkMode('keep');
    setBatchRemarkText('');
    setBatchModalOpen(true);
  };

  const handleApplyBatchSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedToolIds.length === 0) return;
    const count = selectedToolIds.length;
    onChangeTools((prev) =>
      prev.map((t) => {
        if (!selectedToolIds.includes(t.id)) return t;
        const nextDesc =
          batchRemarkMode === 'replace'
            ? batchRemarkText.trim() || t.description
            : batchRemarkMode === 'append' && batchRemarkText.trim()
              ? `${t.description}${t.description ? '；' : ''}${batchRemarkText.trim()}`
              : t.description;
        return {
          ...t,
          enabled:
            batchEnabledAction === 'keep'
              ? t.enabled !== false
              : batchEnabledAction === 'enable',
          protocol:
            batchProtocolAction === 'keep'
              ? t.protocol || 'mqtt'
              : batchProtocolAction,
          toolType:
            batchTypeAction === 'keep'
              ? t.toolType || '系统内置'
              : batchTypeAction,
          description: nextDesc,
        };
      })
    );
    setBatchModalOpen(false);
    onNotify?.(`已对选中的 ${count} 个系统工具完成批量设置`);
  };

  const handleAiOneClickGenerate = () => {
    const candidate = protocolFilter.toUpperCase();
    const targetProto: McpProtocol =
      candidate === 'MQTT' ||
      candidate === 'TCP' ||
      candidate === 'HTTP' ||
      candidate === 'RS232' ||
      candidate === 'RS485'
        ? candidate
        : candidate === 'MODBUS'
          ? 'RS485'
          : 'MQTT';
    window.dispatchEvent(
      new CustomEvent('open-mcp-ai-assistant', {
        detail: {
          agentName: '平台系统工具库',
          hardwareModel: '全平台通用物联网网关',
          protocol: targetProto,
          existingToolsCount: tools.length,
        },
      })
    );
  };

  // 筛选与分页衍生数据
  const availableProtocolFilters = Array.from(
    new Set([
      ...MCP_PROTOCOL_OPTIONS.map((o) => o.value),
      ...tools.map((t) => (t.protocol || '').toLowerCase()).filter(Boolean),
    ])
  );

  const filteredTools = tools.filter((tool) => {
    const toolProto = (tool.protocol || 'mqtt').toLowerCase();
    const toolTypeVal = tool.toolType || '系统内置';
    const isEnabled = tool.enabled !== false;

    if (protocolFilter !== 'all' && toolProto !== protocolFilter.toLowerCase()) return false;
    if (typeFilter !== 'all' && toolTypeVal !== typeFilter) return false;
    if (statusFilter === 'enabled' && !isEnabled) return false;
    if (statusFilter === 'disabled' && isEnabled) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const hit =
        tool.name.toLowerCase().includes(q) ||
        (tool.addressOrCode || '').toLowerCase().includes(q) ||
        (tool.category || '').toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        toolProto.includes(q);
      if (!hit) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTools.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedTools = filteredTools.slice((safePage - 1) * pageSize, safePage * pageSize);
  const isAllPageSelected =
    paginatedTools.length > 0 && paginatedTools.every((t) => selectedToolIds.includes(t.id));

  const toggleSelectAllPage = () => {
    const pageIds = paginatedTools.map((t) => t.id);
    if (isAllPageSelected) {
      setSelectedToolIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedToolIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectTool = (id: string) => {
    setSelectedToolIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const enabledCount = tools.filter((t) => t.enabled !== false).length;
  const disabledCount = tools.length - enabledCount;
  const builtinCount = tools.filter((t) => (t.toolType || '系统内置') === '系统内置').length;

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 flex-wrap">
            <Wrench className="w-4 h-4 text-indigo-600" />
            <span>平台运营 · 系统工具</span>
          </h3>
        </div>

        {/* Stats & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3.5 text-xs bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/80">
            <div>
              <span className="text-slate-400">总工具数: </span>
              <b className="font-mono text-slate-800 font-bold">{tools.length}</b>
            </div>
            <div className="h-3 w-px bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-400">已启用: </span>
              <b className="font-mono text-emerald-700 font-bold">{enabledCount}</b>
            </div>
            <div className="h-3 w-px bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-slate-400">已停用: </span>
              <b className="font-mono text-slate-700 font-bold">{disabledCount}</b>
            </div>
            <div className="h-3 w-px bg-slate-200 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-slate-400">系统内置: </span>
              <b className="font-mono text-indigo-700 font-bold">{builtinCount}</b>
            </div>
          </div>

          <button
            type="button"
            onClick={startAddTool}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>手动新增</span>
          </button>

          <button
            type="button"
            onClick={handleAiOneClickGenerate}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI 生成</span>
          </button>
        </div>
      </div>

      {/* Search, Filter & Batch Action Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-2.5 text-xs">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[220px] sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="搜索工具名称、地址、备注..."
                className="w-full h-8 pl-8 pr-6 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Protocol filter */}
            <select
              value={protocolFilter}
              onChange={(e) => {
                setProtocolFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:bg-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">全部协议</option>
              {availableProtocolFilters.map((protoOpt) => (
                <option key={protoOpt} value={protoOpt}>
                  {protoOpt}
                </option>
              ))}
            </select>

            {/* Tool type filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as 'all' | McpToolType);
                setPage(1);
              }}
              className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">全部类型</option>
              <option value="系统内置">系统内置</option>
              <option value="用户自定义">用户自定义</option>
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | 'enabled' | 'disabled');
                setPage(1);
              }}
              className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">全部状态</option>
              <option value="enabled">已启用</option>
              <option value="disabled">已停用</option>
            </select>
          </div>

          {/* Batch Action Controls */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {selectedToolIds.length > 0 && (
              <span className="text-[11px] text-indigo-700 font-semibold mr-1 tabular-nums whitespace-nowrap">
                已选 {selectedToolIds.length} 项
                <button
                  type="button"
                  onClick={() => setSelectedToolIds([])}
                  className="ml-1.5 text-slate-400 hover:text-slate-700 underline font-normal"
                >
                  清空
                </button>
              </span>
            )}

            <button
              type="button"
              disabled={selectedToolIds.length === 0}
              onClick={handleOpenBatchModal}
              title={
                selectedToolIds.length === 0
                  ? '请先在下方列表勾选工具'
                  : '对已选工具批量修改状态、协议、类型或备注'
              }
              className="h-8 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>批量设置</span>
            </button>

            <button
              type="button"
              disabled={selectedToolIds.length === 0}
              onClick={() => handleBatchToggleEnabled(true)}
              className="h-8 px-2.5 rounded-xl bg-white hover:bg-emerald-50 disabled:bg-slate-100 disabled:text-slate-400 text-emerald-700 border border-slate-200 hover:border-emerald-200 font-medium transition-colors whitespace-nowrap shrink-0"
            >
              批量启用
            </button>

            <button
              type="button"
              disabled={selectedToolIds.length === 0}
              onClick={() => handleBatchToggleEnabled(false)}
              className="h-8 px-2.5 rounded-xl bg-white hover:bg-amber-50 disabled:bg-slate-100 disabled:text-slate-400 text-amber-700 border border-slate-200 hover:border-amber-200 font-medium transition-colors whitespace-nowrap shrink-0"
            >
              批量停用
            </button>

            <button
              type="button"
              disabled={selectedToolIds.length === 0}
              onClick={handleBatchDeleteTools}
              className="h-8 px-2.5 rounded-xl bg-white hover:bg-rose-50 disabled:bg-slate-100 disabled:text-slate-400 text-rose-600 border border-slate-200 hover:border-rose-200 font-medium transition-colors whitespace-nowrap shrink-0"
            >
              批量删除
            </button>
          </div>
        </div>

        {aiFileStatus && (
          <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{aiFileStatus}</span>
            </div>
            <button
              type="button"
              onClick={() => setAiFileStatus(null)}
              className="text-emerald-600 hover:text-emerald-800 shrink-0"
              title="关闭提示"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Paginated System MCP Tools Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="p-3.5 pl-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectAllPage}
                    title={isAllPageSelected ? '取消全选本页' : '全选本页工具'}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                </th>
                <th className="p-3.5 whitespace-nowrap">工具名称</th>
                <th className="p-3.5 whitespace-nowrap">协议类型</th>
                <th className="p-3.5 whitespace-nowrap">工具类型</th>
                <th className="p-3.5 whitespace-nowrap">状态</th>
                <th className="p-3.5 whitespace-nowrap">添加时间</th>
                <th className="p-3.5 whitespace-nowrap">备注说明</th>
                <th className="p-3.5 text-center whitespace-nowrap w-48">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTools.map((tool) => {
                const isSelected = selectedToolIds.includes(tool.id);
                const toolProto = tool.protocol || 'mqtt';
                const toolTypeVal = tool.toolType || '系统内置';
                const isEnabled = tool.enabled !== false;

                return (
                  <tr
                    key={tool.id}
                    className={cn(
                      'transition-colors',
                      isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/80',
                      !isEnabled && 'opacity-75'
                    )}
                  >
                    <td className="p-3.5 pl-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectTool(tool.id)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                      />
                    </td>

                    {/* 工具名称 */}
                    <td className="p-3.5 max-w-[260px]">
                      <div className="font-mono font-semibold text-slate-900 truncate" title={tool.name}>
                        {tool.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                        v{tool.version || 1} · {tool.script_language || 'python'}
                        {tool.risk ? ` · ${tool.risk}` : ''}
                        {tool.addressOrCode ? ` · ${tool.addressOrCode}` : ''}
                      </div>
                    </td>

                    {/* 协议类型 */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="font-mono font-semibold text-indigo-700">{toolProto}</span>
                      {tool.category && tool.category !== toolProto && (
                        <span className="text-[11px] text-slate-400 font-mono ml-1.5">
                          · {tool.category}
                        </span>
                      )}
                    </td>

                    {/* 工具类型 */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={cn(
                          'font-medium',
                          toolTypeVal === '系统内置' ? 'text-indigo-700' : 'text-blue-700'
                        )}
                      >
                        {toolTypeVal}
                      </span>
                    </td>

                    {/* 状态 */}
                    <td className="p-3.5 whitespace-nowrap">
                      {isEnabled ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          已启用
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          已停用
                        </span>
                      )}
                    </td>

                    {/* 添加时间 */}
                    <td className="p-3.5 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {tool.addedAt || '2026-03-25 09:15'}
                    </td>

                    {/* 备注说明 */}
                    <td className="p-3.5 max-w-[260px]">
                      <div className="text-slate-600 truncate" title={tool.description || '—'}>
                        {tool.description || '—'}
                      </div>
                    </td>

                    {/* 操作 */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEditTool(tool)}
                          className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 font-medium transition-colors whitespace-nowrap"
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleToolEnabled(tool)}
                          className={cn(
                            'px-2.5 py-1 rounded-lg border font-medium transition-colors whitespace-nowrap',
                            isEnabled
                              ? 'bg-amber-50/70 hover:bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          )}
                        >
                          {isEnabled ? '停用' : '启用'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTool(tool)}
                          className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 font-medium transition-colors whitespace-nowrap"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredTools.length === 0 && (
          <div className="p-12 text-center text-slate-400 space-y-2.5 text-xs">
            <Wrench className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
            <div>
              {tools.length === 0
                ? '暂无系统工具，请点击右上方「手动新增」或「AI 生成」'
                : '没有符合当前筛选条件的系统工具'}
            </div>
            {tools.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setProtocolFilter('all');
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
              >
                重置筛选条件
              </button>
            )}
          </div>
        )}

        {/* Pagination Bar */}
        {filteredTools.length > 0 && (
          <div className="bg-slate-50/70 border-t border-slate-200/90 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-3 tabular-nums">
              <span>
                显示第 <b className="text-slate-800">{(safePage - 1) * pageSize + 1}</b> -{' '}
                <b className="text-slate-800">
                  {Math.min(safePage * pageSize, filteredTools.length)}
                </b>{' '}
                条，共 <b className="text-slate-900">{filteredTools.length}</b> 条工具
              </span>
              <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <span>每页</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium"
                >
                  <option value={5}>5 条</option>
                  <option value={10}>10 条</option>
                  <option value={20}>20 条</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>上一页</span>
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    'w-7 h-7 rounded-lg text-xs font-semibold tabular-nums transition-colors',
                    safePage === pageNum
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  )}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <span>下一页</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sub-modal: 新增 / 编辑 系统 MCP 工具 */}
      {editingToolId && (
        <McpToolFormModal
          tool={toolDraft}
          isNew={isNewToolDraft}
          existingToolNames={tools
            .filter((t) => isNewToolDraft || t.id !== editingToolId)
            .map((t) => t.name)}
          defaultProtocol={protocolFilter !== 'all' ? protocolFilter : 'mqtt'}
          defaultToolType="系统内置"
          onSave={handleSaveToolFromModal}
          onCancel={cancelToolDraft}
        />
      )}

      {/* Sub-modal: 批量设置系统工具 */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <form
            onSubmit={handleApplyBatchSettings}
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden text-xs"
          >
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-slate-900 text-sm">
                  批量设置系统工具（已选 {selectedToolIds.length} 项）
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/70 text-[11px] text-slate-600">
                选中工具：
                <span className="font-semibold text-slate-900 ml-1">
                  {tools
                    .filter((t) => selectedToolIds.includes(t.id))
                    .map((t) => t.name)
                    .slice(0, 4)
                    .join('、')}
                  {selectedToolIds.length > 4 ? ` 等共 ${selectedToolIds.length} 个` : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">启用状态</label>
                  <select
                    value={batchEnabledAction}
                    onChange={(e) =>
                      setBatchEnabledAction(e.target.value as 'keep' | 'enable' | 'disable')
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                  >
                    <option value="keep">保持原状态不变</option>
                    <option value="enable">全部设为「已启用」</option>
                    <option value="disable">全部设为「已停用」</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">所属协议</label>
                  <select
                    value={batchProtocolAction}
                    onChange={(e) => setBatchProtocolAction(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono"
                  >
                    <option value="keep">保持原协议不变</option>
                    {MCP_PROTOCOL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        统一修改为 {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">工具类型</label>
                <select
                  value={batchTypeAction}
                  onChange={(e) => setBatchTypeAction(e.target.value as 'keep' | McpToolType)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                >
                  <option value="keep">保持原工具类型不变</option>
                  <option value="系统内置">全部设为「系统内置」</option>
                  <option value="用户自定义">全部设为「用户自定义」</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-slate-700">备注说明调整</label>
                <select
                  value={batchRemarkMode}
                  onChange={(e) =>
                    setBatchRemarkMode(e.target.value as 'keep' | 'replace' | 'append')
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                >
                  <option value="keep">保持原备注说明不变</option>
                  <option value="replace">统一替换为新备注说明</option>
                  <option value="append">在原有备注说明末尾追加</option>
                </select>
                {batchRemarkMode !== 'keep' && (
                  <input
                    type="text"
                    value={batchRemarkText}
                    onChange={(e) => setBatchRemarkText(e.target.value)}
                    placeholder={
                      batchRemarkMode === 'replace'
                        ? '输入统一的备注说明内容...'
                        : '输入要追加的备注说明文本...'
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                  />
                )}
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                className="px-4 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                应用批量设置
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
