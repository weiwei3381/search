import Vector from "../util/vector";
import buckets from "buckets-js";
import config from '../config'

/**
 * 固定翼无人机
 */
export class UAV {
    constructor({id, position, angle, zlevel}) {
        // 无人机ID号
        this.id = id;
        // 无人机位置
        this.position = new Vector(position);
        // 经过的位置值
        this._pos_history = new buckets.Queue();
        // 无人机绘制大小
        this.size = 1;
        // 无人机绘制所处的层次
        this.zlevel = zlevel
        this.shapeType = 'uav'
        this.angle = angle

        // 从配置项中取得无人机参数
        const {
            max_speed, min_speed, navigate_speed,
            max_push_force, max_steer_force
        } = config.aerocraft
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
        // 无人机初始速度
        const PI = Math.PI;
        let vel_x = Math.sin(angle / 180 * PI) * this.navigate_speed;  // x方向的初始速度大小为巡航速度
        let vel_y = Math.cos(angle / 180 * PI) * this.navigate_speed;  // y方向的初始速度大小为巡航速度
        let init_vel = new Vector(vel_x, vel_y);
        this.vel = init_vel.limit(this.max_speed, this.min_speed);
        // 历史速度值
        this._vel_history = new buckets.Queue();
        // 无人机是否被击落
        this.dead = false;
        // 无人机飞行模式
        this.fly_mode = "normal";
        // 上一次无人机飞行模式
        this.last_fly_mode = this.fly_mode;
    }

    get shape() {
        const theta = Math.atan2(this.vel.x, this.vel.y);
        this.angle = theta
        return {
            shape: 'uav',
            id: this.id,
            position: this.position.toArray(),
            zlevel: this.zlevel,
            rotation: [this.angle , 0, 0],
            scale: [1, 1, 0, 0],
            // rotation: [2 * Math.PI, 0, 0],
            __needTransform: true,  // 需要旋转
            hoverable: true,
            style: {
                w: 15,
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
            this.transFlyMode();
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
        this.position = this.position.add(this.vel);
        // 将速度加入历史值,如果保存数目大于5000, 则删除掉之前的
        this._pos_history.add(this.position);
        if (this._pos_history.size() > 5000) this._pos_history.dequeue();
    }

    /**
     * 转换无人机飞行模式
     */
    transFlyMode() {
        // 获得无人机当前位置到目标位置的向量
        let e = this.fly_pos.sub(this.position);
        let cos_value = this.vel.cosAngle(e);
        if (cos_value < 0.1) {
            if (this.last_fly_mode === "normal") {
                this.setCircle();
            }
            this.fly_mode = "circle";
        } else if (cos_value > 0.35) {
            if (this.last_fly_mode === "circle") {
                this.circle_point = null;
            }
            this.fly_mode = "normal";
        }
        // 将飞行模式存入历史记录
        this.last_fly_mode = this.fly_mode;
    }

    /**
     * 设置为绕圈飞行模式,该方法的核心在于两点:
     * ☆为目标,△为无人机,无人机方向为-→, 无人机到目标的方向是↙, 那么无人机到目标位置需要进行绕圈
     * 绕圈的位置大致在◎位置, 该方法主要就是计算◎位置的坐标
     *            △-→
     *         ↙ ◎
     *      ☆
     */
    setCircle() {
        // 当前位置到目标的距离向量
        let e = this.fly_pos.sub(this.position);
        // 距离向量在速度方向上的垂直投影
        let steer_acc = this.vel.steer(e);
        // 垂直向量的相反值
        if (e.mag() < 30) {
            steer_acc.imul(-1);
        }
        // todo 转弯系数
        let steer_index = 18.0;
        // 速度系数
        let vel_index = this.vel.mag() < this.min_speed ? this.min_speed : this.vel.mag();
        let pos_trans = steer_acc.unit().mul(vel_index * steer_index);
        // todo 绕圈飞行的中心点
        this.circle_point = this.position.add(pos_trans);
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
        let target_pos = null;
        // 如果是正常情况,目标就是target,如果是绕圈模式,目标则是圆心
        if (this.fly_mode === "normal") {
            target_pos = this.fly_pos;
        } else if (this.fly_mode === "circle") {
            target_pos = this.circle_point;
        }
        // 获得无人机当前位置到目标位置的向量
        let e = target_pos.sub(this.position);
        // 如果向量离得太近,则加速度为0
        if (e.mag() <= 0.005) {
            return new Vector(0, 0);
        }
        // 反之则根据加速类型计算应该有的加速度
        // 1. 计算单位速度
        let unit_e = e.unit();
        // 2. 根据类型计算期望的速度
        let wish_e = {};
        switch (type) {
            case "fast": {
                wish_e = unit_e.mul(this.max_speed);
                break;
            }
            case "equal": {
                wish_e = unit_e.mul(this.vel.mag());
                break
            }
            case "navigate": {
                wish_e = unit_e.mul(this.navigate_speed);
                break;
            }
            case "slow": {
                wish_e = unit_e.mul(this.min_speed);
                break;
            }
        }
        // 期望速度减去当前速度,得到期望的加速度
        let wish_acc = wish_e.sub(this.vel);
        return wish_acc
    }

    // 限制加速度
    limitAcc(acc) {
        // 加速度在前进方向的大小
        let forward_vector = this.vel.forward(acc);
        forward_vector.ilimit(this.max_push_force, 0);
        // 加速度在左右方向的大小
        let steer_acc = this.vel.steer(acc);
        steer_acc.ilimit(this.max_steer_force, 0);
        return forward_vector.add(steer_acc);
    };

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
        return this._vel_history.toArray();
    }

    // 获得位置历史记录
    get pos_history() {
        return this._pos_history.toArray();
    }

    // 无人机的绘制
    draw(canvas, debug = false, theme = "dark", is_loop = true) {
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
            if (this.position.x < 0) this.position.x = width;
            if (this.position.x > width) this.position.x = 0;
            if (this.position.y < 0) this.position.y = height;
            if (this.position.y > height) this.position.y = 0;
        }
        // 绘制参数
        let wing_span = 25 * this.size;
        let plane_length = 23 * this.size;

        // 无人机绘制的朝向
        let theta = Math.atan2(this.vel.y, this.vel.x);
        ctx.save();
        // canvas平移和旋转
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(theta);
        // 绘制无人机
        ctx.beginPath();

        // 绘制无人机
        /* Bico */
        ctx.moveTo(1, -wing_span / 6.666);
        ctx.lineTo(wing_span / 2 - 1, 0);
        ctx.lineTo(1, wing_span / 6.666);

        //ctx.moveTo(0, 0) // Fica mais legal o stroke
        //ctx.moveTo(3, 0)
        /* Asa direita */
        ctx.lineTo(wing_span / 10, wing_span / 10);
        ctx.lineTo(wing_span / 5, wing_span / 5);
        ctx.lineTo(0, wing_span / 2);
        ctx.lineTo(-wing_span / 18, wing_span / 2.222);
        ctx.lineTo(wing_span / 36, wing_span / 4);
        ctx.lineTo(0, wing_span / 10);

        /* Cauda */
        var xx = wing_span / 72;
        ctx.lineTo(-wing_span / 4, xx);
        ctx.lineTo(-wing_span / 3, xx);
        ctx.lineTo(-wing_span / 2, wing_span / 6);
        ctx.lineTo(-wing_span / 2, -wing_span / 6);
        ctx.lineTo(-wing_span / 3, -xx);
        ctx.lineTo(-wing_span / 4, -xx);

        ctx.lineTo(0, -wing_span / 10);

        /* Asa esquerda */
        ctx.lineTo(plane_length / 36, -wing_span / 4);
        ctx.lineTo(-plane_length / 18, -wing_span / 2.222);
        ctx.lineTo(0, -wing_span / 2);
        ctx.lineTo(wing_span / 5, -wing_span / 5);
        ctx.lineTo(wing_span / 10, -wing_span / 10);

        ctx.closePath();
        // 用配置的无人机颜色进行填充
        ctx.fillStyle = vehicle_color;
        ctx.fill();

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

            // 绘制飞机等级, 如果有飞机等级才绘制
            if (typeof (this.leaderGrade) !== "undefined" && typeof this.leaderRank !== "undefined") {
                var leaderName = "(" + this.leaderGrade + "," + this.leaderRank + ")";
                ctx.font = "13pt Arial";
                ctx.fillStyle = "#F3F3F3";
                ctx.fillText(leaderName, -15, -20);
            }

        }
        ctx.restore();
    };
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
        this.vel = init_vel.limit(this.max_speed, this.min_speed);
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
                wish_e = unit_e.mul(this.max_speed);
                break;
            }
            case "equal": {
                wish_e = unit_e.mul(this.vel.mag());
                break
            }
            case "navigate": {
                wish_e = unit_e.mul(this.navigate_speed);
                break;
            }
            case "slow": {
                wish_e = unit_e.mul(this.min_speed);
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
        forward_vector.ilimit(this.max_push_force, 0);
        // 加速度在左右方向的大小
        let steer_acc = this.vel.steer(acc);
        steer_acc.ilimit(this.max_steer_force, 0);
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
