import config from '../config'
import Vector from '../util/vector'

export default class Threat {
    constructor({id, position = [0, 0], range = 50, v = 0, angle = 0, zlevel, onStep}) {
        this.id = id;
        this.position = new Vector(position);
        this.range = range
        this.v = v
        this.angle = angle
        this.zlevel = zlevel || config.threat.zlevel
        this.onStep = onStep
    }

    get shape() {
        const r0 = config.threat.r
        return {
            shape: 'ring',
            id: this.id,
            zlevel: this.zlevel,
            style: {
                x: this.position.x,
                y: this.position.y,
                r0: r0,
                r: this.range,
                color: '#eee',
                brushType: 'stroke',
                strokeColor: '#ee2a12',
            },
        }
    }

    // 每步的调用
    step(stepNum) {
        if (this.onStep && typeof this.onStep === 'function') {
            // 调用每步的回调函数
            this.onStep(stepNum)
            // 更新速度和位置信息, 如果v存在且大于0才更新
            if (this.v) {
                let vel_x = Math.sin(this.angle / 180 * Math.PI) * this.v;  // x方向的速度
                let vel_y = Math.cos(this.angle / 180 * Math.PI) * this.v;  // y方向的速度
                // 更新目标位置
                this.position.x += vel_x
                this.position.y += vel_y
            }
            return true
        }
    }
}