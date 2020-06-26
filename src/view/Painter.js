import CanvasManager from './CanvasManager'
import config from '../config'
import {logger} from '../util/logger'
import shape from '../shape'

/**
 * 绘图类 (V)
 * @param {HTMLElement} root 绘图区域
 * @param {storage} storage Storage实例
 */
export default class Painter{

    constructor(root, storage){
        this.root = root
        this.storage = storage

        // 获取配置项
        const {catchBrushException} = config
        this.catchBrushException = catchBrushException

        this._domList = {}   // canvas dom元素
        this._ctxList = {}   // canvas 2D context对象，与domList对应
        this._maxZlevel = 0  //最大zlevel，缓存记录
        // 根dom节点
        this._domRoot = document.createElement('div');
        // 避免页面选中的尴尬, 不让根dom节点被选中
        this._domRoot.onselectstart = function () {
            return false;
        };

        //retina 屏幕优化
        this._devicePixelRatio = window.devicePixelRatio || 1;
        // 调用初始化方法
        this._init();
    }


    // 获取传入的dom对象的宽度
    _getWidth() {
        const root = this.root
        const stl = root.currentStyle
            || document.defaultView.getComputedStyle(root);

        return root.clientWidth
            - stl.paddingLeft.replace(/\D/g, '')   // 请原谅我这比较粗暴
            - stl.paddingRight.replace(/\D/g, '');
    }

    // 获取传入的dom对象的高度
    _getHeight() {
        const root = this.root
        const stl = root.currentStyle
            || document.defaultView.getComputedStyle(root);

        return root.clientHeight
            - stl.paddingTop.replace(/\D/g, '')    // 请原谅我这比较粗暴
            - stl.paddingBottom.replace(/\D/g, '');
    }

    /**
     * 私有方法
     * painter的初始化方法,
     *
     * 根据storage存储的最大zlevel创建canvas,
     * 初始形成根节点domRoot, dom节点列表domList和绘图ctx列表ctxList,
     * 说是列表, 但是都是用object对象实现的
     * @private
     */
    _init() {
        // 从this中提取缓存参数
        const root = this.root
        const _domRoot = this._domRoot
        const _domList = this._domList
        const _ctxList = this._ctxList
        const _devicePixelRatio = this._devicePixelRatio

        // 初始化根节点
        _domRoot.innerHTML = '';
        root.innerHTML = '';
        // 设置宽和高
        this._width = this._getWidth();
        this._height = this._getHeight();

        //没append呢，原谅我这样写，清晰~
        _domRoot.style.position = 'relative';
        _domRoot.style.overflow = 'hidden';
        _domRoot.style.width = this._width + 'px';
        _domRoot.style.height = this._height + 'px';

        root.appendChild(_domRoot);

        // 初始化最大z层
        this._maxZlevel = this.storage.getMaxZlevel();

        //  创建各层canvas
        //  创建背景div, 由于不是canvas, 不需要用canvasManager初始化
        _domList['bg'] = this._createDom('bg', 'div');
        _domRoot.appendChild(_domList['bg']);

        //  创建实体canvas
        for (var i = 0; i <= this._maxZlevel; i++) {
            _domList[i] = this._createDom(i, 'canvas');
            _domRoot.appendChild(_domList[i]);
            if (CanvasManager) {
                CanvasManager.initElement(_domList[i]);
            }
            _ctxList[i] = _domList[i].getContext('2d');
            // 高分屏放大
            _devicePixelRatio != 1
            && _ctxList[i].scale(_devicePixelRatio, _devicePixelRatio);
        }

        // 创建高亮层canvas
        _domList['hover'] = this._createDom('hover', 'canvas');
        _domList['hover'].id = '_zrender_hover_';
        _domRoot.appendChild(_domList['hover']);
        if (CanvasManager) {
            CanvasManager.initElement(_domList['hover']);
        }
        _ctxList['hover'] = _domList['hover'].getContext('2d');
        // 高分屏放大
        _devicePixelRatio !== 1
        && _ctxList['hover'].scale(_devicePixelRatio, _devicePixelRatio);
    }

    /**
     * 检查_maxZlevel是否变大，如是则同步创建需要的Canvas
     */
    _syncMaxZlevelCanvase() {
        // 获得最新的zlevel, 如果最新的zlevel比已有的大, 例如已有的是1, 现在变成3
        // 则需要重新创建2和3的canvas对象, 并将其键入到_domList和_ctxList中去
        const curMaxZlevel = this.storage.getMaxZlevel();
        if (this._maxZlevel < curMaxZlevel) {
            //实体
            for (let i = this._maxZlevel + 1; i <= curMaxZlevel; i++) {
                this._domList[i] = this._createDom(i, 'canvas');
                this._domRoot.insertBefore(this._domList[i], this._domList['hover']);
                if (CanvasManager) {
                    CanvasManager.initElement(this._domList[i]);
                }
                this._ctxList[i] = this._domList[i].getContext('2d');
                this._devicePixelRatio != 1
                && this._ctxList[i].scale(
                    this._devicePixelRatio, this._devicePixelRatio
                );
            }
            this._maxZlevel = curMaxZlevel;
        }
    }

    /**
     * 创建dom
     * @param {string} id dom的id值,待用
     * @param {string} type : dom类型，例如canvas, div等
     */
    _createDom(id, type) {
        // 缓存信息
        const _width = this._width
        const _height = this._height
        const _devicePixelRatio = this._devicePixelRatio


        const newDom = document.createElement(type);

        //没append呢，请原谅我这样写，清晰~
        newDom.style.position = 'absolute';
        newDom.style.width = _width + 'px';
        newDom.style.height = _height + 'px';
        newDom.setAttribute('width', _width * _devicePixelRatio);
        newDom.setAttribute('height', _height * _devicePixelRatio);
        //id不作为索引用，避免可能造成的重名，定义为私有属性
        newDom.setAttribute('data-id', id);
        return newDom;
    }

    /**
     * 刷画图形, 返回的是一个函数, 这个函数会被迭代器调用
     * @param {Object} changedZlevel 需要更新的zlevel索引
     */
    _brush(changedZlevel) {
        return (e)=>{
            if ((changedZlevel.all || changedZlevel[e.zlevel])
                && !e.invisible
            ) {
                const ctx = this._ctxList[e.zlevel];
                if (ctx) {
                    if (!e.onbrush //没有onbrush
                        //有onbrush并且调用执行返回false或undefined则继续粉刷
                        || (e.onbrush && !e.onbrush(ctx, e, false))
                    ) {
                        if (this.catchBrushException) {
                            try {
                                shape.get(e.shape.shape).brush(ctx, e, false, this.update);
                            } catch (error) {
                                logger.log(error, 'brush error of ' + e.shape, e);
                            }
                        } else {
                            var currentShape = shape.get(e.shape.shape)
                            currentShape.brush(ctx, e.shape, false, this.update);
                        }
                    }
                } else {
                    logger.log('can not find the specific zlevel canvas!');
                }
            }
        };
    }

    /**
     * 鼠标悬浮刷画
     */
    _brushHover(e) {
        var ctx = _ctxList['hover'];
        if (!e.onbrush //没有onbrush
            //有onbrush并且调用执行返回false或undefined则继续粉刷
            || (e.onbrush && !e.onbrush(ctx, e, true))
        ) {
            // Retina 优化
            if (catchBrushException) {
                try {
                    index.get(e.shape).brush(ctx, e, true, update);
                } catch (error) {
                    logger.log(
                        error, 'hoverBrush error of ' + e.shape, e
                    );
                }
            } else {
                index.get(e.shape).brush(ctx, e, true, update);
            }
        }
    }

    /**
     * 首次绘图，创建各种dom和context
     * @param {Function=} callback 绘画结束后的回调函数
     */
    render(callback) {
        //检查_maxZlevel是否变大，如是则同步创建需要的Canvas
        this._syncMaxZlevelCanvase();

        //升序遍历，shape上的zlevel指定绘画图层的z轴层叠
        this.storage.iterShape(
            // 把储存里面的形状全部刷画下来
            this._brush({all: true}),
            {normal: 'up'}
        );

        //update到最新则清空标志位, 把有数据改变的zLevel层清空掉
        this.storage.clearChangedZlevel();

        if (typeof callback == 'function') {
            callback();
        }

        return this;
    }

    /**
     * 刷新
     * @param {Function=} callback 刷新结束后的回调函数
     */
    refresh(callback) {
        //检查_maxZlevel是否变大，如是则同步创建需要的Canvas
        this._syncMaxZlevelCanvase();
        //仅更新有修改的canvas
        var changedZlevel = this.storage.getChangedZlevel();
        //擦除有修改的canvas
        if (changedZlevel.all) {
            this.clear();
        } else {
            for (var k in changedZlevel) {
                if (this._ctxList[k]) {
                    this._ctxList[k].clearRect(
                        0, 0,
                        this._width * this._devicePixelRatio,
                        this._height * this._devicePixelRatio
                    );
                }
            }
        }
        //重绘内容，升序遍历，shape上的zlevel指定绘画图层的z轴层叠
        this.storage.iterShape(
            this._brush(changedZlevel),
            {normal: 'up'}
        );

        //update到最新则清空标志位
        this.storage.clearChangedZlevel();

        if (typeof callback == 'function') {
            callback();
        }

        return this;
    }


    /**
     * 视图更新
     * @param {Array} shapeList 需要更新的图形元素列表,
     *                          不进入这个list的元素则不进行更新
     * @param {Function} callback  视图更新后回调函数, 默认不传
     */
    update(shapeList, callback) {
        var shape;
        // 对shapeList中的每个形状, 在storage中更改其内容
        for (var i = 0, l = shapeList.length; i < l; i++) {
            shape = shapeList[i];
            // 更新标志位
            this.storage.updateMark(shape);
        }
        this.refresh(callback);
        return this;
    }

    /**
     * 清除hover层外所有内容
     */
    clear() {
        for (var k in _ctxList) {
            if (k == 'hover') {
                continue;
            }
            _ctxList[k].clearRect(
                0, 0,
                _width * _devicePixelRatio,
                _height * _devicePixelRatio
            );
        }
        return this;
    }

    /**
     * 刷新hover层
     */
    refreshHover() {
        clearHover();

        storage.iterShape(_brushHover, {hover: true});

        storage.delHover();

        return this;
    }

    /**
     * 清除hover层所有内容
     */
    clearHover() {
        _ctxList
        && _ctxList['hover']
        && _ctxList['hover'].clearRect(
            0, 0,
            _width * _devicePixelRatio,
            _height * _devicePixelRatio
        );

        return this;
    }


    /**
     * 获取绘图区域宽度
     */
    getWidth() {
        return this._width;
    }

    /**
     * 获取绘图区域高度
     */
    getHeight() {
        return this._height;
    }

    /**
     * 区域大小变化后重绘
     */
    resize() {
        var width;
        var height;
        var dom;

        this._domRoot.style.display = 'none';

        width = this._getWidth();
        height = this._getHeight();

        this._domRoot.style.display = '';

        //优化没有实际改变的resize
        if (this._width != width || height != this._height) {
            this._width = width;
            this._height = height;

            this._domRoot.style.width = _width + 'px';
            this._domRoot.style.height = _height + 'px';

            for (var i in this._domList) {
                dom = this._domList[i];
                dom.setAttribute('width', _width);
                dom.setAttribute('height', _height);
                dom.style.width = _width + 'px';
                dom.style.height = _height + 'px';
            }

            this.storage.setChangedZlevle('all');
            this.refresh();
        }

        return this;
    }

    /**
     * 释放
     */
    dispose() {
        root.innerHTML = '';

        this.root = null;
        this.storage = null;

        this._domRoot = null;
        this._domList = null;
        this._ctxList = null;

        return;
    }

    getDomHover() {
        return _domList['hover'];
    }

    toDataURL(type, args) {
        if (CanvasManager) {
            return null;
        }
        var imageDom = _createDom('image', 'canvas');
        _domList['bg'].appendChild(imageDom);
        var ctx = imageDom.getContext('2d');
        _devicePixelRatio != 1
        && ctx.scale(_devicePixelRatio, _devicePixelRatio);

        ctx.fillStyle = '#fff';
        ctx.rect(
            0, 0,
            _width * _devicePixelRatio,
            _height * _devicePixelRatio
        );
        ctx.fill();
        //升序遍历，shape上的zlevel指定绘画图层的z轴层叠
        storage.iterShape(
            function (e) {
                if (!e.invisible) {
                    if (!e.onbrush //没有onbrush
                        //有onbrush并且调用执行返回false或undefined则继续粉刷
                        || (e.onbrush && !e.onbrush(ctx, e, false))
                    ) {
                        if (catchBrushException) {
                            try {
                                index.get(e.shape).brush(
                                    ctx, e, false, update
                                );
                            } catch (error) {
                                logger.log(
                                    error,
                                    'brush error of ' + e.shape,
                                    e
                                );
                            }
                        } else {
                            index.get(e.shape).brush(
                                ctx, e, false, update
                            );
                        }
                    }
                }
            },
            {normal: 'up'}
        );
        var image = imageDom.toDataURL(type, args);
        ctx = null;
        _domList['bg'].removeChild(imageDom);
        return image;
    }

}