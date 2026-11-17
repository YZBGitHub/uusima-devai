export interface AgentCommand {
  id: string;
  label: string;
  prompt: string;
  response: string;
  codeHint?: string;
}

export interface HardwareAgentItem {
  id: number;
  name: string;
  shortTitle?: string;
  desc: string;
  type: 'system' | 'custom';
  industry: string;
  status: 'published';
  author?: string;
  publishDate?: string;
  views: string;
  popularity: number;
  port: string;
  model: string;
  image: string;
  deviceImage: string;
  isHot?: boolean;
  guideBullets: string[];
  guideTip: string;
  guideHighlight?: string;
  troubleshootingCommands: AgentCommand[];
  controlCommands: AgentCommand[];
}

export const INITIAL_SYSTEM_AGENTS: HardwareAgentItem[] = [
  {
    id: 1,
    name: '人工智能前端设备应用实训平台',
    shortTitle: 'AI 视觉实训平台助手',
    desc: '人工智能前端设备应用实训平台智能体，支持视觉标定、人脸提取与算法排错',
    type: 'system',
    industry: '人工智能',
    status: 'published',
    views: '16.8k',
    popularity: 99,
    port: 'Camera / AI-Host : 554',
    model: 'AI-FRONTEND-V1',
    image: '/assets/agents/device_1.png',
    deviceImage: '/assets/agents/device_1.png',
    isHot: true,
    guideBullets: [
      '完整的错误日志/报错截图',
      '您当前运行的代码片段',
      '正在执行的实训任务名称（如：人脸提取、算法测试等）',
    ],
    guideTip: '根据知识库，若您正在进行数据准备或人脸相关任务，正确的代码运行后应输出',
    guideHighlight: '人脸提取成功！',
    troubleshootingCommands: [
      {
        id: 'ts-1-1',
        label: '人脸提取与视觉算法报错排查',
        prompt: '帮我排查人脸提取任务运行报错及未输出“人脸提取成功！”的原因',
        response:
          '已完成 AI 前端实训平台视觉链路诊断：\n1. 检测摄像头 RTSP 流（端口 554）连接正常，当前帧率 30fps；\n2. 请确认模型权重路径 `/opt/models/face_det_v2.onnx` 已加载，且输入图像尺寸已对齐为 640×640；\n3. 若提示特征提取异常，建议检查光照曝光增益并重试特征点对齐。',
        codeHint: 'face_detector.extract(frame, align=True)',
      },
      {
        id: 'ts-1-2',
        label: '前端摄像头RTSP视频流中断诊断',
        prompt: '人工智能前端设备摄像头 RTSP 拉流失败或画面黑屏如何排查？',
        response:
          '已完成视频采集通道自检：\n1. 核对前端相机网口 PoE 供电状态（当前电压 48V 正常）；\n2. 检查子网掩码与主控板卡是否处于 `192.168.1.x` 同网段；\n3. 建议执行流媒体守护进程重启命令以恢复通道绑定。',
        codeHint: 'rtsp://192.168.1.64:554/h264/ch1/main/av_stream',
      },
      {
        id: 'ts-1-3',
        label: 'NPU 推理算力占用与内存溢出排查',
        prompt: '实训平台运行多路图像识别时出现 NPU 内存不足警告',
        response:
          '检测到当前并发推理线程数为 4：\n1. NPU CMA 内存池使用率达到 92%；\n2. 建议将批处理 `batch_size` 由 8 调整为 2，并释放未关闭的 OpenCV VideoCapture 句柄。',
        codeHint: 'cap.release() && npu_cache_clear()',
      },
    ],
    controlCommands: [
      {
        id: 'ct-1-1',
        label: '执行视觉九点标定自检',
        prompt: '请向实训平台下发视觉九点标定自检指令',
        response:
          '已通过 MCP 协议下发【视觉九点标定自检】指令到 `AI-FRONTEND-V1`：\n- 标定板角点识别率：100%\n- 重投影平均误差：0.18px（符合实训高精度标准）',
      },
      {
        id: 'ct-1-2',
        label: '重启前端推理服务守护进程',
        prompt: '下发命令重启人工智能前端设备推理服务',
        response:
          '已安全重启 `ai-inference.service`，NPU 上下文已清空重建，当前推理延迟恢复至 14.2ms。',
      },
      {
        id: 'ct-1-3',
        label: '采集一帧实训画面快照',
        prompt: '触发前端相机采集当前实训台测试快照',
        response:
          '快照采集指令已响应：分辨率 `1920×1080`，曝光正常，图像质量评分 96 分，已就绪可供后续算法调用。',
      },
    ],
  },
  {
    id: 2,
    name: '四通道数字网络IO控制器',
    shortTitle: '四通道IO控制器助手',
    desc: '适用于四通道数字网络 IO 控制器，支持继电器状态回读与电平跳变排错',
    type: 'system',
    industry: '物联网',
    status: 'published',
    views: '11.2k',
    popularity: 95,
    port: 'Ethernet / Modbus-TCP',
    model: 'USR-IO424',
    image: '/assets/agents/device_2.png',
    deviceImage: '/assets/agents/device_2.png',
    guideBullets: [
      '控制器当前 IP 与 Modbus-TCP 端口号',
      '触发异常的 DI/DO 通道编号（1~4）',
      '实际测得的继电器动作现象或报文内容',
    ],
    guideTip: '根据知识库，读取四通道继电器输出线圈状态应使用功能码 0x01，正常响应报文前缀为',
    guideHighlight: '01 01 01 ...',
    troubleshootingCommands: [
      {
        id: 'ts-2-1',
        label: 'Modbus-TCP 继电器无响应排查',
        prompt: '发送控制指令后四通道继电器没有吸合动作，如何排查？',
        response:
          '已完成 USR-IO424 控制链路分析：\n1. 确认设备工作模式处于 `Modbus-TCP Server` 且端口为 502；\n2. 检查 12V/24V 直流供电端子极性及指示灯状态；\n3. 核实线圈地址映射（DO1~DO4 对应寄存器 `0x0000 ~ 0x0003`）。',
        codeHint: 'TX: 00 01 00 00 00 06 01 05 00 00 FF 00',
      },
      {
        id: 'ts-2-2',
        label: '光耦输入通道 DI 电平抖动分析',
        prompt: 'DI 输入通道出现频繁误触发抖动，怎么配置滤波？',
        response:
          '检测到现场存在感性负载反电动势干扰：\n建议将 DI 去抖动滤波时间由默认 10ms 调整为 50ms，并在公共端 COM 接入稳压参考地。',
      },
    ],
    controlCommands: [
      {
        id: 'ct-2-1',
        label: '读取全通道 DI/DO 当前状态',
        prompt: '读取四通道数字网络 IO 控制器当前所有通道状态',
        response:
          '已采集 USR-IO424 实时通道快照：\n- DI1~DI4：[低, 高, 低, 低]\n- DO1~DO4（继电器）：[吸合, 断开, 断开, 吸合]',
      },
      {
        id: 'ct-2-2',
        label: '执行四路继电器轮询自检',
        prompt: '对 DO1~DO4 执行一次顺序脉冲自检',
        response:
          '已下发脉冲自检序列：DO1 -> DO2 -> DO3 -> DO4 均已完成 200ms 吸合/释放测试，触点反馈正常。',
      },
    ],
  },
  {
    id: 3,
    name: '中心网关智能体',
    shortTitle: '新大陆中心网关助手',
    desc: '适用于新大陆中心网关设备，支持多协议汇聚调度与边缘节点自愈',
    type: 'system',
    industry: '物联网',
    status: 'published',
    views: '14.5k',
    popularity: 97,
    port: 'WAN/LAN / USB-Host : 8080',
    model: 'NL-GW-2000',
    image: '/assets/agents/device_3.png',
    deviceImage: '/assets/agents/device_3.png',
    guideBullets: [
      '网关南向接入的子设备协议类型（ZigBee / LoRa / RS485）',
      '北向云平台 MQTT 上报状态或断连日志',
      '网关系统管理界面的异常告警截图',
    ],
    guideTip: '根据知识库，新大陆中心网关南向汇聚服务启动成功后，状态日志应包含',
    guideHighlight: 'Gateway Hub Ready [8080]',
    troubleshootingCommands: [
      {
        id: 'ts-3-1',
        label: 'MQTT 北向上云心跳超时排查',
        prompt: '中心网关无法连接实训云平台 MQTT Broker，提示连接超时',
        response:
          '已检查北向链路诊断：\n1. 验证 WAN 口 DHCP/静态网关路由可达；\n2. 确认 ClientID 与三元组鉴权 Token 未与其他实训台冲突；\n3. 建议开启断网本地 SQLite 缓存并测试 1883/8883 端口连通性。',
      },
      {
        id: 'ts-3-2',
        label: 'ZigBee 协调器串口挂载异常排查',
        prompt: '中心网关识别不到内置 ZigBee 协调器节点',
        response:
          '请检查 `/dev/ttyUSB0` 设备节点挂载状态及波特率 115200 配置，必要时重新插拔无线协调器模块并复位 PAN ID。',
      },
    ],
    controlCommands: [
      {
        id: 'ct-3-1',
        label: '刷新南向子设备在线拓扑',
        prompt: '扫描并刷新当前中心网关下挂的所有传感子设备',
        response:
          '南向拓扑扫描完成：当前共发现 12 个在线传感节点（ZigBee 8 个、RS485 4 个），链路丢包率 0.0%。',
      },
      {
        id: 'ct-3-2',
        label: '同步网关本地 NTP 时钟',
        prompt: '下发时钟同步指令校准中心网关系统时间',
        response: '网关 NTP 校时完成，当前系统时间偏差已收敛至 ±2ms。',
      },
    ],
  },
  {
    id: 4,
    name: 'ECU-1251研华工业通讯网关',
    shortTitle: '工业网关智能体',
    desc: '工业协议自解析与边缘采集排错，支持 Modbus / OPC-UA / CAN 总线诊断',
    type: 'system',
    industry: '工业互联网',
    status: 'published',
    views: '13.9k',
    popularity: 96,
    port: 'RS485 / Modbus : 502',
    model: 'ADVANTECH-ECU1251',
    image: '/assets/agents/device_4.png',
    deviceImage: '/assets/agents/device_4.png',
    isHot: true,
    guideBullets: [
      '工业网关当前采集周期与从站站号列表',
      'Modbus CRC 校验报错或 EdgeLink 采集日志',
      'RS485 总线接线方式及终端电阻状态',
    ],
    guideTip: '根据知识库，ECU-1251 进行高速 RS485 轮询时，总线终端需保持匹配以输出',
    guideHighlight: 'CRC Check Passed',
    troubleshootingCommands: [
      {
        id: 'ts-4-1',
        label: 'Modbus CRC 校验失败与总线畸变排查',
        prompt: 'ECU-1251 读取温湿度从站提示 Modbus CRC 校验错误',
        response:
          'RS485 物理总线阻抗分析：\n1. 检测到波形反射畸变率较高，常见原因为未开启终端匹配电阻；\n2. 建议闭合网关侧板 S1 开关（120Ω 负载），并核实 A+/B- 差分线极性未反接；\n3. 将轮询超时参数设为 500ms 以上。',
      },
      {
        id: 'ts-4-2',
        label: 'EdgeLink 采集点表映射异常排查',
        prompt: 'ECU-1251 采集到的浮点数寄存器数值明显异常',
        response:
          '请核对 32 位浮点数的字节序（Big-Endian / Little-Endian Word Swap），在点表配置中切换为 `CDAB` 字节序后即可恢复正常工程值。',
      },
    ],
    controlCommands: [
      {
        id: 'ct-4-1',
        label: '下发 RS485 总线虚拟负载自检',
        prompt: '对 ECU-1251 RS485 端口执行物理链路阻抗与环回自检',
        response:
          '已完成 RS485 端口自检：COM1 误码率 < 1e-6，总线差分电平幅值 2.8V，通信链路状态优良。',
      },
      {
        id: 'ct-4-2',
        label: '重载 EdgeLink 工业采集配置',
        prompt: '热重载 ECU-1251 当前边缘采集点表策略',
        response: 'EdgeLink 采集引擎热重载成功，共激活 36 个实时工业数据测点，采集周期 1000ms。',
      },
    ],
  },
  {
    id: 5,
    name: 'USR-M100 有人DTU智能体',
    shortTitle: '4G DTU 透传助手',
    desc: 'AI硬件智能体-USR-M100 有人 4G DTU，边缘计算网关与无线透传诊断',
    type: 'system',
    industry: '物联网',
    status: 'published',
    views: '10.4k',
    popularity: 93,
    port: '4G-LTE / MQTT',
    model: 'USR-M100',
    image: '/assets/agents/device_5.png',
    deviceImage: '/assets/agents/device_5.png',
    guideBullets: [
      'SIM 卡信号强度（CSQ 值）与注网状态指示灯',
      '云端 Socket / MQTT 服务器地址与心跳包配置',
      '串口透传丢帧或 AT 指令返回错误码',
    ],
    guideTip: '根据知识库，USR-M100 正常附着 4G 网络并建立透传通道时应返回',
    guideHighlight: '+NETOPEN: SUCCESS',
    troubleshootingCommands: [
      {
        id: 'ts-5-1',
        label: '4G 蜂窝网络注网失败排查',
        prompt: 'USR-M100 上电后 NET 指示灯长灭，无法注网连接云端',
        response:
          '已完成蜂窝链路排错：\n1. 确认物联网卡未欠费且已正确插入卡槽（听到咔嗒锁定声）；\n2. 检查 4G 吸盘天线是否紧固并远离金属屏蔽机柜；\n3. 核对 APN 参数是否匹配运营商默认设置。',
      },
      {
        id: 'ts-5-2',
        label: '边缘 Modbus 轮询主动上报异常',
        prompt: 'M100 采集本地仪表正常但未向云平台推送 JSON 数据',
        response:
          '请检查边缘网关的触发上报策略（定时上报 vs 变化上报），并核实 JSON 模板字段映射是否包含非法字符。',
      },
    ],
    controlCommands: [
      {
        id: 'ct-5-1',
        label: '查询 4G 模块信号强度与基站信息',
        prompt: '查询当前 USR-M100 的 CSQ 信号质量与驻网状态',
        response: '查询响应：CSQ = 26（信号优良，-61dBm），网络制式 LTE-FDD，链路驻留稳定。',
      },
      {
        id: 'ct-5-2',
        label: '发送云端心跳保活测试包',
        prompt: '触发 DTU 立即发送一次心跳与状态探测帧',
        response: '已成功向目标 Broker 推送心跳测试帧，往返 RTT 延迟 38ms。',
      },
    ],
  },
  {
    id: 6,
    name: 'LoRa数传终端智能体',
    shortTitle: 'LoRa 远距数传助手',
    desc: '设备智能体-LORA终端，支持扩频因子配置、信道抗干扰与组网调优',
    type: 'system',
    industry: '物联网',
    status: 'published',
    views: '8.8k',
    popularity: 91,
    port: 'LoRa 470MHz / RS485',
    model: 'USR-LG206',
    image: '/assets/agents/device_6.png',
    deviceImage: '/assets/agents/device_6.png',
    guideBullets: [
      '发射端与接收端的信道频点（CH）与扩频因子（SF）',
      '实际通信距离、遮挡环境及 RSSI / SNR 指标',
      '透传串口波特率与分包长度参数',
    ],
    guideTip: '根据知识库，两端 LoRa 模块通信建立的前提是频段、扩频因子与网络 ID 完全一致，测试成功将回显',
    guideHighlight: 'LoRa Link RSSI > -95dBm',
    troubleshootingCommands: [
      {
        id: 'ts-6-1',
        label: 'LoRa 节点收发丢包与频偏诊断',
        prompt: '两个 LoRa 数传终端距离 300 米就频繁丢包，如何调优参数？',
        response:
          '建议优化射频调制参数：\n1. 将扩频因子由 SF7 提升至 SF9 或 SF10 以增强链路预算；\n2. 确认天线频段为 470MHz 专配胶棒天线；\n3. 开启 CAD（信道活动检测）避免同频碰撞。',
      },
    ],
    controlCommands: [
      {
        id: 'ct-6-1',
        label: '执行射频信道噪声底扫描',
        prompt: '扫描 470-510MHz 频段环境底噪以推荐最佳信道',
        response: '频谱扫描完成：推荐切换至信道 CH12（475.5MHz），当前环境底噪 -118dBm，干扰极低。',
      },
    ],
  },
  {
    id: 7,
    name: '串口服务器智能体',
    shortTitle: 'USR-TCP232-410s 助手',
    desc: '波特率自适应匹配与断线自愈，适用于 USR-TCP232-410s 串口终端设备',
    type: 'system',
    industry: '物联网',
    status: 'published',
    views: '18.1k',
    popularity: 98,
    port: 'COM1/COM2 : 8234',
    model: 'USR-TCP232-410s',
    image: '/assets/agents/device_7.png',
    deviceImage: '/assets/agents/device_7.png',
    isHot: true,
    guideBullets: [
      '串口参数配置（波特率、数据位、停止位、校验位）',
      'Socket 工作模式（TCP Server / Client / UDP）与目标端口',
      '出现乱码或丢包的串口抓包十六进制数据',
    ],
    guideTip: '根据知识库，当串口服务器与下位机完成波特率自适应同步后，串口状态将提示',
    guideHighlight: '115200-8-N-1 Synced',
    troubleshootingCommands: [
      {
        id: 'ts-7-1',
        label: '串口数据乱码与波特率不匹配排查',
        prompt: 'USR-TCP232-410s 串口服务器接收下位机数据全是乱码或丢包',
        response:
          '已完成串口帧结构比对：\n1. 检测当前网络侧端口 8234 通信正常；\n2. 发现模块设置波特率 9600 与控制器 115200 不一致导致采样错位；\n3. 建议切换为 `115200bps, 8N1`，并开启类 RFC2217 自适应参数同步。',
        codeHint: 'AT+UART=115200,8,1,NONE,NFC',
      },
      {
        id: 'ts-7-2',
        label: 'TCP 长连接频繁断开重连排查',
        prompt: '串口服务器作为 TCP Client 经常 5 分钟自动断开',
        response:
          '请核查设备内置的心跳包与超时重启机制：建议将 `TCP KeepAlive` 保活周期设为 30s，避免中间路由器 NAT 映射表过期回收。',
      },
    ],
    controlCommands: [
      {
        id: 'ct-7-1',
        label: '一键同步推荐串口参数',
        prompt: '将 115200-8-N-1 推荐参数同步下发至 USR-TCP232-410s',
        response: '参数下发成功：COM1 已更新为 `115200bps / 8位 / 无校验 / 1停止位`，帧错误率已归零。',
      },
      {
        id: 'ct-7-2',
        label: '清空串口收发环形缓冲区',
        prompt: '清理当前串口服务器残余缓存帧',
        response: 'TX/RX 环形缓冲区已清空复位，当前端口处于洁净监听状态。',
      },
    ],
  },
  {
    id: 8,
    name: '智慧大棚环境监测平台',
    shortTitle: '环境智控助手',
    desc: '温湿度传感器融合与设备联动控制，支持无线传感节点断流修复与滴灌调度',
    type: 'system',
    industry: '智慧农业',
    status: 'published',
    views: '9.4k',
    popularity: 92,
    port: 'RS485 / ZigBee',
    model: 'NL-AGRI-HUB',
    image: '/assets/agents/io424-controller.png',
    deviceImage: '/assets/agents/io424-controller.png',
    isHot: true,
    guideBullets: [
      '大棚异常传感器节点编号（如 3 号土壤湿度节点）',
      '当前观测到的环境温湿度/光照告警阈值',
      '联动继电器（风机、卷帘、水阀）的响应异常现象',
    ],
    guideTip: '根据知识库，智慧大棚传感节点恢复链路握手并上报有效土壤墒情后，应输出',
    guideHighlight: 'Sensor Node Online [0x3F1A]',
    troubleshootingCommands: [
      {
        id: 'ts-8-1',
        label: '土壤湿度节点数据断流诊断',
        prompt: '智慧大棚 3 号节点土壤湿度传感器数据中断超过 20 分钟',
        response:
          '已完成 ZigBee 拓扑探测：\n1. 检测到节点 `0x3F1A` 供电电压跌至 2.4V 触发低功耗保护；\n2. 建议检查光伏冗余供电回路接线及探针防腐层；\n3. 已重新校准 60s 低功耗上报周期。',
      },
    ],
    controlCommands: [
      {
        id: 'ct-8-1',
        label: '下发大棚拓扑自愈与唤醒指令',
        prompt: '唤醒智慧大棚休眠节点并激活联动监测策略',
        response: '拓扑自愈指令执行成功：节点 `0x3F1A` 已重新入网，当前土壤含水率 42.6%，空气温度 25.4℃。',
      },
    ],
  },
  {
    id: 9,
    name: '边缘AI视觉分拣工作站',
    shortTitle: '视觉分拣协同体',
    desc: '面向智能制造产线的工业相机识别标定与机械臂抓取轨迹纠偏智能体',
    type: 'system',
    industry: '人工智能',
    status: 'published',
    views: '12.1k',
    popularity: 94,
    port: 'GigE Vision / TCP : 9000',
    model: 'NL-VISION-ARM',
    image: '/assets/agents/ai-terminal.png',
    deviceImage: '/assets/agents/ai-terminal.png',
    guideBullets: [
      '工业相机与机械臂的手眼标定矩阵文件',
      '抓取偏移量（X/Y/Z 轴误差毫米数）',
      '工件目标检测置信度阈值及报错截图',
    ],
    guideTip: '根据知识库，完成手眼九点标定并校验通过后，控制台将打印',
    guideHighlight: 'Hand-Eye Calibration OK',
    troubleshootingCommands: [
      {
        id: 'ts-9-1',
        label: '机械臂抓取偏离零位校准排查',
        prompt: '视觉分拣台机械臂每次上电抓取偏离 5mm，如何校准？',
        response:
          '手眼坐标偏差诊断：\n1. 读取视觉九点标定矩阵与轴 2 编码器零点，发现偏移 +124 counts；\n2. 请执行一键回零宏指令，并更新相机安装高度 Z 轴标定补偿参数。',
      },
    ],
    controlCommands: [
      {
        id: 'ct-9-1',
        label: '运行机械臂一键回零与标定',
        prompt: '执行机械臂回零复位并校准视觉坐标原点',
        response: '回零复位完成，手眼映射残差已收敛至 ±0.12mm，可正常投入分拣实训。',
      },
    ],
  },
  {
    id: 10,
    name: '工业总线协议分析终端',
    shortTitle: '工业总线诊断助手',
    desc: '集成 CAN-Bus / Profinet / Modbus 多协议实时抓包与帧结构智能解析',
    type: 'system',
    industry: '工业互联网',
    status: 'published',
    views: '7.9k',
    popularity: 90,
    port: 'CAN0 / ETH1 : 7000',
    model: 'NL-BUS-ANALYZER',
    image: '/assets/agents/ecu-1251.png',
    deviceImage: '/assets/agents/ecu-1251.png',
    guideBullets: [
      '工业现场总线类型与通信速率（如 CAN 500kbps）',
      '抓取到的异常错误帧 ID 或 Bus-Off 计数',
      '受控伺服驱动器或从站节点地址',
    ],
    guideTip: '根据知识库，CAN 总线帧率与仲裁段无冲突时，分析终端状态栏显示',
    guideHighlight: 'CAN Bus Error Active (0 errors)',
    troubleshootingCommands: [
      {
        id: 'ts-10-1',
        label: 'CAN 总线 Bus-Off 故障排查',
        prompt: '工业总线频繁触发 Bus-Off 状态导致电机掉线',
        response:
          '总线诊断结论：\n1. Bus-Off 通常由波特率不一致或屏蔽双绞线未单端接地引起；\n2. 请检查所有 CAN 节点是否均设为 500kbps，且总线两端已接入 120Ω 终端电阻。',
      },
    ],
    controlCommands: [
      {
        id: 'ct-10-1',
        label: '开启实时 CAN 帧监听与过滤',
        prompt: '启动工业总线错误帧监听抓包',
        response: '监听通道已启动：最近 1000 帧通信正常，Bus Load 占用率 23.4%，零丢帧。',
      },
    ],
  },
];

export const INITIAL_CUSTOM_AGENTS: HardwareAgentItem[] = [
  {
    id: 11,
    name: '自定义PLC梯形图调试助手',
    shortTitle: 'PLC 梯形图助手',
    desc: '针对特定型号 PLC 的梯形图编程与通讯异常自助调试',
    type: 'custom',
    industry: '工业互联网',
    status: 'published',
    author: '张**',
    publishDate: '2026-03-24 14:30',
    views: '1.2k',
    popularity: 84,
    port: 'TCP/IP : 5000',
    model: 'CUSTOM-PLC-01',
    image: '/assets/agents/device_8.png',
    deviceImage: '/assets/agents/device_8.png',
    guideBullets: [
      'PLC 型号与当前梯形图逻辑程序段',
      'X/Y 软元件地址及监控表异常状态',
      '编程软件下载报错代码',
    ],
    guideTip: '根据自定义知识库，PLC 梯形图联机监控建立成功后，状态栏将显示',
    guideHighlight: 'PLC RUN · Online Monitor',
    troubleshootingCommands: [
      {
        id: 'ts-11-1',
        label: '梯形图自锁回路不复位排查',
        prompt: '梯形图起保停控制回路按下停止按钮后无法断开',
        response:
          '梯形图逻辑检查建议：\n1. 核对停止按钮物理接线为常闭还是常开触点；\n2. 确认梯形图中串联的停止软元件 `X001` 触点类型未与物理触点双重取反。',
      },
    ],
    controlCommands: [
      {
        id: 'ct-11-1',
        label: '读取 PLC 核心软元件状态字',
        prompt: '读取 PLC 当前 D0~D10 数据寄存器快照',
        response: '已采集寄存器快照：PLC 运行模式 `RUN`，扫描周期 4.2ms，无 I/O 报警。',
      },
    ],
  },
  {
    id: 12,
    name: '智慧农业水肥联动智能体',
    shortTitle: '水肥联动助手',
    desc: '多路电磁阀继电器控制与土壤温湿度传感联动排错',
    type: 'custom',
    industry: '智慧农业',
    status: 'published',
    author: '李**',
    publishDate: '2026-03-22 09:15',
    views: '850',
    popularity: 79,
    port: 'RS485-2 / Modbus',
    model: 'CUSTOM-AGRI-02',
    image: '/assets/agents/device_2.png',
    deviceImage: '/assets/agents/device_2.png',
    guideBullets: [
      'EC/PH 传感器实时采集读数',
      '电磁阀继电器通道编号与水泵联锁条件',
      '异常联动日志或灌溉超时告警',
    ],
    guideTip: '根据自定义知识库，水肥一体化配比达标且电磁阀开度正常时，系统记录为',
    guideHighlight: 'Irrigation Cycle Balanced',
    troubleshootingCommands: [
      {
        id: 'ts-12-1',
        label: '电磁阀继电器联动超时排查',
        prompt: '土壤湿度低于阈值但 2 号灌溉电磁阀未自动开启',
        response:
          '联动策略检查：\n1. 确认当前处于“自动联动模式”而非“手动锁定”；\n2. 检查水泵压力保护开关信号是否已满足开启前置条件。',
      },
    ],
    controlCommands: [
      {
        id: 'ct-12-1',
        label: '模拟触发水肥配比联动测试',
        prompt: '执行一次 5 秒水肥电磁阀安全联动自检',
        response: '安全自检完成：1~2 号电磁阀动作响应 85ms，管路压力反馈正常。',
      },
    ],
  },
  {
    id: 13,
    name: '智能电表能耗采集诊断体',
    shortTitle: '电表能耗采集助手',
    desc: 'DL/T645 电力规约解析与实训室配电柜串口抄表排错',
    type: 'custom',
    industry: '工业互联网',
    status: 'published',
    author: '王**',
    publishDate: '2026-03-20 16:40',
    views: '690',
    popularity: 77,
    port: 'RS485 / 2400bps Even',
    model: 'CUSTOM-METER-03',
    image: '/assets/agents/serial-server.png',
    deviceImage: '/assets/agents/serial-server.png',
    guideBullets: [
      '电表表号（12位 BCD 码）与规约版本（DL/T645-2007）',
      '发送的前导唤醒字节 `FE FE FE FE` 及回传报文',
      '偶校验（Even）串口参数截图',
    ],
    guideTip: '根据自定义知识库，DL/T645 规约默认串口参数为 2400bps 偶校验，读表成功返回',
    guideHighlight: '68 ... 16 (Meter Read OK)',
    troubleshootingCommands: [
      {
        id: 'ts-13-1',
        label: 'DL/T645 抄表无应答排查',
        prompt: '发送电表读取报文后没有任何数据返回',
        response:
          '规约排查建议：\n1. DL/T645-2007 默认采用 `2400bps, 8数据位, 偶校验(Even), 1停止位`，切勿误设为无校验；\n2. 请确认帧头包含 4 个 `0xFE` 唤醒字节且表地址按低字节在前逆序填充。',
      },
    ],
    controlCommands: [
      {
        id: 'ct-13-1',
        label: '测试读取正向有功总电能',
        prompt: '下发 DL/T645 读取电表总有功电量测试帧',
        response: '抄表成功：当前总有功电能 1428.64 kWh，A/B/C 三相电压 220.4V 正常。',
      },
    ],
  },
  {
    id: 14,
    name: '校园LoRa气象站调测助手',
    shortTitle: '气象站调测助手',
    desc: '风速风向、雨量传感与 LoRa 低功耗休眠唤醒周期配置调测',
    type: 'custom',
    industry: '物联网',
    status: 'published',
    author: '陈**',
    publishDate: '2026-03-18 11:05',
    views: '540',
    popularity: 75,
    port: 'LoRa 470MHz / Solar',
    model: 'CUSTOM-WEATHER-04',
    image: '/assets/agents/lora-terminal.png',
    deviceImage: '/assets/agents/lora-terminal.png',
    guideBullets: [
      '气象站传感采集包格式与唤醒间隔',
      '太阳能蓄电池当前电压与电量百分比',
      '网关接收时间戳中断日志',
    ],
    guideTip: '根据自定义知识库，气象站定时唤醒完成全要素采集上报后，日志记录为',
    guideHighlight: 'Weather Telemetry Uploaded',
    troubleshootingCommands: [
      {
        id: 'ts-14-1',
        label: '雨量计脉冲计数漏采排查',
        prompt: '翻斗式雨量计降雨时脉冲计数偏少',
        response:
          '低功耗中断唤醒建议：\n请将雨量计脉冲信号接入 MCU 外部下降沿唤醒引脚（EXTI），避免休眠期间错过瞬时脉冲。',
      },
    ],
    controlCommands: [
      {
        id: 'ct-14-1',
        label: '远程触发气象站即时上报',
        prompt: '唤醒气象站采集一次瞬时风速与温湿度数据',
        response: '即时上报成功：风速 3.2m/s（东南风），气温 22.8℃，气压 1013.2hPa。',
      },
    ],
  },
];

const CUSTOM_AGENTS_STORAGE_KEY = 'uusima_custom_agents_v1';

export function getCustomAgents(): HardwareAgentItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_AGENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return INITIAL_CUSTOM_AGENTS;
}

export function saveCustomAgents(agents: HardwareAgentItem[]): void {
  try {
    localStorage.setItem(CUSTOM_AGENTS_STORAGE_KEY, JSON.stringify(agents));
  } catch {
    // ignore storage errors
  }
}

export function getAllAgents(): HardwareAgentItem[] {
  return [...INITIAL_SYSTEM_AGENTS, ...getCustomAgents()];
}

export function getAgentById(id: number): HardwareAgentItem | undefined {
  return getAllAgents().find((a) => a.id === id);
}

export function getHotAgents(): HardwareAgentItem[] {
  const all = getAllAgents();
  // Return the 4 featured hot agents in specific order: 7 (USR-TCP232-410s), 4 (ECU-1251), 1 (AI实训平台), 8 (智慧大棚)
  const hotIds = [7, 4, 1, 8];
  return hotIds
    .map((id) => all.find((a) => a.id === id))
    .filter((a): a is HardwareAgentItem => Boolean(a));
}
