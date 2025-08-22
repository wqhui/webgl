// WebGL 第二章 - 高级3D渲染系统 (纹理、光照、动画纹理)

// 全局变量
let cubeRotation = 0.0;
let deltaTime = 0;
let currentMode = 'basic';
let isAnimating = false;
let animationId = null;

// 渲染模式枚举
const RENDER_MODES = {
    BASIC: 'basic',
    TEXTURE: 'texture', 
    LIGHTING: 'lighting',
    ANIMATED_TEXTURE: 'animated-texture'
};

// 简单的矩阵工具函数
const mat4 = {
    create: function() {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    },
    
    perspective: function(out, fovy, aspect, near, far) {
        const f = 1.0 / Math.tan(fovy / 2);
        const nf = 1 / (near - far);
        
        out[0] = f / aspect;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        out[4] = 0;
        out[5] = f;
        out[6] = 0;
        out[7] = 0;
        out[8] = 0;
        out[9] = 0;
        out[10] = (far + near) * nf;
        out[11] = -1;
        out[12] = 0;
        out[13] = 0;
        out[14] = 2 * far * near * nf;
        out[15] = 0;
        return out;
    },
    
    translate: function(out, a, v) {
        const x = v[0], y = v[1], z = v[2];
        out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
        out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
        out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
        return out;
    },
    
    rotate: function(out, a, rad, axis) {
        const x = axis[0], y = axis[1], z = axis[2];
        const len = Math.sqrt(x * x + y * y + z * z);
        
        if (len < 0.000001) return out;
        
        const s = Math.sin(rad);
        const c = Math.cos(rad);
        const t = 1 - c;
        
        const nx = x / len;
        const ny = y / len;
        const nz = z / len;
        
        const b00 = nx * nx * t + c;
        const b01 = ny * nx * t + nz * s;
        const b02 = nz * nx * t - ny * s;
        const b10 = nx * ny * t - nz * s;
        const b11 = ny * ny * t + c;
        const b12 = nz * ny * t + nx * s;
        const b20 = nx * nz * t + ny * s;
        const b21 = ny * nz * t - nx * s;
        const b22 = nz * nz * t + c;
        
        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        
        out[0] = a00 * b00 + a10 * b01 + a20 * b02;
        out[1] = a01 * b00 + a11 * b01 + a21 * b02;
        out[2] = a02 * b00 + a12 * b01 + a22 * b02;
        out[3] = a03 * b00 + a13 * b01 + a23 * b02;
        out[4] = a00 * b10 + a10 * b11 + a20 * b12;
        out[5] = a01 * b10 + a11 * b11 + a21 * b12;
        out[6] = a02 * b10 + a12 * b11 + a22 * b12;
        out[7] = a03 * b10 + a13 * b11 + a23 * b12;
        out[8] = a00 * b20 + a10 * b21 + a20 * b22;
        out[9] = a01 * b20 + a11 * b21 + a21 * b22;
        out[10] = a02 * b20 + a12 * b21 + a22 * b22;
        out[11] = a03 * b20 + a13 * b21 + a23 * b22;
        
        if (a !== out) {
            out[12] = a[12];
            out[13] = a[13];
            out[14] = a[14];
            out[15] = a[15];
        }
        return out;
    },
    
    // 向量归一化
    normalize: function(out, a) {
        const x = a[0];
        const y = a[1];
        const z = a[2];
        let len = x * x + y * y + z * z;
        if (len > 0) {
            len = 1 / Math.sqrt(len);
            out[0] = a[0] * len;
            out[1] = a[1] * len;
            out[2] = a[2] * len;
        }
        return out;
    }
};

// 着色器源码管理
// 关键字	作用域	更新频率	用途
// attribute	仅顶点着色器	每个顶点	顶点位置、法线、颜色、纹理坐标
// uniform	顶点 + 片段	每次 draw call	矩阵、材质、灯光、时间变量
// varying	顶点 → 片段	每个片段	插值数据（颜色、纹理坐标）
const shaderSources = {
    // 基础着色器
    basic: {
        vertex: `
            attribute vec4 aVertexPosition;
            attribute vec4 aVertexColor;
            
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            
            varying lowp vec4 vColor;
            
            void main(void) {
                gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
                vColor = aVertexColor;
            }
        `,
        fragment: `
            varying lowp vec4 vColor;
            
            void main(void) {
                gl_FragColor = vColor;
            }
        `
    },
    
    // 纹理着色器
    // 不再获取顶点颜色数据转而获取和设置纹理坐标数据；这样就能把顶点与其对应的纹理联系在一起了。
    texture: {
        vertex: `
            attribute vec4 aVertexPosition;
            attribute vec2 aTextureCoord;
            
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            
            varying highp vec2 vTextureCoord;
            
            void main(void) {
                gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
                vTextureCoord = aTextureCoord;
            }
        `,
        fragment: `
            varying highp vec2 vTextureCoord;
            
            uniform sampler2D uSampler;
            
            void main(void) {
                gl_FragColor = texture2D(uSampler, vTextureCoord);
            }
        `
    },
    
    // 光照着色器
    // 我们先根据立方体位置和朝向，通过顶点法线乘以法线矩阵来转换法线。
    // 接着我们可以通过计算转换过后的法线与方向向量（即，光来自的方向）的点积来计算得出顶点反射方向光的量。
    // 如果计算出的这个值小于 0，则我们把值固定设为 0，因为你不会有小于 0 的光。

    // 当方向光的量计算完，我们可以通过获取环境光并且添加方向光的颜色和要提供的定向光的量来生成光照值（lighting value）。
    // 最终结果我们会得到一个 RGB 值，用于片段着色器调整我们渲染的每一个像素的颜色。
    lighting: {
        vertex: `
            attribute vec4 aVertexPosition;
            attribute vec3 aVertexNormal;
            attribute vec2 aTextureCoord;
            
            uniform mat4 uNormalMatrix;
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            
            varying highp vec2 vTextureCoord;
            varying highp vec3 vLighting;
            
            void main(void) {
                gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
                vTextureCoord = aTextureCoord;
                
                // 改进的光照计算
                highp vec3 ambientLight = vec3(0.4, 0.4, 0.4);
                highp vec3 directionalLightColor = vec3(0.8, 0.8, 0.8);
                highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));
                
                // 正确变换法向量
                highp vec4 transformedNormal = normalize(uNormalMatrix * vec4(aVertexNormal, 0.0));
                
                // 计算漫反射光照
                highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
                
                // 组合环境光和方向光
                vLighting = ambientLight + (directionalLightColor * directional);
                
                // 确保光照值在合理范围内
                vLighting = clamp(vLighting, 0.2, 1.0);
            }
        `,
        fragment: `
            varying highp vec2 vTextureCoord;
            varying highp vec3 vLighting;
            
            uniform sampler2D uSampler;
            
            void main(void) {
                highp vec4 texelColor = texture2D(uSampler, vTextureCoord);
                // 应用光照，保持纹理的原始亮度
                gl_FragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
            }
        `
    },
    
    // 动画纹理着色器
    'animated-texture': {
        vertex: `
            attribute vec4 aVertexPosition;
            attribute vec2 aTextureCoord;
            
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            
            varying highp vec2 vTextureCoord;
            
            void main(void) {
                gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
                vTextureCoord = aTextureCoord;
            }
        `,
        fragment: `
            varying highp vec2 vTextureCoord;
            
            uniform sampler2D uSampler;
            
            void main(void) {
                gl_FragColor = texture2D(uSampler, vTextureCoord);
            }
        `
    }
};

// 渲染器类
class WebGLRenderer {
    constructor(canvas) {
        /** @type {HTMLCanvasElement|null} */
        this.canvas = canvas;  
        /** @type {WebGLRenderingContext|null} */
        this.gl = canvas.getContext('webgl');
        this.programs = {};
        this.buffers = {};
        this.textures = {};
        this.currentProgram = null;
        this.copyVideo = false; // 用于标记视频是否可以复制到纹理
        
        if (!this.gl) {
            throw new Error('WebGL not supported');
        }
        
        // 启用深度测试
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);

        // 初始化纹理（图片、视频资源）
        this.initTextures();
        
        this.initPrograms();
        // 初始化顶点、颜色、纹理映射、光照映射缓冲区
        this.initBuffers();

    }
    
    // 初始化所有着色器程序
    initPrograms() {
        for (const [mode, sources] of Object.entries(shaderSources)) {
            this.programs[mode] = this.createShaderProgram(sources.vertex, sources.fragment);
        }
    }
    
    // 创建着色器程序
    createShaderProgram(vsSource, fsSource) {
        if(!this.gl){
            throw new Error('WebGL not supported');
        }
        // 加载着色器
        const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fsSource);
        if(!vertexShader || !fragmentShader){
            throw new Error('Unable to create shaders');
        }
        
        // 创建着色器程序, 附加上着色器，并与gl实例关联
        const shaderProgram = this.gl.createProgram();
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);
        this.gl.linkProgram(shaderProgram);
        
        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
            throw new Error('Unable to initialize shader program: ' + this.gl.getProgramInfoLog(shaderProgram));
        }
        
        return shaderProgram;
    }
    
    // 加载着色器
    loadShader(type, source) {
        if(!this.gl){
            throw new Error('WebGL not supported');
        }
        const shader = this.gl.createShader(type);
        if(!shader){
            throw new Error('Unable to create shader');
        }

        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            this.gl.deleteShader(shader);
            throw new Error('An error occurred compiling the shaders: ' + this.gl.getShaderInfoLog(shader));
        }
        
        return shader;
    }
    
    // 初始化缓冲区
    initBuffers() {
        this.buffers.position = this.initPositionBuffer();
        this.buffers.color = this.initColorBuffer();
        this.buffers.textureCoord = this.initTextureBuffer();
        this.buffers.normal = this.initNormalBuffer();
        this.buffers.indices = this.initIndexBuffer();
    }
    
    // 初始化位置缓冲区
    initPositionBuffer() {
        if(!this.gl){
            throw new Error('WebGL not supported');
        }
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        // 24 个顶点（每个面使用 4 个顶点）, (x,y,z)坐标
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
            
            // 顶面
            -1.0,  1.0, -1.0,
            -1.0,  1.0,  1.0,
             1.0,  1.0,  1.0,
             1.0,  1.0, -1.0,
            
            // 底面
            -1.0, -1.0, -1.0,
             1.0, -1.0, -1.0,
             1.0, -1.0,  1.0,
            -1.0, -1.0,  1.0,
            
            // 右面
             1.0, -1.0, -1.0,
             1.0,  1.0, -1.0,
             1.0,  1.0,  1.0,
             1.0, -1.0,  1.0,
            
            // 左面
            -1.0, -1.0, -1.0,
            -1.0, -1.0,  1.0,
            -1.0,  1.0,  1.0,
            -1.0,  1.0, -1.0,
        ];
        
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
        return positionBuffer;
    }
    
    // 初始化颜色缓冲区
    initColorBuffer() {
        if(!this.gl){
            throw new Error('WebGL not supported');
        }
        // 每个面的颜色 rgba
        const faceColors = [
            [1.0, 1.0, 1.0, 1.0], // 前面: 白色
            [1.0, 0.0, 0.0, 1.0], // 后面: 红色
            [0.0, 1.0, 0.0, 1.0], // 顶面: 绿色
            [0.0, 0.0, 1.0, 1.0], // 底面: 蓝色
            [1.0, 1.0, 0.0, 1.0], // 右面: 黄色
            [1.0, 0.0, 1.0, 1.0], // 左面: 紫色
        ];
        
        let colors = [];
        for (const c of faceColors) {
            colors = colors.concat(c, c, c, c);
        }
        
        const colorBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
        
        return colorBuffer;
    }

    // 初始化三角形缓冲区
    initIndexBuffer() {
        if(!this.gl){
            throw new Error('WebGL not supported');
        }
        const indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        // 36 个索引，每个面两个三角形、组成正方形
        const indices = [
            0,  1,  2,      0,  2,  3,    // 前面
            4,  5,  6,      4,  6,  7,    // 后面
            8,  9,  10,     8,  10, 11,   // 顶面
            12, 13, 14,     12, 14, 15,   // 底面
            16, 17, 18,     16, 18, 19,   // 右面
            20, 21, 22,     20, 22, 23,   // 左面
        ];
        
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
        return indexBuffer;
    }
    
    // 初始化纹理坐标缓冲区
    initTextureBuffer() {
        if(!this.gl){
            throw new Error('WebGL not supported');
        }
        const textureCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureCoordBuffer);
        //我们需要建立纹理坐标到立方体上的面的顶点的映射。替换设置每个立方体面颜色而存在的所有先前的代码
        // UV 坐标（纹理坐标） ，每两个数字 (u, v) 表示纹理上的一个点。
        // 左下角 → (0.0, 0.0)
        // 右下角 → (1.0, 0.0)
        // 右上角 → (1.0, 1.0)
        // 左上角 → (0.0, 1.0)
        // 每个立方体面都会用整张纹理填充，不会裁剪也不会重复。
        const textureCoordinates = [
            // 前面
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // 后面
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // 顶面
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // 底面
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // 右面
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            // 左面
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
        ];
        
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), this.gl.STATIC_DRAW);
        return textureCoordBuffer;
    }
    
    // 初始化所有顶点的法线
    initNormalBuffer() {
        if(!this.gl){
            throw new Error('WebGL not supported');
        }
        const normalBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, normalBuffer);
        
        const vertexNormals = [
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
            
            // 顶面
             0.0,  1.0,  0.0,
             0.0,  1.0,  0.0,
             0.0,  1.0,  0.0,
             0.0,  1.0,  0.0,
            
            // 底面
             0.0, -1.0,  0.0,
             0.0, -1.0,  0.0,
             0.0, -1.0,  0.0,
             0.0, -1.0,  0.0,
            
            // 右面
             1.0,  0.0,  0.0,
             1.0,  0.0,  0.0,
             1.0,  0.0,  0.0,
             1.0,  0.0,  0.0,
            
            // 左面
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0,
            -1.0,  0.0,  0.0,
        ];
        
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertexNormals), this.gl.STATIC_DRAW);
        return normalBuffer;
    }
    
    // 创建纹理
    createTexture(image) {
        if(!this.gl){
            throw new Error('WebGL not supported');
        }
        
        // createTexture() 函数来创建一个 WebGL 纹理对象
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        // 用 WebGL 的 texImage2D 把一张图像（可以是 <img> 元素、<canvas>、<video> 等）上传到 GPU，存储在当前绑定的纹理对象中
        // 第一个参数指定纹理目标，这里是 2D 纹理
        // 第二个参数指定 MIP 贴图级别，0 表示基础级别
        // 第三个参数指定内部格式，这里是 RGBA
        // 第四个参数指定外部格式，这里是 RGBA
        // 第五个参数指定数据类型，这里是 UNSIGNED_BYTE
        // 第六个参数指定图像数据，这里是 <img>、<canvas>、<video> 等元素
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
        
        // 分别设置纹理参数
        if (this.isPowerOf2(image.width) && this.isPowerOf2(image.height)) {
            // 如果是2的幂次方，生成MIP贴图，提高采样质量和性能
            this.gl.generateMipmap(this.gl.TEXTURE_2D);
        } else {
            // 如果不是2的幂次方，只能使用 CLAMP_TO_EDGE，防止越界
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        }
        
        return texture;
    }

    
    // 检查是否为2的幂次方
    isPowerOf2(value) {
        return (value & (value - 1)) === 0;
    }
    
    // 初始化纹理
    initTextures() {
        // 创建静态纹理（用于texture和lighting模式）
        this.createStaticTexture();
        
        // 创建动画纹理（用于animated-texture模式）
        this.createAnimatedTexture();
    }
    
    // 创建静态纹理
    createStaticTexture() {
        // 创建一个简单的棋盘格纹理
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
            // 绘制棋盘格图案
            const tileSize = 32;
            for (let x = 0; x < canvas.width; x += tileSize) {
                for (let y = 0; y < canvas.height; y += tileSize) {
                    const isEven = ((x / tileSize) + (y / tileSize)) % 2 === 0;
                    ctx.fillStyle = isEven ? '#ffffff' : '#cccccc';
                    ctx.fillRect(x, y, tileSize, tileSize);
                }
            }
        }
        
        // 为texture和lighting模式创建相同的纹理
        this.textures[RENDER_MODES.TEXTURE] = this.createTexture(canvas);
        this.textures[RENDER_MODES.LIGHTING] = this.createTexture(canvas);
    }
    
    // 创建动画纹理
    createAnimatedTexture = () => {
        if (!this.gl) {
            throw new Error('WebGL not supported');
        }
        
        
        // 创建视频元素
        const video = document.createElement('video');
        
        let playing = false;
        let timeupdate = false;
        
        video.playsInline = true;
        video.muted = true;
        video.loop = true;
        video.crossOrigin = 'anonymous';

        const checkReady = () => {
            if (playing && timeupdate) {
                this.copyVideo = true;
                console.log('视频准备就绪，可以复制到纹理');
            }
        }
        
        // 等待这两个事件确保视频中有数据
        video.addEventListener('playing', () => {
            playing = true;
            checkReady();
            console.log('视频正在播放');
        }, true);
        
        video.addEventListener('timeupdate', () => {
            timeupdate = true;
            checkReady();
        }, true);
        
        video.src = './Firefox.mp4';
        video.play().catch(e => {
            console.error('视频播放失败:', e);
        });
        

        
        // 存储视频元素以便后续使用
        this.videoElement = video;
        
        // 创建初始纹理（蓝色像素占位符）
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        
        // 因为视频需要通过网络下载，可能需要一些时间
        // 所以先放一个单像素在纹理中，这样我们可以立即使用它
        const level = 0;
        const internalFormat = this.gl.RGBA;
        const width = 1;
        const height = 1;
        const border = 0;
        const srcFormat = this.gl.RGBA;
        const srcType = this.gl.UNSIGNED_BYTE;
        const pixel = new Uint8Array([0, 0, 255, 255]); // 不透明蓝色
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            level,
            internalFormat,
            width,
            height,
            border,
            srcFormat,
            srcType,
            pixel
        );
        
        // 关闭mips并设置包装为clamp to edge，这样无论视频尺寸如何都能工作
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        
        this.textures[RENDER_MODES.ANIMATED_TEXTURE] = texture;
        
    }
    
    // 更新视频纹理
    updateVideoTexture() {
        if (!this.gl || !this.videoElement || !this.copyVideo) {
            return;
        }
        
        const video = this.videoElement;
        const texture = this.textures[RENDER_MODES.ANIMATED_TEXTURE];
        
        const level = 0;
        const internalFormat = this.gl.RGBA;
        const srcFormat = this.gl.RGBA;
        const srcType = this.gl.UNSIGNED_BYTE;
        
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            level,
            internalFormat,
            srcFormat,
            srcType,
            video
        );
    }
    
    // 渲染场景
    render(mode, deltaTime) {
        if (!this.gl || !this.canvas) {
            throw new Error('WebGL not supported');
        }
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clearDepth(1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        const program = this.programs[mode];
        if (!program) return;
        

        
        this.gl.useProgram(program);
        this.currentProgram = program;
        
        // 设置投影矩阵
        const fieldOfView = 45 * Math.PI / 180;  // 视野角度（FOV）：45度转换为弧度，决定“镜头广角”
        const aspect = this.canvas.width / this.canvas.height; // 宽高比，避免图像拉伸
        const zNear = 0.1;   // 近裁剪面，摄像机能看到的最近距离
        const zFar = 100.0;  // 远裁剪面，摄像机能看到的最远距离
        const projectionMatrix = mat4.create(); // 创建一个 4x4 单位矩阵
        // 使用透视投影（Perspective Projection），模拟真实相机效果：近大远小
        mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
        
        // 设置模型视图矩阵
        const modelViewMatrix = mat4.create(); // 创建一个单位矩阵，初始状态：不平移、不旋转、不缩放
        // 将立方体沿 Z 轴向后移动 6 个单位（不移动就会“贴”在摄像机上，看不到）
        mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -6.0]);
        // 绕 Z 轴旋转（cubeRotation 随时间变化，实现动画）
        mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation, [0, 0, 1]);
        // 绕 Y 轴旋转，速度是 Z 轴的 0.7 倍，让旋转更自然
        mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation * 0.7, [0, 1, 0]);
        // 绕 X 轴旋转，速度是 Y 轴的 0.3 倍，让旋转更自然
        mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation * 0.3, [1, 0, 0]);

        // 如果是动画纹理模式且视频准备就绪，更新视频纹理
        if (mode === RENDER_MODES.ANIMATED_TEXTURE && this.copyVideo) {
            this.updateVideoTexture();
        }
        
        // 根据模式设置属性，从缓冲区中对应的坐标、值
        // 基础模式：顶点位置、颜色
        // 纹理模式：顶点位置、颜色、纹理坐标
        // 光照模式：顶点位置、颜色、纹理坐标、光照坐标
        // 动画纹理模式：顶点位置、颜色、纹理坐标
        this.setupAttributes(mode);
        // 设置uniform变量()
        // 投影矩阵、模型视图矩阵、法线矩阵（用于光照）、以及纹理采样器，并根据渲染模式绑定纹理
        this.setupUniforms(mode, projectionMatrix, modelViewMatrix);
        
        // 绘制
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);
        const vertexCount = 36;//立方体的每个面都由 2 个三角形组成，那就是每个面需要 6 个顶点，或者说总共 36 个顶点，尽管有许多重复的顶点
        this.gl.drawElements(this.gl.TRIANGLES, vertexCount, this.gl.UNSIGNED_SHORT, 0);
        
        cubeRotation += deltaTime;
    }
    
    // 设置属性
    // 设置顶点的相关属性
    setupAttributes(mode) {
        const program = this.currentProgram;

        if(!this.gl){
            throw new Error('WebGL not supported');
        }

        // 从缓存中获取顶点的位置
        const positionLocation = this.gl.getAttribLocation(program, 'aVertexPosition');
        if (positionLocation !== -1) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.position);
            this.gl.vertexAttribPointer(positionLocation, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.enableVertexAttribArray(positionLocation);
        }
        
        // 从缓存中获取并设置顶点的颜色(仅基础模式)，片段也会获取这个颜色
        if (mode === RENDER_MODES.BASIC) {
            const colorLocation = this.gl.getAttribLocation(program, 'aVertexColor');
            if (colorLocation !== -1) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.color);
                this.gl.vertexAttribPointer(colorLocation, 4, this.gl.FLOAT, false, 0, 0);
                this.gl.enableVertexAttribArray(colorLocation);
            }
        }
        
        // 设置每个面的纹理坐标属性，告诉 WebGL 如何从缓冲区中提取纹理坐标
        // 每个顶点有 2 个纹理坐标（u, v），所以每个面需要 6 个顶点，或者说总共 12 个纹理坐标
        if (mode === RENDER_MODES.TEXTURE || mode === RENDER_MODES.LIGHTING || mode === RENDER_MODES.ANIMATED_TEXTURE) {
            const textureCoordLocation = this.gl.getAttribLocation(program, 'aTextureCoord');
            if (textureCoordLocation !== -1) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.textureCoord);
                this.gl.vertexAttribPointer(textureCoordLocation, 2, this.gl.FLOAT, false, 0, 0);
                this.gl.enableVertexAttribArray(textureCoordLocation);
            }
        }
        
        // 法向量属性（光照模式）
        if (mode === RENDER_MODES.LIGHTING) {
            const normalLocation = this.gl.getAttribLocation(program, 'aVertexNormal');
            if (normalLocation !== -1) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.normal);
                this.gl.vertexAttribPointer(normalLocation, 3, this.gl.FLOAT, false, 0, 0);
                this.gl.enableVertexAttribArray(normalLocation);
            }
        }
    }
    
    // 设置uniform变量
    // uniform 在 vertex shader 和 fragment shader 中都可以访问。
    setupUniforms(mode, projectionMatrix, modelViewMatrix) {
        const program = this.currentProgram;
        if(!this.gl){
            throw new Error('WebGL not supported');
        }
        // 投影矩阵
        // 在 Vertex Shader 中通常有 uniform mat4 uProjectionMatrix;
        // 将透视投影或正交投影矩阵传入 GPU，用于把 3D 场景投影到 2D 屏幕
        const projectionMatrixLocation = this.gl.getUniformLocation(program, 'uProjectionMatrix');
        if (projectionMatrixLocation) {
            //gl.uniformMatrix4fv() 表示传递 4x4 矩阵
            this.gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);
        }
        
        // 模型视图矩阵
        // 在 Vertex Shader 中通常 gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        // 用于将 模型坐标 → 摄像机坐标 → 世界坐标
        const modelViewMatrixLocation = this.gl.getUniformLocation(program, 'uModelViewMatrix');
        if (modelViewMatrixLocation) {
            this.gl.uniformMatrix4fv(modelViewMatrixLocation, false, modelViewMatrix);
        }
        
        // 法向量矩阵（光照模式）
        // 光照计算需要 法线方向
        if (mode === RENDER_MODES.LIGHTING) {
            const normalMatrixLocation = this.gl.getUniformLocation(program, 'uNormalMatrix');
            if (normalMatrixLocation) {
                // 计算正确的法向量矩阵（模型视图矩阵的逆转置矩阵）
                // 简化处理：对于均匀缩放，可以直接使用模型视图矩阵
                const normalMatrix = mat4.create();
                // 复制模型视图矩阵的旋转部分
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        normalMatrix[i * 4 + j] = modelViewMatrix[i * 4 + j];
                    }
                }
                normalMatrix[15] = 1.0; // 设置w分量
                this.gl.uniformMatrix4fv(normalMatrixLocation, false, normalMatrix);
            }
        }
        
        // 纹理采样器
        if (mode === RENDER_MODES.TEXTURE || mode === RENDER_MODES.LIGHTING || mode === RENDER_MODES.ANIMATED_TEXTURE) {
            //uSampler 是 fragment shader 里的 uniform sampler2D，用于采样纹理颜色。
            const samplerLocation = this.gl.getUniformLocation(program, 'uSampler');
            if (samplerLocation) {
                //uniform1i(samplerLocation, 0) 表示这个采样器绑定到 纹理单元 0
                this.gl.uniform1i(samplerLocation, 0);
            }
            
            // 绑定纹理数据
            // activeTexture(TEXTURE0) 和 bindTexture() 把实际的纹理绑定到 GPU。
            if (this.textures[mode]) {
                this.gl.activeTexture(this.gl.TEXTURE0);
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures[mode]);
            }
        }
    }
}

// 全局渲染器实例
let renderer = null;

// 主函数
function main() {
    const canvas = document.querySelector('#webgl-canvas');
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        alert('找不到画布元素');
        return;
    }
    
    try {
        renderer = new WebGLRenderer(canvas);
        console.log('WebGL渲染器初始化成功');
    } catch (error) {
        console.trace(error)
        alert('WebGL初始化失败: ' + error.message);
        return;
    }
    
    // 绑定事件
    bindEvents();
    
    // 初始渲染
    renderer.render(currentMode, 0);
    const checkbox = document.getElementById('animation-checkbox');
    if (checkbox instanceof HTMLInputElement) {
        if (checkbox.checked) {
            startAnimation();
        }
    }
}


// 绑定事件
function bindEvents() {
    // 模式切换按钮
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target;
            if (!target || !(target instanceof HTMLElement)) return;
            
            // 移除所有active类
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            // 添加active类到当前按钮
            target.classList.add('active');
            
            // 设置当前模式
            const btnId = target.id;
            switch(btnId) {
                case 'basic-btn':
                    currentMode = RENDER_MODES.BASIC;
                    break;
                case 'texture-btn':
                    currentMode = RENDER_MODES.TEXTURE;
                    break;
                case 'lighting-btn':
                    currentMode = RENDER_MODES.LIGHTING;
                    break;
                case 'animated-texture-btn':
                    currentMode = RENDER_MODES.ANIMATED_TEXTURE;
                    // 尝试播放视频
                    if (renderer.videoElement) {
                        renderer.videoElement.play().catch(e => {
                            console.warn('视频播放失败:', e);
                        });
                    }
                    break;
            }
            
            // 如果正在动画，重新渲染
            if (!isAnimating) {
                renderer.render(currentMode, 0);
            }
        });
    });
    
    // 动画控制
    const checkbox = document.getElementById('animation-checkbox');
    if (checkbox) {
        checkbox.addEventListener('change', (e) => {
            if (e.target instanceof HTMLInputElement) {
                if (e.target.checked) {
                    startAnimation();
                } else {
                    stopAnimation();
                }
            }
        });
    }
}

// 开始动画
function startAnimation() {
    if (isAnimating) return;
    
    isAnimating = true;
    let then = 0;
    
    function render(now) {
        if (!isAnimating) return;
        
        now *= 0.001; // 转换为秒
        deltaTime = now - then;
        then = now;
        
        
        renderer.render(currentMode, deltaTime);
        
        animationId = requestAnimationFrame(render);
    }
    
    animationId = requestAnimationFrame(render);
}

// 停止动画
function stopAnimation() {
    isAnimating = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    cubeRotation = 0.0;
    renderer.render(currentMode, 0);
}



// 页面加载完成后启动
window.addEventListener('DOMContentLoaded', main);