precision mediump float; // 设置浮点精度

varying vec4 v_color; // 从顶点着色器接收的颜色

void main() {
    // 输出最终颜色
    gl_FragColor = v_color;
}