// WebGL 工具函数

/**
 * 创建着色器
 * @param {WebGLRenderingContext} gl WebGL上下文
 * @param {number} type 着色器类型
 * @param {string} source 着色器源代码
 * @returns {WebGLShader|null} 编译后的着色器
 */
function createShader(gl, type, source) {
    //调用gl.createShader().创建一个新的着色器
    const shader = gl.createShader(type);
    if (!shader) {
        return null;
    }
    //调用gl.shaderSource().将着色器源代码设置为着色器对象
    gl.shaderSource(shader, source);
    //调用gl.compileShader().编译着色器
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('着色器编译错误:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    
    return shader;
}

/**
 * 创建着色器程序
 * @param {WebGLRenderingContext} gl WebGL上下文
 * @param {string} vertexShaderSource 顶点着色器源代码
 * @param {string} fragmentShaderSource 片段着色器源代码
 * @returns {WebGLProgram|null} 链接后的程序
 */
function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
    //调用gl.createShader().创建一个新的着色器
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);//顶点
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);//片段
    
    if (!vertexShader || !fragmentShader) {
        return null;
    }
    
    const program = gl.createProgram();
    if (!program) {
        return null;
    }
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('程序链接错误:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    
    return program;
}

/**
 * 创建缓冲区
 * @param {WebGLRenderingContext} gl WebGL上下文
 * @param {Float32Array} data 数据
 * @returns {WebGLBuffer} 缓冲区
 */
function createBuffer(gl, data) {
    //调用gl.createBuffer().创建一个新的缓冲区
    const buffer = gl.createBuffer();
    //调用gl.bindBuffer().绑定上下文
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    //调用gl.bufferData().将数据复制到缓冲区
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buffer;
}

/**
 * 设置属性
 * @param {WebGLRenderingContext} gl WebGL上下文
 * @param {WebGLProgram} program 程序
 * @param {string} attributeName 属性名
 * @param {WebGLBuffer} buffer 缓冲区
 * @param {number} size 每个顶点的组件数
 */
function setAttribute(gl, program, attributeName, buffer, size) {
    const attributeLocation = gl.getAttribLocation(program, attributeName);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(attributeLocation);
    gl.vertexAttribPointer(attributeLocation, size, gl.FLOAT, false, 0, 0);
}

/**
 * 调整画布大小
 * @param {HTMLCanvasElement} canvas 画布元素
 * @param {WebGLRenderingContext} gl WebGL上下文
 */
function resizeCanvas(canvas, gl) {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}

/**
 * 创建变换矩阵
 * @param {number} tx 平移X
 * @param {number} ty 平移Y
 * @param {number} rotation 旋转角度（弧度）
 * @param {number} scaleX 缩放X
 * @param {number} scaleY 缩放Y
 * @returns {Float32Array} 3x3变换矩阵
 */
function createTransformMatrix(tx = 0, ty = 0, rotation = 0, scaleX = 1, scaleY = 1) {
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);
    
    return new Float32Array([
        c * scaleX, -s * scaleY, tx,
        s * scaleX,  c * scaleY, ty,
        0,           0,          1
    ]);
}

/**
 * 清除画布
 * @param {WebGLRenderingContext} gl WebGL上下文
 * @param {number} r 红色分量
 * @param {number} g 绿色分量
 * @param {number} b 蓝色分量
 * @param {number} a 透明度
 */
function clearCanvas(gl, r = 0, g = 0, b = 0, a = 1) {
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT);
}