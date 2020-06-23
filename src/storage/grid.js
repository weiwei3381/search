// 网格类
export default class Grid {
    constructor(size, cellWidth, cellHeight) {
        this._cellsPool = {}  // 网格池
        this.cellWidth = cellWidth
        this.cellHeight = cellHeight

        this.size = size || [4, 4];  // 网格的尺寸,例如[4,5]
        this.rowNum = this.size[0];  // 横排数量
        this.columnNum = this.size[1];  // 纵排数量
        this.cells = [];  // 每个单元的情况
        this.clusters = [];  // 格子聚类结果
        this.connectedCells = [];  // 全联通格子列表
        this.treeDraw = null;  // 最小生成树
        this.relativeMinReturn = null;  // 相对比较小的回报率值，用作无人机的阈值
    }

    addCell(cell) {
        this._cellsPool[cell.id] = cell
    }

    update(flock) {
        const changeElements = []
        for (let uavId in flock) {
            const uav = flock[uavId]
            // 根据无人机的位置坐标, 以及每个格子的宽和高来确定位置
            const rowId = Math.floor(uav.position.x / this.cellWidth)
            const columnId = Math.floor(uav.position.y / this.cellHeight)
            const cell = this._cellsPool["" + rowId + columnId]
            // 可能无人机会飞出边界, 这里需要判断cell是否存在
            if(cell){
                cell.earning++
                changeElements.push(cell)
            }
        }
        return changeElements
    }


    // 从总数sum中随机抽取choiceNum个元素, 这个元素的范围是[0,sum-1],然后为每个元素分配一个概率,概率之和为1
    // 返回值是一个列表, 列表里面每个元素有两个属性, 分别是position位置和prob概率
    choice(sum, choiceNum) {
        var result = [];
        var probSum = 0;
        while (true) {
            if (result.length >= choiceNum) break;
            var isExist = false;  // 判断是否存在
            var temp = Math.floor(sum * Math.random());
            for (var i in result) {
                if (!result.hasOwnProperty(i)) continue;
                if (result[i].position === temp) {
                    isExist = true;
                    break
                }
            }
            if (!isExist) {
                var element = {};
                element.prob = Math.ceil(100 * Math.random());  // 随机生成概率
                element.position = temp;  // 随机生成位置
                result.push(element);
                probSum += element.prob;
            }
        }

        for (var i in result) {
            if (!result.hasOwnProperty(i)) continue;
            result[i].prob = result[i].prob / probSum
        }
        return result
    };

    /**
     * 聚类方法
     * @param type 方法类型,默认为"SKATER"方法
     */
    clusterMethod(type) {
        this.getRelativeMinReturn();  // 拿到一个比较小的回报率阈值，放到this.relativeMinReturn里
        var k = simulation.clusterNum;  // 分为5类
        var centerList = [];  // 聚类中心列表
        var stategy = "max_tree";  // Skater中每次拆最大的树
        // 采用k均值聚类
        if (simulation.UAVs_strategy === "C均值算法") {
            // 1. 随机生成k个聚类中心
            var result = this.choice(simulation.targetDistribCells, k);
            for (var i = 0; i < k; i++) {
                var center = {};  // 聚类中心是一个对象
                center.clustering = [];  // 聚类中心拥有的格子
                center.pos = this.cells[result[i].position].center;
                centerList.push(center);
            }

            // 迭代运行30次
            for (var iteration = 0; iteration < 30; iteration++) {
                // 2. 将离得最近的聚类中心元素归为该聚类
                for (var i in this.cells) {
                    if (!this.cells.hasOwnProperty(i)) continue;
                    var cell = this.cells[i];
                    if (cell.return <= this.relativeMinReturn) continue;  // 不考虑为比较小阈值的点
                    var cellPosition = cell.center;  // 获得格子中心位置
                    // 下面找到最近距离的聚类
                    var minDis = 9999999;
                    var nearestCenter = null;
                    for (var j = 0; j < k; j++) {
                        var center = centerList[j];  // 获得聚类中心
                        var dis = cellPosition.euc2d(center.pos);  // 获得到某点的距离
                        if (dis < minDis) {
                            minDis = dis;
                            nearestCenter = center;
                        }
                    }
                    nearestCenter.clustering.push(cell);  // 把该格子归为这个中心的类别
                }
                // 3. 重新生成聚类中心
                var newCenterList = [];
                for (var i = 0; i < k; i++) {
                    var center = centerList[i];
                    if (center.clustering.length === 0) continue;

                    var xSumCell = 0;  // 加起来的x轴位置
                    var ySumCell = 0;  // 加起来的y轴位置
                    for (var j in center.clustering) {
                        if (!center.clustering.hasOwnProperty(j)) continue;
                        var clusteringCell = center.clustering[j];  // 获得聚类的格子
                        xSumCell += clusteringCell.center.x;
                        ySumCell += clusteringCell.center.y;
                    }
                    var newCenter = {};
                    // 新聚类中心的位置
                    newCenter.pos = new Vector(xSumCell / center.clustering.length, ySumCell / center.clustering.length);
                    newCenter.clustering = [];  // 清空新聚类中心拥有的格子
                    newCenterList.push(newCenter)
                }
                centerList = newCenterList;
            }
            for (var i in this.cells) {
                if (!this.cells.hasOwnProperty(i)) continue;
                var cell = this.cells[i];
                if (cell.return <= this.relativeMinReturn) continue;  // 不考虑为0的点
                var cellPosition = cell.center;  // 获得格子中心位置
                // 下面找到最近距离的聚类
                var minDis = 9999999;
                var nearestCenter = null;
                for (var j = 0; j < k; j++) {
                    var center = centerList[j];  // 获得聚类中心
                    var dis = cellPosition.euc2d(center.pos);  // 获得到某点的距离
                    if (dis < minDis) {
                        minDis = dis;
                        nearestCenter = center;
                    }
                }
                nearestCenter.clustering.push(cell);  // 把该格子归为这个中心的类别
            }
            var clusters = []
            for (var i in centerList) {
                if (!centerList.hasOwnProperty(i)) continue;
                var oneCenter = centerList[i];
                var oneCluster = new Cluster();
                oneCluster.setClusterElements(oneCenter.clustering)
                clusters.push([oneCluster]);
            }
            this.clusters = clusters;
        } else if (simulation.UAVs_strategy === "连通域动态算法") {
            // 采用SKATER算法进行
            // 第1步 计算最小生成树
            var treeDraw = [];  // 绘制树用的
            var allCells = this.connectedCells;  // 获得所有参与计算的格子
            var noProcess = new HashMap();  // 还没处理的格子
            var waitProcess = new HashMap();  // 等待处理的格子
            var haveProcessed = new HashMap();  // 已经处理的格子
            var tree = new MinTree();  // 生成的最小生成树
            for (var i in allCells) {
                if (!allCells.hasOwnProperty(i)) continue;
                noProcess.put(allCells[i].id, allCells[i]);
            }
            var disMap = this.getDisMap(allCells);  // 获得距离矩阵
            var rootNode = new Node(allCells[0]);
            tree.setRoot(rootNode);  // 设置最小生成树的根节点
            haveProcessed.put(allCells[0].id, allCells[0]);
            noProcess.remove(allCells[0].id);
            var connectCellsId = allCells[0].getConnect();
            var count = 0;
            while (noProcess.size() != 0 || waitProcess.size() != 0) {
                for (var i in connectCellsId) {
                    if (!connectCellsId.hasOwnProperty(i)) continue;
                    var oneCellId = connectCellsId[i];
                    if (noProcess.containsKey(oneCellId)) {
                        waitProcess.put(oneCellId, noProcess.get(oneCellId));  // 放到等待处理中
                        noProcess.remove(oneCellId);  // 把没处理的删除掉
                    }
                }
                // 把所有等待处理的和已经处理的做循环,找到最短的路径
                var minDis = 99999;
                var startHaveProcess = null;
                var endWaitProcess = null;
                for (var i in waitProcess.values()) {
                    if (!waitProcess.values().hasOwnProperty(i)) continue;
                    var waitProcessCell = waitProcess.values()[i];  // 等待处理的格子
                    var cellDisMap = disMap.get(waitProcessCell.id);  // 所有跟等待处理的格子相邻的格子
                    for (var j in cellDisMap.keySet()) {
                        if (!cellDisMap.keySet().hasOwnProperty(j)) continue;
                        var cellConnectId = cellDisMap.keySet()[j];  // 拿到邻接格子Id
                        if (haveProcessed.containsKey(cellConnectId)) {  // 如果这个相邻的格子是已经处理过的
                            // 从已经处理格子,到等待处理的格子的距离
                            var dis = this.getNodesDis(cellConnectId, waitProcessCell, disMap);
                            if (dis < minDis) {
                                minDis = dis;
                                startHaveProcess = haveProcessed.get(cellConnectId);
                                endWaitProcess = waitProcessCell;
                            }
                        }
                    }
                }
                treeDraw.push([startHaveProcess, endWaitProcess, minDis]);
                tree.addNode(startHaveProcess, new Node(endWaitProcess));  // 把节点加入树
                waitProcess.remove(endWaitProcess.id);
                haveProcessed.put(endWaitProcess.id, endWaitProcess);
                connectCellsId = endWaitProcess.getConnect();
                count++;
                if (count > 1000) break;
            }
            this.treeDraw = treeDraw;

            // 第2步, 穷举法找各个聚类
            var treeList = [tree.copy()];
            if (stategy === "max_tree") {
                for (var i = 0; i < k - 1; i++) {  // 分成k份则需要运行k-1次
                    var minFitness = 999999;
                    var minTreeList = [];
                    var oneTree = {};
                    var maxSize = 0;
                    var max_j = 0
                    for (var j = 0; j < treeList.length; j++) {
                        if (treeList[j].size() > maxSize) {
                            maxSize = treeList[j].size();
                            oneTree = treeList[j].copy();
                            max_j = j;
                        }
                    }
                    for (var l = 0; l < oneTree.root.descendant.length; l++) {
                        var newTreeList = treeList.copy();  // 拷贝一份数组之后,去掉老树
                        newTreeList.remove(treeList[max_j]);
                        var child = oneTree.root.descendant[l];  // 找到一个子代
                        var oneTreeCopy = oneTree.copy();
                        var anotherNode = oneTreeCopy.removeNode(child.data);  // 一棵树变成两颗树
                        var anotherTree = new MinTree();
                        anotherTree.setRoot(anotherNode);
                        newTreeList.push(oneTreeCopy);
                        newTreeList.push(anotherTree);
                        var fitnessValue = this.clusterFitnessValue(newTreeList);  // 获得新树的适应度值
                        if (fitnessValue < minFitness) {
                            minFitness = fitnessValue;
                            minTreeList = newTreeList;
                        }
                    }
                    treeList = minTreeList;
                }
            } else {
                for (var i = 0; i < k - 1; i++) {  // 分成k份则需要运行k-1次
                    var minFitness = 999999;
                    var minTreeList = [];
                    for (var j = 0; j < treeList.length; j++) {
                        var oneTree = treeList[j].copy();
                        for (var l = 0; l < oneTree.root.descendant.length; l++) {
                            var newTreeList = treeList.copy();  // 拷贝一份数组之后,去掉老树
                            newTreeList.remove(treeList[j]);
                            var child = oneTree.root.descendant[l];  // 找到一个子代
                            var oneTreeCopy = oneTree.copy();
                            var anotherNode = oneTreeCopy.removeNode(child.data);  // 一棵树变成两颗树
                            var anotherTree = new MinTree();
                            anotherTree.setRoot(anotherNode);
                            newTreeList.push(oneTreeCopy);
                            newTreeList.push(anotherTree);
                            var fitnessValue = this.clusterFitnessValue(newTreeList);  // 获得新树的适应度值
                            if (fitnessValue < minFitness) {
                                minFitness = fitnessValue;
                                minTreeList = newTreeList;
                            }
                        }
                    }
                    treeList = minTreeList;
                }
            }

            var decisionTreeList = treeList;  // 最终的聚类
            // 第三步, 把最终的树编程包含Cell的数组
            var clusterList = [];
            for (var i in decisionTreeList) {
                if (!decisionTreeList.hasOwnProperty(i)) continue;
                var oneTree = decisionTreeList[i];

                var oneCluster = new Cluster();
                oneCluster.setClusterElements(oneTree.getAllData());  // 设置一个聚类的所有元素
                oneCluster.setAvgReturn();  // 计算其中的平均回报率
                clusterList.push([oneCluster, oneTree]);  // 聚类的列表中既放数组, 又放树
            }
            // 按照回报率从大到小排序
            clusterList.sort(function (a, b) {
                return (b[0].avgReturn - a[0].avgReturn);
            });
            this.clusters = clusterList;
        }
    };

    // 获得距离矩阵
    getDisMap(allCells) {
        var disMap = new HashMap();
        for (var i in allCells) {
            if (!allCells.hasOwnProperty(i)) continue;
            var cell = allCells[i];  // 拿到一个格子
            var cellConnectId = cell.getConnect();  // 跟这个格子联通的格子id
            var subSimilaryMap = new HashMap();
            for (var j in allCells) {
                if (!allCells.hasOwnProperty(j)) continue;
                var otherCell = allCells[j];
                if (cellConnectId.indexOf(otherCell.id) > -1) {
                    var dis = Math.abs(cell.return - otherCell.return);
                    subSimilaryMap.put(otherCell.id, dis);
                }
            }
            disMap.put(cell.id, subSimilaryMap);
        }
        return disMap;
    };

    // 获得相对小的阈值,放到Grid中
    getRelativeMinReturn(middleNum) {
        var middleNum = middleNum || 0.25;  // 中位数默认值为0.25
        var cells = this.cells;
        var cellsWithReturn = [];
        // 把回报率大于0的网格加入cellsWithReturn
        for (var i in cells) {
            if (!cells.hasOwnProperty(i)) continue;
            cells[i].hasSearch = false;  // 搜索网格为未搜索
            if (cells[i].return > 0) {
                cellsWithReturn.push(cells[i]);
            }
        }
        cellsWithReturn.sort(
            function (a, b) {
                return a.return - b.return;
            });  // 按照等级从小到大排序
        var index = Math.floor(cellsWithReturn.length * middleNum);
        this.relativeMinReturn = cellsWithReturn[index].return;
        console.log("当前阈值：", this.relativeMinReturn);
        return cellsWithReturn[index].return;
    };

    // 获得节点距离,可以是节点的id或者cell
    getNodesDis(a, b, disMap) {
        var dis = null;
        const a_id = a instanceof Cell ? a.id : a;
        const b_id = b instanceof Cell ? b.id : b;
        if (disMap.containsKey(a_id)) {
            dis = disMap.get(a_id).get(b_id)
        }
        return dis;
    };

    // 聚类的适应度值
    clusterFitnessValue(treeList) {
        var fitnessValue = 0;
        // 最多的节点数
        var maxSize = 0;
        var minSize = 99999;
        for (var i in treeList) {
            if (!treeList.hasOwnProperty(i)) continue;
            var tree = treeList[i];
            if (tree.size() > maxSize) {
                maxSize = tree.size()
            }
            if (tree.size() < minSize) {
                minSize = tree.size()
            }
            var attribList = [tree.root.data.return];
            for (var j in tree.root.descendant) {
                if (!tree.root.descendant.hasOwnProperty(j)) continue;
                attribList.push(tree.root.descendant[j].data.return);
            }
            var sum = 0;  // 属性和
            for (var i in attribList) {
                if (!attribList.hasOwnProperty(i)) break;
                sum += attribList[i];
            }
            var avg = sum / attribList.length;  // 平均值

            for (var i in attribList) {
                if (!attribList.hasOwnProperty(i)) break;
                fitnessValue += Math.abs(attribList[i] - avg);
            }
        }
        // 惩罚系数
        if ((minSize / maxSize) < 0.4) fitnessValue = 9999;
        return fitnessValue;
    };

    // 区域联通
    connectCells() {
        var connectedMap = new HashMap();  // 已经联通的格子
        var leftMap = new HashMap();  // 剩下来还没有联通的格子,map类型, 方便查找
        var allMap = new HashMap();  // 所有return大于0的格子的表
        // step 1. 初始化上述三个表
        for (var i in this.cells) {
            if (!this.cells.hasOwnProperty(i)) continue;
            var cell = this.cells[i];
            if (cell.return > 0) {
                allMap.put(cell.id, cell);
                if (connectedMap.size() === 0) {
                    connectedMap.put(cell.id, cell);
                } else {
                    leftMap.put(cell.id, cell);
                }
            }
        }
        // step 2. 循环进行迭代
        var twoNodeMinDis = this.cells[0].center.euc2d(this.cells[2].center);  // 两个格子的距离,如果两个点的距离等于这个值, 则直接作为最小值
        var cell = connectedMap.values()[0];  // 提出联通格子
        var conIds = cell.getConnect();  // 找到格子周围所有的id
        // step 2.1 当剩余格子数目等于0, 则迭代结束
        while (leftMap.size() > 0) {
            var processMap = new HashMap();  // 待处理的格子
            var newConIds = [];  // 新的联通的格子
            // step 2.2 对于所有ids中的格子, 如果return值大于0, 而且在剩余格子列表中,则准备进行处理
            for (var i in conIds) {
                if (!conIds.hasOwnProperty(i)) continue;
                var id = conIds[i];
                if (allMap.containsKey(id) && leftMap.containsKey(id)) {  // 确保return>0
                    processMap.put(id, allMap.get(id));  // 把格子加入待处理列表
                }
            }
            // step 2.3 分两种情况讨论, 第一种情况, 如果所有新联通的格子都不在剩余格子中,也就是说周围都是空格子
            // 那么从剩余格子和联通格子中找一条最短路径
            if (processMap.size() === 0) {
                var connectedList = connectedMap.values();  // 已经联通过的格子
                var leftList = leftMap.values();  // 待联通的格子
                var minDis = 99999999999;
                var minDisConCell = null;
                var minDisLeftCell = null;
                var isFindMin = false;  // 是否找到最小的点
                // 找到两个最短路径
                for (var j in connectedList) {
                    if (!connectedList.hasOwnProperty(j)) continue;
                    var connectedCell = connectedList[j];  // 拿到一个已经联通的格子
                    for (var k in leftList) {
                        if (!leftList.hasOwnProperty(k)) continue;
                        var leftCell = leftList[k];  // 拿到一个没联通的格子
                        var dis = leftCell.center.euc2d(connectedCell.center);
                        if (dis <= twoNodeMinDis) {  // 如果直接找到最小值
                            minDisLeftCell = leftCell;
                            minDisConCell = connectedCell;
                            isFindMin = true;
                        }
                        if (isFindMin) break;
                        if (dis < minDis) {  // 如果小于最小距离
                            minDisLeftCell = leftCell;
                            minDisConCell = connectedCell;
                            minDis = dis;
                        }
                    }
                    if (isFindMin) break;
                }
                // step 2.4 针对这个最短路径, 对于已经联通的格子, 按照八连通进行扩张, 每次扩张一个格子,这个格子到目标格子的距离最短
                var isContain = false;
                while (true) {
                    var ids = minDisConCell.getConnect();
                    // 如果周围取到的联通格子, 已经包括了目标格子,则跳出循环
                    for (var k in ids) {
                        if (!ids.hasOwnProperty(k)) continue;
                        if (ids[k] === minDisLeftCell.id) {
                            isContain = true;
                        }
                    }
                    if (isContain) break;
                    minDisConCell = this.getMinDisCell(minDisLeftCell, ids);
                    // 把过度点加入联通表
                    connectedMap.put(minDisConCell.id, minDisConCell);
                    // 把过渡点的联通
                    var ids = minDisConCell.getConnect();
                    for (var l in ids) {
                        if (!ids.hasOwnProperty(l)) continue;
                        var id = ids[l];
                        newConIds.push(id);
                    }
                }
                // 在联通表里面加入目标格子, 然后在剩余点中去掉目标格子
                connectedMap.put(minDisLeftCell.id, minDisLeftCell);
                leftMap.remove(minDisLeftCell.id);
                // 新ids的格子, 就是这次目标格子的周围格子
                var ids = minDisLeftCell.getConnect();
                for (var l in ids) {
                    if (!ids.hasOwnProperty(l)) continue;
                    var id = ids[l];
                    newConIds.push(id);
                }

                // step 2.3 第二种情况,如果所有周围有剩余格子
            } else {
                // 拿到所有要处理的格子,把格子加入联通表,去掉剩余表
                var processCellList = processMap.values();
                for (var j in processCellList) {
                    if (!processCellList.hasOwnProperty(j)) continue;
                    var processCell = processCellList[j];
                    connectedMap.put(processCell.id, processCell);
                    leftMap.remove(processCell.id);
                    // 对于所有得到的联通点的id放到新的ids里面,进行下一次循环
                    var conId = processCell.getConnect();
                    for (var k in conId) {
                        if (!conId.hasOwnProperty(k)) continue;
                        var id = conId[k];
                        newConIds.push(id);
                    }
                }
            }
            // step 2.5 新ids赋值给ids
            conIds = newConIds;
        }
        return connectedMap.values();  // 返回所有联通的区域cell的list

    };

    // 得到最近距离的格子
    getMinDisCell(disCell, cellIds) {
        var minDis = 999999;
        var minDisCell = null;
        for (var i in cellIds) {
            if (!cellIds.hasOwnProperty(i)) continue;
            var cellId = cellIds[i];
            var cell = this.cells[cellId];
            var dis = disCell.center.euc2d(cell.center);
            if (dis < minDis) {
                minDis = dis;
                minDisCell = cell;
            }
        }
        return minDisCell;  // 离标准点最近的距离
    };

    // 初始化
    init() {
        // 切割网络
        var rowNum = this.size[0];  // 横排的数目
        var columnNum = this.size[1];  // 竖排的数目
        var xCoordinate = [];  // x轴坐标
        var xPiece = this.canvas.width / columnNum;  // x轴坐标一份的数量
        for (var i = 0; i < columnNum + 1; i++) {
            xCoordinate.push(xPiece * i);
        }
        this.xCoordinate = xCoordinate;

        var yCoordinate = [];  // y轴坐标
        var yPiece = this.canvas.height / rowNum;  // 竖排一份的数量
        for (var i = 0; i < rowNum + 1; i++) {
            yCoordinate.push(yPiece * i);
        }
        this.yCoordinate = yCoordinate;

        for (var i = 0; i < rowNum; i++) {
            for (var j = 0; j < columnNum; j++) {
                var id = j + i * columnNum;  // 单元格的编号
                // 一个格子的空间, 由四个值确定, 分别是x轴的范围, 和y轴的范围
                var range = [xCoordinate[j], xCoordinate[j + 1], yCoordinate[i], yCoordinate[i + 1]];  // 一个单元格的范围
                var cell = new Cell(id, range);
                this.cells.push(cell);
            }
        }
        var gridSum = this.rowNum * this.columnNum;  // 格子总数
        var targetList = [];
        var randomTextArea = document.getElementById("randomValue");  // 获得现有文本框内容
        var localTargetValue = localStorage.getItem("targetValue");  // 获得本地存储的值
        // 如果文本框里面有内容, 则导入现有的目标分布
        if (randomTextArea.value.length > 100 || localTargetValue != null) {
            var randomValue = "";
            // 首先用html中的值,不存在则使用本地存储的值
            if (randomTextArea.value.length > 100) {
                randomValue = randomTextArea.value.trim(" ");
            } else {
                randomValue = localTargetValue.trim(" ");
            }
            randomTextArea.value = randomValue;
            var targetDistrbTxt = randomValue.split("&&");
            for (var i in targetDistrbTxt) {
                if (!targetDistrbTxt.hasOwnProperty(i)) continue;
                var targetDistrib = targetDistrbTxt[i].split("||");
                for (var j in targetDistrib) {
                    if (!targetDistrib.hasOwnProperty(j)) continue;
                    var oneTarget = targetDistrib[j];
                    var position = parseInt(oneTarget.slice(1, oneTarget.length - 1).split(",")[0]);
                    var prob = parseFloat(oneTarget.slice(1, oneTarget.length - 1).split(",")[1]);
                    this.cells[position].targetsProb.push(prob);  // 把这个目标放到对应的格子中
                }
            }
            // 都不存在则重新生成
        } else {
            randomTextArea.value = "";  // 清空文本域
            for (var i = 0; i < this.targetNum; i++) {
                var targetDistrib = this.choice(simulation.targetDistribCells, 7);  // 初始化每个目标的概率分布
                var textValue = "";
                for (var j in targetDistrib) {
                    if (!targetDistrib.hasOwnProperty(j)) continue;
                    var oneTarget = targetDistrib[j];  // 获得一个目标在某个格子的概率
                    textValue += "[" + oneTarget.position + "," + oneTarget.prob + "]" + "||"  // 某一个目标的分布用||隔开
                    this.cells[oneTarget.position].targetsProb.push(oneTarget.prob);  // 把这个目标放到对应的格子中
                }
                textValue = textValue.slice(0, textValue.length - 2);  // 去掉结束多余的||
                randomTextArea.value = randomTextArea.value + "&&" + textValue;  // 目标与目标之间用&&隔开
            }
            randomTextArea.value = randomTextArea.value.slice(2, randomTextArea.value.length);  // 去掉开头多余的&&
            // 把分布放到本地存储中
            localStorage.setItem("targetValue", randomTextArea.value);
        }

        for (var i in this.cells) {
            if (!this.cells.hasOwnProperty(i)) continue;
            this.cells[i].init();  // 格子初始化
        }

        // 生成全联通的格子列表
        this.connectedCells = this.connectCells();
    };

    // 评估总的收益
    evaluate() {
        var sumEarning = 0;
        for (var i in this.cells) {
            if (!this.cells.hasOwnProperty(i)) continue;
            var cell = this.cells[i];
            sumEarning += cell.earning;
        }
        return sumEarning;
    };


    // 绘制虚线
    drawDashLine(context, x1, y1, x2, y2, dashLen) {

        //求斜边长度
        function getBeveling(x, y) {
            return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
        }

        dashLen = dashLen === undefined ? 5 : dashLen;
        //得到斜边的总长度
        var beveling = getBeveling(x2 - x1, y2 - y1);
        //计算有多少个线段
        var num = Math.floor(beveling / dashLen);

        for (var i = 0; i < num; i++) {
            context[i % 2 == 0 ? 'moveTo' : 'lineTo'](x1 + (x2 - x1) / num * i, y1 + (y2 - y1) / num * i);
        }
        context.stroke();
    };

    // 网格的绘制方法
    draw(ctx) {
        color = ['#ff7f50', '#b8860b', '#da70d6', '#32cd32', '#6495ed',
            '#ff69b4', '#ba55d3', '#cd5c5c', '#ffa500', '#40e0d0',
            '#1e90ff', '#ff6347', '#7b68ee', '#00fa9a', '#ffd700',
            '#6699FF', '#ff6666', '#3cb371', '#30e0e0', '#87cefa'];
        ctx.save();
        if (simulation.isDrawCluster) {
            for (var i in this.clusters) {
                if (!this.clusters.hasOwnProperty(i)) continue;
                var oneCluster = this.clusters[i][0];  // 聚类中既有列表, 又有树
                var clusterElements = oneCluster.clusterElements;  // 获得所属聚类
                for (var j in clusterElements) {
                    if (!clusterElements.hasOwnProperty(j)) continue;
                    var cell = clusterElements[j];
                    var range = cell.range;
                    ctx.beginPath();
                    ctx.lineTo(range[0], range[2]);
                    ctx.lineTo(range[1], range[2]);
                    ctx.lineTo(range[1], range[3]);
                    ctx.lineTo(range[0], range[3]);
                    ctx.fillStyle = color[i % color.length];
                    ctx.fill();
                    ctx.closePath();
                }
            }
        } else {
            for (var i in this.connectedCells) {
                if (!this.connectedCells.hasOwnProperty(i)) continue;
                var cell = this.connectedCells[i];
                if (!simulation.isDrawConnectCell) {
                    if (cell.return <= 0) continue;
                }
                var range = cell.range;
                ctx.beginPath();
                ctx.lineTo(range[0], range[2]);
                ctx.lineTo(range[1], range[2]);
                ctx.lineTo(range[1], range[3]);
                ctx.lineTo(range[0], range[3]);
                if (cell.return > 0) {
                    var openness = 0.3 + cell.return / 0.001;  // 透明度随着回报率的不同变化
                    ctx.fillStyle = "rgba(51,153,204," + openness + ")";
                } else {
                    ctx.fillStyle = color[2];
                }
                ctx.fill();
                ctx.closePath();
            }
        }

        // 绘制树形结构
        if (simulation.isDrawTree) {
            for (var i in this.treeDraw) {
                if (!this.treeDraw.hasOwnProperty(i)) continue;
                var oneConnect = this.treeDraw[i];
                var start = oneConnect[0];
                var end = oneConnect[1];
                ctx.beginPath();
                ctx.strokeStyle = "rgb(255,255,255)"; // 航迹线的颜色
                ctx.lineWidth = 2.5;  // 航迹线宽
                this.drawDashLine(ctx, start.center.x, start.center.y, end.center.x, end.center.y, 12);
                ctx.moveTo(start.center.x, start.center.y);
                ctx.lineTo(end.center.x, end.center.y);
                ctx.beginPath();
                ctx.arc(start.center.x, start.center.y, 5, 0, 2 * Math.PI);
                ctx.arc(end.center.x, end.center.y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = "rgb(77,255,21)";
                ctx.fill();
                ctx.closePath();
            }
        }

        // 绘制格子边框
        ctx.beginPath();
        for (var i in this.xCoordinate) {
            if (!this.xCoordinate.hasOwnProperty(i)) continue;
            ctx.moveTo(this.xCoordinate[i], 0);
            ctx.lineTo(this.xCoordinate[i], ctx.canvas.height)
        }
        for (var i in this.yCoordinate) {
            if (!this.yCoordinate.hasOwnProperty(i)) continue;
            ctx.moveTo(0, this.yCoordinate[i]);
            ctx.lineTo(ctx.canvas.width, this.yCoordinate[i])
        }
        ctx.lineWidth = 1.5;  // 航迹线宽
        if (simulation.draw_style === "white") {
            ctx.strokeStyle = "#222"; // 航迹线的颜色
        } else {
            ctx.strokeStyle = "rgba(200,200,200,0.8)"; // 航迹线的颜色
        }

        ctx.stroke();  // 绘制
        ctx.restore()
    }
}