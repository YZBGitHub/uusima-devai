export type McpProtocol = 'MQTT' | 'TCP' | 'HTTP' | 'RS232' | 'RS485';
export type McpToolType = '系统内置' | '用户自定义';
export type McpConcurrency = 'parallel' | 'sequential';
export type McpRiskLevel = 'low' | 'medium' | 'high';
export type McpScriptLanguage = 'python' | 'javascript' | 'bash' | 'lua' | 'groovy' | 'go';
export type McpParamType = 'string' | 'integer' | 'number' | 'boolean' | 'object' | 'array';

export interface McpParameterProperty {
  type: McpParamType | McpParamType[];
  description?: string;
}

export interface McpParametersSchema {
  type: 'object';
  additionalProperties: boolean;
  properties: Record<string, McpParameterProperty>;
  required: string[];
}

export const MCP_PROTOCOL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'mqtt', label: 'mqtt' },
  { value: 'http', label: 'http' },
  { value: 'modbus', label: 'modbus' },
  { value: 'tcp', label: 'tcp' },
  { value: 'websocket', label: 'websocket' },
  { value: 'custom', label: 'custom' },
];

export const MCP_PARAM_TYPES: McpParamType[] = [
  'string',
  'integer',
  'number',
  'boolean',
  'object',
  'array',
];

export const MCP_SCRIPT_LANGUAGE_OPTIONS: Array<{
  value: McpScriptLanguage;
  label: string;
  defaultEntrypoint: string;
}> = [
  { value: 'python', label: 'python (Python 3)', defaultEntrypoint: 'run' },
  { value: 'javascript', label: 'javascript (Node.js)', defaultEntrypoint: 'run' },
  { value: 'bash', label: 'bash (Shell)', defaultEntrypoint: '' },
  { value: 'lua', label: 'lua (Lua)', defaultEntrypoint: 'run' },
  { value: 'groovy', label: 'groovy (Groovy)', defaultEntrypoint: 'run' },
  { value: 'go', label: 'go (Go)', defaultEntrypoint: 'Run' },
];

export const MCP_DEFAULT_ENTRYPOINTS: Record<McpScriptLanguage, string> = {
  python: 'run',
  javascript: 'run',
  bash: '',
  lua: 'run',
  groovy: 'run',
  go: 'Run',
};

export const MCP_SCRIPT_TEMPLATES: Record<McpScriptLanguage, string> = {
  python: `def run(p):\n    # p 为输入参数字典\n    return "ok"`,
  javascript: `async function run(p) {\n    // p 为输入参数对象\n    return "ok";\n}`,
  bash: `#!/bin/bash\n# $1 为序列化的 JSON 参数字符串\n\necho "ok"`,
  lua: `function run(p)\n    -- p 为输入参数表\n    return "ok"\nend`,
  groovy: `def run(Map p) {\n    // p 为输入参数 Map\n    return "ok"\n}`,
  go: `package main\n\nfunc Run(p map[string]any) (any, error) {\n    // p 为输入参数 map\n    return "ok", nil\n}`,
};

export interface McpToolInterface {
  id: string;
  methodName: string;
  paramSpec: string;
}

export interface McpToolItem {
  id: string;
  name: string;
  protocol?: string;
  category?: string;
  version?: number;
  toolType?: McpToolType;
  addedAt?: string;
  enabled?: boolean;
  description: string;
  // Execution & Policy
  timeout_seconds?: number;
  concurrency?: McpConcurrency;
  risk?: McpRiskLevel;
  // JSON Schema Parameters
  parameters?: McpParametersSchema;
  // Multi-language Script Execution
  script_language?: McpScriptLanguage;
  script_entrypoint?: string;
  script?: string;
  // Legacy / AI Assistant display fields
  addressOrCode?: string;
  mqttDirection?: 'subscribe' | 'publish' | 'pubsub';
  mqttQos?: '0' | '1' | '2';
  payloadTemplate?: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  httpHeaders?: string;
  tcpEncoding?: 'HEX' | 'ASCII' | 'JSON';
  commandPayload?: string;
  responsePattern?: string;
  slaveAddress?: string;
  modbusFunctionCode?: string;
  serialTerminator?: '\\r\\n' | '\\n' | 'NONE';
  interfaces: McpToolInterface[];
}

export function formatMcpTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function buildProtocolAiTools(
  protocol: McpProtocol,
  model: string,
  sourceHint?: string,
  toolType: McpToolType = '用户自定义'
): McpToolItem[] {
  const slug = (model || 'device').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const ts = Date.now();
  const addedAt = formatMcpTimestamp();

  if (protocol === 'MQTT') {
    return [
      {
        id: `ai-mqtt-${ts}-1`,
        name: `${model || '硬件'}遥测数据上报订阅`,
        protocol: 'MQTT',
        toolType,
        addedAt,
        enabled: true,
        mqttDirection: 'subscribe',
        mqttQos: '1',
        addressOrCode: `iot/${slug}/telemetry/up`,
        payloadTemplate: JSON.stringify(
          {
            deviceId: '${deviceId}',
            timestamp: 1731744000,
            metrics: {
              temperature: 26.4,
              humidity: 54.2,
              voltage: 24.05,
              online: true,
            },
          },
          null,
          2
        ),
        description: sourceHint
          ? `依据文档「${sourceHint}」自动生成：订阅设备周期上报的传感器与运行状态 JSON 载荷`
          : '订阅设备上行遥测主题，自动解析温度、湿度、电压及运行状态 Payload',
        interfaces: [
          { id: `if-${ts}-1a`, methodName: 'subscribe_telemetry', paramSpec: 'topic: string, qos: 1' },
          { id: `if-${ts}-1b`, methodName: 'parse_telemetry_payload', paramSpec: 'payload: TelemetryJson -> DeviceMetrics' },
        ],
      },
      {
        id: `ai-mqtt-${ts}-2`,
        name: '远程控制指令下发发布',
        protocol: 'MQTT',
        toolType,
        addedAt,
        enabled: true,
        mqttDirection: 'publish',
        mqttQos: '1',
        addressOrCode: `iot/${slug}/cmd/down`,
        payloadTemplate: JSON.stringify(
          {
            msgId: '${uuid}',
            action: 'set_relay_channel',
            params: {
              channel: 1,
              state: 'ON',
              timeoutMs: 3000,
            },
          },
          null,
          2
        ),
        description: '向设备下行控制主题发布开关动作、参数校准或软件复位指令 Payload',
        interfaces: [
          { id: `if-${ts}-2a`, methodName: 'publish_control_cmd', paramSpec: 'action: string, params: object' },
          { id: `if-${ts}-2b`, methodName: 'await_cmd_ack', paramSpec: 'msgId: string, timeoutMs: 3000' },
        ],
      },
      {
        id: `ai-mqtt-${ts}-3`,
        name: '设备告警事件上报订阅',
        protocol: 'MQTT',
        toolType,
        addedAt,
        enabled: true,
        mqttDirection: 'subscribe',
        mqttQos: '2',
        addressOrCode: `iot/${slug}/alarm/up`,
        payloadTemplate: JSON.stringify(
          {
            deviceId: '${deviceId}',
            alarmCode: 'E_LINK_TIMEOUT',
            level: 'warning',
            message: 'RS485 sub-node polling timeout',
          },
          null,
          2
        ),
        description: '订阅设备异常告警与掉线事件上报，支持故障联动诊断',
        interfaces: [
          { id: `if-${ts}-3a`, methodName: 'subscribe_alarm_events', paramSpec: 'qos: 2 -> AlarmPayload' },
        ],
      },
    ];
  }

  if (protocol === 'TCP') {
    return [
      {
        id: `ai-tcp-${ts}-1`,
        name: `${model || '硬件'}实时工况报文查询`,
        protocol: 'TCP',
        toolType,
        addedAt,
        enabled: true,
        addressOrCode: '192.168.1.101:8234',
        tcpEncoding: 'HEX',
        commandPayload: 'AA 55 01 03 00 00 00 08 45 D2',
        responsePattern: 'AA 55 01 03 10 [DATA_16B] [CRC16]',
        description: sourceHint
          ? `依据文档「${sourceHint}」生成：通过 TCP Socket 长连接发送 HEX 采集帧并校验回传帧`
          : '建立 TCP Socket 长连接并下发 HEX 查询指令帧，解析设备实时通道数据',
        interfaces: [
          { id: `if-${ts}-t1a`, methodName: 'tcp_send_hex_frame', paramSpec: 'host: string, port: number, frame: hex' },
          { id: `if-${ts}-t1b`, methodName: 'verify_frame_crc16', paramSpec: 'rawBuffer: bytes -> ParsedChannel[]' },
        ],
      },
      {
        id: `ai-tcp-${ts}-2`,
        name: 'TCP 控制指令透传与心跳探测',
        protocol: 'TCP',
        toolType,
        addedAt,
        enabled: true,
        addressOrCode: '192.168.1.101:8234',
        tcpEncoding: 'JSON',
        commandPayload: JSON.stringify(
          {
            cmd: 'DEVICE_HEARTBEAT_PROBE',
            seq: 1001,
            checkChannels: true,
          },
          null,
          2
        ),
        responsePattern: '{"cmd":"DEVICE_HEARTBEAT_ACK","status":"OK","rttMs":4}',
        description: '发送 JSON 透传指令探测设备 TCP 链路存活状态并同步心跳参数',
        interfaces: [
          { id: `if-${ts}-t2a`, methodName: 'tcp_heartbeat_probe', paramSpec: 'timeoutMs: uint16 -> { alive: boolean, rttMs: number }' },
        ],
      },
    ];
  }

  if (protocol === 'HTTP') {
    return [
      {
        id: `ai-http-${ts}-1`,
        name: '查询设备实时运行状态',
        protocol: 'HTTP',
        toolType,
        addedAt,
        enabled: true,
        httpMethod: 'GET',
        addressOrCode: `http://192.168.1.101:8080/api/v1/${slug}/status`,
        httpHeaders: JSON.stringify(
          {
            Accept: 'application/json',
            Authorization: 'Bearer ${apiToken}',
          },
          null,
          2
        ),
        payloadTemplate: JSON.stringify(
          {
            includeSensors: true,
            channelMask: '0xFF',
          },
          null,
          2
        ),
        responsePattern: '{"code":200,"data":{"online":true,"cpuLoad":18.4,"temp":38.2}}',
        description: sourceHint
          ? `依据文档「${sourceHint}」生成：通过 HTTP GET 请求拉取设备在线状态与传感器遥测快照`
          : '调用设备 RESTful GET 接口获取当前在线状态、端口负载与实时传感器数据',
        interfaces: [
          { id: `if-${ts}-h1a`, methodName: 'http_get_device_status', paramSpec: 'url: string, query: object -> StatusResponse' },
        ],
      },
      {
        id: `ai-http-${ts}-2`,
        name: '下发设备端口控制指令',
        protocol: 'HTTP',
        toolType,
        addedAt,
        enabled: true,
        httpMethod: 'POST',
        addressOrCode: `http://192.168.1.101:8080/api/v1/${slug}/control`,
        httpHeaders: JSON.stringify(
          {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ${apiToken}',
          },
          null,
          2
        ),
        payloadTemplate: JSON.stringify(
          {
            channel: 1,
            action: 'switch_on',
            durationSec: 0,
            verifyAck: true,
          },
          null,
          2
        ),
        responsePattern: '{"code":200,"msg":"executed","channelState":"ON"}',
        description: '通过 HTTP POST 提交 JSON 请求体，实现通道开关控制与参数写入',
        interfaces: [
          { id: `if-${ts}-h2a`, methodName: 'http_post_control', paramSpec: 'body: ControlPayload -> ApiResult' },
          { id: `if-${ts}-h2b`, methodName: 'verify_http_ack', paramSpec: 'code: number, msg: string' },
        ],
      },
    ];
  }

  if (protocol === 'RS232') {
    return [
      {
        id: `ai-232-${ts}-1`,
        name: '串口 AT 握手与版本号查询',
        protocol: 'RS232',
        toolType,
        addedAt,
        enabled: true,
        addressOrCode: 'AT+VER? / AT+INFO?',
        commandPayload: 'AT+INFO?',
        serialTerminator: '\\r\\n',
        responsePattern: '+INFO:MODEL=ECU1251,FW=v3.4.2,OK',
        description: sourceHint
          ? `依据文档「${sourceHint}」生成：发送串口 ASCII 指令查询固件版本号及设备序列号`
          : '发送标准串口 AT 文本指令探测设备存活与当前固件版本信息',
        interfaces: [
          { id: `if-${ts}-r1a`, methodName: 'send_at_query', paramSpec: 'cmd: "AT+INFO?", terminator: "\\r\\n"' },
          { id: `if-${ts}-r1b`, methodName: 'check_uart_echo', paramSpec: 'baudRate: number, parity: "8N1"' },
        ],
      },
      {
        id: `ai-232-${ts}-2`,
        name: '串口通道参数读写校准',
        protocol: 'RS232',
        toolType,
        addedAt,
        enabled: true,
        addressOrCode: 'AT+UART=115200,8,1,0',
        commandPayload: 'AT+UART=115200,8,1,0',
        serialTerminator: '\\r\\n',
        responsePattern: '+UART:OK',
        description: '读取或修改设备串口波特率、数据位、停止位及流控模式',
        interfaces: [
          { id: `if-${ts}-r2a`, methodName: 'set_serial_params', paramSpec: 'baud: uint32, flowControl: boolean' },
          { id: `if-${ts}-r2b`, methodName: 'save_and_reboot', paramSpec: 'cmd: "AT+Z" -> "OK"' },
        ],
      },
    ];
  }

  // RS485
  return [
    {
      id: `ai-485-${ts}-1`,
      name: '读取保持寄存器（实时工况）',
      protocol: 'RS485',
      toolType,
      addedAt,
      enabled: true,
      slaveAddress: '0x01',
      modbusFunctionCode: '0x03 读保持寄存器',
      addressOrCode: '0x0000 ~ 0x001F',
      commandPayload: '01 03 00 00 00 10 44 06',
      responsePattern: '01 03 20 [32B寄存器数据] [CRC16] -> 温度/电流/心跳计数',
      description: sourceHint
        ? `依据文档「${sourceHint}」生成：通过 Modbus RTU 0x03 功能码批量读取核心采集寄存器`
        : `使用 Modbus 0x03 功能码批量读取 ${model || '从站'} 运行参数与实时传感器值`,
      interfaces: [
        { id: `if-${ts}-41a`, methodName: 'read_holding_registers', paramSpec: 'slaveAddr: uint8, regStart: 0x0000, count: 16' },
        { id: `if-${ts}-41b`, methodName: 'decode_ieee754_float', paramSpec: 'highWord: uint16, lowWord: uint16 -> number' },
      ],
    },
    {
      id: `ai-485-${ts}-2`,
      name: '写单个控制线圈 / 继电器输出',
      protocol: 'RS485',
      toolType,
      addedAt,
      enabled: true,
      slaveAddress: '0x01',
      modbusFunctionCode: '0x05 写单个线圈',
      addressOrCode: '0x0000 ~ 0x0007',
      commandPayload: '01 05 00 00 FF 00 8C 3A',
      responsePattern: '01 05 00 00 FF 00 8C 3A (原帧回显表示吸合成功)',
      description: '控制多路开关量继电器吸合或断开，并自动回读线圈状态校验',
      interfaces: [
        { id: `if-${ts}-42a`, methodName: 'write_single_coil', paramSpec: 'slaveAddr: uint8, coilAddr: uint16, state: boolean' },
        { id: `if-${ts}-42b`, methodName: 'read_coils_status', paramSpec: 'slaveAddr: uint8, count: 8 -> boolean[]' },
      ],
    },
    {
      id: `ai-485-${ts}-3`,
      name: '修改从站站号与通信波特率',
      protocol: 'RS485',
      toolType,
      addedAt,
      enabled: true,
      slaveAddress: '0x01',
      modbusFunctionCode: '0x06 写单个寄存器',
      addressOrCode: '0x0100',
      commandPayload: '01 06 01 00 00 07 C9 F4',
      responsePattern: '01 06 01 00 00 07 C9 F4',
      description: '配置 RS485 总线从站地址（1~247）及通信校验参数',
      interfaces: [
        { id: `if-${ts}-43a`, methodName: 'write_station_config', paramSpec: 'oldAddr: uint8, newAddr: uint8, baudCode: uint16' },
      ],
    },
  ];
}

export function generateMcpToolsFromPrompt(
  protocol: McpProtocol,
  model: string,
  userPrompt: string
): { summary: string; tools: McpToolItem[] } {
  const trimmed = userPrompt.trim();
  const slug = (model || 'device').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const ts = Date.now();
  const addedAt = formatMcpTimestamp();

  if (!trimmed || /一键|标准|全部|推荐|默认|生成全部/.test(trimmed)) {
    const tools = buildProtocolAiTools(protocol, model);
    return {
      summary: `已结合设备型号「${model || '默认硬件'}」生成 ${tools.length} 个标准 ${protocol} 协议 MCP 工具配置，支持直接应用到左侧工具列表：`,
      tools,
    };
  }

  // Extract entities from user prompt
  const urlMatch = trimmed.match(/https?:\/\/[^\s，。]+|\/api\/[^\s，。]+/i);
  const topicMatch = trimmed.match(/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_${}-]+)+/);
  const hexMatch = trimmed.match(/0x[0-9a-fA-F]{2,4}/g);
  const atMatch = trimmed.match(/AT\+[A-Z0-9_?=]+/i);
  const methodMatch = trimmed.match(/\b(GET|POST|PUT|DELETE)\b/i);

  const isTemp = /温湿度|温度|湿度|传感器|采集|监测/.test(trimmed);
  const isRelay = /继电器|开关|控制|输出|吸合/.test(trimmed);
  const isAlarm = /告警|报警|故障|异常|掉线/.test(trimmed);
  const isReboot = /重启|复位|校准|reset/i.test(trimmed);

  if (protocol === 'MQTT') {
    const isPublish = /发布|下发|控制|指令|重启|继电器/.test(trimmed) && !/订阅|上报/.test(trimmed);
    const topic =
      topicMatch?.[0] ||
      (isAlarm
        ? `iot/${slug}/alarm/up`
        : isPublish
          ? `iot/${slug}/cmd/down`
          : `iot/${slug}/telemetry/up`);

    const payloadObj = isTemp
      ? { deviceId: '${deviceId}', temperature: 25.8, humidity: 58.0, unit: 'C/%' }
      : isRelay
        ? { msgId: '${uuid}', action: 'relay_switch', channel: 1, state: 'ON' }
        : isAlarm
          ? { deviceId: '${deviceId}', alarmLevel: 'critical', code: 'E_SENSOR_ERR', detail: trimmed }
          : { deviceId: '${deviceId}', command: isReboot ? 'reboot' : 'sync_status', timestamp: 1731744000 };

    const tool: McpToolItem = {
      id: `ai-custom-mqtt-${ts}`,
      name: isTemp
        ? '温湿度遥测数据上报订阅'
        : isRelay
          ? '继电器开关指令发布'
          : isAlarm
            ? '设备异常告警上报订阅'
            : `MQTT 自定义交互接口`,
      protocol: 'MQTT',
      toolType: '用户自定义',
      addedAt,
      enabled: true,
      mqttDirection: isPublish ? 'publish' : 'subscribe',
      mqttQos: '1',
      addressOrCode: topic,
      payloadTemplate: JSON.stringify(payloadObj, null, 2),
      description: `根据需求「${trimmed}」生成的 MQTT ${isPublish ? '下行发布' : '上行订阅'}配置`,
      interfaces: [
        {
          id: `if-cm-${ts}-1`,
          methodName: isPublish ? 'publish_mqtt_payload' : 'subscribe_mqtt_topic',
          paramSpec: `topic: "${topic}", qos: 1, payload: JSON`,
        },
      ],
    };
    return {
      summary: `已根据您的描述生成 MQTT ${isPublish ? '发布' : '订阅上报'}工具及 Payload 模板：`,
      tools: [tool],
    };
  }

  if (protocol === 'HTTP') {
    const httpMethod = (methodMatch?.[1]?.toUpperCase() as McpToolItem['httpMethod']) || (isRelay || isReboot ? 'POST' : 'GET');
    const url = urlMatch
      ? urlMatch[0].startsWith('http')
        ? urlMatch[0]
        : `http://192.168.1.101:8080${urlMatch[0]}`
      : `http://192.168.1.101:8080/api/v1/${slug}/${isRelay ? 'relay' : isAlarm ? 'webhook/alarm' : 'telemetry'}`;

    const reqBody =
      httpMethod === 'GET'
        ? { deviceId: '${deviceId}', fields: isTemp ? 'temp,humidity' : 'status,uptime' }
        : isRelay
          ? { channel: 1, state: 'ON', operator: 'agent' }
          : isReboot
            ? { action: 'reboot', delaySec: 2 }
            : { deviceId: '${deviceId}', command: trimmed };

    const tool: McpToolItem = {
      id: `ai-custom-http-${ts}`,
      name: isRelay ? 'HTTP 继电器控制接口' : isTemp ? 'HTTP 温湿度采集接口' : 'HTTP 自定义设备接口',
      protocol: 'HTTP',
      toolType: '用户自定义',
      addedAt,
      enabled: true,
      httpMethod,
      addressOrCode: url,
      httpHeaders: JSON.stringify(
        {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ${apiToken}',
        },
        null,
        2
      ),
      payloadTemplate: JSON.stringify(reqBody, null, 2),
      responsePattern: '{"code":200,"msg":"ok","data":{"success":true}}',
      description: `根据需求「${trimmed}」生成的 HTTP ${httpMethod} 请求配置`,
      interfaces: [
        {
          id: `if-ch-${ts}-1`,
          methodName: `http_${httpMethod.toLowerCase()}_endpoint`,
          paramSpec: `url: "${url}", data: JSON`,
        },
      ],
    };
    return {
      summary: `已为您生成 HTTP ${httpMethod} 请求地址与请求数据配置：`,
      tools: [tool],
    };
  }

  if (protocol === 'TCP') {
    const useJson = /json/i.test(trimmed);
    const tool: McpToolItem = {
      id: `ai-custom-tcp-${ts}`,
      name: isReboot ? 'TCP 设备复位控制帧' : isTemp ? 'TCP 传感数据透传采集' : 'TCP 自定义 Socket 指令',
      protocol: 'TCP',
      toolType: '用户自定义',
      addedAt,
      enabled: true,
      addressOrCode: '192.168.1.101:8234',
      tcpEncoding: useJson ? 'JSON' : 'HEX',
      commandPayload: useJson
        ? JSON.stringify({ cmd: isReboot ? 'REBOOT' : 'QUERY_DATA', target: model || 'GW' }, null, 2)
        : isRelay
          ? 'AA 55 01 05 00 01 FF 00 9D 9A'
          : 'AA 55 01 03 00 00 00 04 44 09',
      responsePattern: useJson ? '{"status":"OK"}' : 'AA 55 01 03 [DATA] [CRC16]',
      description: `根据需求「${trimmed}」生成的 TCP Socket 指令配置`,
      interfaces: [
        {
          id: `if-ct-${ts}-1`,
          methodName: useJson ? 'tcp_send_json' : 'tcp_send_hex',
          paramSpec: 'host: string, port: 8234, payload: string',
        },
      ],
    };
    return {
      summary: '已为您生成 TCP Socket 地址及收发指令配置：',
      tools: [tool],
    };
  }

  if (protocol === 'RS232') {
    const atCmd = atMatch?.[0]?.toUpperCase() || (isReboot ? 'AT+RST' : isTemp ? 'AT+SENSOR?' : 'AT+STATUS?');
    const tool: McpToolItem = {
      id: `ai-custom-232-${ts}`,
      name: `串口指令 ${atCmd}`,
      protocol: 'RS232',
      toolType: '用户自定义',
      addedAt,
      enabled: true,
      addressOrCode: atCmd,
      commandPayload: atCmd,
      serialTerminator: '\\r\\n',
      responsePattern: `+${atCmd.replace('AT+', '').replace('?', '')}:OK`,
      description: `根据需求「${trimmed}」生成的 RS232 串口指令配置`,
      interfaces: [
        {
          id: `if-cr-${ts}-1`,
          methodName: `exec_${atCmd.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
          paramSpec: 'baud: 115200, terminator: "\\r\\n"',
        },
      ],
    };
    return {
      summary: `已为您生成 RS232 串口指令（${atCmd}）与应答规则：`,
      tools: [tool],
    };
  }

  // RS485
  const regAddr = hexMatch?.[0] || (isRelay ? '0x0001' : '0x0020');
  const funcCode = isRelay ? '0x05 写单个线圈' : isReboot ? '0x06 写单个寄存器' : '0x03 读保持寄存器';
  const tool: McpToolItem = {
    id: `ai-custom-485-${ts}`,
    name: isRelay ? `控制线圈 (${regAddr})` : isTemp ? `读取温湿度寄存器 (${regAddr})` : `Modbus 寄存器操作 (${regAddr})`,
    protocol: 'RS485',
    toolType: '用户自定义',
    addedAt,
    enabled: true,
    slaveAddress: '0x01',
    modbusFunctionCode: funcCode,
    addressOrCode: regAddr,
    commandPayload: isRelay
      ? `01 05 ${regAddr.replace('0x', '').padStart(4, '0').match(/.{2}/g)?.join(' ')} FF 00`
      : `01 03 ${regAddr.replace('0x', '').padStart(4, '0').match(/.{2}/g)?.join(' ')} 00 02`,
    responsePattern: isTemp ? 'Reg0=温度(×0.1℃), Reg1=湿度(×0.1%RH)' : '返回标准 Modbus RTU 响应帧并校验 CRC16',
    description: `根据需求「${trimmed}」生成的 RS485 Modbus RTU 指令配置`,
    interfaces: [
      {
        id: `if-c485-${ts}-1`,
        methodName: isRelay ? 'modbus_write_coil' : 'modbus_read_register',
        paramSpec: `slaveAddr: 0x01, regAddr: ${regAddr}`,
      },
    ],
  };
  return {
    summary: `已为您生成 RS485 指令帧与寄存器地址（${regAddr}）配置：`,
    tools: [tool],
  };
}
