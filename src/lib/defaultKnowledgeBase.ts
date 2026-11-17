import type { AgentKnowledgeDoc } from '../components/AgentKnowledgeModal';
import type { CommandTreeNode } from '../components/AgentDesignModal';

export interface DefaultAiConfig {
  assistantName: string;
  welcomeMessage: string;
  kbName: string;
  description: string;
  updatedAt: string;
  docs: AgentKnowledgeDoc[];
  commandTree: CommandTreeNode[];
}

export type DefaultKnowledgeBaseConfig = DefaultAiConfig;

const STORAGE_KEY = 'ai_platform_default_ai_config_v2';
export const DEFAULT_KB_UPDATED_EVENT = 'default-kb-updated';

export function formatKbTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export const INITIAL_DEFAULT_COMMAND_TREE: CommandTreeNode[] = [
  {
    id: 'sys-cmd-cat-1',
    label: '串口与工业总线排错',
    nodeType: 'category',
    children: [
      {
        id: 'sys-cmd-1',
        label: 'USR-410s 串口丢包',
        nodeType: 'command',
        isDefault: true,
        prompt: 'USR-TCP232-410s 串口通信出现 42% 丢包，怎么自愈？',
        commandCode: 'MCP_PROBE USR-TCP232-410s --check-uart --rts-cts --pack-ms=10',
        expectedReply:
          '已完成 USR-TCP232-410s 串口通道诊断：建议开启硬件流控 RTS/CTS、将串口帧打包时间设为 10ms，并确认双方波特率 115200 8N1 完全一致。',
      },
      {
        id: 'sys-cmd-2',
        label: 'ECU-1251 CRC 错误',
        nodeType: 'command',
        isDefault: true,
        prompt: 'ECU-1251 读取 Modbus 从站提示 CRC 校验失败',
        commandCode: 'READ_ERROR_COUNTERS ECU-1251 --bus=rs485 --verify=crc16',
        expectedReply:
          '检测到 Modbus RTU 总线存在 CRC 校验异常：请检查总线首末端是否并联 120Ω 终端匹配电阻、核对 A+/B- 差分极性（>200mV）并将轮询周期调至 100ms 以上。',
      },
    ],
  },
  {
    id: 'sys-cmd-cat-2',
    label: '视觉机械臂与无线传感',
    nodeType: 'category',
    children: [
      {
        id: 'sys-cmd-3',
        label: '机械臂零位校准',
        nodeType: 'command',
        isDefault: true,
        prompt: '视觉分拣台机械臂上电后抓取偏差 5mm，如何标定？',
        commandCode: 'MCP_CALIBRATE ELITE-EC66 --nine-point --port=8055',
        expectedReply:
          '建议重新执行九点手眼标定（重投影误差 <0.25px），并通过 8055 控制端口下发 clearAlarm() 与零位同步指令。',
      },
      {
        id: 'sys-cmd-4',
        label: '大棚传感断流',
        nodeType: 'command',
        isDefault: true,
        prompt: '智慧大棚土壤湿度传感器断流已超过 20 分钟',
        commandCode: 'MCP_LORA_CHECK --band=CN470 --sf=10 --adr=on',
        expectedReply:
          '已定位 LoRa 节点掉线排查方案：请核查 CN470 信道匹配及 12V/24V 供电状态，遮挡场景建议将扩频因子调至 SF10 并开启 ADR 自适应速率。',
      },
    ],
  },
  {
    id: 'sys-cmd-cat-3',
    label: '平台终端通用巡检',
    nodeType: 'category',
    children: [
      {
        id: 'sys-cmd-5',
        label: 'MQTT 心跳断线自检',
        nodeType: 'command',
        isDefault: false,
        prompt: '实训终端 MQTT 接入频繁断线重连如何排查？',
        commandCode: 'MCP_MQTT_PING --port=1883 --keepalive=60',
        expectedReply:
          '请核对 Broker 端口 1883 连通性、心跳保活间隔 60s 及 ClientID 唯一性，检查网口链路与 TLS 证书有效期。',
      },
    ],
  },
];

export const INITIAL_DEFAULT_KB_CONFIG: DefaultAiConfig = {
  assistantName: 'AI 硬件智能助手',
  welcomeMessage:
    '您好！我是 AI 硬件智能助手。我已接入系统默认知识库与默认指令集，随时为您解答硬件接入、通信排错与实训指导问题！',
  kbName: '平台默认硬件与实训通用知识库',
  description:
    '全平台默认知识库，供系统默认 AI 智能助手在日常问答、设备排错与实训指导时优先读取与引用。',
  updatedAt: '2026-03-29 10:00:00',
  docs: [
    {
      id: 'default-doc-1',
      name: 'USR-TCP232-410s串口丢包与流控排查指南.md',
      fileType: 'MD',
      size: '184 KB',
      uploadedAt: '2026-03-28 16:30:00',
      status: 'completed',
      content:
        '当 USR-TCP232-410s 串口通信出现丢包或粘包时，请按以下规范排查：1. 核对双方波特率（默认 115200bps）、数据位 8、停止位 1 及奇偶校验位完全一致；2. 若丢包率高于 5%，需开启硬件流控 RTS/CTS，并将串口帧打包时间调整为 10ms；3. 建议开启 30s 心跳保活包与断线自动重连机制，排查 RS485/RS232 屏蔽接地是否可靠。',
    },
    {
      id: 'default-doc-2',
      name: 'ECU-1251工业网关Modbus_CRC校验排错手册.pdf',
      fileType: 'PDF',
      size: '3.6 MB',
      uploadedAt: '2026-03-28 14:15:00',
      status: 'completed',
      content:
        'ECU-1251 读取 Modbus 从站提示 CRC 校验失败或响应超时（E04）时的标准处理步骤：1. 使用万用表核验 RS485 总线 A+ 对 B- 差分电压应维持在 200mV 以上，检查总线首末端是否并联 120Ω 终端匹配电阻；2. 确认采用手拉手串联拓扑，避免星型分支引起信号反射；3. 检查网关串口 FIFO 缓冲区与轮询周期，建议单节点轮询间隔不低于 100ms；4. 异常码 0x01 表示非法功能码，0x02 表示非法寄存器地址，0x03 表示非法数据值。',
    },
    {
      id: 'default-doc-3',
      name: '协作机械臂视觉标定与零位校准规范.docx',
      fileType: 'DOC',
      size: '2.4 MB',
      uploadedAt: '2026-03-27 11:20:00',
      status: 'completed',
      content:
        '视觉分拣台机械臂上电后出现抓取偏移（如 5mm 偏差）时的校准流程：1. 执行九点手眼标定（Nine-Point Calibration），核对相机像素坐标系与机械臂基座标系仿射变换矩阵，要求重投影平均误差小于 0.25px；2. 解除急停拍下状态后，通过控制端口 8055 下发 clearAlarm() 并重新使能关节伺服；3. 核查光源照度与镜头焦距，确认串口 115200bps 坐标透传帧无截断。',
    },
    {
      id: 'default-doc-4',
      name: '智慧大棚无线传感断流自愈手册.txt',
      fileType: 'TXT',
      size: '96 KB',
      uploadedAt: '2026-03-26 09:40:00',
      status: 'completed',
      content:
        '智慧农业大棚土壤温湿度、EC/PH 传感器断流超过 15 分钟的排查准则：1. 检查 LoRa 节点 CN470 频段（470.3MHz~489.3MHz）信道配置是否与网关一致，遮挡较多区域建议将扩频因子由 SF7 调整为 SF10 并开启 ADR 自适应速率；2. 核查现场 12V/24V 太阳能供电电压及继电器驱动端子接触状态；3. 若 EC/PH 读数漂移超过 0.3，需触发自清洗电磁阀 15s 后重新采样标定。',
    },
    {
      id: 'default-doc-5',
      name: '平台接入终端通用故障排查与MCP指令规范.md',
      fileType: 'MD',
      size: '412 KB',
      uploadedAt: '2026-03-25 18:05:00',
      status: 'completed',
      content:
        '实训终端接入平台默认遵循以下通信与自愈规范：1. MQTT 接入默认端口 1883，心跳保活周期 60s，断网重连缓存支持最多 4096 条断点续传；2. 下发远程固件 OTA 升级前需通过 SHA256 指纹核验，确保设备处于在线空闲状态；3. 使用系统默认 AI 助手排查设备故障时，可结合寄存器读取、心跳探测与串口自检 MCP 工具快速定位物理链路与协议配置异常。',
    },
  ],
  commandTree: INITIAL_DEFAULT_COMMAND_TREE,
};

export function loadDefaultKbConfig(): DefaultAiConfig {
  if (typeof window === 'undefined') return INITIAL_DEFAULT_KB_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_DEFAULT_KB_CONFIG;
    const parsed = JSON.parse(raw) as Partial<DefaultAiConfig>;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.docs)) {
      return INITIAL_DEFAULT_KB_CONFIG;
    }
    return {
      assistantName: parsed.assistantName || INITIAL_DEFAULT_KB_CONFIG.assistantName,
      welcomeMessage: parsed.welcomeMessage || INITIAL_DEFAULT_KB_CONFIG.welcomeMessage,
      kbName: parsed.kbName || INITIAL_DEFAULT_KB_CONFIG.kbName,
      description: parsed.description ?? INITIAL_DEFAULT_KB_CONFIG.description,
      updatedAt: parsed.updatedAt || INITIAL_DEFAULT_KB_CONFIG.updatedAt,
      docs: parsed.docs,
      commandTree: Array.isArray(parsed.commandTree)
        ? parsed.commandTree
        : INITIAL_DEFAULT_KB_CONFIG.commandTree,
    };
  } catch {
    return INITIAL_DEFAULT_KB_CONFIG;
  }
}

export function saveDefaultKbConfig(config: DefaultAiConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors
  }
  window.dispatchEvent(
    new CustomEvent<DefaultAiConfig>(DEFAULT_KB_UPDATED_EVENT, {
      detail: config,
    })
  );
}

export function collectDefaultCommandsFromTree(
  nodes: CommandTreeNode[],
  path: string[] = []
): Array<{ path: string; node: CommandTreeNode }> {
  const res: Array<{ path: string; node: CommandTreeNode }> = [];
  for (const n of nodes) {
    const curPath = [...path, n.label];
    if (n.nodeType === 'command' && n.isDefault) {
      res.push({ path: path.join(' / '), node: n });
    }
    if (n.children) {
      res.push(...collectDefaultCommandsFromTree(n.children, curPath));
    }
  }
  return res;
}

export function flattenCommandsFromTree(nodes: CommandTreeNode[]): CommandTreeNode[] {
  const res: CommandTreeNode[] = [];
  for (const n of nodes) {
    if (n.nodeType === 'command') {
      res.push(n);
    }
    if (n.children) {
      res.push(...flattenCommandsFromTree(n.children));
    }
  }
  return res;
}

export function countCommandTreeStats(
  nodes: CommandTreeNode[]
): { categories: number; commands: number; defaults: number } {
  let categories = 0;
  let commands = 0;
  let defaults = 0;
  for (const n of nodes) {
    if (n.nodeType === 'category') {
      categories += 1;
      if (n.children) {
        const sub = countCommandTreeStats(n.children);
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

export interface DefaultKbMatch {
  doc: AgentKnowledgeDoc;
  score: number;
  snippet: string;
}

function extractQueryTokens(query: string): string[] {
  const cleaned = query
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9._-]+/g, ' ')
    .trim();
  const rawParts = cleaned.split(/\s+/).filter(Boolean);
  const tokens = new Set<string>();

  for (const part of rawParts) {
    if (part.length >= 2) tokens.add(part);
    if (/[\u4e00-\u9fa5]{3,}/.test(part)) {
      const zhOnly = part.replace(/[^\u4e00-\u9fa5]/g, '');
      for (let i = 0; i < zhOnly.length - 1; i++) {
        tokens.add(zhOnly.slice(i, i + 2));
      }
    }
  }
  return Array.from(tokens);
}

export function retrieveDefaultKbMatches(
  query: string,
  docs: AgentKnowledgeDoc[],
  limit = 3
): DefaultKbMatch[] {
  const completedDocs = docs.filter((d) => d.status === 'completed');
  if (completedDocs.length === 0) return [];

  const qLower = query.trim().toLowerCase();
  const tokens = extractQueryTokens(query);

  const scored: DefaultKbMatch[] = completedDocs.map((doc) => {
    const nameLower = doc.name.toLowerCase();
    const contentText = (doc.content || '').trim();
    const contentLower = contentText.toLowerCase();
    let score = 0;

    if (qLower && (nameLower.includes(qLower) || contentLower.includes(qLower))) {
      score += 12;
    }

    for (const tk of tokens) {
      if (nameLower.includes(tk)) score += 4;
      if (contentLower.includes(tk)) score += 2;
    }

    const snippet =
      contentText.length > 260 ? `${contentText.slice(0, 260)}...` : contentText;

    return { doc, score, snippet };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
