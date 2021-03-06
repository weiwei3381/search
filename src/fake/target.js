import Vector from "../common/calc/vector"

class Target {
    constructor({id, position, v, angel, zlevel, onMove}) {
        this.id = id;  // 目标的id值
        this.position = new Vector(position);  // 目标的所处位置
        this.v = v  // 目标速度
        this.angle = angel  // 目标朝向
        this.zlevel = zlevel  // 所处canvas层
        this.onMove = onMove  // onmove函数

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
            shape  : 'star',
            id     : '123456',
            zlevel : 1,
            style  : {
                x : 200,
                y : 100,
                r : 150,
                n : 5,
                color : '#eee'
            },
            myName : 'kener',   // 可自带任何有效自定义属性

            clickable : true,
            onClick : function(eventPacket) {
                alert(eventPacket.target.myName);
            }
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