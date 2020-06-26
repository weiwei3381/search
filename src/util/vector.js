import numeric from 'numeric'

/**
 * 二维向量类, 包含向量的各类计算方法
 * @param x
 * @param y
 * @constructor
 */
export default class Vector {
    constructor(x, y) {
        if(arguments.length===1 && Array.isArray(arguments[0])){
            this.x = x[0];
            this.y = x[1]
        }else{
            this.x = x;
            this.y = y
        }
    }

    // 向量除实数
    div(num) {
        return new Vector(this.x / num, this.y / num)
    }

    // 向量自除实数
    idiv(num) {
        this.x /= num;
        this.y /= num
    }

    // 向量乘实数
    mul(num) {
        return new Vector(this.x * num, this.y * num)
    }

    // 向量自乘实数
    imul(num) {
        this.x *= num;
        this.y *= num
    }

    // 限制到最大值和最小值范围内,并返回新的向量
    limit(max, min) {
        if (this.mag() > max) {
            const unit = this.unit();
            return new Vector(unit.x * max, unit.y * max)
        } else if (this.mag() < min) {
            const unit = this.unit();
            return new Vector(unit.x * min, unit.y * min)
        }
        return this
    }

    // 将自身限制到最大值和最小值之内
    ilimit(max, min) {
        let unit = this.unit();
        if (this.mag() > max) {
            this.x = unit.x * max;
            this.y = unit.y * max
        } else if (this.mag() < min) {
            this.x = unit.x * min;
            this.y = unit.y * min
        }
    }

    // 向量求模长
    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y)
    }

    // 返回单位化后的新向量
    unit() {
        let mag = this.mag();
        return new Vector(this.x / mag, this.y / mag)
    }

    // 向量自身单位化
    iunit() {
        let mag = this.mag();
        this.x = this.x / mag;
        this.y = this.y / mag;
    }

    // 加上一个矢量,并返回一个新的向量
    add(v2) {
        return new Vector(this.x + v2.x, this.y + v2.y)
    }

    // 向量自加
    iadd(v2) {
        this.x += v2.x;
        this.y += v2.y
    }

    // 减去或者给自身减一个矢量
    sub(v2) {
        return new Vector(this.x - v2.x, this.y - v2.y)
    }

    isub(v2) {
        this.x -= v2.x;
        this.y -= v2.y
    }

    /* 向量与第二个向量v2的点乘 */
    dot(v2) {
        return (this.x * v2.x + this.y * v2.y)
    }

    /* 向量与第二个向量v2的叉乘 */
    cross(v2) {
        return (this.x * v2.y) - (this.y * v2.x)
    }

    // 到dest点的距离
    euc2d(dest) {
        return Math.sqrt((this.x - dest.x) * (this.x - dest.x) +
            (this.y - dest.y) * (this.y - dest.y))
    }

    // 目标向量dest在本向量方向上的投影的矢量(前进方向)
    forward(dest) {
        const vx = this.x * ((this.x * dest.x) + (this.y * dest.y)) / ((this.x * this.x) + (this.y * this.y));
        const vy = this.y * ((this.x * dest.x) + (this.y * dest.y)) / ((this.x * this.x) + (this.y * this.y));
        return new Vector(vx, vy)
    }

    // 目标向量dest在本向量垂直方向上的投影的矢量(侧面方向)
    steer(dest) {
        const vx = this.y * ((this.y * dest.x) - (this.x * dest.y)) / ((this.x * this.x) + (this.y * this.y));
        const vy = -1 * this.x * ((this.y * dest.x) - (this.x * dest.y)) / ((this.x * this.x) + (this.y * this.y));
        return new Vector(vx, vy)
    }

    // 对象的拷贝
    copy() {
        return new Vector(this.x, this.y);
    }

    // 目标dest在本向量的夹角的cos值
    cosAngle(dest) {
        let this_mag = this.mag();
        let dest_mag = dest.mag();
        if (this_mag > 0 && dest_mag > 0) {
            let dot_product = dest.x * this.x + dest.y * this.y;
            return dot_product / (dest_mag * this_mag);
        }
    }

    // 目标dest顺时针到当前向量夹角的sin值
    sinAngle(dest) {
        let this_mag = this.mag();
        let dest_mag = dest.mag();
        if (this_mag > 0 && dest_mag > 0) {
            let cross_product = this.cross(dest);
            return cross_product / (dest_mag * this_mag);
        }
    }

    // 将向量转成字符串, fixNum为小数点后保留几位
    toString(height, fixNum = 2) {
        const x = this.x
        const y = this.y
        height = height || y * 2;  // 默认为2倍的y值
        return `(${x.toFixed(fixNum)},${(height - y).toFixed(fixNum)})`

    }

    // 求垂直向量
    vertical() {
        let x1 = this.mag() * this.y / (this.x * this.x + this.y * this.y);
        let y1 = -1 * this.mag() * this.x / (this.x * this.x + this.y * this.y);
        return new Vector(x1, y1)
    }

    // 转换为数组
    toArray(){
        return [this.x, this.y]
    }

    // 向量旋转角度a, a为角度值, 逆时针为正,顺时针为负, 返回值为旋转后的值
    rotate(a){
        const angle = a / 180 * Math.PI
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        let transMatrix = [[cos, sin],[-1*sin, cos]]
        return new Vector(numeric.dot([this.x, this.y],transMatrix))
    }
}