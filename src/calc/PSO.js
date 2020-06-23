import numeric from "numeric"

/**
 * 粒子群算法的javascript实现
 * @author 小熊
 * @date 2018-04-27
 */

function PSO(dimension, ub, lb, fitness_function, particle_num = 30, iter_max = 10000, fit_func_caller = null) {
    // 粒子个数
    this.particle_num = particle_num;
    // 单个粒子的维度
    this.dimension = dimension;
    // 单个粒子的每个维度的上限
    this.ub = ub;
    // 单个粒子的每个维度的下限
    this.lb = lb;
    // 单个粒子的适应度函数
    this.fitness_func = fitness_function;
    // 适应度函数的调用者
    this.fit_func_caller = fit_func_caller;
    // 粒子群算法中的粒子列表
    this.particle_list = [];
    // 全局粒子的最优位置
    this.gbest = null;
    // 全局粒子最优的适应度值
    this.gbestValue = Infinity;
    // 当前步数
    this.currentStep = 0;

    /**
     * 粒子群整体初始化
     */
    this.init = function () {
        console.log(`种群数量为:${this.particle_num}`)
        // 按照最大迭代次数开始更新
        for (let i = 0; i < this.particle_num; i++) {
            let particle = new Particle(this.dimension, this.ub, this.lb, this.fitness_func, this.fit_func_caller);
            particle.init();
            this.particle_list.push(particle)
        }
        this.update_gbest();
    };




    this.calcInertiaWeight = function() {
        // 惯性权重的两个值
        const w0 = 0.9;
        const w1 = 0.4;
        // 根据当前迭代数和最大迭代数得到当前惯性权重
        const currentW = w0 - ((w0 - w1) * this.currentStep / this.maxStep);
        return currentW
    }




    /**
     * 粒子群按照指定的步数更新
     * @param steps 整型,指定的步数
     * @returns {*[]} 列表,长度为2,第0位是全局最优位置,第1位是全局最优适应度
     */
    this.step_run = function (steps) {
        // 首先判断是否第一次运行,是的话就初始化粒子群
        if (this.particle_list.length === 0) {
            this.init();
        }
        // 按照指定的步数更新PSO算法
        for (let i = 0; i < steps; i++) {
            this.currentStep++;

            // 计算惯性权重
            const w = this.calcInertiaWeight();

            // 更新每个粒子
            for (let particle of this.particle_list) {
                particle.update(w, this.gbest);
            }
            // 更新全局最优
            this.update_gbest();
        }
        //打印
        console.log(`迭代${this.currentStep}次, 当前全局最优值为${this.gbestValue}`);

        return {
            currentStep: this.currentStep,
            gbest: this.gbest,
            gbestValue: this.gbestValue
        };

        // return [this.gbest,this.gbestValue];

    };

    // 更新全局最优
    this.update_gbest = function () {
        // 遍历所有的粒子历史最优解
        for (let particle of this.particle_list) {
            if (particle.pbestValue < this.gbestValue) {

                this.gbestValue = particle.pbestValue;
                this.gbest = particle.pbest;
            }
        }
    }
}


function Particle(dimension, ub, lb, fitness_function, fit_func_caller) {
    // 单个粒子的维度
    this.dimension = dimension;
    // 单个粒子的每个维度的上限
    this.ub = ub;
    // 单个粒子的每个维度的下限
    this.lb = lb;
    // 单个粒子的适应度函数
    this.fitnessFunc = fitness_function;
    // 适应度函数的调用者
    this.fitFuncCaller = fit_func_caller;
    // 当前粒子的位置
    this.position = [];
    // 当前粒子的速度
    this.velocity = [];
    // 单个粒子的最优位置
    this.pbest = null;
    // 单个粒子的最优适应度值，初始值为正无穷大
    this.pbestValue = Infinity;


    // 粒子初始化公式
    this.init = function () {
        // 随机初始化位置
        this.position = this.get_rand_vector();
        // 随机初始化速度,全为0
        this.velocity = numeric.mul(numeric.random([this.dimension]), 0);
        // 当前粒子的pbest就是这个位置
        this.pbest = this.position;
        // 当前粒子的best适应度值就是该位置的评价值
        this.pbestValue = this.evaluate();

    };

    // 获得在lb和ub范围内的随机向量
    this.get_rand_vector = function () {
        // 先产生一组0-1随机值
        let rand_vec_0 = numeric.random([this.dimension]);
        //fixme 混沌初始化？
        let rand_vec = 4*rand_vec_0*(1-rand_vec_0);
        // 下面完成的过程是： lb + (ub - lb) * 初始值
        let range = numeric.sub(ub, lb);
        rand_vec = numeric.add(lb, numeric.mul(rand_vec, range));
        return rand_vec;
    };

    // 粒子更新公式
    this.update = function (w, gbest_position) {
        // 粒子更新公式为两步，分别是更新速度和位置
        // 更新速度：v(t+1) = 0.9*v(t) + 2*rand*(pbest-x) + 2*rand*(gbest-x)

        //fixme 原来为0.4-2-2或0.7298-1.494-1.494
        let velocity_part = numeric.mul(w, this.velocity);
        let pbest_part = numeric.mul(1.494, numeric.random([this.dimension]), numeric.sub(this.pbest, this.position));
        let gbest_part = numeric.mul(1.494, numeric.random([this.dimension]), numeric.sub(gbest_position, this.position));
        this.velocity = numeric.add(velocity_part, pbest_part, gbest_part);
        // 更新位置：x(t+1) = x(t) + v(t)
        this.position = numeric.add(this.position, this.velocity);

        // 如果更新后的位置大于ub，则放到ub上
        let gt_parts = numeric.gt(this.position, ub);
        for (let i = 0; i < gt_parts.length; i++) {
            if (gt_parts[i]) {
                this.position[i] = this.ub[i] * (0.7 + 0.3*Math.random());
            }
        }
        // 如果更新后的位置小于lb，则放到lb上
        let lt_parts = numeric.lt(this.position, lb);
        for (let i = 0; i < lt_parts.length; i++) {
            if (lt_parts[i]) {
                this.position[i] =  this.lb[i] + 0.3*Math.random() * (this.ub[i] - this.lb[i]);
            }
        }

        // 如果更新后的适应度值优于pbest值，则更新粒子历史最优
        let fitness_value = this.evaluate();
        if (fitness_value < this.pbestValue) {

            this.pbest = this.position;
            this.pbestValue = fitness_value;
        }
    };

    // 粒子评价函数
    this.evaluate = function () {
        // 如果评价函数的参数只需要一个,则直接传入位置
        if (this.fitFuncCaller === null) {
            return this.fitnessFunc(this.position);
        } else {
            return this.fitnessFunc.call(fit_func_caller, this.position);
        }
        // 直接调用传入的适应度函数

    }
}

export default PSO;