// 群体类
export default function Flock() {
    this.boids = [];  //  所有无人机对象
    this.obstacles = [];  // 所有障碍物对象
    this.grid = null;  // 航迹的空对象
    this.leaders = [];  // 领导者
    this.virtualLeaders = [];  // 虚拟领航者
    this.evaluation = [];  // 回报率变化情况

    // 增加网格
    this.addGrid = function (grid) {
        this.grid = grid;
        this.grid.init();
        this.grid.clusterMethod();  // 调用聚类方法
    };

    // 删除网格
    this.delGrid = function () {
        if (this.grid != null) {
            // 清空目标分布的文本框
            $("#randomValue").val("");
            // 清空localStorage
            localStorage.removeItem("targetValue");
            localStorage.removeItem("连通域动态算法");
            localStorage.removeItem("贪心算法");
            localStorage.removeItem("C均值算法");
            // 令轨迹对象为空
            this.grid = null;
        }
    };

    // 增加领航者
    this.addLeader = function (leader) {
        this.leaders.push(leader);
        simulation.leadersSum++;
        for (var i in this.grid.cells) {
            if (!this.grid.cells.hasOwnProperty(i)) continue;
            var cell = this.grid.cells[i];  // 获得每个格子
            cell.update(this.leaders);
        }
    };

    // 删除领航者
    this.delLeader = function () {
        this.leaders.pop();  // 把最后一个领导者踢出去,因此必须要保证坠毁的领航者在最后
        simulation.leadersSum--;  // 领航者总量减1

    };

    // 等级和排名寻找无人机
    this.getLeaderByGrade = function (leaderGrade, leaderRank) {
        for (var i = 0; i < this.leaders.length; i++) {
            if (this.leaders[i].leaderGrade === leaderGrade && this.leaders[i].leaderRank === leaderRank) {
                return this.leaders[i]
            }
        }
    };

    // 增加虚拟领航者
    this.addVirtualLeader = function (virtualLeader) {
        this.virtualLeaders.push(virtualLeader);
    };

    this.returnValue = [];

    // 更新数据方法
    this.update = function () {
        var tempLeader;
        // 如果迭代未完成,则每次全局迭代数+1
        if (simulation.iteration < simulation.iterationSum) {
            simulation.iteration++;
            this.returnValue.push(simulation.lastEvaluation);

            // 设置监控器情况
            if(simulation.iteration % 20 === 0){
                simulation.monitor.setOption({
                    series: [{
                        // 根据名字对应到相应的系列
                        name: simulation.UAVs_strategy,
                        data: this.returnValue
                    }]
                });
            }
            // 迭代完成则,保存历史评估信息,并在控制台输出最后的评估值
        } else {
            localStorage.setItem(simulation.UAVs_strategy,JSON.stringify(this.returnValue));
            console.log("最后的评估值：" + simulation.lastEvaluation);
            simulation.run = false;
            return;
        }

        // 对每个领航者的行为进行模拟
        for (var i = this.leaders.length - 1; i >= 0; i--) {
            this.leaders[i].simulate(this.leaders, this.grid);
            if (this.leaders[i].dead) {  // 如果领航者坠毁
                tempLeader = this.leaders[i];
                this.leaders[i] = this.leaders[this.leaders.length - 1];  // 把最后一个领导者放到坠毁的领导者这里
                this.leaders[this.leaders.length - 1] = tempLeader; // 坠毁的领导者移到最后
                this.delLeader();  // 把最后的领航者删除了
            }
            if (this.leaders[i].isFinish) {
                this.reClustering();
            }
        }
        // 更新每个格子
        for (var i in this.grid.cells) {
            if (!this.grid.cells.hasOwnProperty(i)) continue;
            var cell = this.grid.cells[i];  // 获得每个格子
            cell.update(this.leaders);
        }

        var fitnessValue = this.grid.evaluate();  // 评估网格的适应度值
        if (simulation.iteration % 10 === 0) {
            this.evaluation.push(fitnessValue);
        }
        simulation.lastEvaluation = fitnessValue;
        //console.log("适应度值: " + fitnessValue)
    };

    /**
     * 给对所有的格子分配聚类, 然后给每架飞机分配聚类
     */
    this.reClustering = function () {
        this.grid.clusterMethod();  // 调用聚类方法
        // 清空原有数据
        for (var i = 0; i < this.leaders.length; i++) {
            var leader = this.leaders[i];
            leader.isAssignCluster = false;
            leader.isFinish = false;
            leader.isCircle = false;
            leader.beginCircle = false;
        }
        var clusters = this.grid.clusters;  // 生成的聚类情况
        for (var i = 0; i < this.leaders.length; i++) {  // 如果有3架飞机，则取3个最大的聚类
            var cluster = clusters[i][0];  // 拿到平均回报率最大的聚类
            var elements = cluster.clusterElements;  // 拿到每个格子
            var maxCell = null; // 回报率最大的格子
            var maxReturn = 0;
            // 找到回报率最大的格子
            for (var j = 0; j < elements.length; j++) {
                var element = elements[j];  // 拿到一个格子
                if (element.return >= maxReturn) {
                    maxCell = element;
                    maxReturn = element.return;
                }
            }
            // 计算每架无人机到这个格子的距离，取最近的
            var minDis = 999999;  // 最近距离
            var minLeader = null;  // 最近的飞机
            for (var k = 0; k < this.leaders.length; k++) {
                var leader = this.leaders[k];  // 拿到一架飞机
                if (leader.isAssignCluster)  continue;  // 如果飞机已经分配,则跳过
                var dis = leader.position.euc2d(maxCell.center);  // 计算每个格子到飞机的距离
                if (dis < minDis) {
                    minDis = dis;
                    minLeader = leader;
                }
            }

            minLeader.cluster = cluster;  // 无人机对应的聚类
            minLeader.clusterTarget = maxCell;  // 无人机聚类的飞行目标
            minLeader.isAssignCluster = true;  // 已经制定聚类

            // todo 确定从无人机当前目标到所需目标的格子链
            // 第一步,先求出从无人机目前位置到飞行目标的路径
            var targetList = [];  // 加入格子时进行判定,没有值的格子不加入,这样能省时间
            var nowCell = minLeader.nowCell;  // 无人机目前所在格子
            var isEnd = false;  // 是否结束
            if (simulation.UAVs_strategy === "连通域动态算法") {
                while (true) {
                    var referenceDis = nowCell.center.euc2d(maxCell.center);  // 参考距离
                    var connectIds = nowCell.getConnect();  // 得到联通格子
                    connectIds.push(nowCell.id);  // 把本地id加进去，保证到目标点后能break
                    var shortCells = [];  // 所有让距离变短的格子
                    var minShortInCells = 99999;  // 最短距离
                    var minShortCell = null;  // 最短距离的格子
                    for (var m = 0; m < connectIds.length; m++) {
                        var connectId = connectIds[m];  // 拿到id;
                        if (connectId === maxCell.id) {
                            isEnd = true;
                            break;
                        }
                        var connectCell = this.grid.cells[connectId];  // 拿到格子
                        var dis = connectCell.center.euc2d(maxCell.center);
                        if (dis < referenceDis) {  // 如果距离小于参考距离
                            shortCells.push(connectCell);  // 放到所有让距离变短的格子里
                            if (dis < minShortInCells) {
                                minShortInCells = dis;
                                minShortCell = connectCell;
                            }
                        }
                    }
                    if (isEnd) break;
                    shortCells.sort(function (a, b) {
                        return b.return - a.return;
                    });  // 按照回报率由高到低排序
                    if (shortCells[0].return < 0.00001) {  // 如果回报率都比较低,则往近的飞
                        nowCell = minShortCell;
                    } else {
                        nowCell = shortCells[0];  // 当前格子为回报率最大的格子
                        targetList.push(nowCell);
                    }

                }
                // 第二步, 到了树中怎么飞,
                var clusterTree = clusters[i][1].copy();  // 复制一颗树
                var minCellNode = clusterTree.findNode(maxCell);  // 拿到节点

                targetList.push(minCellNode.data);  // 目标格子链
                var nextNode = minCellNode;  // 下一个节点
                while (true) {
                    var nextNode = nextNode.search();
                    if (nextNode == null) {
                        break;
                    }
                    if (nextNode.data.return > 0) {
                        targetList.push(nextNode.data);
                    }

                }
            }
            else if (simulation.UAVs_strategy === "C均值算法") {
                targetList = elements.copy();  // 简单把元素放到目标列
                targetList.sort(function (a, b) {
                    return b.return - a.return;
                });
                minLeader.targetCell = targetList.shift();
                minLeader.target = minLeader.targetCell.center;
            }
            minLeader.targetList = targetList;  // 目标链
        }
    };
    // 整个群体的绘图方法
    this.draw = function (ctx, width, height) {
        var i;
        var accSpeed = 0;  // 速度的累加值
        var speeds = [];

        // 绘制航迹
        if (this.path != null) {
            this.path.draw(ctx);
        }

        // 绘制网格
        if (this.grid !== null) {
            this.grid.draw(ctx);
            for (var i in this.grid.cells) {
                if (!this.grid.cells.hasOwnProperty(i)) continue;
                this.grid.cells[i].draw(ctx);
            }
        }

        // 绘制每架无人机
        for (i = this.boids.length - 1; i >= 0; i--) {
            this.boids[i].draw(ctx, width, height);
            // 计算每架无人机的速度
            var speed = this.boids[i].vel.mag();  // mag是合成后速度的大小,方法是sqrt(x^2+y^2)
            speeds.push(speed);
            accSpeed += speed
        }

        // 绘制每架领航者
        for (i = this.leaders.length - 1; i >= 0; i--) {
            this.leaders[i].draw(ctx, simulation.draw_style);
        }

        // 绘制虚拟领航者
        for (i = this.virtualLeaders.length - 1; i >= 0; i--) {
            this.virtualLeaders[i].draw(ctx);
        }

        // 绘制每个障碍物
        for (i = this.obstacles.length - 1; i >= 0; i--) {
            this.obstacles[i].draw(ctx)
        }

        // 绘制每个格子的信息


        /* 显示统计量 */
        ctx.save();  // 保存绘图上下文
        ctx.font = "16pt Arial";
        var avgSpeed = accSpeed / this.boids.length;  // 获得平均速度
        var speedStd = 0;  // 获得速度标准差
        for (i = 0; i < speeds.length; i++) {
            speedStd += (speeds[i] - avgSpeed) * (speeds[i] - avgSpeed);
        }
        speedStd = Math.sqrt(speedStd / speeds.length);

        var contextHeight = ctx.canvas.height - ctx.canvas.offsetTop;  // 得到画布高度
        //var textAvg = "平均速度: " + avgSpeed.toFixed(2) + " p/f";
        //var textStd = "标准差: " + speedStd.toFixed(2) + " p/f";
        //ctx.fillText(textAvg, 10, contextHeight - 10 - 22);
        //ctx.fillText(textStd, 10, contextHeight - 10);
        ctx.restore();
    }
}