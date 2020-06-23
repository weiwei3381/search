/**
 * 网格类
 * @param canvas
 * @param size
 * @param targetNum
 * @constructor
 */
class Grid {
    constructor( canvas, size) {
        this.canvas = canvas;  // 储存绘图上下文
        this.size = size || [4, 4];  // 网格的尺寸,例如[4,4]
        this.row_num = this.size[0];  // 横排数量
        this.column_num = this.size[1];  // 纵排数量


        let x_coordinate = [];  // x轴坐标
        let x_piece = this.canvas.width / this.column_num;  // x轴坐标一份的数量
        for (let i = 0; i < this.column_num + 1; i++) {
            x_coordinate.push(x_piece * i);
        }
        this.x_coordinate = x_coordinate;

        let y_coordinate = [];  // y轴坐标
        let y_piece = this.canvas.height / this.row_num;  // 竖排一份的数量
        for (let i = 0; i < this.row_num + 1; i++) {
            y_coordinate.push(y_piece * i);
        }
        this.y_coordinate = y_coordinate;
    }

    //求斜边长度
    getBeveling(x, y) {
        return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
    };

    // 绘制虚线
    drawDashLine(context, x1, y1, x2, y2, dashLen) {
        dashLen = dashLen === undefined ? 5 : dashLen;
        //得到斜边的总长度
        let beveling = this.getBeveling(x2 - x1, y2 - y1);
        //计算有多少个线段
        let num = Math.floor(beveling / dashLen);

        for (let i = 0; i < num; i++) {
            context[i % 2 == 0 ? 'moveTo' : 'lineTo'](x1 + (x2 - x1) / num * i, y1 + (y2 - y1) / num * i);
        }
        context.stroke();
    };

    // 绘制网格
    draw() {
        let ctx = this.canvas.getContext("2d");
        ctx.save();
        // 绘制格子边框
        ctx.beginPath();
        for (let scale of this.x_coordinate) {
            ctx.moveTo(scale, 0);
            ctx.lineTo(scale, ctx.canvas.height)
        }
        for (let scale of this.y_coordinate) {
            ctx.moveTo(0, scale);
            ctx.lineTo(ctx.canvas.width, scale)
        }
        ctx.lineWidth = 1.5;  // 航迹线宽
        ctx.strokeStyle = "rgba(200,200,200,0.8)"; // 航迹线的颜色

        ctx.stroke();  // 绘制
        ctx.restore()
    }
}

export default Grid;