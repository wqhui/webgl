attribute vec3 a_position; // 三维顶点位置
attribute vec4 a_color;    // 顶点颜色（RGBA）

uniform mat4 u_projectionMatrix;  // 投影矩阵
uniform mat4 u_modelViewMatrix;   // 模型视图矩阵

varying vec4 v_color; // 传递给片段着色器的颜色

void main() {
    // 应用模型视图矩阵和投影矩阵变换
    gl_Position = u_projectionMatrix * u_modelViewMatrix * vec4(a_position, 1.0);
    
    // 传递颜色到片段着色器
    v_color = a_color;
}