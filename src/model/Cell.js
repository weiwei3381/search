import Vector from '../util/vector'

// 单个格子类
export default class Cell {
    constructor({id, x, y, width, height}){
        this.id = id;  // 一个单元格的编号
        this.zlevel = 0  // z层
        this.leftTop = [x,y]  // 网格左上角单元坐标点
        this.width = width  // 格子宽
        this.height = height  // 网格高
        this.range = [x,width,y,height];  // 一个单元格的范围
        this.targetsProb = [];  // 不同目标在这个格子的概率
        this.time = 0;  // 总探测时间为0
        this.earning = 1;  // 无人机在该单元的总收益
        this.return = 0;  // 无人机下一秒如果访问该目标的收益增长
        this.center = new Vector(0, 0);  // 网格的中心点
        this.isForward = false;  // 是否有无人机正在前往
        this.hasSearch = false;
    }

    get shape(){
        return {
            shape: 'rectangle',
            id: this.id,
            zlevel: 0,
            style  : {
                x : this.leftTop[0],
                y : this.leftTop[1],
                width : this.width,
                height : this.height,
                color : '#eee',
                text : this.earning,
                textColor: '#a6b7ff',
                textPosition: 'inside',
                brushType: 'stroke'
            }
        }
    }

    // 得到id对应的行号和列号
    getRowAndColumn(id) {
        var rowNum = simulation.gridSize[0];
        var columnNum = simulation.gridSize[1];
        var row = Math.floor(id / columnNum);  // 格子的行号
        var column = id % columnNum;  // 格子的行号
        return [row, column]
    }

    getConnect (type) {
        type = type || 8;  // 默认计算八连通
        var resultConn = [];  // 最终联通情况
        if (type === 4) {
            var row = this.getRowAndColumn(this.id)[0];
            var column = this.getRowAndColumn(this.id)[1];
            var straightConnAll = [[row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1]];  // 四个所有可能的正对角
            for (var i = 0; i < straightConnAll.length; i++) {
                var conn = straightConnAll[i];
                if (0 <= conn[0] && conn[0] < simulation.gridSize[0] && 0 <= conn[1] && conn[1] < simulation.gridSize[1]) {
                    resultConn.push(conn[0] * simulation.gridSize[1] + conn[1]);
                }
            }
        } else if (type === 8) {  // 得到8联通的格子ID
            var row = this.getRowAndColumn(this.id)[0];
            var column = this.getRowAndColumn(this.id)[1];
            var straightConnAll = [[row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1]];  // 四个所有可能的正对角
            var diagonalConnAll = [[row - 1, column - 1], [row - 1, column + 1], [row + 1, column - 1], [row + 1, column + 1]]; // 四个斜对角
            for (var i = 0; i < straightConnAll.length; i++) {
                var conn = straightConnAll[i];
                if (0 <= conn[0] && conn[0] < simulation.gridSize[0] && 0 <= conn[1] && conn[1] < simulation.gridSize[1]) {
                    resultConn.push(conn[0] * simulation.gridSize[1] + conn[1]);
                }
            }
            for (var i = 0; i < diagonalConnAll.length; i++) {
                var conn = diagonalConnAll[i];
                if (0 <= conn[0] && conn[0] < simulation.gridSize[0] && 0 <= conn[1] && conn[1] < simulation.gridSize[1]) {
                    resultConn.push(conn[0] * simulation.gridSize[1] + conn[1]);
                }
            }
        }
        return resultConn;  // 返回所有联通格子的id
    };

    // 格子初始化
    init() {
        // 初始化中心点坐标
        this.center.x = (this.range[0] + this.range[1]) / 2;  // 中心点的x坐标
        this.center.y = (this.range[2] + this.range[3]) / 2;  // 中心点的y坐标

        // 初始化格子收益
        var futureEarning = 0;  // 下一秒如果再到这个格子的收益
        for (var j = 0; j < this.targetsProb; j++) {
            var futureOneEarning = 1 - Math.exp(-1 * 0.005);
            futureEarning += futureOneEarning * this.targetsProb[j];
        }
        this.return = futureEarning;
    };


    update(leaders) {
        for (var i in leaders) {
            if (!leaders.hasOwnProperty(i)) continue;
            var leader = leaders[i];  // 拿到领航者
            // 判定单元格内有没有leader飞机
            if (leader.position.x > this.range[0] && leader.position.x < this.range[1] && leader.position.y > this.range[2] && leader.position.y < this.range[3]) {
                // 如果单元格有飞机, 则侦查时间+1
                this.time += 1;
                leader.nowCell = this;  // 更新无人机所处的网格
                // 更新总收益
                this.earning = 0;
                // 无人机在该网格中的总收益是每个目标被探测到概率的总和
                for (var j = 0; j < this.targetsProb; j++) {
                    var oneEarning = 1 - Math.exp(-1 * 0.005 * this.time);
                    this.earning += oneEarning * this.targetsProb[j];
                }

                //console.log("单元格id："+this.id + "|" + leader.leaderName + this.time + "|"+ this.earning + "|"+ this.return );
            }
        }
        var futureEarning = 0;  // 下一秒如果再到这个格子的收益
        for (var j = 0; j < this.targetsProb; j++) {
            var futureOneEarning = 1 - Math.exp(-1 * 0.005 * (this.time + 1));
            futureEarning += futureOneEarning * this.targetsProb[j];
        }
        this.return = futureEarning - this.earning;
    };

    // 网格的上的回报率绘制方法
    draw (ctx) {
        if (simulation.isDrawReturn) {
            if (this.return > 0) {
                ctx.save();
                ctx.translate(this.range[0], this.range[2]);  // canvas平移
                ctx.font = "15pt Arial";
                if (simulation.draw_style === "white") {
                    ctx.fillStyle = "#FFFFFF";
                }
                else {
                    ctx.fillStyle = "#FFFFFF";
                }

                ctx.fillText((this.return * 10000).toFixed(2), 1, 15);
                ctx.restore()
            }
        }
    }
}