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