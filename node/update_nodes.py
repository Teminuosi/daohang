import requests
import base64
import yaml  # 运行 pip3 install PyYAML

source_url = "https://hh.yudou226.top/202604/20260405bf3ase.txt"
save_path = "/www/wwwroot/www.sanyue.help/node/node.txt"

# 1. 下载原始数据
response = requests.get(source_url)
raw_data = response.text.strip()

# 2. 解码并转为 Clash 格式 (YAML)
# 这里我们假设原数据是 Base64
decoded = base64.b64decode(raw_data).decode('utf-8')

# 注意：这里我们简化处理，如果不方便转 YAML，我们可以暴力重命名
# 针对 vmess，我们需要找到 ps 字段并替换
import json

lines = decoded.splitlines()
new_lines = []

for line in lines:
    if line.startswith("vmess://"):
        # 对 vmess 链接进行解码修改
        b64_part = line.replace("vmess://", "")
        # 有时候结尾有杂字符，需要处理
        try:
            json_str = base64.b64decode(b64_part).decode('utf-8')
            data = json.loads(json_str)
            data['ps'] = "三月空间-专属" # 强行修改节点名
            new_encoded = base64.b64encode(json.dumps(data).encode('utf-8')).decode('utf-8')
            new_lines.append("vmess://" + new_encoded)
        except:
            new_lines.append(line)
    elif '#' in line:
        # 处理 ss/vless 等
        link_part = line.split('#')[0]
        new_lines.append(link_part + "#三月空间-专属")
    else:
        new_lines.append(line)

final_data = base64.b64encode("\n".join(new_lines).encode('utf-8')).decode('utf-8')
with open(save_path, "w") as f:
    f.write(final_data)
print("所有节点（含vmess）已重命名！")