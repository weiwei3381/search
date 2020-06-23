import Storage from './storage/Storage'
import Painter from './view/Painter'
import Interaction from './handler/interaction'


const simulation = {};  // 提供MVC内部反向使用静态方法；

let _idx = 0;           // 实例id
let _instances = {};    //simulation实例map索引

/**
 * simulation初始化
 * 不让外部直接new ZRender实例，为啥？
 * 不为啥，提供全局可控同时减少全局污染和降低命名冲突的风险！
 *
 * @param {HTMLElement} dom dom对象，不帮你做document.getElementById了
 * @param {Object=} params 个性化参数，如自定义shape集合，带进来就好
 *
 * @return {Simulation} Simulation实例
 */
simulation.init = function (dom, params) {
    const si = new Simulation(++_idx + '', dom, params || {});
    _instances[_idx] = si;
    return si;
};

/**
 * zrender实例销毁，记在_instances里的索引也会删除了
 * 管生就得管死，可以通过zrender.dispose(zi)销毁指定ZRender实例
 * 当然也可以直接zi.dispose()自己销毁
 *
 * @param {ZRender=} si ZRender对象，不传则销毁全部
 */
simulation.dispose = function (si) {
    if (si) {
        si.dispose();
    } else {
        for (var s in _instances) {
            _instances[s].dispose();
        }
        _instances = {};
    }
    return simulation;
};

/**
 * 获取zrender实例
 *
 * @param {string} id ZRender对象索引
 */
simulation.getInstance = function (id) {
    return _instances[id];
};

/**
 * 删除zrender实例，ZRender实例dispose时会调用，
 * 删除后getInstance则返回undefined
 * ps: 仅是删除，删除的实例不代表已经dispose了~~
 *     这是一个摆脱全局zrender.dispose()自动销毁的后门，
 *     take care of yourzrender~
 *
 * @param {string} id ZRender对象索引
 */
simulation.delInstance = function (id) {
    if (_instances[id]) {
        //只是对垃圾回收上的友好照顾，不写也大不了~
        _instances[id] = null;
        delete _instances[id];
    }
    return zrender;
};

export default simulation;


/**
 * ZRender接口类，对外可用的所有接口都在这里！！
 * storage（M）、painter（V）、handler（C）为内部私有类，外部接口不可见
 * 非get接口统一返回self支持链式调用~
 *
 * @param {string} id 唯一标识
 * @param {HTMLElement} dom dom对象，不帮你做document.getElementById
 * @param {Object=} params 个性化参数，如自定义shape集合，带进来就好
 *
 * @return {ZRender} ZRender实例
 */
class Simulation {
    constructor(id, dom) {
        this.id = id
        this.dom = dom
        this.storage = new Storage();
        this.painter = new Painter(dom, this.storage)
        this.interaction = new Interaction(this.storage)
        this._step = 0  // 当前仿真步数, 更新一次算一步
        // 需要变动的形状集合, 不变动的形状则不进行更新
        this.animatingShapes = [];
    }

    // 仿真
    emulate() {
        this._running = true // 仿真运行情况

        // 动画函数, 采用浏览器自带的动画函数, 如果都没有则用默认函数, 保证每隔1000/60ms执行一次回调函数
        // 为了提高性能和电池寿命，当requestAnimationFrame() 运行在后台标签页或者隐藏的<iframe> 里时，
        // requestAnimationFrame() 会被暂停调用以提升性能和电池寿命。
        const animate = window.requestAnimationFrame
            || window.mozRequestAnimationFrame
            || window.webkitRequestAnimationFrame
            || function (callback) {
                window.setTimeout(
                    callback, 1000 / 60
                );
            };
        // 每步运行情况
        const step = () => {
            if (this._running) {
                this.update()
                this._step++
                animate(step)
            }
        }
        animate(step)
    }

    addAnimatingShapes(shape) {
        this.animatingShapes.push(shape)
    }

    update() {
        this.interaction.step(
            (shape) => {
                this.addAnimatingShapes(shape)
            }
        )
        this.painter.update(this.animatingShapes)
    }

    // 图形渲染, 委托painter的render进行处理
    render(callback) {
        this.painter.render(callback)
        return this
    }

    /**
     * 获取视图宽度
     */
    getWidth() {
        return this.painter.getWidth();
    };

    /**
     * 获取视图高度
     */
    getHeight() {
        return this.painter.getHeight();
    };

}