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