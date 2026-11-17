import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sliders,
  Database,
  Plug,
  Wrench,
  Terminal,
  Upload,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Check,
  ChevronRight,
  ChevronDown,
  Star,
  FolderPlus,
  Folder,
  FileCode,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  CheckCircle2,
  Send,
  Search,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { AgentKnowledgeBase } from './AgentKnowledgeModal';
import McpToolFormModal from './McpToolFormModal';
import {
  type McpProtocol,
  type McpToolType,
  type McpToolInterface,
  type McpToolItem,
  MCP_PROTOCOL_OPTIONS,
  MCP_SCRIPT_TEMPLATES,
  formatMcpTimestamp,
} from '../lib/mcpTemplates';

export type { McpProtocol, McpToolType, McpToolInterface, McpToolItem };

// ================== TYPES ==================

export interface ConnectionFieldConfig {
  id: string;
  name: string;
  key: string;
  type: 'input' | 'select';
  inputMode?: 'text' | 'password' | 'number';
  options?: string[];
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
}

export interface McpConfig {
  protocol: McpProtocol;
  tools: McpToolItem[];
}

export interface CommandTreeNode {
  id: string;
  label: string;
  nodeType: 'category' | 'command';
  isDefault?: boolean;
  prompt?: string;
  commandCode?: string;
  expectedReply?: string;
  children?: CommandTreeNode[];
}

export interface AgentDesignConfig {
  connectionFields: ConnectionFieldConfig[];
  mcpConfig: McpConfig;
  commandTree: CommandTreeNode[];
}

export interface DesignableCustomAgent {
  id: number;
  name: string;
  desc: string;
  coverImage: string;
  hardwareModel: string;
  schoolName: string;
  status: 'published' | 'draft';
}

interface AgentDesignModalProps {
  agent: DesignableCustomAgent;
  designConfig: AgentDesignConfig;
  availableKnowledgeBases: AgentKnowledgeBase[];
  selectedKbIds: string[];
  onSaveDesign: (payload: {
    basic: {
      name: string;
      hardwareModel: string;
      coverImage: string;
      desc: string;
      selectedKbIds: string[];
    };
    designConfig: AgentDesignConfig;
  }) => void;
  onOpenKnowledgeManager?: () => void;
  onClose: () => void;
  onNotify?: (msg: string) => void;
}

export function createDefaultDesignConfig(hardwareModel: string, agentName: string): AgentDesignConfig {
  return {
    connectionFields: [
      {
        id: 'cf-ip',
        name: '设备IP地址',
        key: 'ip',
        type: 'input',
        inputMode: 'text',
        required: true,
        placeholder: '例如：192.168.1.101',
        defaultValue: '192.168.1.101',
      },
      {
        id: 'cf-port',
        name: '通讯端口',
        key: 'port',
        type: 'input',
        inputMode: 'number',
        required: true,
        placeholder: '502 / 1883',
        defaultValue: '502',
      },
      {
        id: 'cf-account',
        name: '设备账号',
        key: 'username',
        type: 'input',
        inputMode: 'text',
        required: false,
        placeholder: '输入设备认证账号（可选）',
        defaultValue: 'admin',
      },
      {
        id: 'cf-password',
        name: '连接密码',
        key: 'password',
        type: 'input',
        inputMode: 'password',
        required: false,
        placeholder: '输入设备认证密钥',
        defaultValue: '',
      },
      {
        id: 'cf-baud',
        name: '串口波特率',
        key: 'baudRate',
        type: 'select',
        options: ['9600', '19200', '38400', '57600', '115200'],
        required: true,
        defaultValue: '115200',
      },
    ],
    mcpConfig: {
      protocol: 'RS485',
      tools: [
        {
          id: 'mcp-1',
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
          script: `def run(p):\n    # p 为输入参数字典\n    slave = p.get("slave_id", 1)\n    return {"slave": slave, "status": "ok"}`,
          slaveAddress: '0x01',
          modbusFunctionCode: '0x03 读保持寄存器',
          addressOrCode: '0x0001 ~ 0x0010',
          description: `读取 ${hardwareModel} 核心状态寄存器、波特率及心跳计数，返回解析后的设备运行指标。`,
          interfaces: [
            {
              id: 'if-1-1',
              methodName: 'read_holding_registers',
              paramSpec: 'slave_id: integer, start_addr: string, count: integer',
            },
          ],
        },
        {
          id: 'mcp-2',
          name: 'modbus_reset_channel',
          protocol: 'modbus',
          category: 'control',
          version: 1,
          toolType: '系统内置',
          addedAt: '2026-03-25 09:15',
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
          description: `向 ${agentName} 写入标准串口波特率并执行通道软复位，成功返回握手确认回执。`,
          interfaces: [
            {
              id: 'if-2-1',
              methodName: 'write_single_register',
              paramSpec: 'slave_id: integer, channel: integer',
            },
          ],
        },
        {
          id: 'mcp-3',
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
          addressOrCode: `iot/${(hardwareModel || 'device').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/telemetry/up`,
          description: '订阅设备上行遥测主题并自动解析温湿度、供电电压与在线状态等 JSON 传感器数据。',
          interfaces: [
            {
              id: 'if-3-1',
              methodName: 'subscribe_telemetry',
              paramSpec: 'topic: string, qos: integer',
            },
          ],
        },
        {
          id: 'mcp-4',
          name: 'mqtt_publish_message',
          protocol: 'mqtt',
          category: 'mqtt',
          version: 1,
          toolType: '系统内置',
          addedAt: '2026-03-26 14:22',
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
          addressOrCode: `iot/${(hardwareModel || 'device').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/cmd/down`,
          description: '向设备下行控制主题发布开关控制或参数刷新指令，高风险操作需人工二次确认。',
          interfaces: [
            {
              id: 'if-4-1',
              methodName: 'publish_control_cmd',
              paramSpec: 'connection_id: string, payload: string | object',
            },
          ],
        },
        {
          id: 'mcp-5',
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
          addressOrCode: `http://192.168.1.101:8080/api/v1/${(hardwareModel || 'device').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/status`,
          description: '调用 HTTP GET 状态接口获取设备在线率、内存占用及实时传感器快照。',
          interfaces: [
            {
              id: 'if-5-1',
              methodName: 'http_get_device_status',
              paramSpec: 'endpoint_url: string, include_sensors: boolean',
            },
          ],
        },
        {
          id: 'mcp-6',
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
              id: 'if-6-1',
              methodName: 'tcp_send_hex_frame',
              paramSpec: 'host: string, port: integer',
            },
          ],
        },
        {
          id: 'mcp-7',
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
              id: 'if-7-1',
              methodName: 'send_at_query',
              paramSpec: 'serial_port: string',
            },
          ],
        },
      ],
    },
    commandTree: [
      {
        id: 'cmd-cat-1',
        label: '排错能力',
        nodeType: 'category',
        children: [
          {
            id: 'cmd-cat-1-1',
            label: '通讯链路排查',
            nodeType: 'category',
            children: [
              {
                id: 'cmd-1-1-1',
                label: `${hardwareModel} 通讯超时与丢包自检`,
                nodeType: 'command',
                isDefault: true,
                prompt: `请排查 ${hardwareModel} 设备通讯超时、无应答或丢包率偏高的问题`,
                commandCode: `MCP_PROBE ${hardwareModel} --check-uart --baud=115200`,
                expectedReply: `已完成 ${hardwareModel} 通讯链路自检：1. 波特率匹配校验正常；2. 终端匹配电阻与 RS485 差分电压处于正常区间。`,
              },
              {
                id: 'cmd-1-1-2',
                label: 'CRC 校验失败与干扰排查',
                nodeType: 'command',
                isDefault: false,
                prompt: `分析 ${hardwareModel} 返回 CRC 校验异常的可能原因`,
                commandCode: `READ_ERROR_COUNTERS 0x0012 4`,
                expectedReply: `建议核对屏蔽层单端接地状态，并检查是否存在大功率感性负载并线干扰。`,
              },
            ],
          },
          {
            id: 'cmd-1-2',
            label: '寄存器异常码诊断',
            nodeType: 'command',
            isDefault: true,
            prompt: `帮我分析 ${agentName} 读取寄存器返回异常码的原因`,
            commandCode: `READ_HOLDING_REGISTERS 0x0001 0x0008`,
            expectedReply: `若返回异常码 0x02/0x03，请核对起始寄存器偏移地址与从站映射表范围。`,
          },
        ],
      },
      {
        id: 'cmd-cat-2',
        label: '控制能力',
        nodeType: 'category',
        children: [
          {
            id: 'cmd-2-1',
            label: '执行设备出厂自检序列',
            nodeType: 'command',
            isDefault: true,
            prompt: `向 ${hardwareModel} 下发标准自检与心跳探针指令`,
            commandCode: `MCP_EXEC self_test --target=${hardwareModel}`,
            expectedReply: `已向目标设备【${agentName}】下发自检序列，各通道采样及开关量回读响应正常。`,
          },
          {
            id: 'cmd-2-2',
            label: '同步默认通讯配置参数',
            nodeType: 'command',
            isDefault: false,
            prompt: `将 ${hardwareModel} 通讯参数校准为实训默认推荐值`,
            commandCode: `SET_UART_CONFIG baud=115200 parity=NONE stopbits=1`,
            expectedReply: `参数已下发并完成握手确认（115200bps / 8N1）。`,
          },
        ],
      },
    ],
  };
}

// Helper functions for recursive command tree updates
function updateNodeInTree(
  nodes: CommandTreeNode[],
  targetId: string,
  updater: (node: CommandTreeNode) => CommandTreeNode
): CommandTreeNode[] {
  return nodes.map((n) => {
    if (n.id === targetId) {
      return updater(n);
    }
    if (n.children && n.children.length > 0) {
      return { ...n, children: updateNodeInTree(n.children, targetId, updater) };
    }
    return n;
  });
}

function deleteNodeInTree(nodes: CommandTreeNode[], targetId: string): CommandTreeNode[] {
  return nodes
    .filter((n) => n.id !== targetId)
    .map((n) =>
      n.children ? { ...n, children: deleteNodeInTree(n.children, targetId) } : n
    );
}

function appendChildInTree(
  nodes: CommandTreeNode[],
  parentId: string,
  child: CommandTreeNode
): CommandTreeNode[] {
  return nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: [...(n.children || []), child] };
    }
    if (n.children && n.children.length > 0) {
      return { ...n, children: appendChildInTree(n.children, parentId, child) };
    }
    return n;
  });
}

function countTreeStats(nodes: CommandTreeNode[]): { categories: number; commands: number; defaults: number } {
  let categories = 0;
  let commands = 0;
  let defaults = 0;
  for (const n of nodes) {
    if (n.nodeType === 'category') {
      categories += 1;
      if (n.children) {
        const sub = countTreeStats(n.children);
        categories += sub.categories;
        commands += sub.commands;
        defaults += sub.defaults;
      }
    } else {
      commands += 1;
      if (n.isDefault) defaults += 1;
    }
  }
  return { categories, commands, defaults };
}

function collectDefaultCommands(nodes: CommandTreeNode[], path: string[] = []): Array<{ path: string; node: CommandTreeNode }> {
  const res: Array<{ path: string; node: CommandTreeNode }> = [];
  for (const n of nodes) {
    const curPath = [...path, n.label];
    if (n.nodeType === 'command' && n.isDefault) {
      res.push({ path: path.join(' / '), node: n });
    }
    if (n.children) {
      res.push(...collectDefaultCommands(n.children, curPath));
    }
  }
  return res;
}

const ENGLISH_KEY_REGEX = /^[A-Za-z][A-Za-z0-9_-]*$/;

function getConnectionKeyError(
  keyVal: string,
  allFields: ConnectionFieldConfig[],
  currentId: string
): string | null {
  const trimmed = keyVal.trim();
  if (!trimmed) return '英文 Key 不能为空';
  if (!ENGLISH_KEY_REGEX.test(trimmed)) {
    return '须以英文字母开头，仅支持字母、数字、_ 或 -';
  }
  const dupCount = allFields.filter(
    (f) => f.id !== currentId && f.key.trim() === trimmed
  ).length;
  if (dupCount > 0) {
    return `Key「${trimmed}」重复，须唯一`;
  }
  return null;
}

function generateUniqueFieldKey(
  baseKey: string,
  existing: ConnectionFieldConfig[]
): string {
  const cleaned = baseKey.replace(/[^A-Za-z0-9_-]/g, '');
  const safeBase = /^[A-Za-z]/.test(cleaned) ? cleaned : `field_${cleaned || 'item'}`;
  const usedKeys = new Set(existing.map((f) => f.key.trim()).filter(Boolean));
  if (!usedKeys.has(safeBase)) return safeBase;
  let seq = 2;
  while (usedKeys.has(`${safeBase}_${seq}`)) {
    seq += 1;
  }
  return `${safeBase}_${seq}`;
}

// ================== COMPONENT ==================

export default function AgentDesignModal({
  agent,
  designConfig,
  availableKnowledgeBases,
  selectedKbIds: initialSelectedKbIds,
  onSaveDesign,
  onOpenKnowledgeManager,
  onClose,
  onNotify,
}: AgentDesignModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'connection' | 'mcp' | 'commands'>('basic');

  // 3.1 基础配置 state
  const [name, setName] = useState(agent.name);
  const [hardwareModel, setHardwareModel] = useState(agent.hardwareModel);
  const [coverImage, setCoverImage] = useState(agent.coverImage);
  const [desc, setDesc] = useState(agent.desc);
  const [selectedKbIds, setSelectedKbIds] = useState<string[]>(initialSelectedKbIds);
  const prevInitialKbRef = useRef<string[]>(initialSelectedKbIds);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const added = initialSelectedKbIds.filter((id) => !prevInitialKbRef.current.includes(id));
    const removed = prevInitialKbRef.current.filter((id) => !initialSelectedKbIds.includes(id));
    if (added.length > 0 || removed.length > 0) {
      setSelectedKbIds((prev) => {
        const filtered = prev.filter((id) => !removed.includes(id));
        return Array.from(new Set([...filtered, ...added]));
      });
      prevInitialKbRef.current = initialSelectedKbIds;
    }
  }, [initialSelectedKbIds]);

  // 3.2 连接配置 state
  const [connectionFields, setConnectionFields] = useState<ConnectionFieldConfig[]>(() =>
    designConfig.connectionFields.map((f, idx) => ({
      ...f,
      key: f.key?.trim() || `field_${idx + 1}`,
    }))
  );
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  // 3.3 MCP工具配置 state
  const [mcpProtocol, setMcpProtocol] = useState<McpProtocol>(designConfig.mcpConfig.protocol);
  const [mcpTools, setMcpTools] = useState<McpToolItem[]>(() =>
    designConfig.mcpConfig.tools.map((t) => ({
      ...t,
      protocol: t.protocol || designConfig.mcpConfig.protocol,
      toolType: t.toolType || '系统内置',
      addedAt: t.addedAt || '2026-03-25 09:15',
      enabled: t.enabled !== false,
    }))
  );
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [toolDraft, setToolDraft] = useState<McpToolItem | null>(null);
  const [isNewToolDraft, setIsNewToolDraft] = useState(false);
  const [aiFileStatus, setAiFileStatus] = useState<string | null>(null);

  // MCP 列表检索、筛选、分页与批量设置 state
  const [mcpSearchQuery, setMcpSearchQuery] = useState('');
  const [mcpProtocolFilter, setMcpProtocolFilter] = useState<'all' | string>('all');
  const [mcpTypeFilter, setMcpTypeFilter] = useState<'all' | McpToolType>('all');
  const [mcpStatusFilter, setMcpStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [mcpPage, setMcpPage] = useState(1);
  const [mcpPageSize, setMcpPageSize] = useState(5);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchEnabledAction, setBatchEnabledAction] = useState<'keep' | 'enable' | 'disable'>('keep');
  const [batchProtocolAction, setBatchProtocolAction] = useState<'keep' | string>('keep');
  const [batchTypeAction, setBatchTypeAction] = useState<'keep' | McpToolType>('keep');
  const [batchRemarkMode, setBatchRemarkMode] = useState<'keep' | 'replace' | 'append'>('keep');
  const [batchRemarkText, setBatchRemarkText] = useState('');

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
        toolType: t.toolType || ('用户自定义' as McpToolType),
        addedAt: t.addedAt || nowStr,
        enabled: t.enabled !== false,
      }));

      setMcpProtocol(detail.protocol);
      setMcpTools((prev) => {
        if (detail.mode === 'append') {
          return [...normalized, ...prev];
        }
        const otherProtocolTools = prev.filter(
          (item) => (item.protocol || mcpProtocol) !== detail.protocol
        );
        return [...normalized, ...otherProtocolTools];
      });
      setMcpPage(1);
      setEditingToolId(null);
      setToolDraft(null);
      setIsNewToolDraft(false);
      setAiFileStatus(`已从左下角 AI 助手应用 ${normalized.length} 个 ${detail.protocol} 工具配置`);
      onNotify?.(`已应用 AI 生成的 ${normalized.length} 个 ${detail.protocol} 协议工具`);
    };

    window.addEventListener('apply-mcp-ai-tools', handleApplyAiTools);
    return () => {
      window.removeEventListener('apply-mcp-ai-tools', handleApplyAiTools);
    };
  }, [mcpProtocol, onNotify]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('close-mcp-ai-assistant'));
    };
  }, []);

  // 3.4 指令库配置 state
  const [commandTree, setCommandTree] = useState<CommandTreeNode[]>(() => designConfig.commandTree);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    const expandAll = (nodes: CommandTreeNode[]) => {
      nodes.forEach((n) => {
        map[n.id] = true;
        if (n.children) expandAll(n.children);
      });
    };
    expandAll(designConfig.commandTree);
    return map;
  });
  const [editingCmdNode, setEditingCmdNode] = useState<CommandTreeNode | null>(null);

  // --------- Tab 1 handlers ---------
  const handleToggleKb = (kbId: string) => {
    setSelectedKbIds((prev) =>
      prev.includes(kbId) ? prev.filter((id) => id !== kbId) : [...prev, kbId]
    );
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverImage(reader.result);
        onNotify?.(`已上传自定义封面图：${file.name}`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // --------- Tab 2 handlers ---------
  const handleAddConnectionField = (preset?: Partial<ConnectionFieldConfig>) => {
    const newId = `cf-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const uniqueKey = generateUniqueFieldKey(
      preset?.key || `field_${connectionFields.length + 1}`,
      connectionFields
    );
    const newField: ConnectionFieldConfig = {
      id: newId,
      name: preset?.name || '自定义连接项',
      key: uniqueKey,
      type: preset?.type || 'input',
      inputMode: preset?.inputMode || 'text',
      options: preset?.options || ['选项A', '选项B'],
      required: preset?.required ?? true,
      placeholder: preset?.placeholder || '请输入参数值',
      defaultValue: preset?.defaultValue || '',
    };
    setConnectionFields((prev) => [...prev, newField]);
    setEditingFieldId(newId);
  };

  const handleUpdateConnectionField = (id: string, patch: Partial<ConnectionFieldConfig>) => {
    setConnectionFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const handleMoveConnectionField = (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= connectionFields.length) return;
    setConnectionFields((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item);
      return copy;
    });
  };

  const handleDeleteConnectionField = (id: string) => {
    setConnectionFields((prev) => prev.filter((f) => f.id !== id));
    if (editingFieldId === id) setEditingFieldId(null);
  };

  // --------- Tab 3 handlers ---------
  const startAddMcpTool = () => {
    setIsNewToolDraft(true);
    setEditingToolId('__new__');
    setToolDraft(null);
  };

  const startEditMcpTool = (tool: McpToolItem) => {
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
      setMcpTools((prev) => [savedTool, ...prev]);
      setMcpPage(1);
      onNotify?.(`已新增 MCP 工具：${savedTool.name}`);
    } else {
      setMcpTools((prev) => prev.map((t) => (t.id === savedTool.id ? savedTool : t)));
      onNotify?.(`已更新 MCP 工具：${savedTool.name}`);
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

  const toggleMcpToolEnabled = (tool: McpToolItem) => {
    const nextEnabled = tool.enabled === false;
    setMcpTools((prev) =>
      prev.map((t) => (t.id === tool.id ? { ...t, enabled: nextEnabled } : t))
    );
    onNotify?.(`${nextEnabled ? '已启用' : '已停用'}工具「${tool.name}」`);
  };

  const deleteMcpTool = (id: string) => {
    setMcpTools((prev) => prev.filter((t) => t.id !== id));
    setSelectedToolIds((prev) => prev.filter((x) => x !== id));
    if (editingToolId === id) {
      cancelToolDraft();
    }
  };

  const handleBatchToggleEnabled = (enabled: boolean) => {
    if (selectedToolIds.length === 0) return;
    const count = selectedToolIds.length;
    setMcpTools((prev) =>
      prev.map((t) => (selectedToolIds.includes(t.id) ? { ...t, enabled } : t))
    );
    onNotify?.(`已批量${enabled ? '启用' : '停用'} ${count} 个 MCP 工具`);
  };

  const handleBatchDeleteTools = () => {
    if (selectedToolIds.length === 0) return;
    const count = selectedToolIds.length;
    setMcpTools((prev) => prev.filter((t) => !selectedToolIds.includes(t.id)));
    setSelectedToolIds([]);
    onNotify?.(`已批量删除 ${count} 个 MCP 工具`);
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
    setMcpTools((prev) =>
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
              ? t.protocol || mcpProtocol
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
    onNotify?.(`已对选中的 ${count} 个 MCP 工具完成批量设置`);
  };

  // MCP 列表筛选与分页衍生数据
  const availableProtocolFilters = Array.from(
    new Set([
      ...MCP_PROTOCOL_OPTIONS.map((o) => o.value),
      ...mcpTools.map((t) => (t.protocol || '').toLowerCase()).filter(Boolean),
    ])
  );

  const filteredMcpTools = mcpTools.filter((tool) => {
    const toolProto = (tool.protocol || mcpProtocol).toLowerCase();
    const toolTypeVal = tool.toolType || '系统内置';
    const isEnabled = tool.enabled !== false;

    if (mcpProtocolFilter !== 'all' && toolProto !== mcpProtocolFilter.toLowerCase()) return false;
    if (mcpTypeFilter !== 'all' && toolTypeVal !== mcpTypeFilter) return false;
    if (mcpStatusFilter === 'enabled' && !isEnabled) return false;
    if (mcpStatusFilter === 'disabled' && isEnabled) return false;

    if (mcpSearchQuery.trim()) {
      const q = mcpSearchQuery.trim().toLowerCase();
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

  const totalMcpPages = Math.max(1, Math.ceil(filteredMcpTools.length / mcpPageSize));
  const safeMcpPage = Math.min(mcpPage, totalMcpPages);
  const paginatedMcpTools = filteredMcpTools.slice(
    (safeMcpPage - 1) * mcpPageSize,
    safeMcpPage * mcpPageSize
  );
  const isAllMcpPageSelected =
    paginatedMcpTools.length > 0 &&
    paginatedMcpTools.every((t) => selectedToolIds.includes(t.id));

  const toggleSelectAllMcpPage = () => {
    const pageIds = paginatedMcpTools.map((t) => t.id);
    if (isAllMcpPageSelected) {
      setSelectedToolIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedToolIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectMcpTool = (id: string) => {
    setSelectedToolIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAiOneClickGenerate = () => {
    const candidate = mcpProtocolFilter.toUpperCase();
    const targetProto: McpProtocol =
      candidate === 'MQTT' ||
      candidate === 'TCP' ||
      candidate === 'HTTP' ||
      candidate === 'RS232' ||
      candidate === 'RS485'
        ? candidate
        : candidate === 'MODBUS'
          ? 'RS485'
          : mcpProtocol;
    window.dispatchEvent(
      new CustomEvent('open-mcp-ai-assistant', {
        detail: {
          agentName: name || agent.name,
          hardwareModel: hardwareModel || agent.hardwareModel,
          protocol: targetProto,
          existingToolsCount: mcpTools.length,
        },
      })
    );
  };

  // --------- Tab 4 handlers (多级指令库 + 默认指令) ---------
  const toggleExpandNode = (id: string) => {
    setExpandedNodeIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddRootCategory = () => {
    const newId = `cat-${Date.now()}`;
    const newCat: CommandTreeNode = {
      id: newId,
      label: `新指令分类 ${commandTree.length + 1}`,
      nodeType: 'category',
      children: [],
    };
    setCommandTree((prev) => [...prev, newCat]);
    setExpandedNodeIds((prev) => ({ ...prev, [newId]: true }));
    setEditingCmdNode(newCat);
  };

  const handleAddRootDefaultCommand = () => {
    const newId = `cmd-${Date.now()}`;
    const newCmd: CommandTreeNode = {
      id: newId,
      label: '新默认诊断指令',
      nodeType: 'command',
      isDefault: true,
      prompt: `请执行 ${hardwareModel || agent.name} 默认硬件健康检查`,
      commandCode: `MCP_HEALTH_CHECK --model=${hardwareModel || 'DEFAULT'}`,
      expectedReply: '已完成设备默认巡检，各通讯通道与供电状态正常。',
    };
    setCommandTree((prev) => [...prev, newCmd]);
    setEditingCmdNode(newCmd);
  };

  const handleAddChildNode = (parentId: string, nodeType: 'category' | 'command') => {
    const newId = `${nodeType === 'category' ? 'cat' : 'cmd'}-${Date.now()}`;
    const newNode: CommandTreeNode =
      nodeType === 'category'
        ? {
            id: newId,
            label: '子级指令分组',
            nodeType: 'category',
            children: [],
          }
        : {
            id: newId,
            label: '新建子指令',
            nodeType: 'command',
            isDefault: false,
            prompt: `请执行 ${hardwareModel || agent.name} 专项调试检测`,
            commandCode: '',
            expectedReply: '已收到指令并完成设备状态核验。',
          };
    setCommandTree((prev) => appendChildInTree(prev, parentId, newNode));
    setExpandedNodeIds((prev) => ({ ...prev, [parentId]: true, [newId]: true }));
    setEditingCmdNode(newNode);
  };

  const handleToggleDefaultCmd = (nodeId: string) => {
    setCommandTree((prev) =>
      updateNodeInTree(prev, nodeId, (n) => ({ ...n, isDefault: !n.isDefault }))
    );
    if (editingCmdNode?.id === nodeId) {
      setEditingCmdNode((prev) => (prev ? { ...prev, isDefault: !prev.isDefault } : null));
    }
  };

  const handleDeleteTreeNode = (nodeId: string) => {
    setCommandTree((prev) => deleteNodeInTree(prev, nodeId));
    if (editingCmdNode?.id === nodeId) setEditingCmdNode(null);
  };

  const handleSaveEditingCmdNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCmdNode || !editingCmdNode.label.trim()) return;
    setCommandTree((prev) =>
      updateNodeInTree(prev, editingCmdNode.id, (old) => ({
        ...old,
        label: editingCmdNode.label.trim(),
        isDefault: editingCmdNode.isDefault,
        prompt: editingCmdNode.prompt,
        commandCode: editingCmdNode.commandCode,
        expectedReply: editingCmdNode.expectedReply,
      }))
    );
    setEditingCmdNode(null);
    onNotify?.(`已更新指令节点【${editingCmdNode.label.trim()}】`);
  };

  // Recursive tree renderer for Tab 4
  const renderCommandNodes = (nodes: CommandTreeNode[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      const isExpanded = expandedNodeIds[node.id] ?? true;
      const isCategory = node.nodeType === 'category';
      const isSelected = editingCmdNode?.id === node.id;

      return (
        <div key={node.id} className="space-y-1">
          <div
            style={{ paddingLeft: `${depth * 18 + 10}px` }}
            className={cn(
              'pr-2.5 py-2 rounded-xl border transition-all flex items-center justify-between gap-2 text-xs',
              isSelected
                ? 'bg-blue-50/80 border-blue-300 shadow-2xs'
                : 'bg-white border-slate-200/80 hover:border-slate-300'
            )}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {isCategory ? (
                <button
                  type="button"
                  onClick={() => toggleExpandNode(node.id)}
                  className="p-0.5 rounded hover:bg-slate-100 text-slate-400 shrink-0"
                >
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              ) : (
                <span className="w-4 shrink-0" />
              )}

              {isCategory ? (
                <Folder className="w-4 h-4 text-indigo-500 shrink-0" />
              ) : (
                <Terminal className="w-4 h-4 text-emerald-600 shrink-0" />
              )}

              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono shrink-0">
                {depth + 1}级
              </span>

              <span className="font-semibold text-slate-800 truncate" title={node.label}>
                {node.label}
              </span>

              {!isCategory && node.isDefault && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold shrink-0">
                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                  <span>默认指令</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isCategory ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleAddChildNode(node.id, 'category')}
                    className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 text-[11px] font-medium flex items-center gap-1"
                    title="添加子分类（支持多级）"
                  >
                    <FolderPlus className="w-3 h-3" />
                    <span className="hidden sm:inline">子分类</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddChildNode(node.id, 'command')}
                    className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 text-[11px] font-medium flex items-center gap-1"
                    title="添加子指令"
                  >
                    <Plus className="w-3 h-3" />
                    <span className="hidden sm:inline">子指令</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleDefaultCmd(node.id)}
                  className={cn(
                    'px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors flex items-center gap-1',
                    node.isDefault
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:text-amber-600'
                  )}
                  title={node.isDefault ? '取消默认指令' : '设为默认指令'}
                >
                  <Star className={cn('w-3 h-3', node.isDefault && 'fill-amber-500 text-amber-500')} />
                  <span className="hidden sm:inline">{node.isDefault ? '已设默认' : '设默认'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setEditingCmdNode({ ...node })}
                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                title="编辑"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleDeleteTreeNode(node.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="删除"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {isCategory && isExpanded && node.children && node.children.length > 0 && (
            <div className="space-y-1">{renderCommandNodes(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  // --------- Save whole design ---------
  const handleConfirmSaveAll = () => {
    if (!name.trim()) {
      setActiveTab('basic');
      onNotify?.('请填写智能体名称');
      return;
    }
    if (!hardwareModel.trim()) {
      setActiveTab('basic');
      onNotify?.('请填写设备型号');
      return;
    }
    for (const field of connectionFields) {
      if (!field.name.trim()) {
        setActiveTab('connection');
        onNotify?.('连接配置中存在未填写名称的输入框，请补充');
        return;
      }
      const keyErr = getConnectionKeyError(field.key, connectionFields, field.id);
      if (keyErr) {
        setActiveTab('connection');
        onNotify?.(`连接配置「${field.name}」的英文 Key 校验未通过：${keyErr}`);
        return;
      }
    }
    const normalizedFields = connectionFields.map((f) => ({
      ...f,
      name: f.name.trim(),
      key: f.key.trim(),
    }));
    onSaveDesign({
      basic: {
        name: name.trim(),
        hardwareModel: hardwareModel.trim(),
        coverImage: coverImage || '/assets/agents/ecu-1251.png',
        desc: desc.trim() || '用于实验教学与硬件排错的自定义智能体',
        selectedKbIds,
      },
      designConfig: {
        connectionFields: normalizedFields,
        mcpConfig: {
          protocol: mcpProtocol,
          tools: mcpTools,
        },
        commandTree,
      },
    });
  };

  const treeStats = countTreeStats(commandTree);
  const defaultCommandsList = collectDefaultCommands(commandTree);

  const baseDisplayName = (name || agent.name || '').trim();
  const modalHeaderTitle = baseDisplayName.endsWith('智能体')
    ? `${baseDisplayName}配置`
    : `${baseDisplayName}智能体配置`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-[95vw] max-w-[1380px] h-[92vh] max-h-[900px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Top Modal Header (Light Theme & Simplified Title) */}
        <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <h3 className="font-bold text-base text-slate-900 truncate">
            {modalHeaderTitle}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors shrink-0"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Tabs Navigation (No Numeric Prefixes) */}
        <div className="px-6 pt-3 bg-slate-50/60 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
          {[
            { id: 'basic', label: '基础配置', icon: Sliders },
            { id: 'connection', label: '连接配置', icon: Plug, count: connectionFields.length },
            { id: 'mcp', label: 'MCP工具配置', icon: Wrench, count: mcpTools.length },
            { id: 'commands', label: '指令库配置', icon: Terminal, count: treeStats.commands },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  'px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap shrink-0',
                  isActive
                    ? 'bg-white text-blue-700 border-blue-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 border-transparent hover:bg-white/60'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums',
                      isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-white">
          {/* ================= TAB 1: 基础配置 ================= */}
          {activeTab === 'basic' && (
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
              {/* Left Form Fields */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-bold text-slate-700">
                        智能体名称 <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">{name.length}/50</span>
                    </div>
                    <input
                      type="text"
                      maxLength={50}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="1~50字符，例如：工业网关协议排错智能体"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-bold text-slate-700">
                        设备型号 <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">{hardwareModel.length}/50</span>
                    </div>
                    <input
                      type="text"
                      maxLength={50}
                      value={hardwareModel}
                      onChange={(e) => setHardwareModel(e.target.value)}
                      placeholder="1~50字符，例如：ADVANTECH-ECU1251"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-slate-700">
                      简要描述
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">{desc.length}/200</span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={200}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="选填，最多200字，简述该硬件智能体的教学应用与排错场景..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  />
                </div>

                {/* 知识库关联配置（支持关联多个 + 直接管理知识库） */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-blue-600" />
                        <span>知识库关联配置（支持多选）</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        已勾选 <b className="text-blue-700">{selectedKbIds.length}</b> 个知识库，对话调试与大厅使用时将自动联合检索
                      </p>
                    </div>

                    {onOpenKnowledgeManager && (
                      <button
                        type="button"
                        onClick={onOpenKnowledgeManager}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>知识库管理</span>
                      </button>
                    )}
                  </div>

                  {availableKnowledgeBases.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {availableKnowledgeBases.map((kb) => {
                        const checked = selectedKbIds.includes(kb.id);
                        return (
                          <label
                            key={kb.id}
                            className={cn(
                              'p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 select-none',
                              checked
                                ? 'bg-blue-50/70 border-blue-300 shadow-2xs'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleKb(kb.id)}
                              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-800 truncate" title={kb.name}>
                                {kb.name}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                                {kb.docs.length} 篇文档 · {kb.description}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 space-y-2.5">
                      <div>暂无可关联知识库，请点击「知识库管理」新增知识库并上传文档</div>
                      {onOpenKnowledgeManager && (
                        <button
                          type="button"
                          onClick={onOpenKnowledgeManager}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>立即新增知识库</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Cover Image Picker */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    <span>设备封面图</span>
                  </label>
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>上传本地图片</span>
                  </button>
                </div>

                {/* Live Cover Preview */}
                <div className="aspect-[16/10] rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center p-2">
                  <img
                    src={coverImage}
                    alt={name || '设备封面'}
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">图片地址 URL</label>
                  <input
                    type="text"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="/assets/agents/ecu-1251.png"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: 连接配置 ================= */}
          {activeTab === 'connection' && (
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
              {/* Left: Dynamic Form Builder */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">连接设备输入表单配置</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      配置用户在开启智能体并连接物理硬件时需要填写的表单项，每个输入框需设置唯一的英文 Key 标识
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddConnectionField()}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新增表单项</span>
                  </button>
                </div>

                {/* Quick Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 mr-1">快捷添加常用字段：</span>
                  {[
                    { name: '设备IP地址', key: 'ip', type: 'input' as const, inputMode: 'text' as const, required: true, placeholder: '192.168.1.101' },
                    { name: '登录账号', key: 'account', type: 'input' as const, inputMode: 'text' as const, required: true, placeholder: 'admin' },
                    { name: '连接密码', key: 'password', type: 'input' as const, inputMode: 'password' as const, required: true, placeholder: '请输入设备密码' },
                    { name: '通讯端口', key: 'port', type: 'input' as const, inputMode: 'number' as const, required: true, placeholder: '502' },
                    { name: '串口号', key: 'comPort', type: 'select' as const, options: ['COM1', 'COM2', 'COM3', '/dev/ttyUSB0'], required: true },
                    { name: '校验位', key: 'parity', type: 'select' as const, options: ['NONE (无校验)', 'ODD (奇校验)', 'EVEN (偶校验)'], required: false },
                  ].map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => handleAddConnectionField(preset)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-[11px] font-medium transition-colors"
                    >
                      + {preset.name}
                    </button>
                  ))}
                </div>

                {/* Fields List */}
                <div className="space-y-2.5">
                  {connectionFields.length > 0 ? (
                    connectionFields.map((field, index) => {
                      const keyError = getConnectionKeyError(field.key, connectionFields, field.id);
                      return (
                      <div
                        key={field.id}
                        className={cn(
                          'p-4 rounded-2xl border bg-slate-50/60 space-y-3',
                          keyError ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
                        )}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              输入框名称 <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={field.name}
                              onChange={(e) => handleUpdateConnectionField(field.id, { name: e.target.value })}
                              placeholder="如：IP地址、登录账号"
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              英文标识 (Key) <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={field.key}
                              onChange={(e) =>
                                handleUpdateConnectionField(field.id, {
                                  key: e.target.value.replace(/\s+/g, ''),
                                })
                              }
                              placeholder="如：ip, baudRate"
                              title="每个输入框的唯一英文标识（字母开头，可含字母/数字/_/-）"
                              className={cn(
                                'w-full px-3 py-1.5 bg-white border rounded-xl font-mono text-xs focus:outline-none focus:ring-2',
                                keyError
                                  ? 'border-rose-400 text-rose-700 focus:ring-rose-500/20'
                                  : 'border-slate-200 text-slate-800 focus:ring-blue-500/20 focus:border-blue-500'
                              )}
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              控件类型
                            </label>
                            <select
                              value={field.type}
                              onChange={(e) =>
                                handleUpdateConnectionField(field.id, {
                                  type: e.target.value as 'input' | 'select',
                                  options:
                                    e.target.value === 'select' && (!field.options || field.options.length === 0)
                                      ? ['选项1', '选项2']
                                      : field.options,
                                })
                              }
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                              <option value="input">输入框</option>
                              <option value="select">下拉框</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="flex items-center justify-center gap-1.5 cursor-pointer py-1.5 px-2.5 bg-white border border-slate-200 rounded-xl select-none whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => handleUpdateConnectionField(field.id, { required: e.target.checked })}
                                className="rounded border-slate-300 text-blue-600"
                              />
                              <span className="font-semibold text-slate-700">必填</span>
                            </label>
                          </div>

                          <div className="sm:col-span-2 flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveConnectionField(index, -1)}
                              disabled={index === 0}
                              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-40"
                              title="上移"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveConnectionField(index, 1)}
                              disabled={index === connectionFields.length - 1}
                              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-40"
                              title="下移"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteConnectionField(field.id)}
                              className="p-1.5 rounded-lg bg-white border border-slate-200 text-rose-500 hover:bg-rose-50"
                              title="删除字段"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {keyError && (
                          <div className="text-[11px] text-rose-600 font-medium flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span>英文标识校验提示：{keyError}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {field.type === 'input' ? (
                            <>
                              <div>
                                <label className="block text-[11px] text-slate-500 mb-1">输入格式</label>
                                <select
                                  value={field.inputMode || 'text'}
                                  onChange={(e) =>
                                    handleUpdateConnectionField(field.id, {
                                      inputMode: e.target.value as 'text' | 'password' | 'number',
                                    })
                                  }
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl"
                                >
                                  <option value="text">普通文本</option>
                                  <option value="password">密码掩码</option>
                                  <option value="number">数字输入</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] text-slate-500 mb-1">占位提示 / 默认值</label>
                                <input
                                  type="text"
                                  value={field.placeholder || ''}
                                  onChange={(e) =>
                                    handleUpdateConnectionField(field.id, { placeholder: e.target.value })
                                  }
                                  placeholder="例如：请输入设备 IP"
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl"
                                />
                              </div>
                            </>
                          ) : (
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] text-slate-500 mb-1">
                                下拉可选项（使用英文逗号 `,` 分隔）
                              </label>
                              <input
                                type="text"
                                value={(field.options || []).join(', ')}
                                onChange={(e) =>
                                  handleUpdateConnectionField(field.id, {
                                    options: e.target.value
                                      .split(/[,，]/)
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  })
                                }
                                placeholder="例如：9600, 19200, 115200"
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })
                  ) : (
                    <div className="p-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      暂未配置连接字段，请点击上方「新增表单项」或快捷添加字段
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Live Connection Modal Preview */}
              <div className="lg:col-span-4">
                <div className="sticky top-0 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Plug className="w-4 h-4 text-blue-600" />
                      <span>连接表单效果预览</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                      实时同步
                    </span>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 space-y-3">
                    <div className="text-[11px] text-slate-500">
                      连接目标：<b className="text-slate-800">{hardwareModel || agent.hardwareModel}</b>
                    </div>

                    {connectionFields.map((f) => (
                      <div key={f.id}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <label className="block text-[11px] font-semibold text-slate-700 truncate">
                            {f.name || '未命名字段'}
                            {f.required && <span className="text-rose-500 ml-0.5">*</span>}
                          </label>
                          <code className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200/70 px-1.5 py-0.2 rounded shrink-0">
                            {f.key || '未设置Key'}
                          </code>
                        </div>
                        {f.type === 'select' ? (
                          <select
                            name={f.key || f.id}
                            defaultValue={f.defaultValue || f.options?.[0] || ''}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700"
                          >
                            {(f.options && f.options.length > 0 ? f.options : ['默认选项']).map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            name={f.key || f.id}
                            type={f.inputMode || 'text'}
                            defaultValue={f.defaultValue || ''}
                            placeholder={f.placeholder || `请输入${f.name}`}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700"
                          />
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      className="w-full py-2 bg-blue-600 text-white rounded-xl font-semibold text-xs mt-2 opacity-90 cursor-default"
                    >
                      建立设备连接
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: MCP 工具配置 ================= */}
          {activeTab === 'mcp' && (
            <div className="w-full space-y-4 text-xs">
              {/* Search, Filter, Add Tools (Manual / AI) & Batch Action Bar */}
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3 space-y-2.5">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative min-w-[200px] sm:w-52">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={mcpSearchQuery}
                        onChange={(e) => {
                          setMcpSearchQuery(e.target.value);
                          setMcpPage(1);
                        }}
                        placeholder="搜索工具名称、地址、备注..."
                        className="w-full h-8 pl-8 pr-6 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                      />
                      {mcpSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setMcpSearchQuery('');
                            setMcpPage(1);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Protocol filter */}
                    <select
                      value={mcpProtocolFilter}
                      onChange={(e) => {
                        setMcpProtocolFilter(e.target.value);
                        setMcpPage(1);
                      }}
                      className="h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:border-blue-500"
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
                      value={mcpTypeFilter}
                      onChange={(e) => {
                        setMcpTypeFilter(e.target.value as 'all' | McpToolType);
                        setMcpPage(1);
                      }}
                      className="h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">全部类型</option>
                      <option value="系统内置">系统内置</option>
                      <option value="用户自定义">用户自定义</option>
                    </select>

                    {/* Status filter */}
                    <select
                      value={mcpStatusFilter}
                      onChange={(e) => {
                        setMcpStatusFilter(e.target.value as 'all' | 'enabled' | 'disabled');
                        setMcpPage(1);
                      }}
                      className="h-8 px-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">全部状态</option>
                      <option value="enabled">已启用</option>
                      <option value="disabled">已停用</option>
                    </select>

                    <div className="hidden sm:block h-4 w-px bg-slate-200 mx-0.5" />

                    {/* Add Tool Actions in Search Toolbar: Manual + AI Generate */}
                    <button
                      type="button"
                      onClick={startAddMcpTool}
                      className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-2xs transition-colors whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>手动新增</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAiOneClickGenerate}
                      className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-2xs transition-colors whitespace-nowrap shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI 生成</span>
                    </button>
                  </div>

                  {/* Batch Action Controls */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {selectedToolIds.length > 0 && (
                      <span className="text-[11px] text-blue-700 font-semibold mr-1 tabular-nums whitespace-nowrap">
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
                      title={selectedToolIds.length === 0 ? '请先在下方列表勾选工具' : '对已选工具批量修改状态、协议、类型或备注'}
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

              {/* Paginated MCP Tools Table */}
              <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="p-3 pl-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isAllMcpPageSelected}
                            onChange={toggleSelectAllMcpPage}
                            title={isAllMcpPageSelected ? '取消全选本页' : '全选本页工具'}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                        </th>
                        <th className="p-3 whitespace-nowrap">工具名称</th>
                        <th className="p-3 whitespace-nowrap">协议类型</th>
                        <th className="p-3 whitespace-nowrap">工具类型</th>
                        <th className="p-3 whitespace-nowrap">状态</th>
                        <th className="p-3 whitespace-nowrap">添加时间</th>
                        <th className="p-3 whitespace-nowrap">备注说明</th>
                        <th className="p-3 text-center whitespace-nowrap w-44">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedMcpTools.map((tool) => {
                        const isSelected = selectedToolIds.includes(tool.id);
                        const toolProto = tool.protocol || mcpProtocol;
                        const toolTypeVal = tool.toolType || '系统内置';
                        const isEnabled = tool.enabled !== false;

                        return (
                          <tr
                            key={tool.id}
                            className={cn(
                              'transition-colors',
                              isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/80',
                              !isEnabled && 'opacity-75'
                            )}
                          >
                            <td className="p-3 pl-4 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectMcpTool(tool.id)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                              />
                            </td>

                            {/* 工具名称 */}
                            <td className="p-3 max-w-[250px]">
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
                            <td className="p-3 whitespace-nowrap">
                              <span className="font-mono font-semibold text-indigo-700">
                                {toolProto}
                              </span>
                              {tool.category && tool.category !== toolProto && (
                                <span className="text-[11px] text-slate-400 font-mono ml-1.5">
                                  · {tool.category}
                                </span>
                              )}
                            </td>

                            {/* 工具类型 */}
                            <td className="p-3 whitespace-nowrap">
                              <span
                                className={cn(
                                  'font-medium',
                                  toolTypeVal === '系统内置' ? 'text-slate-700' : 'text-blue-700'
                                )}
                              >
                                {toolTypeVal}
                              </span>
                            </td>

                            {/* 状态 */}
                            <td className="p-3 whitespace-nowrap">
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
                            <td className="p-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                              {tool.addedAt || '2026-03-25 09:15'}
                            </td>

                            {/* 备注说明 */}
                            <td className="p-3 max-w-[240px]">
                              <div className="text-slate-600 truncate" title={tool.description || '—'}>
                                {tool.description || '—'}
                              </div>
                            </td>

                            {/* 操作：编辑、启用/停用、删除 */}
                            <td className="p-3 text-center whitespace-nowrap">
                              <div className="inline-flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => startEditMcpTool(tool)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 font-medium transition-colors whitespace-nowrap"
                                >
                                  编辑
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleMcpToolEnabled(tool)}
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
                                  onClick={() => deleteMcpTool(tool.id)}
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

                {filteredMcpTools.length === 0 && (
                  <div className="p-10 text-center text-slate-400 space-y-2">
                    <div>
                      {mcpTools.length === 0
                        ? '暂无 MCP 工具，请点击上方「手动新增」或「AI 生成」'
                        : '没有符合当前筛选条件的 MCP 工具'}
                    </div>
                    {mcpTools.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setMcpSearchQuery('');
                          setMcpProtocolFilter('all');
                          setMcpTypeFilter('all');
                          setMcpStatusFilter('all');
                          setMcpPage(1);
                        }}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                      >
                        重置筛选条件
                      </button>
                    )}
                  </div>
                )}

                {/* Pagination Bar */}
                {filteredMcpTools.length > 0 && (
                  <div className="bg-slate-50/70 border-t border-slate-200/90 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-3 tabular-nums">
                      <span>
                        显示第 <b className="text-slate-800">{(safeMcpPage - 1) * mcpPageSize + 1}</b> -{' '}
                        <b className="text-slate-800">
                          {Math.min(safeMcpPage * mcpPageSize, filteredMcpTools.length)}
                        </b>{' '}
                        条，共 <b className="text-slate-900">{filteredMcpTools.length}</b> 条工具
                      </span>
                      <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />
                      <div className="flex items-center gap-1.5">
                        <span>每页</span>
                        <select
                          value={mcpPageSize}
                          onChange={(e) => {
                            setMcpPageSize(Number(e.target.value));
                            setMcpPage(1);
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
                        disabled={safeMcpPage <= 1}
                        onClick={() => setMcpPage((p) => Math.max(1, p - 1))}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>上一页</span>
                      </button>

                      {Array.from({ length: totalMcpPages }, (_, idx) => idx + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setMcpPage(pageNum)}
                          className={cn(
                            'w-7 h-7 rounded-lg text-xs font-semibold tabular-nums transition-colors',
                            safeMcpPage === pageNum
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          )}
                        >
                          {pageNum}
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={safeMcpPage >= totalMcpPages}
                        onClick={() => setMcpPage((p) => Math.min(totalMcpPages, p + 1))}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        <span>下一页</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 4: 指令库配置（支持默认指令、多级） ================= */}
          {activeTab === 'commands' && (
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
              {/* Left: Multi-Level Command Tree */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">多级指令库与默认指令配置</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      共 {treeStats.categories} 个分类、{treeStats.commands} 条指令（含{' '}
                      <b className="text-amber-600">{treeStats.defaults}</b> 条默认指令），支持多级目录嵌套
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddRootCategory}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-semibold flex items-center gap-1"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>新增一级分类</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddRootDefaultCommand}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl font-semibold flex items-center gap-1"
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>新增默认指令</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[52vh] overflow-y-auto pr-1">
                  {commandTree.length > 0 ? (
                    renderCommandNodes(commandTree, 0)
                  ) : (
                    <div className="p-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      暂无指令节点，请点击右上方按钮创建分类或默认指令
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Node Editor OR Default Commands Preview */}
              <div className="lg:col-span-5 space-y-4">
                {editingCmdNode ? (
                  <form
                    onSubmit={handleSaveEditingCmdNode}
                    className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200 space-y-3.5"
                  >
                    <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
                      <span className="font-bold text-slate-900 text-sm">
                        {editingCmdNode.nodeType === 'category' ? '编辑分类节点' : '编辑指令详情'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingCmdNode(null)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {editingCmdNode.nodeType === 'category' ? '分类名称 *' : '指令名称 *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={editingCmdNode.label}
                        onChange={(e) => setEditingCmdNode({ ...editingCmdNode, label: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                      />
                    </div>

                    {editingCmdNode.nodeType === 'command' && (
                      <>
                        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-semibold cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={Boolean(editingCmdNode.isDefault)}
                            onChange={(e) =>
                              setEditingCmdNode({ ...editingCmdNode, isDefault: e.target.checked })
                            }
                            className="rounded border-amber-300 text-amber-600"
                          />
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>设为智能体默认指令</span>
                        </label>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">触发对话提示词</label>
                          <textarea
                            rows={2}
                            value={editingCmdNode.prompt || ''}
                            onChange={(e) => setEditingCmdNode({ ...editingCmdNode, prompt: e.target.value })}
                            placeholder="点击该指令时自动发送给智能体的调试提问"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl resize-none"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">下发底层指令载荷（可选）</label>
                          <input
                            type="text"
                            value={editingCmdNode.commandCode || ''}
                            onChange={(e) =>
                              setEditingCmdNode({ ...editingCmdNode, commandCode: e.target.value })
                            }
                            placeholder="如：MCP_PROBE --check-uart"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">诊断参考响应模板</label>
                          <textarea
                            rows={2}
                            value={editingCmdNode.expectedReply || ''}
                            onChange={(e) =>
                              setEditingCmdNode({ ...editingCmdNode, expectedReply: e.target.value })
                            }
                            placeholder="调试命中该指令时返回的标准排错指引"
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl resize-none"
                          />
                        </div>
                      </>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingCmdNode(null)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      >
                        应用修改
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                      <span>已配置的默认指令预览（{defaultCommandsList.length} 条）</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      点击左侧任意分类或指令的编辑图标可调整层级与详情，默认指令将在开启智能体/调试弹窗中置顶推荐
                    </p>

                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {defaultCommandsList.length > 0 ? (
                        defaultCommandsList.map(({ path, node }) => (
                          <div
                            key={node.id}
                            className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-800 truncate">{node.label}</span>
                              {path && (
                                <span className="text-[10px] text-slate-400 shrink-0">{path}</span>
                              )}
                            </div>
                            {node.prompt && (
                              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Send className="w-3 h-3 text-blue-500 shrink-0" />
                                <span className="truncate">{node.prompt}</span>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                          暂未设置默认指令，可在左侧指令行点击「设默认」
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 text-xs font-medium"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirmSaveAll}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
          >
            保存设计配置
          </button>
        </div>
      </div>

      {/* Sub-modal: 新增 / 编辑 MCP 工具 */}
      {editingToolId && (
        <McpToolFormModal
          tool={toolDraft}
          isNew={isNewToolDraft}
          existingToolNames={mcpTools
            .filter((t) => isNewToolDraft || t.id !== editingToolId)
            .map((t) => t.name)}
          defaultProtocol={mcpProtocolFilter !== 'all' ? mcpProtocolFilter : 'mqtt'}
          onSave={handleSaveToolFromModal}
          onCancel={cancelToolDraft}
        />
      )}

      {/* Sub-modal: 批量设置 MCP 工具 */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <form
            onSubmit={handleApplyBatchSettings}
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden text-xs"
          >
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-slate-900 text-sm">
                  批量设置 MCP 工具（已选 {selectedToolIds.length} 项）
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
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/70 text-[11px] text-slate-600">
                选中工具：
                <span className="font-semibold text-slate-900 ml-1">
                  {mcpTools
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
                    onChange={(e) => setBatchEnabledAction(e.target.value as 'keep' | 'enable' | 'disable')}
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
                  onChange={(e) => setBatchRemarkMode(e.target.value as 'keep' | 'replace' | 'append')}
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
                className="px-5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
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
