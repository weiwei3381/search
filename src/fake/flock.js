import PSO from "../common/calc/pso";
import BBO from "../common/calc/bbo";
import {CLPSO} from "../common/calc/CLPSO";
import Vector from "../common/calc/vector";
import {Target, FakeTarget} from "./target";
import FAKE_CONST from "./constant";
import Monitor from "./monitor";
import moment from "moment"
import Array from "../common/utils/array_ext"
const axios = require('axios')

// 群体类
export class Flock {
    // 构造器函数
    constructor(canvas, plane_img = null){
        // 以时间戳命名此次运行id
        this.runId = new Date().getTime();
        // 获得绘图对象
        this.canvas = canvas;
        // 获得监控器对象
        this.monitor = new Monitor();
        // 群体当前迭代次数
        this.iteration = 0;
        // 网格的默认值
        this.grid = null;
        // 目标列表
        this.target_list = [];
        // 无人机列表
        this.uav_list = [];
        // 评估值变化情况
        this.evaluation = [];
        // 采用的算法
        this.algorithm = null;
        // 算法名称
        this.method = "";
        // 开始仿真时间
        this.begin_time = null;
        // 当前仿真时间
        this.run_time = 0;
        // 当前真目标仿真时间
        this.true_run_time = 0;

        // 开始仿真的帧数
        this.simulate_begin_frame = 0;
        // 仿真总帧数
        this.simulate_frames = 0;
        // 当前真目标的仿真帧数
        this.true_simulate_frames = 0;
        // 无人机图像
        this.plane_img = plane_img;
        // 无人机初始位置
        // fixme 初始位置改为点击位置
        this.start_place = new Vector(0, 0);
        // 仿真是否结束
        this.simulation_is_end = false;
        // 结束时相关数据
        this.data = {};

        this.cluster_1 = null
        this.cluster_2 = null

        this.sendPost = false
    }

    /**
     * 设置配置项
     * @param config
     */
    setConfig(config){
        this.config = config
        this.method = config.method
    }

    // 设置无人机初始位置
    setStartPosition({intX, intY}){
        this.start_place = new Vector(intX, intY)
    }


    // 增加网格
    addGrid(grid) {
        this.grid = grid;
    };

    // 根据解的情况设置假目标
    set_fake_targets(solution) {
        // 获得假目标数量
        const fake_num = document.getElementById("fake_target_num").value - 0;
        // 获得真目标数量
        const true_num = document.getElementById("true_target_num").value - 0;
        // 是否固定真目标
        const isFixTrueTargets = document.getElementById("fixTrueTarget").value - 0;

        if(isFixTrueTargets){
            // 清空假目标
            this.removeFaketargets();
            for (let i = 0; i < fake_num; i++) {
                let fake_target = new FakeTarget("fake_" + i, solution[2 * i], solution[2 * i + 1]);
                this.addTarget(fake_target);
            }
        }else{
            // 情况目标
            this.target_list = []
            for (let i = 0; i < fake_num; i++) {
                let fake_target = new FakeTarget("fake_" + i, solution[2 * i], solution[2 * i + 1]);
                this.addTarget(fake_target);
            }
            for (let j = fake_num; j < fake_num+true_num; j++) {
                let true_target = new Target("true" + j, solution[2 * j], solution[2 * j + 1]);
                this.addTarget(true_target);
            }
        }
    };

    removeFaketargets() {
        let target_list = [];
        for (let target of this.target_list) {
            if (target instanceof FakeTarget) continue;
            target_list.push(target);
        }
        this.target_list = target_list;
    };


    // 删除网格
    delGrid() {
        if (this.grid != null) {
            // 清空目标分布的文本框
            $("#randomValue").val("");
            // 令轨迹对象为空
            this.grid = null;
        }
    };

    addUav(uav) {
        this.uav_list.push(uav);
    };

    // 增加目标
    addTarget(target) {
        this.target_list.push(target)
    };

    // 从储存中增加目标
    add_targets_from_store() {
        // 取得textarea中真目标的分布位置值
        let true_textarea_val = document.getElementById("true_target_locations").value.trim();
        // 取得localstory中的值
        let true_local_val = localStorage.getItem(FAKE_CONST.get("真目标分布位置"));

        // 设定顺序为:1. textarea中的值, 2.localstorage, 3.随机生成
        if (true_textarea_val.length > 10) {
            this.removeTargetAll();

            this.string_to_targets(true_textarea_val);

            localStorage.setItem(FAKE_CONST.get("真目标分布位置"), true_textarea_val);

            //let true_local_val = localStorage.getItem(FAKE_CONST.get("真目标分布位置"));
            //this.string_to_targets(true_local_val);
            //document.getElementById("true_target_locations").value = true_local_val;


        }



        else {
            //let true_local_val = localStorage.getItem(FAKE_CONST.get("真目标分布位置"));
            this.string_to_targets(true_local_val);
            document.getElementById("true_target_locations").value = true_local_val;

            return;
        }

        //  else {
        //     this.add_all_targets();
        // }
    };

    // 从假目标文本框中增加假目标
    add_fake_targets() {
        console.log("增加假目标")
        // 取得textarea中假目标的分布位置值
        let fake_textarea_val = document.getElementById("fake_target_locations").value.trim();

        // 设定顺序为:1.随机生成;2.textarea中的值;3.没有假目标;

        if(fake_textarea_val.length === 0){
            const fake_target_num = parseInt($("#fake_target_num").val());
            for (let j = 0; j < fake_target_num; j++){
                let x = Math.random() * (this.canvas.width - 15);
                let y = Math.random() * (this.canvas.height - 15);
                const fake_target = new FakeTarget('fake_'+j, x, y);
                fake_target.is_adjust = false;
                this.addTarget(fake_target);
                this.writeFakeTargets();
            }
        }
        else if (fake_textarea_val.length > 10) {
            this.string_to_targets(fake_textarea_val,"fake");
        }
        else{
            return;
        }
    };

    /**
     * 根据给定的目标数,一次性随机生成指定个数的目标
     */
    add_all_targets() {
        this.removeTargetAll();
        // 增加指定的真目标数量
        let true_target_num = $("#true_target_num").val() - 0;
        for (let i = 0; i < true_target_num; i++) {
            let id = "true_" + i;
            let rand_x = 10 + Math.random() * (this.canvas.width - 20);
            let rand_y = 10 + Math.random() * (this.canvas.height - 20);
            this.addTarget(new Target(id, rand_x, rand_y))
        }
        // 将目标坐标写入textarea
        let true_target_list = [];
        for (let target of this.target_list) {
            if (target instanceof FakeTarget) continue;
            true_target_list.push(target.toSimpleObj())

        }
        let true_pos_str = JSON.stringify(true_target_list);
        document.getElementById("true_target_locations").value = true_pos_str;
        localStorage.setItem(FAKE_CONST.get("真目标分布位置"), true_pos_str);
    };

    /**
     * 将字符串转换成目标分布
     * @param info 字符串
     * @param type 转换类型
     */
    string_to_targets(info, type = "true") {
        let target_list = JSON.parse(info);
        for (let i = 0; i < target_list.length; i++) {
            let x = target_list[i].x;
            let y = target_list[i].y;
            if (type === "true") {
                this.addTarget(new Target(i, x, y))
            } else {
                let fake_target = new FakeTarget(i, x, y);
                fake_target.is_adjust = false;
                this.addTarget(fake_target);
            }
        }

        // 将信息进行拆分
        let info_list = info.split("&#");
        let target_num = Math.floor(info_list.length / 2);
        for (let i = 0; i < target_num; i++) {
            let [x, y] = [info_list[i * 2], info_list[i * 2 + 1]];
            if (type === "true") {
                this.addTarget(new Target(i, x, y))
            } else {
                this.addTarget(new FakeTarget(i, x, y))
            }
        }
    };

    //删除目标
    delTarget() {
        this.target_list.pop()
    };

    // 删除所有目标
    removeTargetAll() {
        this.target_list = [];
    };

    /**
     * 计算解对应的距离情况
     * @param solution
     * @param type
     */
    distance_evaluation(solution, type = "two") {
        // 所有的总距离
        let sum_distance = 0;
        // 开始位置
        let start_place = this.start_place.copy();
        // 获得假目标数量
        const fake_num = document.getElementById("fake_target_num").value - 0;
        // 获得真目标数量
        const true_num = document.getElementById("true_target_num").value - 0;
        // 是否固定真目标
        const isFixTrueTargets = document.getElementById("fixTrueTarget").value - 0;

        // fixme 固定真目标,则按照老方法计算
        let fake_targets = [];
        let true_targets = [];
        if(isFixTrueTargets){
            // 假目标个数
            // 所有假目标位置的列表
            for (let i = 0; i < fake_num; i++) {
                let target = new Vector(solution[2 * i], solution[2 * i + 1]);
                fake_targets.push(target);
            }
            // 所有真目标位置的列表
            for (let target of this.target_list) {
                if (target instanceof FakeTarget) continue;
                true_targets.push(new Vector(target.position.x, target.position.y));
            }
        }else{
            for (let i = 0; i < fake_num; i++) {
                let target = new Vector(solution[2 * i], solution[2 * i + 1]);
                fake_targets.push(target);
            }
            for (let j = fake_num; j < fake_num+true_num; j++) {
                let target = new Vector(solution[2 * j], solution[2 * j + 1]);
                true_targets.push(target);
            }
        }

        // 计算无人机从一个点出发的总距离
        if (type === "one") {
            while (true_targets.length > 0) {
                sum_distance += this.calDistanceOne(start_place, true_targets, fake_targets)
            }
            return sum_distance * (-1);
        }
        if (type === "two") {
            // 定义两个集合
            let cluster_1 = {
                start_place: this.start_place.copy(),
                target_list: [],
                total_distance: 0
            };
            let cluster_2 = {
                start_place: this.start_place.copy(),
                target_list: [],
                total_distance: 0
            };
            let true_num = true_targets.length;
            while (true_targets.length >  0) {
                this.calDistanceTwo(true_targets, fake_targets, cluster_1, cluster_2)
            }
            // 两个集合,移动距离越长的作为最终距离,
            // 由于希望距离越大越好,但PSO和BBO算法中求的是最小值,因此通过乘以-1取反
            let dis_1 = cluster_1.total_distance;
            let dis_2 = cluster_2.total_distance;
            return {
                value: -1 * (dis_1 > dis_2 ? dis_1 : dis_2),
                cluster_1: cluster_1,
                cluster_2: cluster_2
            }
        }
    };

    /**
     * 计算从一个点出发的路程
     * @param start_place
     * @param true_targets
     * @param fake_targets
     * @returns {*}
     */
    calDistanceOne(start_place, true_targets, fake_targets) {
        let true_map = new Map();
        let fake_map = new Map();
        let distance_list = [];
        for (let target of true_targets) {
            let distance = target.euc2d(start_place);
            distance_list.push(distance);
            true_map.set(distance, target);
        }
        for (let target of fake_targets) {
            let distance = target.euc2d(start_place);
            distance_list.push(distance);
            fake_map.set(distance, target);
        }
        let min_distance = distance_list.sort((a,b)=>a-b)[0];
        if (true_map.get(min_distance)) {
            true_targets.remove(true_map.get(min_distance));
            start_place = true_map.get(min_distance);
        }
        if (fake_map.get(min_distance)) {
            fake_targets.remove(fake_map.get(min_distance));
            start_place = fake_map.get(min_distance);
        }
        return min_distance
    };

    /**
     * 计算从两个点出发的距离和
     * @param true_targets
     * @param fake_targets
     * @param cluster_1
     * @param cluster_2
     */
    calDistanceTwo(true_targets, fake_targets, cluster_1, cluster_2) {
        // 两个无人机集合,哪个集合目前走的距离短,则给他分配下一个目标,下一个目标就近分配
        if (cluster_2.total_distance <= cluster_1.total_distance) {
            calDistance(cluster_2);
        } else {
            calDistance(cluster_1);
        }

        function calDistance(cluster) {
            // 定义"最近距离->目标"表
            let true_map = new Map();
            let fake_map = new Map();
            let distance_list = [];
            // fixme 假目标的距离权重增加20%
            const fakeParam = 1;
            // 计算集合到所有真目标的距离
            for (let target of true_targets) {
                let distance = target.euc2d(cluster.start_place);
                distance_list.push(distance);
                true_map.set(distance, target);
            }
            // 计算集合到所有假目标的距离
            for (let target of fake_targets) {
                let distance = target.euc2d(cluster.start_place) * fakeParam;
                distance_list.push(distance);
                fake_map.set(distance, target);
            }
            // 把所有距离排序,找到最近距离
            let min_distance = distance_list.sort((a,b)=>a-b)[0];
            // 如果最近距离在真目标中,则从真目标列表中移除该目标,更新集合位置和总移动距离
            if (true_map.get(min_distance)) {
                const nearTrueTarget = true_map.get(min_distance);
                true_targets.remove(nearTrueTarget)
                // FixMe 如果在目标附近75范围内也有其他目标,则去掉一个
                for(let target of true_targets){
                   if(target.euc2d(nearTrueTarget) < 75){
                       true_targets.remove(target)
                       break
                   }
                }
                for(let target of fake_targets){
                    if(target.euc2d(nearTrueTarget) < 75){
                        fake_targets.remove(target)
                        break
                    }
                }
                cluster.start_place = nearTrueTarget;
                cluster.target_list.push(nearTrueTarget);
                cluster.total_distance += min_distance;
            }
            // 反之则更新假目标集合
            if (fake_map.get(min_distance)) {
                const nearFakeTarget = fake_map.get(min_distance)
                fake_targets.remove(nearFakeTarget);
                // FixMe 如果在目标附近75范围内也有其他假目标,则去掉一个
                for(let target of fake_targets){
                    if(target.euc2d(nearFakeTarget) < 75){
                        fake_targets.remove(target)
                        break
                    }
                }
                for(let target of true_targets){
                    if(target.euc2d(nearFakeTarget) < 75){
                        true_targets.remove(target)
                        break
                    }
                }
                cluster.start_place = nearFakeTarget;
                cluster.target_list.push(nearFakeTarget);
                cluster.total_distance += min_distance / fakeParam;
            }
        }
    };


    /**
     * 探测函数
     * @param dis_list  目标到干扰物的距离
     * @param range  干扰半径
     * @returns {number}  被探测到的系数
     */
    discover_func(dis_list, range) {
        // 筛选出距离中小于干扰范围的值
        dis_list = dis_list.filter(x => x < range);
        // 如果筛选出的干扰物没有,则返回1
        if (dis_list.length === 0) {
            return 1;
        } else if (dis_list.length === 1) {
            let dis = dis_list[0];
            return (dis * dis) / (range * range)
        } else if (dis_list.length > 1) {
            let discover_index = 1;
            for (let dis of dis_list) {
                discover_index = discover_index * ((dis * dis) / (range * range));
            }
            return discover_index
        }
    };


    // 设置算法情况
    set_algorithm(method) {
        console.log(`设置算法${method}`)
        // 获得假目标数量
        const fake_num = document.getElementById("fake_target_num").value - 0;
        // 获得真目标数量
        const true_num = document.getElementById("true_target_num").value - 0;
        // 是否固定真目标
        const isFixTrueTargets = document.getElementById("fixTrueTarget").value - 0;
        if (method === "Base") {
            this.method = method;
        } else {
            this.method = method + "#" + fake_num;
        }

        let dimension = 0
        let ub = []
        let lb = []

        if (fake_num >= 0) {
            dimension = fake_num * 2;
            ub = [this.canvas.width - 15, this.canvas.height - 15].repeat(fake_num); // 下限和上限分别缩小10px,使得目标整体在区域中
            lb = [15, 15].repeat(fake_num);
            // fixme 如果不固定真目标,dimension和对应的ub, lb都要增加, 真目标需要加进去
            if(!isFixTrueTargets){
                dimension = (fake_num + true_num) * 2;
                ub = [this.canvas.width - 15, this.canvas.height - 15].repeat(fake_num + true_num); // 下限和上限分别缩小10px,使得目标整体在区域中
                lb = [15, 15].repeat(fake_num + true_num);
            }

            if (method === "BBO") {
                console.log("使用BBO算法");
                this.algorithm = new BBO(dimension, ub, lb, this.distance_evaluation, 20, 1000, this);
            } else if (method === "PSO") {
                console.log("使用PSO算法");
                this.algorithm = new PSO(dimension, ub, lb, this.distance_evaluation, 50, 50000, this);
            } else if (method === "Base") {
                this.algorithm = 0;
            } else if (method === "CLPSO"){
                this.algorithm = new CLPSO({
                    particleNum: this.config.particleNum,
                    dimension: dimension,
                    maxStep: this.config.iterNum,
                    ub: ub,
                    lb: lb,
                    fitFunc: this.distance_evaluation.bind(this)
                })
            }
        }
    };

    /**
     * 飞行模拟
     * @param frames 当前帧数
     */
    fly(frames) {
        // 过滤出活动的真目标列表
        let active_true_list = this.target_list.filter(function (target) {
            let is_alive = !target.is_dead;
            let is_true = !(target instanceof FakeTarget);
            return is_alive && is_true
        });
        // 过滤出活动目标列表
        let active_target_list = this.target_list.filter(a => !a.is_dead);
        if (this.begin_time === null) {
            this.begin_time = new Date();
            this.simulate_begin_frame = frames;  // 仿真开始帧数
        } else {
            this.simulate_frames = frames - this.simulate_begin_frame;  // 当前仿真帧数
            this.run_time = (this.simulate_frames / 30).toFixed(1);
        }
        // 如果还有真目标存在,则真目标时间继续更新
        if (active_true_list.length > 0) {
            this.true_run_time = this.run_time;
        }
        // 监控器更新数据
        this.monitor.update_data(this.method, this.run_time, this.true_run_time);
        this.monitor.show();
        if (active_target_list.length === 0) {
            this.simulation_is_end = true;
            this.monitor.update_data(this.method, this.run_time, this.true_run_time, true);
            this.write_data();
            $("#data").val(JSON.stringify(this.data))
        }
        this.set_uav_targets(this.uav_list, active_target_list, true);
        for (let uav of this.uav_list) {
            uav.fly();
        }
    };

    write_data() {
        let true_target_list = [];
        let fake_target_list = [];
        for (let target of this.target_list) {
            if (target instanceof FakeTarget) {
                fake_target_list.push(target.toSimpleObj());
            } else {
                true_target_list.push(target.toSimpleObj());
            }
        }
        this.data["真目标情况"] = {
            "目标数量": true_target_list.length,
            "目标分布": true_target_list
        };
        this.data["假目标情况"] = {
            "目标数量": fake_target_list.length,
            "目标分布": fake_target_list
        };
        this.data["算法运行情况"] = [];
        let method_list = JSON.parse(localStorage.getItem("use_method"));
        let use_time = JSON.parse(localStorage.getItem("use_time"));
        let use_true_time = JSON.parse(localStorage.getItem("use_true_time"));
        for (let i = 0; i < method_list.length; i++) {
            let method_obj = {};
            method_obj['算法'] = method_list[i];
            method_obj['总运行时间'] = use_time[i];
            method_obj['搜索真目标时间'] = use_true_time[i];
            this.data["算法运行情况"].push(method_obj)
        }
    };


    /**
     * 设置无人机的飞向目标
     * @param uav_list 无人机列表
     * @param target_list 可能的目标列表
     * @param need_second_allocation 是否需要二次分配目标,默认为false
     */
    set_uav_targets(uav_list, target_list, need_second_allocation = false) {
        // todo 信号范围r设置
        let true_signal = 1234;
        let fake_signal = 1234;
        // 是否所有的无人机都闲逛,默认是有
        let is_all_wander = true;
        // 定义"目标->总信号强度"表
        let target_sigal_map = new Map();
        // 对目标进行遍历,计算每架无人机到目标的概率
        for (let target of target_list) {
            // 计算每个目标的总信号强度
            let total_signal = 0;
            for (let uav of uav_list) {
                let distance = uav.position.euc2d(target.position);
                if (target instanceof FakeTarget && distance < fake_signal) {
                    // 无人机进入到信号范围内,下一步无人机就不能闲逛,同时计算信号强度
                    is_all_wander = false;
                    total_signal = 1 - Math.pow((distance / fake_signal), 2)
                } else if (distance < true_signal) {
                    is_all_wander = false;
                    total_signal = 1 - Math.pow((distance / true_signal), 2)
                }
            }
            target_sigal_map.set(target, total_signal);
        }
        if (is_all_wander) {
            //todo 所有无人机进行闲逛
            // 真目标列表和假目标列表

            // 过滤出所有还没搜索到的目标
            const aliveTargets = target_list.filter(target=>!target.is_dead)
            // 搜索最近的目标
            if (aliveTargets.length > 0) {
                let near_dis = Infinity;
                let near_target = null;
                // 找到所有目标中, 无人机离它平均距离最近的目标
                for (let target of aliveTargets) {
                    // 到目标的总距离
                    let dis_to_target = 0;
                    for (let uav of uav_list) {
                        let distance = uav.position.euc2d(target.position);
                        dis_to_target += distance;
                    }
                    let average_dis = dis_to_target / uav_list.length;
                    if (average_dis < near_dis) {
                        near_dis = average_dis;
                        near_target = target;
                    }
                }
                for (let uav of uav_list) {
                    if (uav.hasFlyTarget() && !uav.currentTarget.is_dead) continue;
                    uav.setTarget(near_target);
                    uav.setFlyPos(near_target.pos.x, near_target.pos.y);
                }
            }
            return
        }
        // 定义"无人机->分配目标"表
        let fly_target_map = new Map();
        // 是否要第二次分配目标, 默认为true,只要其中有两个目标不相等,则变为false
        let is_different_target = false;
        // 每架无人机选择目标
        for (let uav of this.uav_list) {
            let max_pro = 0;
            let max_target = null;
            // 令每架无人机选取当前信号强度与当前距离之比最大的目标
            for (let target of target_sigal_map.keys()) {
                let p = target_sigal_map.get(target);
                let distance = uav.position.euc2d(target.position);
                let pro = p / distance;
                if (pro > max_pro) {
                    max_pro = pro;
                    max_target = target;
                }
            }
            // 对已有的目标进行遍历,如果有一个不相等,则不用进行二次划分
            for (let target of fly_target_map.values()) {
                if (max_target !== target) {
                    is_different_target = true;
                }
            }
            // 将无人机和飞向目标保存到map中
            fly_target_map.set(uav, max_target);
        }
        // 如果不需要二次分配, 或者目标有所不同,则直接设置无人机飞向的目标
        if (!need_second_allocation || is_different_target) {
            for (let uav of uav_list) {
                let target = fly_target_map.get(uav);
                target.active();
                uav.setTarget(target);
                uav.setFlyPos(target.position.x, target.position.y);
            }
            return
        }
        // 如果分配的目标相同,则进行二次分配
        // 由于需要二次分配,则所有目标都相同,取第一个目标
        let same_target = fly_target_map.get(this.uav_list[0]);
        // 剩下来进行二次分配的目标
        let rest_targets = [];
        // 剩下来需要二次分配的无人机
        let rest_uavs = [];
        for (let target of target_list) {
            if (target !== same_target) {
                rest_targets.push(target);
            }
        }
        // 所有无人机到目标的距离
        let distance_list = [];
        // 定义"距离->无人机"的哈希表
        let distance_map = new Map();
        for (let uav of this.uav_list) {
            let distance = uav.position.euc2d(same_target.position);
            distance_map.set(distance, uav);
            distance_list.push(distance);
        }
        // 对距离由小到大进行排序
        distance_list = distance_list.sort((a, b) => a - b);
        // 其中距离最近的1/2数量的无人机分配给该目标
        for (let i = 0; i < distance_list.length; i++) {
            let uav = distance_map.get(distance_list[i]);
            if (i < distance_list.length / 2) {
                same_target.active();
                uav.setTarget(same_target);
                uav.setFlyPos(same_target.position.x, same_target.position.y);
            } else {
                rest_uavs.push(uav);
            }
        }
        this.set_uav_targets(rest_uavs, rest_targets);
    };

    // 仿真运行任务是否结束
    isRunOver(){
        for(let target of this.target_list){
            if(!target.is_dead){
                return false
            }
        }
        return true
    }

    /**
     * 生成保存数据
     * @returns {*}
     */
    generateSaveData(){
        const saveData = {}
        // 获得所有无人机的速度和位置信息
        let uavVelocity = ""
        let uavPosition = ""
        for (let uav of this.uav_list) {
            uavVelocity += uav.id + "\n"
            uavPosition += uav.id + "\n"
            for (let vel of uav.vel_history) {
                uavVelocity += vel.toString() + "\n";
            }
            for (let pos of uav.pos_history) {
                uavPosition += pos.toString() + "\n";
            }
        }
        // 获得最终的真目标和假目标分布
        const fakeTargetList = []
        const trueTargetList = []
        for (let target of this.target_list) {
            if (target instanceof FakeTarget) {
                fakeTargetList.push(target.toSimpleObj())
            }else{
                trueTargetList.push(target.toSimpleObj())
            }
        }

        // 保存数据时间
        saveData["saveTime"] = moment().format('YYYY-MM-DD HH:mm:ss')
        // 搜索总时间
        saveData["searchTotalTime"] = this.run_time
        // 搜索真目标时间
        saveData["searchTrueTargetTime"] = this.true_run_time
        // 真目标分布
        saveData["trueTargetPositions"] = JSON.stringify(trueTargetList)
        // 假目标分布
        saveData["fakeTargetPositions"] = JSON.stringify(fakeTargetList)
        // 实验配置
        saveData["config"] = this.config
        // 无人机位置
        saveData['uavPosition'] = uavPosition

        // todo 速度暂时不保存, 数据量太大了
        // saveData['uavVelocity'] = uavVelocity

        return saveData
    }

    /**
     * 数据更新方法
     * @param frames  当前帧数
     */
    update(frames) {
        if (this.algorithm === null || this.simulation_is_end) return;
        // 每隔20帧判断一次是否找到目标
        if (frames % 20 === 0) {
            this.uavFindTarget();
        }
        // 如果计算迭代未完成,则每次全局迭代数+1
        if (this.iteration < this.config.iterNum) {
            this.iteration += 20
            if (this.iteration) {
                const {gbest, gbestValue,currentStep, cluster_1, cluster_2} = this.algorithm.step_run(20);
                this.set_fake_targets(gbest);
                this.cluster_1 = cluster_1
                this.cluster_2 = cluster_2
                let complete = Math.floor(this.iteration / this.config.iterNum * 100) + "%";
                $("#progress_bar").css("width", complete).html(complete);
            }
        } else {
            // 仿真
            if(this.isRunOver() && !this.sendPost){
                this.sendPost = true
                $("#start_btn").attr("disabled", "none").html("仿真结束");
                localStorage.setItem("搜索所有目标用时-"+this.runId,this.run_time);
                localStorage.setItem("搜索真目标用时-"+this.runId,this.true_run_time);
                // 刷新页面
                axios.post("http://localhost:3001/save",{
                    data: JSON.stringify(this.generateSaveData())
                }).then(
                    (response)=>{
                        console.log("插入成功:", response)
                        // 数据插入成功,则刷新页面
                        setTimeout(function(){
                            location.reload();
                        },5000)
                    }
                ).catch((error)=>{
                    console.log("失败",error)
                })
                // 计算完毕则开始仿真
            }else{
                $("#start_btn").attr("disabled", "none").html("仿真中...");

                for (let target of this.target_list) {
                    if (target instanceof FakeTarget) target.is_adjust = false;
                }
                // 如果"假目标分布"文本框中没有数据, 则写入假目标数据
                $("#fake_target_locations").html()? null :this.writeFakeTargets();
                this.fly(frames);
            }

        }
    };

    // 绘制结果线条
    drawClusterLine(cluster, color){
        let ctx = this.canvas.getContext("2d");
        ctx.lineWidth = 2;
        ctx.beginPath()
        // 线段颜色
        ctx.moveTo(this.start_place.x, this.start_place.y);
        for(let target of cluster.target_list){
            let targetName = `(${target.x.toFixed(0)},${target.y.toFixed(0)})`;
            ctx.font = "9pt Arial";
            ctx.fillStyle = "#F3F3F3";
            ctx.fillText(targetName, target.x-50, target.y+30);
            ctx.lineTo(target.x, target.y);
        }

        ctx.strokeStyle = color;
        ctx.stroke()
        ctx.restore()
    }

    /**
     * 将计算后的值写入假目标
     */
    writeFakeTargets() {
        let fake_target_list = [];
        for (let target of this.target_list) {
            if (target instanceof FakeTarget) fake_target_list.push(target.toSimpleObj());
        }
        let fake_pos_str = JSON.stringify(fake_target_list);
        $("#fake_target_locations").html(fake_pos_str);
        localStorage.setItem(FAKE_CONST.get("假目标分布位置"), fake_pos_str);
    };


    uavFindTarget() {
        // todo 近距离目标感知r_0
        let r0 = 20;
        for (let target of this.target_list) {
            for (let uav of this.uav_list) {
                let distance = target.position.euc2d(uav.position);
                if (distance < r0) {
                    // 发现目标概率
                    let discover_pro = 1 - Math.pow(distance / r0, 2);
                    if (Math.random() < discover_pro) {
                        // fixme 改为延迟摧毁目标
                        setTimeout(()=>{
                            target.destory()
                        }, 1000)

                    }
                }
            }
        }
    };

    clear_monitor() {
        this.monitor.clear();
    };

    // 整个群体的绘图方法
    draw() {
        // 绘制网格
        if (this.grid !== null) {
            this.grid.draw(this.canvas);
        }
        //  绘制目标
        for (let i = 0; i < this.target_list.length; i++) {
            this.target_list[i].draw(this.canvas);
        }
        // 绘制无人机
        for (let uav of this.uav_list) {
            uav.draw(this.canvas, false, "dark", false, this.plane_img);
        }
        this.cluster_1 && this.drawClusterLine(this.cluster_1, "red")
        this.cluster_2 && this.drawClusterLine(this.cluster_2, "white")
    }
}

