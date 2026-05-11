#!/usr/bin/env python3
import requests
from io import BytesIO
from PIL import Image
import base64
import json
import time

# Brand mapping with known logo URLs or sources
BRAND_SOURCES = {
    "uniqlo": "https://www.uniqlo.com/images/top/logo_cmn.png",
    "muji": "https://www.muji.com/images/logo_pc.svg",
    "zara": "https://www.zara.com/wcs/resources/stores/15/staticContent/img/logo.svg",
    "h&m": "https://www2.hm.com/en_us/index.html",  # Will use Clearbit
    "gap": "https://www.gap.com/Logo.svg",
    "levi's": "https://www.levi.com/US/en_US/",
    "nike": "https://www.nike.com/",
    "adidas": "https://www.adidas.com/",
    "puma": "https://www.puma.com/",
    "new balance": "https://www.newbalance.com/",
    "converse": "https://www.converse.com/",
    "vans": "https://www.vans.com/",
    "skechers": "https://www.skechers.com/",
    "anta": "https://www.antasports.com/",
    "li-ning": "https://www.lining.com/",
    "fila": "https://www.filasports.com/",
    "the north face": "https://www.thenorthface.com/",
    "columbia": "https://www.columbia.com/",
    "lululemon": "https://www.lululemon.com/",
    "massimo dutti": "https://www.massimodutti.com/",
    "mont-bell": "https://www.mont-bell.jp/",
    "arc'teryx": "https://www.arcteryx.com/",
    "keen": "https://www.keenfootwear.com/",
    "nanamica": "https://www.nanamica.com/",
    "patagonia": "https://www.patagonia.com/",
    "mammut": "https://www.mammut.com/",
    "salomon": "https://www.salomon.com/",
    "merrell": "https://www.merrell.com/",
    "hoka": "https://www.hoka.com/",
    "on": "https://www.on.com/",
    "black diamond": "https://www.blackdiamondequipment.com/",
    "snow peak": "https://www.snowpeak.com/",
    "deuter": "https://www.deuter.com/",
    "osprey": "https://www.osprey.com/",
    "jack wolfskin": "https://www.jack-wolfskin.com/",
}

def normalize_brand_key(brand_name):
    """Normalize brand name to key format"""
    return brand_name.lower().replace("'", "").replace(" ", "")

def get_clearbit_logo(company_name):
    """Get logo from Clearbit API (free tier available)"""
    try:
        url = f"https://clearbit.com/api/companies/suggest?query={company_name}"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                company = data[0]
                if 'logo' in company and company['logo']:
                    return company['logo']
    except Exception as e:
        print(f"  Clearbit error for {company_name}: {e}")
    
    return None

def download_and_convert_logo(brand_name):
    """Download logo and convert to base64"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        # Try Clearbit first (most reliable)
        print(f"    Trying Clearbit...", end="")
        logo_url = get_clearbit_logo(brand_name)
        
        if not logo_url:
            print(" trying sources...")
            key = brand_name.lower()
            if key in BRAND_SOURCES:
                logo_url = BRAND_SOURCES[key]
            else:
                print(f"    No source found")
                return None
        else:
            print(f" found!")
        
        # Download the image
        print(f"    Downloading from {logo_url[:50]}...", end="")
        img_response = requests.get(logo_url, headers=headers, timeout=15, allow_redirects=True)
        img_response.raise_for_status()
        
        # Handle different image types
        content_type = img_response.headers.get('content-type', '').lower()
        
        if 'svg' in content_type or logo_url.endswith('.svg'):
            # For SVG, encode directly as data URI
            img_base64 = base64.b64encode(img_response.content).decode()
            print(" ✓ (SVG)")
            return f"data:image/svg+xml;base64,{img_base64}"
        else:
            # For raster images, convert to PNG and resize
            img = Image.open(BytesIO(img_response.content)).convert('RGBA')
            img.thumbnail((256, 256), Image.Resampling.LANCZOS)
            
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            img_base64 = base64.b64encode(buffer.getvalue()).decode()
            print(" ✓ (PNG)")
            return f"data:image/png;base64,{img_base64}"
        
    except Exception as e:
        print(f" ✗ ({e})")
        return None

def main():
    brands = list(BRAND_SOURCES.keys())
    logos = {}
    
    print(f"\n{'='*60}")
    print(f"Downloading logos for {len(brands)} brands...")
    print(f"{'='*60}\n")
    
    success_count = 0
    for i, brand in enumerate(brands, 1):
        display_name = brand.title()
        print(f"[{i:2d}/{len(brands)}] {display_name:<20}", end=" ")
        
        logo = download_and_convert_logo(brand)
        if logo:
            key = normalize_brand_key(brand)
            logos[key] = logo
            success_count += 1
        
        # Rate limiting
        time.sleep(0.5)
    
    # Generate JavaScript code
    print(f"\n{'='*60}")
    print(f"Successfully downloaded {success_count}/{len(brands)} logos\n")
    
    js_code = "// Auto-generated brand logos from Clearbit and official sources\n"
    js_code += "// Generated by download_logos.py\n"
    js_code += "const PRESET_BRAND_LOGOS_OFFLINE = {\n"
    
    for key, logo in sorted(logos.items()):
        # For readability, just show the data URI scheme
        js_code += f"  '{key}': '{logo}',\n"
    
    js_code += "};\n\n"
    js_code += "// Fallback to SVG initials for brands without logos\n"
    js_code += "function mergePresetLogos() {\n"
    js_code += "  const preset = buildPresetBrandLogos();\n"
    js_code += "  return { ...PRESET_BRAND_LOGOS_OFFLINE, ...preset };\n"
    js_code += "}\n"
    
    # Save to file
    with open('brand_logos_preset.js', 'w', encoding='utf-8') as f:
        f.write(js_code)
    
    print(f"Generated brand_logos_preset.js")
    print(f"File size: ~{len(js_code) / (1024*1024):.2f} MB")
    print(f"\nIntegration steps:")
    print(f"1. Copy brand_logos_preset.js to your project")
    print(f"2. Load it before app.js in your HTML")
    print(f"3. Update buildPresetBrandLogos() to merge offline logos")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    main()
