import requests
import base64
import os

# 1. 自动从本地读取最新的订阅源地址
source_file = "/www/wwwroot/zhanzhangsanyue.com/url_source.txt"
save_path = "/www/wwwroot/zhanzhangsanyue.com/node.txt"

try:
    with open(source_file, "r") as f:
        source_url = f.read().strip()
    
    # 下载数据
    response = requests.get(source_url)
    if response.status_code == 200:
        raw_data = response.text
        
        # 尝试 Base64 解码，如果失败则说明是明文，直接读取
        try:
            decoded_data = base64.b64decode(raw_data).decode('utf-8')
        except:
            decoded_data = raw_data
            
        # 批量替换名字
        final_data = decoded_data.replace("YouTube频道: 工具大师", "三月空间-专属")
        
        # 重新 Base64 编码 (V2rayN 订阅通常要求是 Base64)
        encoded_data = base64.b64encode(final_data.encode('utf-8')).decode('utf-8')
        
        # 保存
        with open(save_path, "w") as f:
            f.write(encoded_data)
        print("更新成功！")
    else:
        print(f"源站下载失败，状态码: {response.status_code}")
except Exception as e:
    print(f"发生错误: {e}")