    attribute vec2 a_position; // 每个顶点的二维位置
    attribute vec3 a_color; // 每个顶点的颜色（RGB）
    
    varying vec3 v_color; // 传递给片段着色器的颜色变量
    
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0); // 把二维位置扩展成齐次坐标
        v_color = a_color; // 把颜色传递给片段着色器 （会被插值）
    }
