/**
 * zrender: 事件辅助类
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * getX：获取事件横坐标
 * getY：或者事件纵坐标
 * getDelta：或者鼠标滚轮变化
 * stop：停止事件传播
 */
/**
 * 提取鼠标（手指）x坐标
 * @param  {event} e : 事件.
 * @return {number} 鼠标（手指）x坐标.
 */

function getX(e) {
    return typeof e.zrenderX != 'undefined' && e.zrenderX
        || typeof e.offsetX != 'undefined' && e.offsetX
        || typeof e.layerX != 'undefined' && e.layerX
        || typeof e.clientX != 'undefined' && e.clientX;
}

/**
 * 提取鼠标y坐标
 * @param  {event} e : 事件.
 * @return {number} 鼠标（手指）y坐标.
 */
function getY(e) {
    return typeof e.zrenderY != 'undefined' && e.zrenderY
        || typeof e.offsetY != 'undefined' && e.offsetY
        || typeof e.layerY != 'undefined' && e.layerY
        || typeof e.clientY != 'undefined' && e.clientY;
}

/**
 * 提取鼠标滚轮变化
 * @param  {event} e : 事件.
 * @return {number} 滚轮变化，正值说明滚轮是向上滚动，如果是负值说明滚轮是向下滚动
 */
function getDelta(e) {
    return typeof e.wheelDelta != 'undefined' && e.wheelDelta
        || typeof e.detail != 'undefined' && -e.detail;
}

/**
 * 停止冒泡和阻止默认行为
 * @param {Object} e : event对象
 */
function stop(e) {
    if (e.preventDefault) {
        e.preventDefault();
        e.stopPropagation();
    } else {
        e.returnValue = false;
    }
}



export default {
    getX: getX,
    getY: getY,
    getDelta: getDelta,
    stop: stop,
};