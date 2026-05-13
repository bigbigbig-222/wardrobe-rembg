"""
AI 背景去除服务 (Render 部署)
使用 rembg 库处理衣服照片
"""

import os
import io
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import rembg

app = Flask(__name__)
CORS(app)

# 初始化 rembg session（加速处理）
SESSION = None

def get_session():
    global SESSION
    if SESSION is None:
        SESSION = rembg.new_session()
    return SESSION

@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({'status': 'ok', 'service': 'rembg-api'})

@app.route('/remove-bg', methods=['POST'])
def remove_background():
    """
    去除背景
    
    请求格式:
    {
        "image": "data:image/jpeg;base64,..." (base64 编码的图片)
    }
    
    响应:
    {
        "success": true,
        "image": "data:image/png;base64,..." (带透明背景的 PNG)
    }
    """
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({'success': False, 'error': 'Missing image data'}), 400
        
        # 解析 base64 图片
        image_data = data['image']
        if image_data.startswith('data:'):
            # 移除 data URL 前缀
            image_data = image_data.split(',', 1)[1]
        
        # 解码
        image_bytes = base64.b64decode(image_data)
        input_image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # 使用 rembg 去除背景
        session = get_session()
        output_image = rembg.remove(input_image, session=session)
        
        # 转换为 base64
        output_bytes = io.BytesIO()
        output_image.save(output_bytes, format='PNG')
        output_bytes.seek(0)
        output_base64 = base64.b64encode(output_bytes.getvalue()).decode()
        
        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{output_base64}'
        })
    
    except Exception as e:
        print(f'Error: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/remove-bg-batch', methods=['POST'])
def remove_background_batch():
    """
    批量去除背景（多张图片）
    
    请求:
    {
        "images": [
            "data:image/jpeg;base64,...",
            ...
        ]
    }
    """
    try:
        data = request.json
        if not data or 'images' not in data:
            return jsonify({'success': False, 'error': 'Missing images'}), 400
        
        images = data['images']
        if not isinstance(images, list):
            return jsonify({'success': False, 'error': 'images must be array'}), 400
        
        results = []
        session = get_session()
        
        for img_data in images:
            try:
                # 解析并处理
                if img_data.startswith('data:'):
                    img_data = img_data.split(',', 1)[1]
                
                image_bytes = base64.b64decode(img_data)
                input_image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
                output_image = rembg.remove(input_image, session=session)
                
                # 转为 base64
                output_bytes = io.BytesIO()
                output_image.save(output_bytes, format='PNG')
                output_bytes.seek(0)
                output_base64 = base64.b64encode(output_bytes.getvalue()).decode()
                
                results.append({
                    'success': True,
                    'image': f'data:image/png;base64,{output_base64}'
                })
            except Exception as e:
                results.append({'success': False, 'error': str(e)})
        
        return jsonify({
            'success': True,
            'results': results
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
