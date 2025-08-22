precision mediump float; // 精度指定为中等精度

varying vec3 v_color; // 从顶点着色器接收的颜色变量

void main() {
    gl_FragColor = vec4(v_color, 1.0); // 输出颜色，使用从顶点着色器接收的颜色
}