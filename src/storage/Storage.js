import {UAV} from '../model/UAV'
import Cell from '../model/Cell'
import {Target} from '../model/Target'
import Grid from '../storage/grid'
import config from '../config'

export default class Storage {
    constructor() {
        this._idBase = 0  // 各类图形数据id增长基础
        this._elements = {}  // 所有元素的索引

        this._maxZlevel = 0  // z层的最大值
        this._zElements = []  // 所有形状的z轴方向排列
        this._hoverElements = []  // 高亮层形状，不稳定，动态增删，数组位置也是z轴方向，靠前显示在下方

        this._changedZlevel = {} // 有数据改变的zlevel


        this._flock = {}  // 无人机群
        this._targets = {}  // 所有目标
        this._radars = {}   // 所有雷达类目标
        this._obstacles = {}  // 所有障碍物类目标
    }

    /**
     * 唯一标识id生成
     * @param {string=} idHead 标识前缀
     */
    newId(idHead) {
        return (idHead || '') + (++this._idBase);
    }

    addUAV(params) {
        // 设置默认属性, 然后用params将其覆盖
        const prop = {
            position: [0, 0],
            angle: 0,
            zlevel: 2,
            v: 0,
            ...params
        }
        const uav = new UAV(prop)  // 创建无人机
        this.addElement(params.id, uav)  // 在元素集合中增加uav
        this._flock[params.id] = uav  // 在无人机群中增加uav
    }

    addTarget(params) {
        // 覆盖默认属性
        const prop = {
            position: [0, 0],
            angle: 0,
            v: 0,
            zlevel: 1,
            ...params
        }
        const target = new Target(prop)
        this.addElement(params.id, target)  // 增加元素
        this._targets[params.id] = target
    }

    // 初始化网格
    initGrid(width, height, size) {
        const gridSize = size || config.gridSize  // 网格数量
        const [row, column] = gridSize  // 横排和纵排网格数
        const cellWidth = width / row
        const cellHeight = height / column
        this._grid = new Grid(gridSize, cellWidth, cellHeight)  // 初始化网格对象
        for (let i = 0; i < row; i++) {
            for (let j = 0; j < column; j++) {
                const id = "" + i + j
                // 新创建网格
                const cell = new Cell({
                    id,
                    x: i * cellWidth,
                    y: j * cellHeight,
                    width: cellWidth,
                    height: cellHeight
                })
                this._grid.addCell(cell)
                this.addElement(id, cell)
            }
        }
    }

    // 增加元素
    addElement(id, e) {
        // 在所有元素列表中保存e
        this._elements[id] = e
        // 更新最大z层
        this._maxZlevel = Math.max(this._maxZlevel, e.zlevel)

        // 更新所有形状的z轴方向排列
        const _zElements = this._zElements
        _zElements[e.zlevel] = _zElements[e.zlevel] || [];
        _zElements[e.zlevel].push(e);

        this._changedZlevel[e.zlevel] = true;


    }

    // 根据对象更新标志位
    updateMark(e) {
        // 设置更改的层
        this._changedZlevel[e.zlevel] = true;

        e.__silent = false;
        e.__needTransform = true;
        // 更新最大z层
        this._maxZlevel = Math.max(this._maxZlevel, e.zlevel);
    }

    /**
     * 遍历迭代器
     * @param {Function} fun 迭代回调函数，return true终止迭代
     * @param {Object=} option 迭代参数，缺省为仅降序遍历常规形状
     *     hover : true 是否迭代高亮层数据
     *     normal : 'down' | 'up' | 'free' 是否迭代常规数据，迭代时是否指定及z轴顺序
     */
    iterShape(func, option) {
        const _zElements = this._zElements

        option = option || {
            hover: false,
            normal: 'down'
        }
        if (option.hover) {
            //高亮层数据遍历
            for (let hoverElement of this._hoverElements.length) {
                // 调用func, 如果func返回true, 则停止迭代
                if (func(hoverElement)) {
                    return this;
                }
            }
        }
        // 如果normal不存在, 则直接返回
        if (typeof option.normal === 'undefined') return this

        let zlist = null
        let len = null
        // 开始迭代常规对象
        switch (option.normal) {
            case 'down':
                //降序遍历，高层优先
                for (let l = _zElements.length - 1; l >= 0; l--) {
                    zlist = _zElements[l];
                    if (zlist) {
                        len = zlist.length;
                        // len减到0, while判断即为false, 就不运行了
                        while (len--) {
                            if (func(zlist[len])) {
                                return this;
                            }
                        }
                    }
                }
                break
            case 'up':
                //升序遍历，底层优先
                for (let i = 0; i < _zElements.length; i++) {
                    zlist = _zElements[i];
                    if (zlist) {
                        len = zlist.length;
                        for (let k = 0; k < len; k++) {
                            if (func(zlist[k])) {
                                return this;
                            }
                        }
                    }
                }
                break;
            default:
                // 无序遍历, 直接遍历所有的对象
                for (let i in this._elements) {
                    if (func(this._elements[i])) {
                        return this
                    }
                }


        }
    }

   // 下面开始是一堆get/set方法

    getFlock() {
        return this._flock
    }

    getGrid() {
        return this._grid
    }

    getTargets(){
        return this._targets
    }

    getMaxZlevel() {
        return this._maxZlevel;
    }

    getChangedZlevel() {
        return this._changedZlevel;
    }

    clearChangedZlevel() {
        this._changedZlevel = {};
        return this;
    }

    setChangedZlevle(level) {
        this._changedZlevel[level] = true;
        return this;
    }
}