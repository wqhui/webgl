# WebGL 第一章 - 基础2D图形渲染

## 项目概述

本章节是WebGL学习的入门项目，主要介绍WebGL的基础概念和2D图形渲染技术。通过实现简单的几何图形绘制和动画效果，帮助理解WebGL的核心工作原理。

## 核心功能

### 1. 基础图形绘制
- **三角形渲染**：实现彩色三角形的绘制
- **正方形渲染**：通过两个三角形组合绘制正方形
- **倒三角形**：演示不同的顶点组织方式

### 2. 动画系统
- **旋转动画**：实现图形的连续旋转效果
- **颜色动画**：基于时间的动态颜色变化
- **变换矩阵**：使用矩阵进行几何变换

## 技术架构

### 类设计

```javascript
class WebGLApp {
    constructor() {
        this.canvas = null;           // HTML Canvas元素
        this.gl = null;               // WebGL渲染上下文
        this.program = null;          // 基础着色器程序
        this.animationProgram = null; // 动画着色器程序
        this.isAnimating = false;     // 动画状态
    }
}
```

### 着色器系统

#### 基础着色器

**顶点着色器 (vertex.vert)**
```glsl
attribute vec2 a_position; // 顶点位置
attribute vec3 a_color;    // 顶点颜色
varying vec3 v_color;      // 传递给片段着色器的颜色

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_color = a_color;
}
```

**片段着色器 (fragment.frag)**
```glsl
precision mediump float;
varying vec3 v_color;

void main() {
    gl_FragColor = vec4(v_color, 1.0);
}
```

#### 动画着色器

**顶点着色器 (vertex2.vert)**
```glsl
attribute vec2 a_position;
attribute vec3 a_color;
uniform mat3 u_transform;  // 变换矩阵
varying vec3 v_color;

void main() {
    vec3 position = u_transform * vec3(a_position, 1.0);
    gl_Position = vec4(position.xy, 0.0, 1.0);
    v_color = a_color;
}
```

**片段着色器 (fragment2.frag)**
```glsl
precision mediump float;
varying vec3 v_color;
uniform float u_time;  // 时间变量

void main() {
    vec3 color = v_color;
    color.r += sin(u_time) * 0.3;
    color.g += cos(u_time * 1.5) * 0.3;
    color.b += sin(u_time * 2.0) * 0.3;
    gl_FragColor = vec4(color, 1.0);
}
```

## 核心概念详解

### 1. WebGL渲染管线

```
顶点数据 → 顶点着色器 → 图元装配 → 光栅化 → 片段着色器 → 帧缓冲
```

- **顶点着色器**：处理每个顶点的位置和属性
- **片段着色器**：计算每个像素的最终颜色
- **图元装配**：将顶点组装成三角形等基本图元
- **光栅化**：将几何图形转换为像素

### 2. 坐标系统

WebGL使用标准化设备坐标(NDC)：
- X轴：-1.0 (左) 到 +1.0 (右)
- Y轴：-1.0 (下) 到 +1.0 (上)
- Z轴：-1.0 (远) 到 +1.0 (近)

### 3. 缓冲区管理

```javascript
// 创建顶点缓冲区
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// 设置顶点属性
gl.vertexAttribPointer(location, size, type, normalized, stride, offset);
gl.enableVertexAttribArray(location);
```

### 4. 变换矩阵

实现2D变换的3x3矩阵：
```javascript
function createTransformMatrix(tx, ty, rotation, scaleX, scaleY) {
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);
    return new Float32Array([
        c * scaleX, s * scaleX, 0,
        -s * scaleY, c * scaleY, 0,
        tx, ty, 1
    ]);
}
```

## 实现细节

### 1. 初始化流程

```javascript
async init() {
    // 1. 获取Canvas和WebGL上下文
    this.canvas = document.getElementById('webgl-canvas');
    this.gl = this.canvas.getContext('webgl');
    
    // 2. 加载着色器源码
    const vertexShaderSource = await fetch('./shaders/vertex.vert').then(res => res.text());
    const fragmentShaderSource = await fetch('./shaders/fragment.frag').then(res => res.text());
    
    // 3. 创建着色器程序
    this.program = createProgram(this.gl, vertexShaderSource, fragmentShaderSource);
    
    // 4. 设置视口
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
}
```

### 2. 图形绘制

```javascript
drawTriangle() {
    // 顶点数据：位置 + 颜色
    const vertices = new Float32Array([
        // 位置(x,y)    颜色(r,g,b)
         0.0,  0.5,    1.0, 0.0, 0.0,  // 顶部-红色
        -0.5, -0.5,    0.0, 1.0, 0.0,  // 左下-绿色
         0.5, -0.5,    0.0, 0.0, 1.0   // 右下-蓝色
    ]);
    
    this.drawShape(vertices, 3, this.gl.TRIANGLES);
}
```

### 3. 动画实现

```javascript
animate() {
    if (!this.isAnimating) return;
    
    const currentTime = Date.now();
    const elapsed = (currentTime - this.startTime) / 1000.0;
    
    // 设置变换矩阵
    const rotation = elapsed * 2.0; // 每秒旋转2弧度
    const transformMatrix = createTransformMatrix(0, 0, rotation, 1, 1);
    
    // 传递uniform变量
    const transformLocation = this.gl.getUniformLocation(this.animationProgram, 'u_transform');
    this.gl.uniformMatrix3fv(transformLocation, false, transformMatrix);
    
    const timeLocation = this.gl.getUniformLocation(this.animationProgram, 'u_time');
    this.gl.uniform1f(timeLocation, elapsed);
    
    // 绘制并请求下一帧
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
    this.animationId = requestAnimationFrame(() => this.animate());
}
```

## 关键学习点

### 1. WebGL基础概念
- **着色器编程**：理解GLSL语言和着色器的作用
- **缓冲区操作**：学会管理顶点数据
- **渲染管线**：掌握WebGL的渲染流程

### 2. 数学基础
- **坐标变换**：理解2D变换矩阵
- **三角函数**：用于动画和颜色计算
- **向量运算**：顶点位置和颜色的处理

### 3. 编程技巧
- **异步加载**：着色器文件的动态加载
- **事件处理**：用户交互的响应
- **动画循环**：requestAnimationFrame的使用

## 扩展方向

1. **更多几何图形**：圆形、多边形、贝塞尔曲线
2. **高级动画**：缓动函数、关键帧动画
3. **交互功能**：鼠标控制、键盘输入
4. **性能优化**：批量渲染、实例化绘制
5. **视觉效果**：粒子系统、后处理效果

## 常见问题

### Q: 为什么图形显示不出来？
A: 检查以下几点：
- 着色器编译是否成功
- 顶点数据是否正确传递
- 坐标是否在NDC范围内(-1到1)
- WebGL上下文是否正确获取

### Q: 如何调试着色器？
A: 
- 使用`gl.getShaderInfoLog()`获取编译错误信息
- 使用`gl.getProgramInfoLog()`获取链接错误信息
- 在浏览器开发者工具中查看WebGL错误

### Q: 动画卡顿怎么办？
A:
- 使用`requestAnimationFrame`而不是`setInterval`
- 避免在动画循环中进行复杂计算
- 合理控制动画帧率

## 总结

本章通过实现基础的2D图形渲染，建立了对WebGL的基本理解。掌握了着色器编程、缓冲区管理、变换矩阵等核心概念，为后续学习3D渲染打下了坚实基础。

下一章将进入3D世界，学习透视投影、纹理映射、光照计算等高级技术。