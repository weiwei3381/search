import eventTool from './tool/event'
import Dispatcher from './tool/Dispatcher'
import config from './config'

/**
 * 控制类 (C)
 * @param {HTMLElement} root 绘图区域
 * @param {storage} storage Storage实例
 * @param {painter} painter Painter实例
 * @param {Object} shape 图形库
 *
 * 分发事件支持详见config.EVENT
 */
export default function Handler(root, storage, painter, shape) {
    //添加事件分发器特性

    // // 分发器的this强制绑定到Handle上
    Dispatcher.call(this);

    var self = this;

    //常用函数加速
    var getX = eventTool.getX;
    var getY = eventTool.getY;

    //各种事件标识的私有变量
    var _event;                         //原生dom事件
    var _hasfound = false;              //是否找到hover图形元素
    var _lastHover = null;              //最后一个hover图形元素
    var _mouseDownTarget = null;
    var _draggingTarget = null;         //当前被拖拽的图形元素
    var _isMouseDown = false;
    var _isDragging = false;
    var _lastTouchMoment;

    var _lastX = 0;
    var _lastY = 0;
    var _mouseX = 0;
    var _mouseY = 0;


    var _domHover = painter.getDomHover();

    /**
     * 初始化，事件绑定，支持的所有事件都由如下原生事件计算得来
     */
    function _init() {
        if (window.addEventListener) {
            window.addEventListener('resize', _resizeHandler);

            root.addEventListener('click', _clickHandler);
            root.addEventListener('mousewheel', _mouseWheelHandler);
            root.addEventListener('DOMMouseScroll', _mouseWheelHandler);
            root.addEventListener('mousemove', _mouseMoveHandler);
            root.addEventListener('mouseout', _mouseOutHandler);
            root.addEventListener('mousedown', _mouseDownHandler);
            root.addEventListener('mouseup', _mouseUpHandler);

            // mobile支持
            root.addEventListener('touchstart', _touchStartHandler);
            root.addEventListener('touchmove', _touchMoveHandler);
            root.addEventListener('touchend', _touchEndHandler);
        } else {
            window.attachEvent('onresize', _resizeHandler);

            root.attachEvent('onclick', _clickHandler);
            root.attachEvent('onmousewheel', _mouseWheelHandler);
            root.attachEvent('onmousemove', _mouseMoveHandler);
            root.attachEvent('onmouseout', _mouseOutHandler);
            root.attachEvent('onmousedown', _mouseDownHandler);
            root.attachEvent('onmouseup', _mouseUpHandler);
        }
    }

    /**
     * 窗口大小改变响应函数
     * @param {event} event dom事件对象
     */
    function _resizeHandler(event) {
        _event = event || window.event;
        _lastHover = null;
        _isMouseDown = false;
        //分发config.EVENT.RESIZE事件，global
        self.dispatch(config.EVENT.RESIZE, _event);
    }

    /**
     * 点击事件
     * @param {event} event dom事件对象
     */
    function _clickHandler(event) {
        _event = _zrenderEventFixed(event);
        //分发config.EVENT.CLICK事件
        if (!_lastHover) {
            _dispatchAgency(_lastHover, config.EVENT.CLICK);
        } else if (_lastHover && _lastHover.clickable) {
            _dispatchAgency(_lastHover, config.EVENT.CLICK);
        }
        _mouseMoveHandler(_event);
    }

    /**
     * 鼠标滚轮响应函数
     * @param {event} event dom事件对象
     */
    function _mouseWheelHandler(event) {
        _event = _zrenderEventFixed(event);
        //分发config.EVENT.MOUSEWHEEL事件
        _dispatchAgency(_lastHover, config.EVENT.MOUSEWHEEL);
        _mouseMoveHandler(_event);
    }

    /**
     * 鼠标（手指）移动响应函数
     * @param {event} event dom事件对象
     */
    function _mouseMoveHandler(event) {
        _event = _zrenderEventFixed(event);
        _lastX = _mouseX;
        _lastY = _mouseY;
        _mouseX = getX(_event);
        _mouseY = getY(_event);

        // 可能出现config.EVENT.DRAGSTART事件
        // 避免手抖点击误认为拖拽
        //if (_mouseX - _lastX > 1 || _mouseY - _lastY > 1) {
        _dragStartHandler();
        //}

        _hasfound = false;
        storage.iterShape(_findHover, {normal: 'down'});

        //找到的在迭代函数里做了处理，没找到得在迭代完后处理
        if (!_hasfound) {
            //过滤首次拖拽产生的mouseout和dragLeave
            if (!_draggingTarget
                || (_lastHover && _lastHover.id != _draggingTarget.id)
            ) {
                //可能出现config.EVENT.MOUSEOUT事件
                _outShapeHandler();

                //可能出现config.EVENT.DRAGLEAVE事件
                _dragLeaveHandler();
            }

            _lastHover = null;
            storage.delHover();
            painter.clearHover();
        }
        //如果存在拖拽中元素，被拖拽的图形元素最后addHover
        if (_draggingTarget) {
            storage.drift(
                _draggingTarget.id,
                _mouseX - _lastX,
                _mouseY - _lastY
            );
            storage.addHover(_draggingTarget);
        }

        //分发config.EVENT.MOUSEMOVE事件
        _dispatchAgency(_lastHover, config.EVENT.MOUSEMOVE);

        if (_draggingTarget || _hasfound || storage.hasHoverShape()) {
            painter.refreshHover();
        }

        if (_draggingTarget || (_hasfound && _lastHover.draggable)) {
            root.style.cursor = 'move';
        } else if (_hasfound && _lastHover.clickable) {
            root.style.cursor = 'pointer';
        } else {
            root.style.cursor = 'default';
        }
    }

    /**
     * 鼠标（手指）离开响应函数
     * @param {event} event dom事件对象
     */
    function _mouseOutHandler(event) {
        _event = _zrenderEventFixed(event);

        var element = _event.toElement || _event.relatedTarget;
        if (element != root) {
            while (element && element.nodeType != 9) {
                if (element == root) {
                    // 忽略包含在root中的dom引起的mouseOut
                    _mouseMoveHandler(event);
                    return;
                }
                element = element.parentNode;
            }
        }
        _event.zrenderX = _lastX;
        _event.zrenderY = _lastY;
        root.style.cursor = 'default';
        _isMouseDown = false;

        _outShapeHandler();
        _dropHandler();
        _dragEndHandler();
    }

    /**
     * 鼠标在某个图形元素上移动
     */
    function _overShapeHandler() {
        //分发config.EVENT.MOUSEOVER事件
        _dispatchAgency(_lastHover, config.EVENT.MOUSEOVER);
    }

    /**
     * 鼠标离开某个图形元素
     */
    function _outShapeHandler() {
        //分发config.EVENT.MOUSEOUT事件
        _dispatchAgency(_lastHover, config.EVENT.MOUSEOUT);
    }

    /**
     * 鼠标（手指）按下响应函数
     * @param {event} event dom事件对象
     */
    function _mouseDownHandler(event) {
        _event = _zrenderEventFixed(event);
        _isMouseDown = true;
        //分发config.EVENT.MOUSEDOWN事件
        _mouseDownTarget = _lastHover;
        _dispatchAgency(_lastHover, config.EVENT.MOUSEDOWN);
    }

    /**
     * 鼠标（手指）抬起响应函数
     * @param {event} event dom事件对象
     */
    function _mouseUpHandler(event) {
        _event = _zrenderEventFixed(event);
        root.style.cursor = 'default';
        _isMouseDown = false;
        _mouseDownTarget = null;

        //分发config.EVENT.MOUSEUP事件
        _dispatchAgency(_lastHover, config.EVENT.MOUSEUP);
        _dropHandler();
        _dragEndHandler();
    }

    /**
     * Touch开始响应函数
     * @param {event} event dom事件对象
     */
    function _touchStartHandler(event) {
        eventTool.stop(event);// 阻止浏览器默认事件，重要
        _event = _zrenderEventFixed(event, true);
        _lastTouchMoment = new Date();
        _mouseDownHandler(_event);
    }

    /**
     * Touch移动响应函数
     * @param {event} event dom事件对象
     */
    function _touchMoveHandler(event) {
        eventTool.stop(event);// 阻止浏览器默认事件，重要
        _event = _zrenderEventFixed(event, true);
        _mouseMoveHandler(_event);
    }

    /**
     * Touch结束响应函数
     * @param {event} event dom事件对象
     */
    function _touchEndHandler(event) {
        eventTool.stop(event);// 阻止浏览器默认事件，重要
        _event = _zrenderEventFixed(event, true);
        _mouseUpHandler(_event);
        painter.clearHover();

        if (new Date() - _lastTouchMoment
            < config.EVENT.touchClickDelay
        ) {
            _lastHover = null;
            _mouseX = _event.zrenderX;
            _mouseY = _event.zrenderY;
            // touch有指尖错觉，四向尝试，让touch上的点击更好触发事件
            storage.iterShape(_findHover, {normal: 'down'});
            if (!_lastHover) {
                _mouseX += 10;
                storage.iterShape(_findHover, {normal: 'down'});
            }
            if (!_lastHover) {
                _mouseX -= 20;
                storage.iterShape(_findHover, {normal: 'down'});
            }
            if (!_lastHover) {
                _mouseX += 10;
                _mouseY += 10;
                storage.iterShape(_findHover, {normal: 'down'});
            }
            if (!_lastHover) {
                _mouseY -= 20;
                storage.iterShape(_findHover, {normal: 'down'});
            }
            if (_lastHover) {
                _event.zrenderX = _mouseX;
                _event.zrenderY = _mouseY;
            }
            _clickHandler(_event);
        }
    }

    /**
     * 拖拽开始
     */
    function _dragStartHandler() {
        if (_isMouseDown
            && _lastHover
            && _lastHover.draggable
            && !_draggingTarget
            && _mouseDownTarget == _lastHover
        ) {
            _draggingTarget = _lastHover;
            _isDragging = true;

            _draggingTarget.invisible = true;
            storage.mod(_draggingTarget.id, _draggingTarget);

            //分发config.EVENT.DRAGSTART事件
            _dispatchAgency(
                _draggingTarget,
                config.EVENT.DRAGSTART
            );
            painter.refresh();
        }
    }

    /**
     * 拖拽进入目标元素
     */
    function _dragEnterHandler() {
        if (_draggingTarget) {
            //分发config.EVENT.DRAGENTER事件
            _dispatchAgency(
                _lastHover,
                config.EVENT.DRAGENTER,
                _draggingTarget
            );
        }
    }

    /**
     * 拖拽在目标元素上移动
     */
    function _dragOverHandler() {
        if (_draggingTarget) {
            //分发config.EVENT.DRAGOVER事件
            _dispatchAgency(
                _lastHover,
                config.EVENT.DRAGOVER,
                _draggingTarget
            );
        }
    }

    /**
     * 拖拽离开目标元素
     */
    function _dragLeaveHandler() {
        if (_draggingTarget) {
            //分发config.EVENT.DRAGLEAVE事件
            _dispatchAgency(
                _lastHover,
                config.EVENT.DRAGLEAVE,
                _draggingTarget
            );
        }
    }

    /**
     * 拖拽在目标元素上完成
     */
    function _dropHandler() {
        if (_draggingTarget) {
            _draggingTarget.invisible = false;
            storage.mod(_draggingTarget.id, _draggingTarget);
            painter.refresh();
            //分发config.EVENT.DROP事件
            _dispatchAgency(
                _lastHover,
                config.EVENT.DROP,
                _draggingTarget
            );
        }
    }

    /**
     * 拖拽结束
     */
    function _dragEndHandler() {
        if (_draggingTarget) {
            //分发config.EVENT.DRAGEND事件
            _dispatchAgency(
                _draggingTarget,
                config.EVENT.DRAGEND
            );
            _lastHover = null;
        }
        _isDragging = false;
        _draggingTarget = null;
    }

    /**
     * 事件分发代理
     * @param {Object} targetShape 目标图形元素
     * @param {string} eventName 事件名称
     * @param {Object=} draggedShape 拖拽事件特有，当前被拖拽图形元素
     */
    function _dispatchAgency(targetShape, eventName, draggedShape) {
        var eventHandler = 'on' + eventName;
        var eventPacket = {
            type: eventName,
            event: _event,
            target: targetShape
        };

        if (draggedShape) {
            eventPacket.dragged = draggedShape;
        }

        if (targetShape) {
            //“不存在shape级事件”或“存在shape级事件但事件回调返回非true”
            if (!targetShape[eventHandler]
                || !targetShape[eventHandler](eventPacket)
            ) {
                self.dispatch(
                    eventName,
                    _event,
                    eventPacket
                );
            }
        } else if (!draggedShape) {
            //无hover目标，无拖拽对象，原生事件分发
            self.dispatch(eventName, _event);
        }
    }

    /**
     * 迭代函数，查找hover到的图形元素并即时做些事件分发
     * @param {Object} e 图形元素
     */
    function _findHover(e) {
        if (_draggingTarget && _draggingTarget.id == e.id) {
            //迭代到当前拖拽的图形上
            return false;
        }

        //打酱油的路过，啥都不响应的shape~
        if (e.__silent) {
            return false;
        }

        var shapeInstance = shape.get(e.shape);
        if (shapeInstance.isCover(e, _mouseX, _mouseY)) {
            if (e.hoverable) {
                storage.addHover(e);
            }

            if (_lastHover != e) {
                _outShapeHandler();

                //可能出现config.EVENT.DRAGLEAVE事件
                _dragLeaveHandler();

                _lastHover = e;

                //可能出现config.EVENT.DRAGENTER事件
                _dragEnterHandler();
            }
            _overShapeHandler();

            //可能出现config.EVENT.DRAGOVER
            _dragOverHandler();

            _hasfound = true;

            return true;    //找到则中断迭代查找
        }

        return false;
    }

    // 如果存在第三方嵌入的一些dom触发的事件，或touch事件，需要转换一下事件坐标
    function _zrenderEventFixed(event, isTouch) {
        if (!isTouch) {
            _event = event || window.event;
            // 进入对象优先~
            var target = _event.toElement
                || _event.relatedTarget
                || _event.srcElement
                || _event.target;
            if (target && target != _domHover) {
                _event.zrenderX = (typeof _event.offsetX != 'undefined'
                    ? _event.offsetX
                    : _event.layerX)
                    + target.offsetLeft;
                _event.zrenderY = (typeof _event.offsetY != 'undefined'
                    ? _event.offsetY
                    : _event.layerY)
                    + target.offsetTop;
            }
        } else {
            _event = event;
            var touch = _event.type != 'touchend'
                ? _event.targetTouches[0]
                : _event.changedTouches[0];
            if (touch) {
                // touch事件坐标是全屏的~
                _event.zrenderX = touch.clientX - root.offsetLeft
                    + document.body.scrollLeft;
                _event.zrenderY = touch.clientY - root.offsetTop
                    + document.body.scrollTop;
            }
        }

        return _event;
    }

    /**
     * 自定义事件绑定
     * @param {string} eventName 事件名称，resize，hover，drag，etc~
     * @param {Function} handler 响应函数
     */
    function on(eventName, handler) {
        self.bind(eventName, handler);

        return self;
    }

    /**
     * 自定义事件解绑
     * @param {string} event 事件名称，resize，hover，drag，etc~
     * @param {Function} handler 响应函数
     */
    function un(eventName, handler) {
        self.unbind(eventName, handler);
        return self;
    }

    /**
     * 比较不可控，先不开放了~
     * 触发原生dom事件，用于自定义元素在顶层截获事件后触发zrender行为
     * @param {string} event 事件名称，resize，hover，drag，etc~
     * @param {event=} event event dom事件对象
     function trigger(eventName, event) {
                switch (eventName) {
                    case config.EVENT.RESIZE :
                        _resizeHandler(event);
                        break;
                    case config.EVENT.CLICK :
                        _clickHandler(event);
                        break;
                    case config.EVENT.MOUSEWHEEL :
                        _mouseWheelHandler(event);
                        break;
                    case config.EVENT.MOUSEMOVE :
                        _mouseMoveHandler(event);
                        break;
                    case config.EVENT.MOUSEDOWN :
                        _mouseDownHandler(event);
                        break;
                    case config.EVENT.MOUSEUP :
                        _mouseUpHandleru(event);
                        break;
                }
            }
     */

    /**
     * 释放
     */
    function dispose() {
        if (window.removeEventListener) {
            window.removeEventListener('resize', _resizeHandler);

            root.removeEventListener('click', _clickHandler);
            root.removeEventListener('mousewheel', _mouseWheelHandler);
            root.removeEventListener(
                'DOMMouseScroll', _mouseWheelHandler
            );
            root.removeEventListener('mousemove', _mouseMoveHandler);
            root.removeEventListener('mouseout', _mouseOutHandler);
            root.removeEventListener('mousedown', _mouseDownHandler);
            root.removeEventListener('mouseup', _mouseUpHandler);

            // mobile支持
            root.removeEventListener('touchstart', _touchStartHandler);
            root.removeEventListener('touchmove', _touchMoveHandler);
            root.removeEventListener('touchend', _touchEndHandler);
        } else {
            window.detachEvent('onresize', _resizeHandler);

            root.detachEvent('onclick', _clickHandler);
            root.detachEvent('onmousewheel', _mouseWheelHandler);
            root.detachEvent('onmousemove', _mouseMoveHandler);
            root.detachEvent('onmouseout', _mouseOutHandler);
            root.detachEvent('onmousedown', _mouseDownHandler);
            root.detachEvent('onmouseup', _mouseUpHandler);
        }

        root = null;
        _domHover = null;
        storage = null;
        painter = null;
        shape = null;

        un();

        self = null;

        return;
    }

    self.on = on;
    self.un = un;
    // self.trigger = trigger;
    self.dispose = dispose;

    _init();
}