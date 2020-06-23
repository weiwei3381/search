/**
 *
 * shape类：无人机类
 * 可配图形属性：
 {
       // 基础属性
       shape  : 'uav',          // 必须，shape类标识，需要显式指定
       id     : {string},       // 必须，图形唯一标识，可通过zrender实例方法newShapeId生成
       zlevel : {number},       // 默认为0，z层level，决定绘画在哪层canvas中
       invisible : {boolean},   // 默认为false，是否可见

       // 样式属性，默认状态样式样式属性
       style  : {
           x             : {number},  // 必须，圆心横坐标
           y             : {number},  // 必须，圆心纵坐标
           r             : {number},  // 必须，圆半径
           brushType     : {string},  // 默认为fill，绘画方式
                                      // fill(填充) | stroke(描边) | both(填充+描边)
           color         : {color},   // 默认为'#000'，填充颜色，支持rgba
           strokeColor   : {color},   // 默认为'#000'，描边颜色（轮廓），支持rgba
           lineWidth     : {number},  // 默认为1，线条宽度，描边下有效

           opacity       : {number},  // 默认为1，透明度设置，如果color为rgba，则最终透明度效果叠加
           shadowBlur    : {number},  // 默认为0，阴影模糊度，大于0有效
           shadowColor   : {color},   // 默认为'#000'，阴影色彩，支持rgba
           shadowOffsetX : {number},  // 默认为0，阴影横向偏移，正值往右，负值往左
           shadowOffsetY : {number},  // 默认为0，阴影纵向偏移，正值往下，负值往上

           text          : {string},  // 默认为null，附加文本
           textFont      : {string},  // 默认为null，附加文本样式，eg:'bold 18px verdana'
           textPosition  : {string},  // 默认为top，附加文本位置。
                                      // inside | left | right | top | bottom
           textAlign     : {string},  // 默认根据textPosition自动设置，附加文本水平对齐。
                                      // start | end | left | right | center
           textBaseline  : {string},  // 默认根据textPosition自动设置，附加文本垂直对齐。
                                      // top | bottom | middle |
                                      // alphabetic | hanging | ideographic
           textColor     : {color},   // 默认根据textPosition自动设置，默认策略如下，附加文本颜色
                                      // 'inside' ? '#fff' : color
       },

       // 样式属性，高亮样式属性，当不存在highlightStyle时使用基于默认样式扩展显示
       highlightStyle : {
           // 同style
       }

       // 交互属性，详见shape.Base

       // 事件属性，详见shape.Base
   }
 例子：
 {
       shape  : 'circle',
       id     : '123456',
       zlevel : 1,
       style  : {
           x : 200,
           y : 100,
           r : 50,
           color : '#eee',
           text : 'Baidu'
       },
       myName : 'kener',  // 可自带任何有效自定义属性

       clickable : true,
       onClick : function(eventPacket) {
           alert(eventPacket.target.myName);
       }
   }
 */

import base from './base'

function UAVShape() {
    this.type = 'uav';
}

UAVShape.prototype = {
    /**
     * 创建圆形路径
     * @param {Context2D} ctx Canvas 2D上下文
     * @param {Object} style 样式
     */
    buildPath: function (ctx, style) {
        // 无人机绘图底边宽
        const w = style.w || 50
        const frontP = [style.x, style.y+4/3*w]
        const tailP1 = [style.x-1/2*w, style.y-2/3*w]
        const tailP2 = [style.x+1/2*w, style.y-2/3*w]
        ctx.moveTo(frontP[0],frontP[1])
        ctx.lineTo(tailP1[0],tailP1[1])
        ctx.lineTo(style.x,style.y)
        ctx.lineTo(tailP2[0],tailP2[1])
        ctx.lineTo(frontP[0],frontP[1])
        return;
    },

    /**
     * 返回矩形区域，用于局部刷新和文字定位,
     * 返回的矩形区域属性中, x和y是中心点, width和height是宽和高
     * @param {Object} style
     */
    getRect: function (style) {
        var lineWidth;
        if (style.brushType == 'stroke' || style.brushType == 'fill') {
            lineWidth = style.lineWidth || 1;
        } else {
            lineWidth = 0;
        }
        return {
            x: Math.round(style.x - style.w - lineWidth / 2),
            y: Math.round(style.y - style.w - lineWidth / 2),
            width: style.w * 2 + lineWidth,
            height: style.w * 2 + lineWidth
        };
    }
};

base.derive(UAVShape);

export default UAVShape;