// 3D矩阵工具函数

/**
 * 创建4x4单位矩阵
 * @returns {Float32Array} 4x4单位矩阵
 */
function createIdentityMatrix() {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}

/**
 * 创建透视投影矩阵
 * @param {number} fov 视野角度（弧度）
 * @param {number} aspect 宽高比
 * @param {number} near 近裁剪面
 * @param {number} far 远裁剪面
 * @returns {Float32Array} 4x4透视投影矩阵
 */
function createPerspectiveMatrix(fov, aspect, near, far) {
    const f = Math.tan(Math.PI * 0.5 - 0.5 * fov);
    const rangeInv = 1.0 / (near - far);
    
    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (near + far) * rangeInv, -1,
        0, 0, near * far * rangeInv * 2, 0
    ]);
}

/**
 * 创建平移矩阵
 * @param {number} tx X轴平移
 * @param {number} ty Y轴平移
 * @param {number} tz Z轴平移
 * @returns {Float32Array} 4x4平移矩阵
 */
function createTranslationMatrix(tx, ty, tz) {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        tx, ty, tz, 1
    ]);
}

/**
 * 创建X轴旋转矩阵
 * @param {number} angle 旋转角度（弧度）
 * @returns {Float32Array} 4x4旋转矩阵
 */
function createRotationXMatrix(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    
    return new Float32Array([
        1, 0, 0, 0,
        0, c, s, 0,
        0, -s, c, 0,
        0, 0, 0, 1
    ]);
}

/**
 * 创建Y轴旋转矩阵
 * @param {number} angle 旋转角度（弧度）
 * @returns {Float32Array} 4x4旋转矩阵
 */
function createRotationYMatrix(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    
    return new Float32Array([
        c, 0, -s, 0,
        0, 1, 0, 0,
        s, 0, c, 0,
        0, 0, 0, 1
    ]);
}

/**
 * 创建Z轴旋转矩阵
 * @param {number} angle 旋转角度（弧度）
 * @returns {Float32Array} 4x4旋转矩阵
 */
function createRotationZMatrix(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    
    return new Float32Array([
        c, s, 0, 0,
        -s, c, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}

/**
 * 矩阵乘法（4x4）
 * @param {Float32Array} a 矩阵A
 * @param {Float32Array} b 矩阵B
 * @returns {Float32Array} 结果矩阵
 */
function multiplyMatrices(a, b) {
    const result = new Float32Array(16);
    
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            result[i * 4 + j] = 
                a[i * 4 + 0] * b[0 * 4 + j] +
                a[i * 4 + 1] * b[1 * 4 + j] +
                a[i * 4 + 2] * b[2 * 4 + j] +
                a[i * 4 + 3] * b[3 * 4 + j];
        }
    }
    
    return result;
}

/**
 * 创建缩放矩阵
 * @param {number} sx X轴缩放
 * @param {number} sy Y轴缩放
 * @param {number} sz Z轴缩放
 * @returns {Float32Array} 4x4缩放矩阵
 */
function createScaleMatrix(sx, sy, sz) {
    return new Float32Array([
        sx, 0, 0, 0,
        0, sy, 0, 0,
        0, 0, sz, 0,
        0, 0, 0, 1
    ]);
}

/**
 * 创建模型视图矩阵
 * @param {number} tx 平移X
 * @param {number} ty 平移Y
 * @param {number} tz 平移Z
 * @param {number} rx X轴旋转角度
 * @param {number} ry Y轴旋转角度
 * @param {number} rz Z轴旋转角度
 * @returns {Float32Array} 4x4模型视图矩阵
 */
function createModelViewMatrix(tx, ty, tz, rx, ry, rz) {
    const translation = createTranslationMatrix(tx, ty, tz);
    const rotationX = createRotationXMatrix(rx);
    const rotationY = createRotationYMatrix(ry);
    const rotationZ = createRotationZMatrix(rz);
    
    // 组合变换：平移 * 旋转Z * 旋转Y * 旋转X
    let result = multiplyMatrices(rotationX, rotationY);
    result = multiplyMatrices(result, rotationZ);
    result = multiplyMatrices(translation, result);
    
    return result;
    
    return result;
}