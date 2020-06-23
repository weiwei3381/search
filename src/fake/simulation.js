import {Flock} from "./flock";
import {Gyroplane} from "../common/module/aerocraft";
import Vector from "../common/calc/vector";
import FAKE_CONST from "./constant";
import Clipboard from "../common/utils/clipboard";

export class Simulation {
    // 构造函数
    constructor(canvas, planeImg) {
        this.canvas = canvas
        this.flock = new Flock(canvas, planeImg);

        this.run = false;
        this.width = null;
        this.height = null;

        this.gridSize = [10, 10];
        this.true_target_num = localStorage.getItem(FAKE_CONST.get("真目标数目")) || 3;

        this.uav_num = 4;  // 默认无人机数目
        this.targetNum = 6;  // 搜索目标数量
        // 采用的搜索算法,共有两种,"PSO"对应粒子群算法, "BBO"对应生物地理学算法
        this.method = $("#algorithm").val() || "BBO";
        this.frames = 0; // 当前帧数
    }

    // canvas更新时调用该方法, 全局数据更新
    update() {
        this.frames++;  // 当前帧数加1
        // 仿真是否运行
        this.flock.update(this.frames);
        // 进行重绘
        this.redraw();
    }

    // 重绘
    redraw() {
        let ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);  // 清空绘制区域
        ctx.fillStyle = "#f6f6f6";
        ctx.strokeStyle = "#aecbf6";
        this.flock.draw();  // 绘制
    }

    /**
     * 处理点击事件
     * @param evt
     */
    handleClick(evt) {
        // 获得鼠标点击位置
        let pos = getCanvasPos(this.canvas, evt);
        let x = pos.x;
        let y = pos.y;
        // 将值写入html中
        $('#init_X').val(pos.init_x);
        $('#init_Y').val(pos.init_y);
        localStorage.setItem("init_X", pos.init_x);
        localStorage.setItem("init_Y", pos.init_y);
        // 如果点击的位置在canvas之外,则无效果
        if (y <= 1 || x > this.canvas.width || y > this.canvas.height)
            return;
        // 一次产生多架无人机
        for (let i = 0; i < this.uav_num; i++) {
            let uav = new Gyroplane(i, x, y, 180, this.flock.uav_list);
            this.flock.addUav(uav);
        }
        // 设置config的值
        const config = require("./config")
        this.flock.setConfig(config)
        this.method = config.method
        // 设置算法计算的初始位置
        this.flock.setStartPosition({
            intX: x,
            intY: y
        });
        // 如果是基准算法，则增加对应个数的假目标
        if (this.method === 'Base') {
            this.flock.add_targets_from_store();
            this.flock.add_fake_targets();
        }

        $("#start_btn").show().attr("disabled", "disabled").html("正在计算...");
        $("#method").attr("disabled", "disabled");
        // 计算总距离
        this.flock.start_place = new Vector(x, y);
        // 设置算法
        this.flock.set_algorithm(this.method);


        //获取鼠标在canvas上的坐标
        function getCanvasPos(canvas, e) {
            let rect = canvas.getBoundingClientRect();
            let leftB = parseInt(document.defaultView.getComputedStyle(canvas).borderLeftWidth);//获取的是样式，需要转换为数值
            let topB = parseInt(document.defaultView.getComputedStyle(canvas).borderTopWidth);
            return {
                x: (e.clientX - rect.left) - leftB,
                y: (e.clientY - rect.top) - topB,
                init_x: e.clientX,
                init_y: e.clientY
            };
        }
    };

    // 参数设置
    setParams() {
        // 设置无人机数量
        this.uav_num = parseInt($("#uav_num").val());
        // 设置方法
        this.method = $("#method").val();
    }

    // 重新产生目标
    rebuildTargets() {
        this.flock.add_all_targets();
        localStorage.removeItem("use_time");
        localStorage.removeItem("use_method");
        localStorage.removeItem("use_true_time");
        this.flock.clear_monitor();
    }

    // 开始或者暂停
    pauseOrRun() {
        const startBtn = document.getElementById("start_btn");
        if (startBtn.innerText === "开始计算") {
            this.run = true;
            startBtn.innerText = "暂停计算";
        } else if (startBtn.innerText === "暂停计算") {
            this.run = false;
            startBtn.innerText = "继续计算"
        } else if (startBtn.innerText === "继续计算") {
            this.run = true;
            startBtn.innerText = "暂停计算";
        }
    }

    // 拷贝位置历史
    copyPosHistory() {
        let $copybtn = $("#copyPosBtn");
        let info = "";

        for (let i = 0; i < this.flock.uav_list.length; i++) {
            let uav = this.flock.uav_list[i];
            info += uav.id + "\n";
            for (let i = 0; i < uav.pos_history.length; i++) {
                info += uav.pos_history[i].toString() + "\n";
            }
        }
        $copybtn.attr("data-clipboard-text", info);
        let clipboard = new Clipboard("#copyPosBtn");  // 实例化剪贴板对象
        $("#copy_message").show(300);
        setTimeout(function () {
            $("#copy_message").hide(300);
        }, 1500);
    }

    // 拷贝速度历史
    copyVelHistory() {
        let $copybtn = $("#copyVelBtn");
        let info = "";

        for (let i = 0; i < this.flock.uav_list.length; i++) {
            let uav = this.flock.uav_list[i];
            info += uav.id + "\n";
            for (let j = 0; j < uav.vel_history.length; j++) {
                info += uav.vel_history[j].toString() + "\n";
            }
        }
        $copybtn.attr("data-clipboard-text", info);
        // 实例化剪贴板对象
        let clipboard = new Clipboard("#copyVelBtn");
        // 显示"复制成功"的信息框
        $("#copy_message").show(300);
        setTimeout(function () {
            $("#copy_message").hide(300);
        }, 1500);
    }

    // 拷贝回报率
    copyEvalution() {
        let $copybtn = $("#copyReturnBtn");
        let info = "";
        for (let i = 0; i < this.flock.evaluation.length; i++) {
            let evaluation = this.flock.evaluation[i].toFixed(7);
            info += evaluation + "\n";
        }
        $copybtn.attr("data-clipboard-text", info);
        let clipboard = new Clipboard("#copyReturnBtn");  // 实例化剪贴板对象
        $("#copy_message").show(300);
        setTimeout(function () {
            $("#copy_message").hide(300);
        }, 1500);
    };

    // 自适应屏幕并且重绘
    adjustAndRedraw() {
        this.canvas.width = window.innerHeight;
        this.canvas.height = window.innerHeight - 70;
        this.redraw();
    };
}




















