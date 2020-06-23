/**
 * 事件分发器
 */
export default function Dispatcher() {
    var _self = this;
    var _h = {};

    /**
     * 单次触发绑定，dispatch后销毁
     * @param {string} event : 事件字符串
     * @param {function} handler : 响应函数
     */
    function one(event, handler) {
        if (!handler || !event) {
            return _self;
        }

        if (!_h[event]) {
            _h[event] = [];
        }

        _h[event].push({
            h: handler,
            one: true
        });

        return _self;
    }

    /**
     * 事件绑定
     * @param {string} event : 事件字符串
     * @param {function} handler : 响应函数
     */
    function bind(event, handler) {
        if (!handler || !event) {
            return _self;
        }

        if (!_h[event]) {
            _h[event] = [];
        }

        _h[event].push({
            h: handler,
            one: false
        });

        return _self;
    }

    /**
     * 事件解绑定
     * @param {string} event : 事件字符串
     * @param {function} handler : 响应函数
     */
    function unbind(event, handler) {
        if (!event) {
            _h = {};
            return _self;
        }

        if (handler) {
            if (_h[event]) {
                var newList = [];
                for (var i = 0, l = _h[event].length; i < l; i++) {
                    if (_h[event][i]['h'] != handler) {
                        newList.push(_h[event][i]);
                    }
                }
                _h[event] = newList;
            }

            if (_h[event] && _h[event].length === 0) {
                delete _h[event];
            }
        } else {
            delete _h[event];
        }

        return _self;
    }

    /**
     * 事件分发
     * @param {string} type : 事件类型
     * @param {Object} event : event对象
     * @param {Object} [attachment] : 附加信息
     */
    function dispatch(type, event, attachment) {
        if (_h[type]) {
            var newList = [];
            var eventPacket = attachment || {};
            eventPacket.type = type;
            eventPacket.event = event;
            //eventPacket._target = self;
            for (var i = 0, l = _h[type].length; i < l; i++) {
                _h[type][i]['h'](eventPacket);
                if (!_h[type][i]['one']) {
                    newList.push(_h[type][i]);
                }
            }

            if (newList.length != _h[type].length) {
                _h[type] = newList;
            }
        }

        return _self;
    }

    _self.one = one;
    _self.bind = bind;
    _self.unbind = unbind;
    _self.dispatch = dispatch;
}