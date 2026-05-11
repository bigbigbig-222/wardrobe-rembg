#!/usr/bin/env python3
"""
下载真实品牌Logo并转换为Base64 data URIs
支持多个Logo源，自动fallback
"""

import requests
import base64
from io import BytesIO
from PIL import Image
import time
import json

# 品牌Logo源配置 - 按优先级排序
BRAND_LOGO_URLS = {
    # 零售和时尚
    "uniqlo": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Uniqlo_logo.svg/1200px-Uniqlo_logo.svg.png",
        "https://www.uniqlo.com/images/top/logo_cmn.png",
    ],
    "muji": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Muji_logo.svg/1200px-Muji_logo.svg.png",
        "https://www.muji.com/images/logo_pc.svg",
    ],
    "zara": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Zara_logo.svg/1200px-Zara_logo.svg.png",
    ],
    "h&m": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/H%26M-Logo.svg/1200px-H%26M-Logo.svg.png",
    ],
    "gap": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Gap_logo.svg/1200px-Gap_logo.svg.png",
    ],
    "levi's": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Levi_Strauss_%26_Co._logo.svg/1200px-Levi_Strauss_%26_Co._logo.svg.png",
    ],
    
    # 运动品牌
    "nike": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Nike_logo.svg/1200px-Nike_logo.svg.png",
    ],
    "adidas": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Adidas_logo.svg/1200px-Adidas_logo.svg.png",
    ],
    "puma": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Puma_logo.svg/1200px-Puma_logo.svg.png",
    ],
    "new balance": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/New_Balance_logo.svg/1200px-New_Balance_logo.svg.png",
    ],
    "converse": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Converse_logo.svg/1200px-Converse_logo.svg.png",
    ],
    "vans": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Vans_logo.svg/1200px-Vans_logo.svg.png",
    ],
    "skechers": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Skechers_logo.svg/1200px-Skechers_logo.svg.png",
    ],
    "anta": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Anta_logo.svg/1200px-Anta_logo.svg.png",
    ],
    "li-ning": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Li-Ning_logo.svg/1200px-Li-Ning_logo.svg.png",
    ],
    "fila": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Fila_logo.svg/1200px-Fila_logo.svg.png",
    ],
    
    # 户外品牌
    "the north face": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/The_North_Face_logo.svg/1200px-The_North_Face_logo.svg.png",
    ],
    "columbia": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Columbia_Sportswear_logo.svg/1200px-Columbia_Sportswear_logo.svg.png",
    ],
    "lululemon": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Lululemon_athletica_logo.svg/1200px-Lululemon_athletica_logo.svg.png",
    ],
    "massimo dutti": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Massimo_Dutti_logo.svg/1200px-Massimo_Dutti_logo.svg.png",
    ],
    "mont-bell": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Montbell_logo.svg/1200px-Montbell_logo.svg.png",
    ],
    "arc'teryx": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Arc%27teryx_logo.svg/1200px-Arc%27teryx_logo.svg.png",
    ],
    "keen": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Keen_footwear_logo.svg/1200px-Keen_footwear_logo.svg.png",
    ],
    "patagonia": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Patagonia_logo.svg/1200px-Patagonia_logo.svg.png",
    ],
    "salomon": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Salomon_logo.svg/1200px-Salomon_logo.svg.png",
    ],
    "merrell": [
        "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Merrell_logo.svg/1200px-Merrell_logo.svg.png",
    ],
}

def normalize_brand_key(brand):
    return brand.lower().strip().replace("'", "").replace(" ", "")

def download_logo(brand_name, urls):
    """从URL列表中下载Logo，自动fallback"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    for url in urls:
        try:
            print(f"  尝试: {url[:60]}...", end=" ", flush=True)
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            # 判断是否是SVG或图片
            content_type = response.headers.get('content-type', '').lower()
            
            if 'svg' in content_type or url.endswith('.svg'):
                # SVG直接转Base64
                svg_data = response.content
                b64 = base64.b64encode(svg_data).decode()
                print("✓ (SVG)")
                return f"data:image/svg+xml;base64,{b64}"
            else:
                # 图片处理：转PNG并压缩
                img = Image.open(BytesIO(response.content)).convert('RGBA')
                img.thumbnail((256, 256), Image.Resampling.LANCZOS)
                
                buffer = BytesIO()
                img.save(buffer, format='PNG', optimize=True)
                b64 = base64.b64encode(buffer.getvalue()).decode()
                print(f"✓ (PNG, {len(b64)//1024}KB)")
                return f"data:image/png;base64,{b64}"
                
        except Exception as e:
            print(f"✗ ({str(e)[:30]})")
            continue
    
    return None

def main():
    print("=" * 70)
    print("品牌Logo下载器 - 转换为Base64 Data URIs")
    print("=" * 70 + "\n")
    
    logos = {}
    success_count = 0
    
    for i, (brand, urls) in enumerate(BRAND_LOGO_URLS.items(), 1):
        print(f"[{i:2d}/{len(BRAND_LOGO_URLS)}] {brand.upper():<20}", end=" ")
        
        logo = download_logo(brand, urls)
        if logo:
            key = normalize_brand_key(brand)
            logos[key] = logo
            success_count += 1
        
        time.sleep(0.3)  # 限流
    
    print("\n" + "=" * 70)
    print(f"✓ 下载成功: {success_count}/{len(BRAND_LOGO_URLS)}")
    print("=" * 70 + "\n")
    
    # 生成JavaScript代码
    js_code = """// 真实品牌Logo - 自动生成的Base64编码
// 下载时间: 2024年
// 来源: Wikimedia Commons, 品牌官网

const BRAND_LOGO_SOURCES = {
"""
    
    for key, logo in sorted(logos.items()):
        # 显示Logo大小
        size_kb = len(logo) // 1024
        js_code += f"  '{key}': '{logo}', // {size_kb}KB\n"
    
    js_code += """}

// 创建Logo映射
const PRESET_BRAND_LOGOS_CDN = {};

function buildPresetBrandLogosMapping() {
  for (const [brandName, logoUrl] of Object.entries(BRAND_LOGO_SOURCES)) {
    const normalized = String(brandName || "").trim().toLowerCase();
    PRESET_BRAND_LOGOS_CDN[normalized] = logoUrl;
  }
}

// 初始化
buildPresetBrandLogosMapping();
"""
    
    # 保存文件
    filename = "brand_logos_real.js"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(js_code)
    
    print(f"✓ 已生成: {filename}")
    print(f"✓ 文件大小: {len(js_code) / (1024*1024):.2f} MB")
    print("\n使用方法:")
    print("1. 将 brand_logos_real.js 复制到项目目录")
    print("2. 在 index.html 中修改加载顺序:")
    print("   <script src='brand_logos_real.js'></script>")
    print("   <script src='brand_logos_cdn.js'></script>")
    print("   <script src='app.js'></script>")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    main()
