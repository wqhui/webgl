# WebGL 第二章 - 高级3D渲染系统

## 项目概述

本章节深入WebGL的3D渲染技术，实现了一个完整的3D立方体渲染系统。项目包含四种不同的渲染模式：基础立方体、纹理映射、光照效果和动画纹理，展示了现代3D图形编程的核心技术。

## 核心功能

### 1. 多模式渲染系统
- **基础模式**：纯色立方体渲染
- **纹理模式**：静态纹理映射
- **光照模式**：Phong光照模型
- **动画纹理**：视频纹理实时渲染

### 2. 3D数学系统
- **透视投影**：真实的3D视觉效果
- **模型视图变换**：物体的位置、旋转、缩放
- **法向量计算**：光照计算的基础

### 3. 纹理管理
- **静态纹理**：程序生成的棋盘格纹理
- **动画纹理**：MP4视频作为纹理源
- **纹理参数**：过滤、包装模式的优化

## 技术架构

### 核心类设计

```javascript
class WebGLRenderer {
    constructor(canvas) {
        this.canvas = canvas;           // Canvas元素
        this.gl = null;                 // WebGL上下文
        this.programs = {};             // 着色器程序集合
        this.buffers = {};              // 缓冲区集合
        this.textures = {};             // 纹理集合
        this.videoElement = null;       // 视频元素
    }
}
```

### 渲染模式枚举

```javascript
const RENDER_MODES = {
    BASIC: 'basic',                    // 基础渲染
    TEXTURE: 'texture',                // 纹理映射
    LIGHTING: 'lighting',              // 光照效果
    ANIMATED_TEXTURE: 'animated-texture' // 动画纹理
};
```

## 着色器系统详解

### 1. 基础着色器

**顶点着色器**
```glsl
attribute vec4 aVertexPosition;
attribute vec4 aVertexColor;

uniform mat4 uModelViewMatrix;  // 模型视图矩阵
uniform mat4 uProjectionMatrix; // 投影矩阵

varying lowp vec4 vColor;

void main(void) {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    vColor = aVertexColor;
}
```

**片段着色器**
```glsl
varying lowp vec4 vColor;

void main(void) {
    gl_FragColor = vColor;
}
```

### 2. 纹理着色器

**顶点着色器**
```glsl
attribute vec4 aVertexPosition;
attribute vec2 aTextureCoord;    // 纹理坐标

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying highp vec2 vTextureCoord;

void main(void) {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    vTextureCoord = aTextureCoord;
}
```

**片段着色器**
```glsl
varying highp vec2 vTextureCoord;
uniform sampler2D uSampler;      // 纹理采样器

void main(void) {
    gl_FragColor = texture2D(uSampler, vTextureCoord);
}
```

### 3. 光照着色器

**顶点着色器**
```glsl
attribute vec4 aVertexPosition;
attribute vec3 aVertexNormal;    // 顶点法向量
attribute vec2 aTextureCoord;

uniform mat4 uNormalMatrix;      // 法向量变换矩阵
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying highp vec2 vTextureCoord;
varying highp vec3 vLighting;

void main(void) {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    vTextureCoord = aTextureCoord;
    
    // 光照计算
    highp vec3 ambientLight = vec3(0.4, 0.4, 0.4);
    highp vec3 directionalLightColor = vec3(0.8, 0.8, 0.8);
    highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));
    
    highp vec4 transformedNormal = normalize(uNormalMatrix * vec4(aVertexNormal, 0.0));
    highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
    
    vLighting = ambientLight + (directionalLightColor * directional);
    vLighting = clamp(vLighting, 0.2, 1.0);
}
```

**片段着色器**
```glsl
varying highp vec2 vTextureCoord;
varying highp vec3 vLighting;

uniform sampler2D uSampler;

void main(void) {
    highp vec4 texelColor = texture2D(uSampler, vTextureCoord);
    gl_FragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
}
```

## 3D数学系统

### 1. 矩阵工具函数

```javascript
const mat4 = {
    // 创建单位矩阵
    create: function() {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    },
    
    // 透视投影矩阵
    perspective: function(out, fovy, aspect, near, far) {
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        
        out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
        out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
        out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
        out[12] = 0; out[13] = 0; out[14] = 2 * far * near * nf; out[15] = 0;
        
        return out;
    },
    
    // 平移变换
    translate: function(out, a, v) {
        const x = v[0], y = v[1], z = v[2];
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
        return out;
    },
    
    // 旋转变换
    rotate: function(out, a, rad, axis) {
        // 四元数旋转实现
        // ...
    }
};
```

### 2. 透视投影

```javascript
// 设置投影矩阵
const fieldOfView = 45 * Math.PI / 180;  // 45度视野角
const aspect = canvas.width / canvas.height; // 宽高比
const zNear = 0.1;   // 近裁剪面
const zFar = 100.0;  // 远裁剪面

const projectionMatrix = mat4.create();
mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
```

### 3. 模型视图变换

```javascript
// 设置模型视图矩阵
const modelViewMatrix = mat4.create();

// 将立方体向后移动6个单位
mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -6.0]);

// 绕Z轴旋转
mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation, [0, 0, 1]);

// 绕Y轴旋转
mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation * 0.7, [0, 1, 0]);
```

## 几何体构建

### 1. 立方体顶点数据

```javascript
initPositionBuffer() {
    const positions = [
        // 前面
        -1.0, -1.0,  1.0,
         1.0, -1.0,  1.0,
         1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,
        
        // 后面
        -1.0, -1.0, -1.0,
        -1.0,  1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0, -1.0, -1.0,
        
        // 其他面...
    ];
    
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
    
    return positionBuffer;
}
```

### 2. 纹理坐标

```javascript
initTextureBuffer() {
    const textureCoordinates = [
        // 每个面的UV坐标
        // 前面
        0.0, 0.0,  1.0, 0.0,  1.0, 1.0,  0.0, 1.0,
        // 后面
        0.0, 0.0,  1.0, 0.0,  1.0, 1.0,  0.0, 1.0,
        // 其他面...
    ];
    
    const textureCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureCoordBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), this.gl.STATIC_DRAW);
    
    return textureCoordBuffer;
}
```

### 3. 法向量数据

```javascript
initNormalBuffer() {
    const normals = [
        // 前面
         0.0,  0.0,  1.0,
         0.0,  0.0,  1.0,
         0.0,  0.0,  1.0,
         0.0,  0.0,  1.0,
        
        // 后面
         0.0,  0.0, -1.0,
         0.0,  0.0, -1.0,
         0.0,  0.0, -1.0,
         0.0,  0.0, -1.0,
        
        // 其他面...
    ];
    
    const normalBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, normalBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.STATIC_DRAW);
    
    return normalBuffer;
}
```

## 纹理系统

### 1. 静态纹理生成

```javascript
createStaticTexture() {
    // 创建棋盘格纹理
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    const tileSize = 32;
    for (let x = 0; x < canvas.width; x += tileSize) {
        for (let y = 0; y < canvas.height; y += tileSize) {
            const isEven = ((x / tileSize) + (y / tileSize)) % 2 === 0;
            ctx.fillStyle = isEven ? '#ffffff' : '#cccccc';
            ctx.fillRect(x, y, tileSize, tileSize);
        }
    }
    
    this.textures[RENDER_MODES.TEXTURE] = this.createTexture(canvas);
    this.textures[RENDER_MODES.LIGHTING] = this.createTexture(canvas);
}
```

### 2. 动画纹理（视频纹理）

```javascript
createAnimatedTexture() {
    // 创建视频元素
    const video = document.createElement('video');
    
    let playing = false;
    let timeupdate = false;
    
    video.playsInline = true;
    video.muted = true;
    video.loop = true;
    video.crossOrigin = 'anonymous';
    
    // 等待视频准备就绪
    video.addEventListener('playing', () => {
        playing = true;
        checkReady();
    }, true);
    
    video.addEventListener('timeupdate', () => {
        timeupdate = true;
        checkReady();
    }, true);
    
    function checkReady() {
        if (playing && timeupdate) {
            copyVideo = true;
        }
    }
    
    video.src = './Firefox.mp4';
    video.play();
    
    // 创建初始纹理
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    
    // 蓝色占位符
    const pixel = new Uint8Array([0, 0, 255, 255]);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixel);
    
    // 设置纹理参数
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    
    this.textures[RENDER_MODES.ANIMATED_TEXTURE] = texture;
    this.videoElement = video;
}
```

### 3. 视频纹理更新

```javascript
updateVideoTexture() {
    if (!this.videoElement || !copyVideo) {
        return;
    }
    
    const texture = this.textures[RENDER_MODES.ANIMATED_TEXTURE];
    
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        this.videoElement
    );
}
```

## 光照系统

### 1. Phong光照模型

光照计算包含三个组件：
- **环境光(Ambient)**：模拟间接光照
- **漫反射(Diffuse)**：基于表面法向量的直接光照
- **镜面反射(Specular)**：高光效果（本项目未实现）

```glsl
// 顶点着色器中的光照计算
highp vec3 ambientLight = vec3(0.4, 0.4, 0.4);
highp vec3 directionalLightColor = vec3(0.8, 0.8, 0.8);
highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));

highp vec4 transformedNormal = normalize(uNormalMatrix * vec4(aVertexNormal, 0.0));
highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);

vLighting = ambientLight + (directionalLightColor * directional);
vLighting = clamp(vLighting, 0.2, 1.0);
```

### 2. 法向量变换

```javascript
// 计算法向量矩阵（模型视图矩阵的逆转置）
const normalMatrix = mat4.create();
// 简化处理：对于均匀缩放，直接使用模型视图矩阵的旋转部分
for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
        normalMatrix[i * 4 + j] = modelViewMatrix[i * 4 + j];
    }
}
normalMatrix[15] = 1.0;
```

## 渲染流程

### 1. 主渲染循环

```javascript
render(mode, deltaTime) {
    // 1. 清除缓冲区
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    
    // 2. 选择着色器程序
    const program = this.programs[mode];
    this.gl.useProgram(program);
    
    // 3. 设置矩阵
    const projectionMatrix = mat4.create();
    const modelViewMatrix = mat4.create();
    
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -6.0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation, [0, 0, 1]);
    
    // 4. 设置属性和uniform
    this.setupAttributes(mode);
    this.setupUniforms(mode, projectionMatrix, modelViewMatrix);
    
    // 5. 绘制
    this.gl.drawElements(this.gl.TRIANGLES, 36, this.gl.UNSIGNED_SHORT, 0);
    
    // 6. 更新旋转角度
    cubeRotation += deltaTime;
}
```

### 2. 动画循环

```javascript
function startAnimation() {
    isAnimating = true;
    let then = 0;
    
    function render(now) {
        if (!isAnimating) return;
        
        now *= 0.001; // 转换为秒
        deltaTime = now - then;
        then = now;
        
        // 更新视频纹理
        if (currentMode === RENDER_MODES.ANIMATED_TEXTURE && copyVideo) {
            renderer.updateVideoTexture();
        }
        
        renderer.render(currentMode, deltaTime);
        
        animationId = requestAnimationFrame(render);
    }
    
    animationId = requestAnimationFrame(render);
}
```

## 性能优化

### 1. 缓冲区管理
- **静态缓冲区**：顶点位置、法向量等不变数据使用`STATIC_DRAW`
- **动态缓冲区**：频繁更新的数据使用`DYNAMIC_DRAW`
- **批量更新**：减少`bufferData`调用次数

### 2. 纹理优化
- **纹理压缩**：使用适当的纹理格式
- **MIP映射**：为2的幂次方纹理生成MIP链
- **纹理参数**：合理设置过滤和包装模式

### 3. 渲染优化
- **深度测试**：启用深度缓冲区
- **背面剔除**：剔除不可见的背面
- **状态缓存**：避免重复的状态切换

## 调试技巧

### 1. 着色器调试
```javascript
// 检查着色器编译错误
if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
    console.error('着色器编译错误:', this.gl.getShaderInfoLog(shader));
}

// 检查程序链接错误
if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
    console.error('程序链接错误:', this.gl.getProgramInfoLog(program));
}
```

### 2. WebGL状态检查
```javascript
// 检查WebGL错误
function checkGLError(gl, operation) {
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
        console.error(`WebGL错误 ${operation}: ${error}`);
    }
}
```

### 3. 性能监控
```javascript
// 帧率监控
let frameCount = 0;
let lastTime = performance.now();

function updateFPS() {
    frameCount++;
    const currentTime = performance.now();
    if (currentTime - lastTime >= 1000) {
        console.log(`FPS: ${frameCount}`);
        frameCount = 0;
        lastTime = currentTime;
    }
}
```

## 扩展方向

### 1. 高级光照
- **点光源**：实现多个点光源
- **聚光灯**：锥形光照效果
- **阴影映射**：实时阴影渲染
- **PBR材质**：基于物理的渲染

### 2. 后处理效果
- **抗锯齿**：FXAA、MSAA
- **景深**：模糊效果
- **色调映射**：HDR渲染
- **屏幕空间反射**：SSR效果

### 3. 几何处理
- **细分曲面**：Tessellation
- **几何着色器**：动态几何生成
- **实例化渲染**：大量物体的高效渲染

### 4. 计算着色器
- **粒子系统**：GPU粒子模拟
- **物理模拟**：布料、流体模拟
- **通用计算**：GPGPU应用

## 常见问题解答

### Q: 立方体显示不正确怎么办？
A: 检查以下几点：
- 顶点索引是否正确
- 深度测试是否启用
- 投影矩阵参数是否合理
- 模型视图变换是否正确

### Q: 纹理显示为黑色？
A: 可能的原因：
- 纹理加载失败
- 纹理坐标错误
- 采样器uniform未正确设置
- 纹理单元绑定错误

### Q: 光照效果不明显？
A: 调整以下参数：
- 增加光照强度
- 检查法向量是否正确
- 确认法向量矩阵计算
- 调整环境光和漫反射比例

### Q: 视频纹理不播放？
A: 检查：
- 视频文件路径是否正确
- 浏览器是否支持视频格式
- CORS设置是否正确
- 视频事件监听是否正常

## 总结

本章实现了一个完整的3D渲染系统，涵盖了现代WebGL开发的核心技术：

1. **3D数学基础**：透视投影、矩阵变换、向量运算
2. **着色器编程**：多种着色器的实现和管理
3. **纹理技术**：静态纹理和动画纹理的处理
4. **光照计算**：Phong光照模型的实现
5. **性能优化**：缓冲区管理和渲染优化

通过这个项目，我们建立了对3D图形编程的深入理解，为后续学习更高级的渲染技术打下了坚实基础。下一步可以探索PBR材质、阴影映射、后处理效果等更高级的渲染技术。