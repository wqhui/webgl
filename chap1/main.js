// WebGL 学习项目主文件

class WebGLApp {
    constructor() {
        /** @type {HTMLCanvasElement|null} */
        this.canvas = null; 
        /** @type {WebGLRenderingContext|null} */
        this.gl = null;
        /** @type {WebGLProgram|null} */
        this.program = null;
        /** @type {WebGLProgram|null} */
        this.animationProgram = null;
        this.isAnimating = false;
        this.animationId = null;
        this.startTime = Date.now();
        
        this.init();
    }
    
    async init () {
        // 获取画布和WebGL上下文
        this.canvas = document.getElementById('webgl-canvas');
        if (!this.canvas) {
            alert('找不到画布元素');
            return;
        }
        
        this.gl = this.canvas.getContext('webgl');
        
        if (!this.gl) {
            alert('您的浏览器不支持WebGL');
            return;
        }
        
        const vertexShaderSource = await fetch('./shaders/vertex.vert').then(res => res.text());
        const fragmentShaderSource = await fetch('./shaders/fragment.frag').then(res => res.text());

        const animationVertexShaderSource = await fetch('./shaders/vertex2.vert').then(res => res.text());
        const animationFragmentShaderSource = await fetch('./shaders/fragment2.frag').then(res => res.text());

        // 创建着色器程序
        this.program = createProgram(this.gl, vertexShaderSource, fragmentShaderSource);
        this.animationProgram = createProgram(this.gl, animationVertexShaderSource, animationFragmentShaderSource);
        
        if (!this.program || !this.animationProgram) {
            alert('着色器程序创建失败');
            return;
        }
        
        // 设置视口
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // 绑定事件
        this.bindEvents();
        
        // 初始清除画布
        this.clearCanvas();
        
        console.log('WebGL 初始化成功！');
    }
    
    bindEvents() {
        const triangleBtn = document.getElementById('triangle-btn');
        const invertedTriangleBtn = document.getElementById('inverted-triangle-btn');
        const squareBtn = document.getElementById('square-btn');
        const rotateBtn = document.getElementById('rotate-btn');
        const clearBtn = document.getElementById('clear-btn');
        
        if (triangleBtn) {
            triangleBtn.addEventListener('click', () => {
                this.drawTriangle();
            });
        }
        
        if (invertedTriangleBtn) {
            invertedTriangleBtn.addEventListener('click', () => {
                this.drawInvertedTriangle();
            });
        }
        
        if (squareBtn) {
            squareBtn.addEventListener('click', () => {
                this.drawSquare();
            });
        }
        
        if (rotateBtn) {
            rotateBtn.addEventListener('click', () => {
                this.toggleAnimation();
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearCanvas();
                this.stopAnimation();
            });
        }
    }
    
    drawTriangle() {
        this.stopAnimation();
        
        // 三角形顶点数据（位置 + 颜色）
        const vertices = new Float32Array([
            // 位置 (x, y)    颜色 (r, g, b)
             0.0,  0.5,      1.0, 0.0, 0.0,  // 顶部 - 红色
            -0.5, -0.5,      0.0, 1.0, 0.0,  // 左下 - 绿色
             0.5, -0.5,      0.0, 0.0, 1.0   // 右下 - 蓝色
        ]);
        
        this.drawShape(vertices, 3, this.gl.TRIANGLES);
    }
    
    drawSquare() {
        this.stopAnimation();
        
        // 正方形顶点数据
        const vertices = new Float32Array([
            // 第一个三角形
            -0.4, -0.4,     1.0, 0.5, 0.0,  // 左下 - 橙色
             0.4, -0.4,     1.0, 0.0, 0.5,  // 右下 - 粉色
            -0.4,  0.4,     0.5, 1.0, 0.0,  // 左上 - 黄绿色
            
            // 第二个三角形
            -0.4,  0.4,     0.5, 1.0, 0.0,  // 左上 - 黄绿色
             0.4, -0.4,     1.0, 0.0, 0.5,  // 右下 - 粉色
             0.4,  0.4,     0.0, 0.5, 1.0   // 右上 - 蓝紫色
        ]);
        
        this.drawShape(vertices, 6, this.gl.TRIANGLES);
    }
    
    /**
     * 绘制形状
     * @param {Float32Array} vertices 顶点数据
     * @param {number} vertexCount 顶点数量
     * @param {number} drawMode 绘制模式
     */
    drawShape(vertices, vertexCount, drawMode) {
        if (!this.gl) {
            alert('WebGL上下文不存在');
            return;
        }
        if (!this.program) {
            alert('着色器程序不存在');
            return;
        }
        // 绑定着色器程序
        this.gl.useProgram(this.program);
        
        // 创建缓冲区
        const buffer = createBuffer(this.gl, vertices);
        
        // 设置位置属性
        //调用gl.getAttribLocation().获取属性位置
        const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        //调用gl.enableVertexAttribArray().启用顶点属性数组，启用后，WebGL 才能访问该属性对应的数据
        this.gl.enableVertexAttribArray(positionLocation);
        //配置顶点如何从缓冲区中读取数据并传递给a_position属性
        //positionLocation：属性位置
        //2：每个顶点属性由 2 个分量组成（表示 2D 坐标）
        //this.gl.FLOAT：数据类型是 32 位浮点数
        //false：不需要将数据归一化
        //5 * 4：相邻两个顶点数据之间的字节数（步长），这里表示每个顶点数据占用 20 字节
        //0：从缓冲区(vertices的数据)起始位置开始读取数据
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 5 * 4, 0); //5 * 4, 0
        
        // 设置颜色属性
        //调用gl.getAttribLocation().获取属性位置
        const colorLocation = this.gl.getAttribLocation(this.program, 'a_color');
        //调用gl.enableVertexAttribArray().启用顶点属性数组
        this.gl.enableVertexAttribArray(colorLocation);
        // 2 * 4 是因为位置已经读取了，需要从缓冲区(vertices的数据)位置之后读取颜色数据
        this.gl.vertexAttribPointer(colorLocation, 3, this.gl.FLOAT, false, 5 * 4, 2 * 4); // 5 * 4, 2 * 4
        
        // 清除画布并绘制
        clearCanvas(this.gl, 0.1, 0.1, 0.1, 1.0);
        this.gl.drawArrays(drawMode, 0, vertexCount);
    }

    drawInvertedTriangle(){
        this.stopAnimation();
        
        const vertices = [
            -0.5,0.5, 
            0.5,0.5,
            0.5,-0.5,
        ]

        const colors = [
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0,
        ]

        if (!this.gl) {
            alert('WebGL上下文不存在');
            return;
        }
        if (!this.program) {
            alert('着色器程序不存在');
            return;
        }
        // 绑定着色器程序
        this.gl.useProgram(this.program);

        
        

        // 设置位置属性
        const vertexBuffer = createBuffer(this.gl, new Float32Array(vertices));
        const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        // 设置颜色属性
        const colorBuffer = createBuffer(this.gl, new Float32Array(colors));
        const colorLocation = this.gl.getAttribLocation(this.program, 'a_color');
        this.gl.enableVertexAttribArray(colorLocation);
        this.gl.vertexAttribPointer(colorLocation, 3, this.gl.FLOAT, false, 0, 0);

        // 清除画布并绘制
        clearCanvas(this.gl, 0.1, 0.1, 0.1, 1.0);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
    }
    
    toggleAnimation() {
        if (this.isAnimating) {
            this.stopAnimation();
        } else {
            this.startAnimation();
        }
    }
    
    startAnimation() {
        this.isAnimating = true;
        this.startTime = Date.now();
        const rotateBtn = document.getElementById('rotate-btn');
        if (rotateBtn) {
            rotateBtn.textContent = '停止动画';
        }
        this.animate();
    }
    
    stopAnimation() {
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        const rotateBtn = document.getElementById('rotate-btn');
        if (rotateBtn) {
            rotateBtn.textContent = '旋转动画';
        }
    }
    
    animate() {
        if (!this.isAnimating) return;
        
        const currentTime = Date.now();
        const elapsed = (currentTime - this.startTime) / 1000.0;
        
        // 旋转三角形的顶点数据
        const vertices = new Float32Array([
             0.0,  0.4,     1.0, 0.2, 0.8,
            -0.4, -0.4,     0.8, 1.0, 0.2,
             0.4, -0.4,     0.2, 0.8, 1.0
        ]);
        
        this.gl.useProgram(this.animationProgram);
        
        // 创建缓冲区
        const buffer = createBuffer(this.gl, vertices);
        
        // 设置位置属性
        const positionLocation = this.gl.getAttribLocation(this.animationProgram, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 5 * 4, 0);
        
        // 设置颜色属性
        const colorLocation = this.gl.getAttribLocation(this.animationProgram, 'a_color');
        this.gl.enableVertexAttribArray(colorLocation);
        this.gl.vertexAttribPointer(colorLocation, 3, this.gl.FLOAT, false, 5 * 4, 2 * 4);
        
        // 设置变换矩阵
        const transformLocation = this.gl.getUniformLocation(this.animationProgram, 'u_transform');
        // 计算旋转角度
        const rotation = elapsed * 2.0; // 每秒旋转2弧度
        const transformMatrix = createTransformMatrix(0, 0, rotation, 1, 1);
        this.gl.uniformMatrix3fv(transformLocation, false, transformMatrix);
        
        // 设置时间uniform
        const timeLocation = this.gl.getUniformLocation(this.animationProgram, 'u_time');
        this.gl.uniform1f(timeLocation, elapsed);
        
        // 清除画布并绘制
        clearCanvas(this.gl, 0.05, 0.05, 0.1, 1.0);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    clearCanvas() {
        clearCanvas(this.gl, 0.1, 0.1, 0.1, 1.0);
    }
}

// 页面加载完成后初始化应用
window.addEventListener('DOMContentLoaded', () => {
    new WebGLApp();
});