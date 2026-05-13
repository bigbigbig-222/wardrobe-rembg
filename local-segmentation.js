/**
 * 本地背景去除 - 使用 MediaPipe Selfie Segmentation
 * 
 * 优点：
 * - 完全免费，无需服务器
 * - 轻量级（1-2 MB），首次加载快
 * - 保留衣服完整轮廓，去掉背景
 * - 隐私保护（数据不上传）
 * 
 * 缺点：
 * - 处理时间 10-15 秒（首次）
 * - 需要较好的 GPU（移动设备可能较慢）
 */

let segmenter = null;

/**
 * 初始化 MediaPipe 分割模型
 */
async function initSegmenter() {
  if (segmenter) return segmenter;
  
  try {
    console.log('[Segmentation] Loading MediaPipe Selfie Segmentation...');
    
    // 动态加载 MediaPipe
    if (!window.mediapipe) {
      // 加载 MediaPipe 脚本
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1632777927/selfie_segmentation.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    
    // 创建 Selfie Segmentation 对象
    const selfieSegmentation = new window.SelfieSegmentation({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1632777927/${file}`;
      }
    });
    
    segmenter = selfieSegmentation;
    console.log('[Segmentation] Model loaded successfully');
    return segmenter;
  } catch (error) {
    console.error('[Segmentation] Load error:', error);
    throw new Error(`模型加载失败: ${error.message}`);
  }
}

/**
 * 使用 MediaPipe 去除背景
 * @param {HTMLImageElement|HTMLCanvasElement} input - 输入图片或 canvas
 * @returns {Promise<HTMLCanvasElement>} 透明背景的 canvas
 */
async function removeBackgroundWithMediaPipe(input) {
  try {
    // 初始化模型
    const segmenter = await initSegmenter();
    
    // 创建输入 canvas
    let sourceCanvas = input;
    if (input instanceof HTMLImageElement) {
      const canvas = document.createElement('canvas');
      canvas.width = input.naturalWidth || input.width;
      canvas.height = input.naturalHeight || input.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(input, 0, 0);
      sourceCanvas = canvas;
    }
    
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    
    console.log('[Segmentation] Processing image:', `${width}x${height}`);
    
    // 运行分割
    const results = await segmenter.sendImage(sourceCanvas);
    
    // 创建输出 canvas（带透明背景）
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const ctx = outputCanvas.getContext('2d');
    
    // 清空背景
    ctx.clearRect(0, 0, width, height);
    
    // 获取掩码数据
    const mask = results.segmentationMask;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    // 获取原始图像数据
    const sourceCtx = sourceCanvas.getContext('2d');
    const sourceImageData = sourceCtx.getImageData(0, 0, width, height);
    const sourceData = sourceImageData.data;
    
    // 应用掩码：只保留前景（人物），背景透明
    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      const maskValue = mask.data[pixelIndex]; // 0-255，255 为前景
      
      // 复制像素
      data[i] = sourceData[i];       // R
      data[i + 1] = sourceData[i + 1]; // G
      data[i + 2] = sourceData[i + 2]; // B
      // Alpha 通道：根据掩码设置透明度
      data[i + 3] = Math.round(maskValue); // 0-255
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    console.log('[Segmentation] Background removed successfully');
    return outputCanvas;
  } catch (error) {
    console.error('[Segmentation] Error:', error);
    throw error;
  }
}

/**
 * 将 Canvas 转换为 data URL
 */
function canvasToDataUrl(canvas) {
  return canvas.toDataURL('image/png');
}
