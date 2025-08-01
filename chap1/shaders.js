// 顶点着色器源代码
const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec3 a_color;
    
    uniform mat3 u_transform;
    
    varying vec3 v_color;
    
    void main() {
        // 应用变换矩阵
        vec3 position = u_transform * vec3(a_position, 1.0);
        gl_Position = vec4(position.xy, 0.0, 1.0);
        
        // 传递颜色到片段着色器
        v_color = a_color;
    }
`;

// 片段着色器源代码
const fragmentShaderSource = `
    precision mediump float;
    
    varying vec3 v_color;
    
    void main() {
        gl_FragColor = vec4(v_color, 1.0);
    }
`;

// 简单的顶点着色器（无变换）
const simpleVertexShaderSource = `
    attribute vec2 a_position;
    attribute vec3 a_color;
    
    varying vec3 v_color;
    
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_color = a_color;
    }
`;

// 渐变片段着色器
const gradientFragmentShaderSource = `
    precision mediump float;
    
    varying vec3 v_color;
    uniform float u_time;
    
    void main() {
        // 添加时间动画效果
        vec3 color = v_color;
        color.r += sin(u_time) * 0.3;
        color.g += cos(u_time * 1.5) * 0.3;
        color.b += sin(u_time * 2.0) * 0.3;
        
        gl_FragColor = vec4(color, 1.0);
    }
`;