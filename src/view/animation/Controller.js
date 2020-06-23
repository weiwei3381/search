/**
 * 动画主控制器
 * @config target 动画对象，可以是数组，如果是数组的话会批量分发onframe等事件
 * @config life(1000) 动画时长
 * @config delay(0) 动画延迟时间
 * @config loop(true)
 * @config gap(0) 循环的间隔时间
 * @config onframe
 * @config easing(optional)
 * @config ondestroy(optional)
 * @config onrestart(optional)
 */

import Easing from './easing'

const Controller = function (options) {
    // 目标池, 其实就是放改变目标的地方
    this._targetPool = options.target || {};
    if (this._targetPool.constructor != Array) {
        this._targetPool = [this._targetPool];
    }

    //生命周期
    this._life = options.life || 1000;
    //延时
    this._delay = options.delay || 0;
    //开始时间
    this._startTime = new Date().getTime() + this._delay;//单位毫秒

    //结束时间
    this._endTime = this._startTime + this._life * 1000;

    //是否循环
    this.loop = typeof (options.loop) == 'undefined'
        ? false : options.loop;

    this.gap = options.gap || 0;
    // 缓动默认为线性
    this.easing = options.easing || 'Linear';
    // 三种事件, 分别是运行中, 销毁, 循环重新运行
    this.onframe = options.onframe || null;

    this.ondestroy = options.ondestroy || null;

    this.onrestart = options.onrestart || null;
};

Controller.prototype = {
    step: function (time) {
        // 获得当前时间百分比
        let percent = (time - this._startTime) / this._life;

        //  百分比小于0表示还没开始
        if (percent < 0) {
            return;
        }
        // 如果百分比大于1, 也最大也只能为1
        percent = Math.min(percent, 1);
        // 缓动函数
        var easingFunc = typeof (this.easing) == 'string'
            ? Easing[this.easing]
            : this.easing;
        // 根据当前时间获得控制器的当前进度,例如0.3, 即运行30%进度
        var schedule;
        if (typeof easingFunc === 'function') {
            schedule = easingFunc(percent);
        } else {
            schedule = percent;
        }
        // 发送onframe事件
        this.fire('frame', schedule);

        //结束
        if (percent == 1) {
            if (this.loop) {
                this.restart();
                // 重新开始周期
                // 抛出而不是直接调用事件直到 stage.update 后再统一调用这些事件
                return 'restart';

            } else {
                // 动画完成将这个控制器标识为待删除
                // 在Animation.update中进行批量删除
                this._needsRemove = true;

                return 'destroy';
            }
        } else {
            return null;
        }
    },
    restart: function () {
        this._startTime = new Date().getTime() + this.gap;
    },
    fire: function (eventType, arg) {
        // 虽然预留了接口,可以根据不同的事件类型进行判断
        // 但是目前主要还是调用onframe函数,进行控制
        // onframe事件, 表示已经开始运行, 有帧数
        // ondestroy事件, 代表控制器需要销毁, 运行已经结束
        // onrestart事件, 代表循环为真, 需要重新运行
        // 上述三种事件都在Control()参数中传入
        for (var i = 0, len = this._targetPool.length; i < len; i++) {
            if (this['on' + eventType]) {
                this['on' + eventType](this._targetPool[i], arg);
            }
        }
    }
};
Controller.prototype.constructor = Controller;

export default Controller;