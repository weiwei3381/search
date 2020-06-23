/**
 * 动画主类, 调度和管理所有动画控制器
 *
 * @author lang(shenyi01@baidu.com)
 *
 * @class : Animation
 * @config : stage(optional) 绘制类, 需要提供update接口
 * @config : fps(optional) 帧率, 是自动更新动画的时候需要提供
 * @config : onframe(optional)
 * @method : add
 * @method : remove
 * @method : update
 * @method : start
 * @method : stop
 */
import util from '../tool/util'
import Deferred from './Deferred'

var Animation = function (options) {

    options = options || {};
    //  stage(optional) 绘制类, 需要提供update接口
    this.stage = options.stage || {};
    // 每次动画运行完的回调函数
    this.onframe = options.onframe || function () {
    };

    // 私有属性, 存放所有控制器的池
    this._controllerPool = [];

    this._running = false;
};

// 需传入回调函数,保证每隔1000/60ms执行一次回调函数
const requrestAnimationFrame = window.requrestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.webkitRequestAnimationFrame
    || function (callback) {
        window.setTimeout(
            callback, 1000 / 60
        );
    };

Animation.prototype = {
    add: function (controller) {
        this._controllerPool.push(controller);
    },
    remove: function (controller) {
        var idx = util.indexOf(this._controllerPool, controller);
        if (idx >= 0) {
            this._controllerPool.splice(idx, 1);
        }
    },
    // 动画更新函数, 每隔16ms运行一次
    update: function () {
        // 记录开始时间
        const time = new Date().getTime();
        // 控制池
        const cp = this._controllerPool;
        // 控制池大小
        let len = cp.length;
        // 插值的事件列表
        const deferredEvents = [];
        // 差值事件对应的控制器列表
        const deferredCtls = [];
        for (let i = 0; i < len; i++) {
            const controller = cp[i];
            // e是一个字符串
            // 根据当前时间调用控制器, 如果销毁destroy或者重新开始restart,则会返回e值,
            // 否则e为null或者undifined
            const e = controller.step(time);
            // 需要在stage.update之后调用的事件，例如destroy
            if (e) {
                // 发送事件, 事件为destroy或者restart
                deferredEvents.push(e);
                deferredCtls.push(controller);
            }
        }
        // 调用stage的update方法, 更新舞台
        if (this.stage && this.stage.update && this._controllerPool.length
        ) {
            this.stage.update();
        }
        // 删除动画完成的控制器
        const newArray = [];
        for (let i = 0; i < len; i++) {
            if (!cp[i]._needsRemove) {
                newArray.push(cp[i]);
                cp[i]._needsRemove = false;
            }
        }
        this._controllerPool = newArray;

        len = deferredEvents.length;
        for (var i = 0; i < len; i++) {
            deferredCtls[i].fire(deferredEvents[i]);
        }
        // 每次动画运行完的回调
        this.onframe();
    },

    // 启用start函数之后每隔1000/60毫秒(fps默认为60)事件就会刷新
    // 也可以不使用animation的start函数
    // 手动每一帧去调用update函数更新状态
    start: function () {
        const self = this;
        // 开始运行设置为true, 修改animation的_running可以停止
        this._running = true;
        // 下述方法只能保证每一帧运行完之后,间隔1000/60毫秒执行下一次,
        // 但是由于运行update()也需要时间, 所以并不能保证最后结果是60帧
        function step() {
            if (self._running) {
                self.update();
                requrestAnimationFrame(step);
            }
        }
        // 首次启动step需要该方法
        requrestAnimationFrame(step);
    },
    // 停止运行动画
    stop: function () {
        this._running = false;
    },
    clear: function () {
        this._controllerPool = [];
    },
    // target是目标图形(shape或者属性), loop表示是否循环
    animate: function (target, loop, getter, setter) {
        // 新生成一个deferred类, 只需要传变动的目标即可.
        var deferred = new Deferred(target, loop, getter, setter);
        // 给defer增加animation示例, 以方便defer控制controller对象
        deferred.animation = this;
        return deferred;
    }
};
Animation.prototype.constructor = Animation;

export default Animation;
