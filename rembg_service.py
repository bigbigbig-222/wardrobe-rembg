#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
REMBG后端服务 - 用于移除衣服背景
使用Flask提供HTTP接口
支持本地运行和云部署
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from rembg import remove
from PIL import Image
import base64
import io
import logging
import traceback
import os

app = Flask(__name__)
CORS(app)  # 启用跨域请求

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.route('/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return jsonify({
        'status': 'ok',
        'service': 'rembg_service',
        'message': 'REMBG后端服务运行正常',
        'environment': os.getenv('ENVIRONMENT', 'development')
    })


@app.route('/remove_background', methods=['POST'])
def remove_background():
    """
    移除图像背景
    
    请求格式:
    {
        'image': 'base64编码的图像数据',
        'format': 'png' (可选，默认png)
    }
    
    返回格式:
    {
        'status': 'success' 或 'error',
        'image': 'base64编码的处理后图像',
        'message': '状态信息'
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({
                'status': 'error',
                'message': '缺少image字段'
            }), 400
        
        # 解码base64图像
        try:
            image_data = base64.b64decode(data['image'])
            input_image = Image.open(io.BytesIO(image_data))
        except Exception as e:
            logger.error(f"图像解码失败: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'图像解码失败: {str(e)}'
            }), 400
        
        logger.info(f"处理图像: {input_image.size}, 格式: {input_image.format}")
        
        # 使用REMBG移除背景
        try:
            output_image = remove(input_image)
        except Exception as e:
            logger.error(f"背景移除失败: {str(e)}\n{traceback.format_exc()}")
            return jsonify({
                'status': 'error',
                'message': f'背景移除失败: {str(e)}'
            }), 500
        
        # 编码为base64并返回
        output_format = data.get('format', 'png').lower()
        if output_format not in ['png', 'jpg', 'jpeg']:
            output_format = 'png'
        
        buffered = io.BytesIO()
        
        # PNG保留透明度，JPG转换为白色背景
        if output_format == 'png':
            output_image.save(buffered, format='PNG')
        else:
            # JPG不支持透明度，转换为RGB并使用白色背景
            rgb_image = Image.new('RGB', output_image.size, (255, 255, 255))
            rgb_image.paste(output_image, mask=output_image.split()[3] if output_image.mode == 'RGBA' else None)
            rgb_image.save(buffered, format='JPEG', quality=95)
        
        buffered.seek(0)
        output_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        logger.info("背景移除成功")
        return jsonify({
            'status': 'success',
            'image': output_base64,
            'message': '背景移除成功'
        })
    
    except Exception as e:
        logger.error(f"未知错误: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'status': 'error',
            'message': f'服务器错误: {str(e)}'
        }), 500


@app.route('/remove_background_url', methods=['POST'])
def remove_background_url():
    """
    移除图像背景 (URL方式)
    
    请求格式:
    {
        'url': '图像URL'
    }
    
    注意: 需要下载URL图像，可能较慢
    """
    try:
        import requests
        
        data = request.get_json()
        
        if not data or 'url' not in data:
            return jsonify({
                'status': 'error',
                'message': '缺少url字段'
            }), 400
        
        url = data['url']
        logger.info(f"从URL获取图像: {url}")
        
        # 下载图像
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            input_image = Image.open(io.BytesIO(response.content))
        except Exception as e:
            logger.error(f"URL图像下载失败: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'图像下载失败: {str(e)}'
            }), 400
        
        # 使用REMBG移除背景
        output_image = remove(input_image)
        
        # 编码为base64并返回
        buffered = io.BytesIO()
        output_image.save(buffered, format='PNG')
        buffered.seek(0)
        output_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        return jsonify({
            'status': 'success',
            'image': output_base64,
            'message': '背景移除成功'
        })
    
    except Exception as e:
        logger.error(f"URL处理错误: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'status': 'error',
            'message': f'服务器错误: {str(e)}'
        }), 500


if __name__ == '__main__':
    # 生产环境使用gunicorn: gunicorn -w 4 -b 0.0.0.0:$PORT rembg_service:app
    # 开发环境运行
    port = int(os.getenv('PORT', 5000))
    is_production = os.getenv('ENVIRONMENT') == 'production'
    
    logger.info(f"启动REMBG后端服务 (环境: {'production' if is_production else 'development'})")
    
    if is_production:
        # 生产环境不使用debug模式
        app.run(
            host='0.0.0.0',
            port=port,
            debug=False,
            threaded=True
        )
    else:
        # 开发环境
        app.run(
            host='127.0.0.1',
            port=port,
            debug=False,
            threaded=True
        )


@app.route('/remove_background', methods=['POST'])
def remove_background():
    """
    移除图像背景
    
    请求格式:
    {
        'image': 'base64编码的图像数据',
        'format': 'png' (可选，默认png)
    }
    
    返回格式:
    {
        'status': 'success' 或 'error',
        'image': 'base64编码的处理后图像',
        'message': '状态信息'
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({
                'status': 'error',
                'message': '缺少image字段'
            }), 400
        
        # 解码base64图像
        try:
            image_data = base64.b64decode(data['image'])
            input_image = Image.open(io.BytesIO(image_data))
        except Exception as e:
            logger.error(f"图像解码失败: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'图像解码失败: {str(e)}'
            }), 400
        
        logger.info(f"处理图像: {input_image.size}, 格式: {input_image.format}")
        
        # 使用REMBG移除背景
        try:
            output_image = remove(input_image)
        except Exception as e:
            logger.error(f"背景移除失败: {str(e)}\n{traceback.format_exc()}")
            return jsonify({
                'status': 'error',
                'message': f'背景移除失败: {str(e)}'
            }), 500
        
        # 编码为base64并返回
        output_format = data.get('format', 'png').lower()
        if output_format not in ['png', 'jpg', 'jpeg']:
            output_format = 'png'
        
        buffered = io.BytesIO()
        
        # PNG保留透明度，JPG转换为白色背景
        if output_format == 'png':
            output_image.save(buffered, format='PNG')
        else:
            # JPG不支持透明度，转换为RGB并使用白色背景
            rgb_image = Image.new('RGB', output_image.size, (255, 255, 255))
            rgb_image.paste(output_image, mask=output_image.split()[3] if output_image.mode == 'RGBA' else None)
            rgb_image.save(buffered, format='JPEG', quality=95)
        
        buffered.seek(0)
        output_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        logger.info("背景移除成功")
        return jsonify({
            'status': 'success',
            'image': output_base64,
            'message': '背景移除成功'
        })
    
    except Exception as e:
        logger.error(f"未知错误: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'status': 'error',
            'message': f'服务器错误: {str(e)}'
        }), 500


@app.route('/remove_background_url', methods=['POST'])
def remove_background_url():
    """
    移除图像背景 (URL方式)
    
    请求格式:
    {
        'url': '图像URL'
    }
    
    注意: 需要下载URL图像，可能较慢
    """
    try:
        import requests
        
        data = request.get_json()
        
        if not data or 'url' not in data:
            return jsonify({
                'status': 'error',
                'message': '缺少url字段'
            }), 400
        
        url = data['url']
        logger.info(f"从URL获取图像: {url}")
        
        # 下载图像
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            input_image = Image.open(io.BytesIO(response.content))
        except Exception as e:
            logger.error(f"URL图像下载失败: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'图像下载失败: {str(e)}'
            }), 400
        
        # 使用REMBG移除背景
        output_image = remove(input_image)
        
        # 编码为base64并返回
        buffered = io.BytesIO()
        output_image.save(buffered, format='PNG')
        buffered.seek(0)
        output_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        return jsonify({
            'status': 'success',
            'image': output_base64,
            'message': '背景移除成功'
        })
    
    except Exception as e:
        logger.error(f"URL处理错误: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'status': 'error',
            'message': f'服务器错误: {str(e)}'
        }), 500


if __name__ == '__main__':
    # 生产环境使用gunicorn: gunicorn -w 4 -b 0.0.0.0:$PORT rembg_service:app
    # 开发环境运行
    port = int(os.getenv('PORT', 5000))
    is_production = os.getenv('ENVIRONMENT') == 'production'
    
    logger.info(f"启动REMBG后端服务 (环境: {'production' if is_production else 'development'})")
    
    if is_production:
        # 生产环境不使用debug模式
        app.run(
            host='0.0.0.0',
            port=port,
            debug=False,
            threaded=True
        )
    else:
        # 开发环境
        app.run(
            host='127.0.0.1',
            port=port,
            debug=False,
            threaded=True
        )
