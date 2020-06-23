/**
 * zrender: shape仓库
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @desc zrender是一个轻量级的Canvas类库，MVC封装，数据驱动，提供类Dom事件模型。
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 */
import Circle from './circle'
import Ellipse from './ellipse'
import Line from './line'
import Polygon from './polygon'
import BrokenLine from './brokenLine'
import Rectangle from './rectangle'
import Ring from './ring'
import Sector from './sector'
import Text from './text'
import Heart from './heart'
import Droplet from './droplet'
import Path from './path'
import ZImage from './image'
import Beziercurve from './beziercurve'
import Star from './star'
import Isogon from './isogon'
import UAVShape from './uavShape'


const index = {};

const _shapeLibrary = {};     //shape库

/**
 * 定义图形实现
 * @param {Object} name
 * @param {Object} clazz 图形实现
 */
index.define = function (name, clazz) {
    _shapeLibrary[name] = clazz;
    return index;
};

/**
 * 获取图形实现
 * @param {Object} name
 */
index.get = function (name) {
    return _shapeLibrary[name];
};

// 内置图形注册
index.define('circle', new Circle());
index.define('ellipse', new Ellipse());
index.define('line', new Line());
index.define('polygon', new Polygon());
index.define('brokenLine', new BrokenLine());
index.define('rectangle', new Rectangle());
index.define('ring', new Ring());
index.define('sector', new Sector());
index.define('text', new Text());
index.define('heart', new Heart());
index.define('droplet', new Droplet());
index.define('path', new Path());
index.define('image', new ZImage());
index.define('beziercurve', new Beziercurve());
index.define('star', new Star());
index.define('isogon', new Isogon());
index.define('uav', new UAVShape());

export default index