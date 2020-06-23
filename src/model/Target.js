import Vector from '../util/vector'

class Target {
    constructor({id, position, v, angle, zlevel, changeMove}) {
        this.id = id;  // 目标的id值
        this.position = new Vector(position);  // 目标的所处位置
        this.v = v  // 目标速度
        this.angle = angle  // 目标朝向
        this.zlevel = zlevel  // 所处canvas层
        this.changeMove = changeMove  // 改变移动情况
        this.shapeType = 'star'  // 形状类型

        // 目标是否正在被无人机搜索
        this.is_find = false;
        // 初始颜色
        this.origin_color = "#F6F152";
        // 目标是否被无人机摧毁
        this.is_dead = false;
        // 目标是否正在工作
        this.is_work = true;
        // 目标是否正在因为计算而调整
        this.is_adjust = true;
    }

    get shape(){
        return {
            shape: 'star',
            id: this.id,
            zlevel : this.zlevel,
            style  : {
                x : this.position.x,
                y : this.position.y,
                r : 20,
                n : 5,
                color : '#29ee0f',
                text: this.id
            },
        }
    }

    move(stepNum){
        if(this.changeMove && typeof this.changeMove === 'function'){
            this.changeMove(stepNum)  // 调用移动改变的方法
            let vel_x = Math.sin(this.angle / 180 * Math.PI) * this.v;  // x方向的初始速度大小为巡航速度
            let vel_y = Math.cos(this.angle / 180 * Math.PI) * this.v;  // y方向的初始速度大小为巡航速度
            // 更新目标位置
            this.position.x += vel_x
            this.position.y += vel_y
        }
    }

    /**
     * 绘制目标,为五角星样式
     * @param canvas
     */
    draw(canvas) {
        let ctx = canvas.getContext("2d");
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        // 绘制五角星
        ctx.beginPath();
        //设置五个顶点的坐标，根据顶点制定路径
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(Math.cos((18 + i * 72) / 180 * Math.PI) * 10, -Math.sin((18 + i * 72) / 180 * Math.PI) * 10);
            ctx.lineTo(Math.cos((54 + i * 72) / 180 * Math.PI) * 4, -Math.sin((54 + i * 72) / 180 * Math.PI) * 4);
        }
        ctx.closePath();
        ctx.lineWidth = "2.5";
        ctx.fillStyle = this.origin_color;
        // 开始工作后的假目标颜色
        if (this instanceof FakeTarget && this.is_work) ctx.fillStyle = "#F600DF";
        // 目标击毁后的颜色
        if (this.is_dead) ctx.fillStyle = "#000000";
        ctx.strokeStyle = "#F5270B";
        ctx.stroke();
        ctx.fill();
        ctx.restore();
    }

    /**
     * 转换成简单对象
     * @returns {{x: *, y: *}}
     */
    toSimpleObj() {
        return {
            x: this.position.x,
            y: this.position.y
        };
    }

    /**
     * 激活目标
     */
    active() {
        this.is_find = true;
    }

    destory(){
        this.is_find = false;
        this.is_dead = true;
    }
}

/**
 * 假目标继承目标的属性
 */
class FakeTarget extends Target {
    constructor(id, x, y) {
        // 调用父类的方法
        super(id, x, y);
        // 初始颜色
        this.origin_color = "#ff98fc";
        // 假目标初始不工作
        this.is_work = false;
    }
    /**
     * 绘制目标,为三角形样式
     * @param canvas
     */
    draw(canvas) {
        let ctx = canvas.getContext("2d");
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        // 绘制五角星
        ctx.beginPath();
        ctx.beginPath();
        // 计算等边三角形的高
        let height = 16*Math.sin(Math.PI/3);
        // ctx.moveTo(8,0);
        // ctx.lineTo(0,height);
        // ctx.lineTo(16,height);

        ctx.moveTo(0,-height/2);
        ctx.lineTo(-8,height/2);
        ctx.lineTo(8,height/2);

        ctx.closePath();
        ctx.lineWidth = "2.5";
        ctx.fillStyle = this.origin_color;
        // 目标击毁后的颜色
        if (this.is_dead) ctx.fillStyle = "#000000";
        if (this.is_adjust) ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#F5270B";
        ctx.stroke();
        ctx.fill();
        // 恢复canvas绘图状态
        ctx.restore();
    }

}

// 导出
export {Target, FakeTarget};