// 由 scripts/gen-docs.mjs 生成, 请勿手改 (改动会被下次生成覆盖)
window.MAGIC_TOOLS_DATA = {
  "name": "Magic Tools",
  "version": "1.4.0",
  "description": "开发者工具箱: 类型转换 / 编解码 / 加解密 / 值计算 / 格式化 / 生成器 / 站长工具 等 119 个工具, 左侧活动栏一键进入",
  "publisher": "freewu",
  "extensionId": "freewu.magic-tools-vscode",
  "license": "MIT",
  "engines": "^1.75.0",
  "total": 119,
  "types": [
    {
      "key": "convert",
      "name": "类型转换",
      "tools": [
        {
          "key": "NumberConvert",
          "name": "进制转换",
          "icon": "Number"
        },
        {
          "key": "LatLngConvert",
          "name": "经纬度格式转换",
          "icon": "Environment"
        },
        {
          "key": "DistanceConvert",
          "name": "距离转换",
          "icon": "ColumnHeight"
        },
        {
          "key": "AreaConvert",
          "name": "面积转换",
          "icon": "BorderOuter"
        },
        {
          "key": "ConfigConvert",
          "name": "配置转换",
          "icon": "Tool"
        },
        {
          "key": "RMBConvert",
          "name": "人民币大写",
          "icon": "MoneyCollect"
        },
        {
          "key": "VolumeConvert",
          "name": "容量转换",
          "icon": "Container"
        },
        {
          "key": "Time",
          "name": "时间戳转换",
          "icon": "ClockCircle"
        },
        {
          "key": "TreePathConvert",
          "name": "树形和路径转换",
          "icon": "Apartment"
        },
        {
          "key": "SpeedConvert",
          "name": "速度转换",
          "icon": "Rocket"
        },
        {
          "key": "TemperatureConvert",
          "name": "温度转换",
          "icon": "Sun"
        },
        {
          "key": "DownloadLinkConvert",
          "name": "下载链接转换",
          "icon": "Link"
        },
        {
          "key": "ColorConvert",
          "name": "颜色格式转换",
          "icon": "FormatPainter"
        },
        {
          "key": "PinyinConvert",
          "name": "中文拼音",
          "icon": "FontSize"
        },
        {
          "key": "WeightConvert",
          "name": "重量转换",
          "icon": "Gold"
        },
        {
          "key": "ByteConvert",
          "name": "字节转换",
          "icon": "Database"
        },
        {
          "key": "SubtitleConvert",
          "name": "字幕格式转换",
          "icon": "FileWord"
        },
        {
          "key": "GPSConvert",
          "name": "GPS坐标转换",
          "icon": "Compass"
        },
        {
          "key": "IPConvert",
          "name": "IP 转换",
          "icon": "Wifi"
        },
        {
          "key": "JSONLConvert",
          "name": "JSONL 转换",
          "icon": "FileSync"
        }
      ]
    },
    {
      "key": "codec",
      "name": "编解码",
      "tools": [
        {
          "key": "MorseCodec",
          "name": "摩斯码编解码",
          "icon": "Sound"
        },
        {
          "key": "Base58Codec",
          "name": "Base58 编解码",
          "icon": "Tag"
        },
        {
          "key": "Base64",
          "name": "Base64 编解码",
          "icon": "Swap"
        },
        {
          "key": "BaseXCodec",
          "name": "BaseX 编解码",
          "icon": "FieldNumber"
        },
        {
          "key": "BCDCodec",
          "name": "BCD 编解码",
          "icon": "FieldBinary"
        },
        {
          "key": "GzipCodec",
          "name": "Gzip 编解码",
          "icon": "FileZip"
        },
        {
          "key": "BasicAuthCodec",
          "name": "HTTP Basic Auth 编解码",
          "icon": "UserSwitch"
        },
        {
          "key": "JWTDecoder",
          "name": "JWT 编解码器",
          "icon": "Idcard"
        },
        {
          "key": "Punycode",
          "name": "Punycode 编解码",
          "icon": "Chrome"
        },
        {
          "key": "Unicode",
          "name": "Unicode 编解码",
          "icon": "FontSize"
        },
        {
          "key": "URL",
          "name": "URL 编解码",
          "icon": "Link"
        },
        {
          "key": "UUencode",
          "name": "UUencode 编解码",
          "icon": "Upload"
        },
        {
          "key": "XXencode",
          "name": "XXencode 编解码",
          "icon": "Download"
        }
      ]
    },
    {
      "key": "crypto",
      "name": "加解密",
      "tools": [
        {
          "key": "TripleDESCrypto",
          "name": "3DES 加解密",
          "icon": "Verified"
        },
        {
          "key": "CaesarCrypto",
          "name": "凯撒加解密",
          "icon": "Translation"
        },
        {
          "key": "VigenereCrypto",
          "name": "维吉尼亚加解密",
          "icon": "BorderlessTable"
        },
        {
          "key": "HillCrypto",
          "name": "希尔加解密",
          "icon": "Table"
        },
        {
          "key": "RailFenceCrypto",
          "name": "栅栏加解密",
          "icon": "VerticalAlignMiddle"
        },
        {
          "key": "ZucCrypto",
          "name": "祖冲之序列密码",
          "icon": "Aim"
        },
        {
          "key": "AESCrypto",
          "name": "AES 加解密",
          "icon": "SafetyCertificate"
        },
        {
          "key": "BlowfishCrypto",
          "name": "Blowfish 加解密",
          "icon": "Experiment"
        },
        {
          "key": "ChaCha20Crypto",
          "name": "ChaCha20 加解密",
          "icon": "Thunderbolt"
        },
        {
          "key": "CiscoType7",
          "name": "Cisco Type 7 加解密",
          "icon": "Hdd"
        },
        {
          "key": "DESCrypto",
          "name": "DES 加解密",
          "icon": "Safety"
        },
        {
          "key": "RabbitCrypto",
          "name": "Rabbit 加解密",
          "icon": "Rocket"
        },
        {
          "key": "RC2Crypto",
          "name": "RC2 加解密",
          "icon": "Control"
        },
        {
          "key": "RC4Crypto",
          "name": "RC4 加解密",
          "icon": "Code"
        },
        {
          "key": "RC5Crypto",
          "name": "RC5 加解密",
          "icon": "PropertySafety"
        },
        {
          "key": "RC6Crypto",
          "name": "RC6 加解密",
          "icon": "SecurityScan"
        },
        {
          "key": "RSACrypto",
          "name": "RSA 加解密",
          "icon": "Key"
        },
        {
          "key": "SM2Crypto",
          "name": "SM2 加解密",
          "icon": "Idcard"
        },
        {
          "key": "SM4Crypto",
          "name": "SM4 加解密",
          "icon": "FileProtect"
        },
        {
          "key": "SM9Crypto",
          "name": "SM9 加解密",
          "icon": "Idcard"
        },
        {
          "key": "TEACrypto",
          "name": "TEA 加解密",
          "icon": "Coffee"
        },
        {
          "key": "XTEACrypto",
          "name": "XTEA 加解密",
          "icon": "Coffee"
        },
        {
          "key": "XXTEACrypto",
          "name": "XXTEA 加解密",
          "icon": "Coffee"
        }
      ]
    },
    {
      "key": "value-calc",
      "name": "值计算",
      "tools": [
        {
          "key": "ComplementCalc",
          "name": "原码/反码/补码计算",
          "icon": "SwapLeft"
        },
        {
          "key": "BCCCheck",
          "name": "BCC 校验",
          "icon": "CheckSquare"
        },
        {
          "key": "BcryptCalc",
          "name": "BCrypt",
          "icon": "Lock"
        },
        {
          "key": "CMACCalc",
          "name": "CMAC 计算",
          "icon": "Audit"
        },
        {
          "key": "CRCCheck",
          "name": "CRC 校验",
          "icon": "CheckCircle"
        },
        {
          "key": "Hash",
          "name": "Hash 值计算",
          "icon": "Solution"
        },
        {
          "key": "HKDFCalc",
          "name": "HKDF 计算",
          "icon": "DeploymentUnit"
        },
        {
          "key": "HmacHash",
          "name": "HmacHash 值计算",
          "icon": "Verified"
        },
        {
          "key": "KeccakHash",
          "name": "Keccak Hash 值计算",
          "icon": "HeatMap"
        },
        {
          "key": "KMACCalc",
          "name": "KMAC 计算",
          "icon": "Insurance"
        },
        {
          "key": "LRCCheck",
          "name": "LRC 校验",
          "icon": "Check"
        },
        {
          "key": "PBKDF2Calc",
          "name": "PBKDF2 值计算",
          "icon": "Sync"
        },
        {
          "key": "PPICalc",
          "name": "PPI计算",
          "icon": "Monitor"
        },
        {
          "key": "ScryptCalc",
          "name": "Scrypt",
          "icon": "Unlock"
        },
        {
          "key": "SHA3Hash",
          "name": "SHA3 Hash 值计算",
          "icon": "DotChart"
        }
      ]
    },
    {
      "key": "formatter",
      "name": "格式化",
      "tools": [
        {
          "key": "VditorMarkdown",
          "name": "即时渲染 Markdown",
          "icon": "Edit"
        },
        {
          "key": "MindMap",
          "name": "思维导图",
          "icon": "Apartment"
        },
        {
          "key": "CnEnSpacing",
          "name": "中英文自动排版",
          "icon": "AlignCenter"
        },
        {
          "key": "HtmlFormat",
          "name": "HTML 格式化",
          "icon": "Html5"
        },
        {
          "key": "JsFormatter",
          "name": "JavaScript 格式化",
          "icon": "JavaScript"
        },
        {
          "key": "JsonFormatter",
          "name": "JSON 格式化",
          "icon": "FileText"
        },
        {
          "key": "JSON5Formatter",
          "name": "JSON5 格式化",
          "icon": "FileAdd"
        },
        {
          "key": "MarkdownEditor",
          "name": "Markdown 编辑器",
          "icon": "FileMarkdown"
        },
        {
          "key": "MermaidEditor",
          "name": "Mermaid 编辑器",
          "icon": "FunnelPlot"
        },
        {
          "key": "SQLFormatter",
          "name": "SQL 格式化",
          "icon": "ConsoleSql"
        },
        {
          "key": "SvgFormat",
          "name": "SVG 格式化",
          "icon": "Sketch"
        },
        {
          "key": "XmlFormatter",
          "name": "XML 格式化",
          "icon": "Snippets"
        }
      ]
    },
    {
      "key": "image",
      "name": "图片",
      "tools": [
        {
          "key": "PixelArt",
          "name": "像素图",
          "icon": "PicCenter"
        }
      ]
    },
    {
      "key": "generator",
      "name": "生成器",
      "tools": [
        {
          "key": "GitignoreGenerator",
          "name": ".gitignore 生成",
          "icon": "Fork"
        },
        {
          "key": "Whiteboard",
          "name": "白板",
          "icon": "Highlight"
        },
        {
          "key": "DotMatrixFont",
          "name": "点阵字生成器",
          "icon": "DotChart"
        },
        {
          "key": "QRCodeGenerator",
          "name": "二维码生成",
          "icon": "Qrcode"
        },
        {
          "key": "FakeMeeting",
          "name": "假装开会",
          "icon": "VideoCamera"
        },
        {
          "key": "ChatGenerator",
          "name": "聊天生成器",
          "icon": "Message"
        },
        {
          "key": "PasswordGenerator",
          "name": "密码生成",
          "icon": "EyeInvisible"
        },
        {
          "key": "BeadPatternGenerator",
          "name": "拼豆图纸",
          "icon": "HeatMap"
        },
        {
          "key": "SudokuGenerator",
          "name": "数独生成器",
          "icon": "Table"
        },
        {
          "key": "MockData",
          "name": "数据生成",
          "icon": "Database"
        },
        {
          "key": "BarcodeGenerator",
          "name": "条形码生成",
          "icon": "Barcode"
        },
        {
          "key": "CopybookGenerator",
          "name": "字帖生成器",
          "icon": "Edit"
        },
        {
          "key": "CronRules",
          "name": "Cron 规则生成",
          "icon": "Schedule"
        },
        {
          "key": "HtpasswdGenerator",
          "name": "htpasswd 生成",
          "icon": "UserAdd"
        },
        {
          "key": "OTPGenerator",
          "name": "OTP 密码生成器",
          "icon": "Hourglass"
        }
      ]
    },
    {
      "key": "webmaster",
      "name": "站长工具",
      "tools": [
        {
          "key": "KeywordDensity",
          "name": "关键词密度",
          "icon": "Search"
        },
        {
          "key": "BrowserFingerprint",
          "name": "浏览器指纹",
          "icon": "Scan"
        },
        {
          "key": "WebTDKCheck",
          "name": "网页TDK信息检测",
          "icon": "FileSearch"
        },
        {
          "key": "CookieAnalyzer",
          "name": "Cookie 分析",
          "icon": "Coffee"
        },
        {
          "key": "CSRGenerator",
          "name": "CSR 申请文件",
          "icon": "FileProtect"
        },
        {
          "key": "DnsQuery",
          "name": "DNS 查询",
          "icon": "Global"
        },
        {
          "key": "HtmlStripText",
          "name": "HTML 标签去除",
          "icon": "Delete"
        },
        {
          "key": "IptablesRules",
          "name": "iptables 规则",
          "icon": "Fire"
        },
        {
          "key": "MtrQuery",
          "name": "MTR 查询",
          "icon": "RadarChart"
        },
        {
          "key": "NginxConfig",
          "name": "nginx 配置",
          "icon": "CloudServer"
        },
        {
          "key": "RobotsTxtGenerator",
          "name": "robots.txt 生成",
          "icon": "Robot"
        },
        {
          "key": "SitemapCheck",
          "name": "Sitemap 检查",
          "icon": "Apartment"
        },
        {
          "key": "TcRules",
          "name": "tc 规则",
          "icon": "Control"
        },
        {
          "key": "UserAgentParser",
          "name": "UA 解析器",
          "icon": "Scan"
        },
        {
          "key": "UrlExtract",
          "name": "URL 提取",
          "icon": "Export"
        },
        {
          "key": "WhoisQuery",
          "name": "Whois 查询",
          "icon": "InfoCircle"
        }
      ]
    },
    {
      "key": "misc",
      "name": "其它",
      "tools": [
        {
          "key": "RegexTester",
          "name": "正则表达式",
          "icon": "Function"
        },
        {
          "key": "Chmod",
          "name": "Chmod 权限",
          "icon": "Safety"
        },
        {
          "key": "CIDRCalc",
          "name": "CIDR 计算器",
          "icon": "Partition"
        },
        {
          "key": "Color",
          "name": "CSS 配色",
          "icon": "BgColors"
        }
      ]
    }
  ],
  "links": {
    "repo": "https://github.com/freewu/magic-tools-vscode",
    "issues": "https://github.com/freewu/magic-tools-vscode/issues",
    "releases": "https://github.com/freewu/magic-tools-vscode/releases",
    "marketplace": "https://marketplace.visualstudio.com/items?itemName=freewu.magic-tools-vscode",
    "openVsx": "https://open-vsx.org/extension/freewu/magic-tools-vscode",
    "upstream": "https://github.com/freewu/magic-tools",
    "site": "https://freewu.github.io/magic-tools-vscode/"
  }
};
