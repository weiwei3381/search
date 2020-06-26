import Vector from "../util/vector";
import buckets from "buckets-js";
import config from '../config'

/**
 * 固定翼无人机
 */
export class UAV {
    constructor({id, position, angle, zlevel}) {
        this.id = id;  // 无人机ID号
        this.position = new Vector(position);  // 无人机位置
        this._posHistory = new buckets.Queue();  // 经过的位置值
        this.size = 1;  // 无人机绘制大小
        this.zlevel = zlevel  // 无人机绘制所处的层次
        this.angle = angle
        this._orientPool = {}  // 无人机朝向合集
        // 历史速度值
        this._velHistory = new buckets.Queue();
        // 无人机是否被击落
        this.dead = false;

        this.init()
    }

    init(){
        const navigateSpeed = config.uav.navigateSpeed
        // 无人机初始速度
        let vel_x = Math.sin(this.angle / 180 * Math.PI) * navigateSpeed;  // x方向的初始速度大小为巡航速度
        let vel_y = Math.cos(this.angle / 180 * Math.PI) * navigateSpeed;  // y方向的初始速度大小为巡航速度
        this.vel = new Vector(vel_x, vel_y);
    }

    // 返回绘制的形状参数
    get shape() {
        // 无人机朝向, 旋转画布, 保证跟无人机速度一致
        const theta = Math.atan2(this.vel.x, this.vel.y);
        this.angle = theta
        return {
            shape: 'uav',
            id: this.id,
            position: this.position.toArray(),
            zlevel: this.zlevel,
            rotation: [this.angle, 0, 0],
            scale: [1, 1, 0, 0],
            // rotation: [2 * Math.PI, 0, 0],
            __needTransform: true,  // 需要旋转
            hoverable: true,
            style: {
                w: 5,
                x: 0,
                y: 0,
                brushType: 'both',
                color: '#0ff',
                strokeColor: 'rgba(220, 20, 60, 0.8)',
                lineWidth: 1,
                text: this.id,
                textPosition: 'top',
            },
        }
    }

    hasFlyTarget() {
        if (this.fly_pos) {
            return true;
        } else {
            return false;
        }
    }

    setFlyPos(x, y) {
        // 无人机飞向的目标
        this.fly_pos = new Vector(x, y);
    }

    setTarget(obj) {
        this.current_target = obj;
    }

    // 计算无人机所有的朝向
    calcAllOrient(flock, type = 'fast') {
        // 计算避免无人机之间相撞的力
        this.calcAvoidCrushOrient(flock)
        // 计算朝着目标飞行的力
        this.calcTargetForce(type)
    }

    // 无人机转弯方法, 获得无人机转弯的角度, 相对于目标方向, 当前方向需要转弯的情况
    steer(orientVel) {
        const steerAngle = config.uav.maxSteerAngle  // 无人机转弯最大角度
        // 获得符号位,逆时针为正, 顺时针为负
        let mark = this.vel.sinAngle(orientVel)
        mark = mark < 0 ? -1 : 1
        // 判断方向是否正确, 先得到方向的cos值
        let orientCos = this.vel.cosAngle(orientVel)
        // 如果方向为0度正, 很接近1, 因为cos(0)=1, 则不需要再转了, 此时直接返回0度
        if (orientCos > 0.998) return 0
        // 否则计算角度值
        const angle = Math.acos(orientCos) * 180 / Math.PI
        // 返回转弯后的速度, 如果在角度范围内,则一次转过去
        if (angle <= steerAngle) {
            return mark * angle
        } else {
            // 否则只转成对应的角度
            return mark * steerAngle
        }
    }

    push(angle) {
        const maxPushForce = config.uav.maxPushForce  // 最大油门/减速速度
        const maxSpeed = config.uav.maxSpeed  // 最大速度
        const minSpeed = config.uav.minSpeed  // 最小速度
        const maxSteerAngle = config.uav.maxSteerAngle  // 最大转弯角度

        let changeVel = this.vel.rotate(angle)  // 转弯后的速度
        let absVel = this.vel.mag()  // 绝对速度
        // 如果有转弯
        if(Math.abs(angle) > 0.1){
            // 根据角度获得系数, 如果转的角度越大, 则速度降的越低
            const steerIndex = Math.abs(angle)/maxSteerAngle
            absVel = Math.max(absVel-maxPushForce*steerIndex, minSpeed)
            return changeVel.unit().mul(absVel)
        }else{
            absVel = Math.min(absVel+maxPushForce, maxSpeed)
            return changeVel.unit().mul(absVel)
        }

    }


    /**
     *
     * @param type
     * type有四种方式,分别是:
     * "fast": 加速到最快速度并保持,
     * "equal": 保持当前速度
     * "navigate": 加速或者减速到巡航速度,并保持
     * "slow": 减速到最低速度并保持
     */
    fly() {
        // 朝向向量总和
        let orientSum = undefined;
        // 获取orientPool中的每一类朝向
        for (let orientType in this._orientPool) {
            // 每一类加速度是一个列表
            const orientList = this._orientPool[orientType]
            for (let orient of orientList) {
                // 加速度加到加速度总和中
                orientSum = orientSum || new Vector(0, 0)
                orientSum.iadd(orient)
            }
        }
        this._orientPool = {}
        if (orientSum) {
            this.vel = this.push(this.steer(orientSum))
        }
        // 将速度加入历史值,如果保存数目大于5000, 则删除掉之前的
        this._velHistory.add(this.vel);
        if (this._velHistory.size() > 5000) this._velHistory.dequeue();
        // 更新无人机的位置
        this.position = this.position.add(this.vel);
        // 将速度加入历史值,如果保存数目大于5000, 则删除掉之前的
        this._posHistory.add(this.position);
        if (this._posHistory.size() > 5000) this._posHistory.dequeue();
    }




    // 避免撞到其他飞机朝向
    calcAvoidCrushOrient(flock) {
        const sepRange = config.uav.sepRange  // 从配置项中获取无人机距离
        for (let id in flock) {
            if (id === this.id) continue
            const uav2 = flock[id]  // 其他无人机
            const d = this.position.euc2d(uav2.position)  // 获得两架无人机的距离
            // 如果当前无人机到其他无人机的距离小于
            if (d <= sepRange) {
                // 得到从其他无人机指向本机的向量, 这是避免碰撞的速度朝向
                const avoidOrient = this.position.sub(uav2.position)
                this._orientPool['avoid'] = this._orientPool['avoid'] || []
                this._orientPool['avoid'].push(avoidOrient.unit())
            }
        }
    }

    // 向目标飞的加速度
    calcTargetForce(type) {
        if (!["fast", "equal", "navigate", "slow"].includes(type)) {
            console.log("警告: 传入的飞行类型type不属于规定类型");
            type = "fast";
        }
        if (this.fly_pos) {
            // 这是往目标飞行的朝向
            const targetOrient = this.fly_pos.sub(this.position)
            this._orientPool['target'] = this._orientPool['target'] || []
            this._orientPool['target'].push(targetOrient.unit())
        }
    }

    // 靠近目标的属性
    get near() {
        if (this.fly_pos === undefined) {
            return false;
        }
        let distance = this.position.euc2d(this.fly_pos);
        if (distance < 15.0) {
            return true;
        } else {
            return false;
        }
    }

    // 获得速度历史记录
    get vel_history() {
        return this._velHistory.toArray();
    }

    // 获得位置历史记录
    get pos_history() {
        return this._posHistory.toArray();
    }
}

/**
 * 旋翼无人机
 */
export class Gyroplane {
    constructor(id, x, y, angle, uav_list, size = 0.4, max_speed = 2.0, min_speed = 0, navigate_speed = 1.6, max_push_force = 0.1, max_steer_force = 0.03) {
        // 无人机ID号, 必须是number值
        this.id = id;
        // 无人机位置
        this.pos = new Vector(x, y);
        // 经过的位置值
        this._pos_history = new buckets.Queue();
        // 无人机绘制大小
        this.size = size;
        // 极限最大速度
        this.max_speed = max_speed;
        // 极限最小速度
        this.min_speed = min_speed;
        // 巡航速度
        this.navigate_speed = navigate_speed;
        // 水平最大加速度
        this.max_push_force = max_push_force;
        // 法向最大加速度
        this.max_steer_force = max_steer_force;
        // 无人机集群(避让用)
        this.uav_list = uav_list;
        // 无人机初始速度
        const PI = Math.PI;
        let vel_x = Math.sin(angle / 180 * PI) * 0.01;  // x方向的初始速度大小为巡航速度
        let vel_y = Math.cos(angle / 180 * PI) * 0.01;  // y方向的初始速度大小为巡航速度
        let init_vel = new Vector(vel_x, vel_y);
        this.vel = init_vel.limit(this.maxSpeed, this.minSpeed);
        // 历史速度值
        this._vel_history = new buckets.Queue();
        // 无人机是否被击落
        this.dead = false;
        // 无人机飞行模式
        this.fly_mode = "normal";
        // 上一次无人机飞行模式
        this.last_fly_mode = this.fly_mode;
        // 最后一次的无人机朝向
        this.last_theta = 0;
    }

    /**
     * 避免碰撞其他无人机所产生的加速度
     * @param uav_list 无人机列表
     * @param separate_range 排斥距离
     * @returns {Vector}
     */
    accToSeparate(uav_list, separate_range) {
        // 定义期待的速度
        let wish_vec = new Vector(0, 0);
        // 定义速度之差
        let diff = new Vector(0, 0);
        let count = 0;
        for (let other of uav_list) {
            // 如果是比较对象是本机, 或者本机的id小于其他飞机,则忽略
            if (this === other || this.id < other.id) {
                continue;
            }
            // 计算本机到其他飞机的距离
            let distance = this.pos.euc2d(other.position);
            // 如果距离小于排斥距离,则进行排斥
            if (distance < separate_range) {
                diff = this.pos.sub(other.position);
                diff = diff.unit();
                wish_vec.iadd(diff);
                count++;
            }
        }
        // 如果有周围有无人机需要避让,则取平均速度
        if (count > 0) {
            wish_vec.idiv(count);
        } else {
            return new Vector(0, 0);
        }
        wish_vec.imul(3);
        return wish_vec.sub(this.vel);  // 速度相减得到加速度
    }

    /**
     * 是否有飞行目标
     * @returns {boolean}
     */
    hasFlyTarget() {
        if (this.fly_pos) {
            return true;
        } else {
            return false;
        }
    }

    setFlyPos(x, y) {
        // 无人机飞向的目标
        this.fly_pos = new Vector(x, y);
    }

    setTarget(obj) {
        this.current_target = obj;
    }

    /**
     *
     * @param type
     * type有四种方式,分别是:
     * "fast": 加速到最快速度并保持,
     * "equal": 保持当前速度
     * "navigate": 加速或者减速到巡航速度,并保持
     * "slow": 减速到最低速度并保持
     */
    fly(type = "fast") {
        if (!["fast", "equal", "navigate", "slow"].includes(type)) {
            console.log("警告: 传入的飞行类型type不属于规定类型");
            type = "fast";
        }
        // 只有当无人机有目标时,才更新速度
        if (this.fly_pos !== undefined) {
            // 获取期望的加速度
            let acc_wish = this.getAcc(type);
            let acc = this.limitAcc(acc_wish);
            // 更新速度
            this.vel = this.vel.add(acc);
        }
        // 将速度加入历史值,如果保存数目大于5000, 则删除掉之前的
        this._vel_history.add(this.vel);
        if (this._vel_history.size() > 5000) this._vel_history.dequeue();
        // 更新无人机的位置
        this.pos = this.pos.add(this.vel);
        // 将速度加入历史值,如果保存数目大于5000, 则删除掉之前的
        this._pos_history.add(this.pos);
        if (this._pos_history.size() > 5000) this._pos_history.dequeue();
    }


    /**
     * 计算加速度
     * @param x
     * @param y
     * @param type
     */
    getAcc(type) {
        if (this.fly_pos == undefined) {
            alert("请先设置无人机目标");
        }
        // 获取目标位置
        let target_pos = this.fly_pos;
        // 获得无人机当前位置到目标位置的向量
        let e = target_pos.sub(this.pos);
        // 如果向量离得太近,则加速度为0
        if (e.mag() <= 0.005) {
            return new Vector(0, 0);
        }
        // 反之则根据加速类型计算应该有的加速度
        // 1. 计算单位速度
        let unit_e = e.unit();
        // 2. 计算距离
        // 速度缩放值, 默认速度不进行缩放
        let narrow_index = 1.0;
        let distance = this.pos.euc2d(this.fly_pos);
        if (distance < 50) {
            narrow_index = distance / 50;
        }
        // 2. 根据类型计算期望的速度
        let wish_e = {};
        switch (type) {
            case "fast": {
                wish_e = unit_e.mul(this.maxSpeed);
                break;
            }
            case "equal": {
                wish_e = unit_e.mul(this.vel.mag());
                break
            }
            case "navigate": {
                wish_e = unit_e.mul(this.navigateSpeed);
                break;
            }
            case "slow": {
                wish_e = unit_e.mul(this.minSpeed);
                break;
            }
        }

        // 根据距离值,对期望速度进行缩放
        wish_e.imul(narrow_index);
        // 获取分开的加速度
        // fixme 无人机防碰撞距离改小
        let separate_e = this.accToSeparate(this.uav_list, 25);
        wish_e.iadd(separate_e);
        // 期望速度减去当前速度,得到期望的加速度
        return wish_e.sub(this.vel)
    }

    // 限制加速度
    limitAcc(acc) {
        // 加速度在前进方向的大小
        let forward_vector = this.vel.forward(acc);
        forward_vector.ilimit(this.maxPushForce, 0);
        // 加速度在左右方向的大小
        let steer_acc = this.vel.steer(acc);
        steer_acc.ilimit(this.maxSteerForce, 0);
        return forward_vector.add(steer_acc);
    };

    // 靠近目标的属性
    get near() {
        if (this.fly_pos === undefined) {
            return false;
        }
        let distance = this.pos.euc2d(this.fly_pos);
        if (distance < 10) {
            return true;
        } else {
            return false;
        }
    }

    // 获得速度历史记录
    get vel_history() {
        return this._vel_history.toArray();
    }

    // 获得位置历史记录
    get pos_history() {
        return this._pos_history.toArray();
    }

    // 四旋翼无人机的绘制
    draw(canvas, debug = false, theme = "dark", is_loop = true, plane_img) {
        if (this.dead) {
            return
        }
        let ctx = canvas.getContext("2d");
        let width = canvas.width;
        let height = canvas.height;
        let vehicle_color = "#FFF";  // 无人机默认颜色
        let radar_color = "#FFF";  // 雷达颜色
        // 浅色条件下的无人机颜色
        if (theme === "white") {
            vehicle_color = "#663366";
            radar_color = "#666";
        }
        //在有限的空间尽可能循环
        if (is_loop) {
            if (this.pos.x < 0) this.pos.x = width;
            if (this.pos.x > width) this.pos.x = 0;
            if (this.pos.y < 0) this.pos.y = height;
            if (this.pos.y > height) this.pos.y = 0;
        }
        // 绘制参数
        let wing_span = 25 * this.size;
        let plane_length = 23 * this.size;

        // 无人机绘制的朝向
        let theta = Math.atan2(this.vel.y, this.vel.x);
        // 为了防止无人机在速度特别小的时候朝向变化,对小速度的情况进行过滤,使用最后一次朝向值
        if (this.vel.mag() > 0.65) {
            this.last_theta = theta;
        } else {
            theta = this.last_theta;
        }
        ctx.save();
        // canvas平移和旋转
        ctx.translate(this.pos.x + plane_img.width / 2, this.pos.y + plane_img.height / 2);
        ctx.rotate(theta / 2);
        ctx.drawImage(plane_img, plane_img.width / -2, plane_img.height / -2);

        // ctx.beginPath();
        // ctx.arc(0, 0, 5, 5 / 4 * Math.PI, 2 * Math.PI);
        // ctx.arc(15, 0, 5, Math.PI, 1 / 2 * Math.PI);
        // ctx.arc(15, 15, 5, 3 / 2 * Math.PI, Math.PI);
        // ctx.arc(0, 15, 5, 0, 3 / 2 * Math.PI);
        // ctx.arc(0, 0, 5, 1 / 2 * Math.PI, 5 / 4 * Math.PI);
        // ctx.closePath();
        // // 用配置的无人机颜色进行填充
        // ctx.fillStyle = vehicle_color;
        // ctx.fill();

        if (debug) {
            // 绘制飞机雷达
            ctx.strokeStyle = radar_color;
            ctx.moveTo(0, 0);
            //ctx.arc(0, 0, simulation.bird_neighborhood, 0, 2 * Math.PI, false)
            ctx.arc(0, 0, simulation.leader_radarRange,
                0, 2 * Math.PI, false);
            ctx.arc(0, 0, simulation.leader_separateRange,
                0, 2 * Math.PI, false);
            ctx.stroke();
        }
        ctx.restore();
    };
}
