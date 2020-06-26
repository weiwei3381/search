export default {
    // 固定翼无人机设置
    uav: {
        maxSpeed: 1.75,              // 最大速度
        minSpeed: 0.4,               // 维持飞行的最小速度
        navigateSpeed: 1.25,         // 巡航速度
        maxPushForce: 0.17,          // 前进最大加速度
        maxSteerForce: 0.02,         // 转向最大加速度

        sepRange: 60,                // 周围无人机进入多少范围进行规避
        detectRange: 100,            // 目标探测范围
    },

    gridSize: [10,10],               // 缺省网格数量
    catchBrushException: false,      // 是否捕获图形绘制的错误
    /**
     * debug日志选项：catchBrushException为true下有效
     * 0 : 不生成debug数据，发布用
     * 1 : 异常抛出，调试用
     * 2 : 控制台输出，调试用
     */
    debugMode: 0,
    EVENT: {                       // 支持事件列表
        RESIZE: 'resize',          // 窗口大小变化
        CLICK: 'click',            // 鼠标按钮被（手指）按下，事件对象是：目标图形元素或空

        MOUSEWHEEL: 'mousewheel',  // 鼠标滚轮变化，事件对象是：目标图形元素或空
        MOUSEMOVE: 'mousemove',    // 鼠标（手指）被移动，事件对象是：目标图形元素或空
        MOUSEOVER: 'mouseover',    // 鼠标移到某图形元素之上，事件对象是：目标图形元素
        MOUSEOUT: 'mouseout',      // 鼠标从某图形元素移开，事件对象是：目标图形元素
        MOUSEDOWN: 'mousedown',    // 鼠标按钮（手指）被按下，事件对象是：目标图形元素或空
        MOUSEUP: 'mouseup',        // 鼠标按键（手指）被松开，事件对象是：目标图形元素或空

        // 一次成功元素拖拽的行为事件过程是：
        // dragstart > dragenter > dragover [> dragleave] > drop > dragend
        DRAGSTART: 'dragstart',    // 开始拖拽时触发，事件对象是：被拖拽图形元素
        DRAGEND: 'dragend',        // 拖拽完毕时触发（在drop之后触发），事件对象是：被拖拽图形元素
        DRAGENTER: 'dragenter',    // 拖拽图形元素进入目标图形元素时触发，事件对象是：目标图形元素
        DRAGOVER: 'dragover',      // 拖拽图形元素在目标图形元素上移动时触发，事件对象是：目标图形元素
        DRAGLEAVE: 'dragleave',    // 拖拽图形元素离开目标图形元素时触发，事件对象是：目标图形元素
        DROP: 'drop',              // 拖拽图形元素放在目标图形元素内时触发，事件对象是：目标图形元素

        touchClickDelay: 300       // touch end - start < delay is click
    }
}