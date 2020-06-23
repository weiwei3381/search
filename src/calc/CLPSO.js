import numeric from "numeric"

/**
 * 综合学习粒子群算法(CLPSO)的javascript实现
 * @author 小熊
 * @date 2020-01-04
 */
export class CLPSO {
    // 构造函数
    constructor({particleNum, dimension, maxStep, ub, lb, fitFunc}) {
        // 粒子个数
        this.particleNum = particleNum || 20;
        // 单个粒子的维度
        this.dimension = dimension || 0;
        // 单个粒子的每个维度的上限
        this.ub = ub || 0;
        // 单个粒子的每个维度的下限
        this.lb = lb || 0;
        // 粒子群最大迭代数
        this.maxStep = maxStep;
        // 单个粒子的适应度函数
        this.fitFunc = fitFunc || null;
        // 粒子群算法中的粒子列表
        this.particleList = [];
        // 全局粒子的最优位置
        this.gbest = null;
        // 全局粒子最优的适应度值
        this.gbestValue = Infinity;
        // 两个移动的集合
        this.cluster_1 = []
        this.cluster_2 = []
        // 粒子群当前迭代数
        this.currentStep = 0;
        // 粒子群的刷新间隔m
        this.gap = 7
    }

    /**
     * 粒子群初始化
     * this.dimension, this.ub, this.lb, this.fitFunc
     */
    init() {
        // 按照最大迭代次数开始更新
        for (let i = 0; i < this.particleNum; i++) {
            // 计算对应粒子的学习率
            const learnProb = this.calcLearnProb(i);
            // 默认的范例, 所有粒子都从自身学习
            const exemplar = numeric.add(numeric.floor(numeric.random([this.dimension])), i);
            let particle = new Particle({
                id: i,
                dimension: this.dimension,
                learnProb: learnProb,
                exemplar: exemplar,
                ub: this.ub,
                lb: this.lb,
                fitFunc: this.fitFunc
            });
            particle.init();
            this.particleList.push(particle)
        }
        this.update_gbest();
    }

    /**
     * 更新全局最优粒子
     */
    update_gbest() {
        // 遍历所有的粒子历史最优解
        for (let particle of this.particleList) {
            if (particle.pbestValue < this.gbestValue) {
                this.gbestValue = particle.pbestValue;
                this.gbest = particle.pbest;
                this.cluster_1 = particle.cluster_1
                this.cluster_2 = particle.cluster_2
            }
        }
    }

    /**
     * 计算当前惯性权重
     * @returns {number} 惯性权重
     */
    calcInertiaWeight() {
        // 惯性权重的两个值
        const w0 = 0.9;
        const w1 = 0.4;
        // 根据当前迭代数和最大迭代数得到当前惯性权重
        const currentW = w0 - ((w0 - w1) * this.currentStep / this.maxStep);
        return currentW
    }

    /**
     * 计算对应id粒子的学习率
     * @param id 粒子id
     * @returns {number} 学习率
     */
    calcLearnProb(id) {
        const minPc = 0.05;
        const maxPc = 0.5;
        // fixme 首先计算分子-1
        const molecule = Math.exp((10 * id) / (this.particleNum - 1))-1;
        // 再计算分母
        const denominator = Math.exp(10) - 1;
        return minPc + (maxPc - minPc) * molecule / denominator

    }

    /**
     * 粒子群按照指定的步数更新
     * @param steps 整型,指定的步数
     * @returns {*} 列表,长度为2,第0位是全局最优位置,第1位是全局最优适应度
     */
    step_run(steps) {
        // 如果第一次运行, 则始化粒子群
        if (this.particleList.length === 0) {
            this.init();
        }
        // 按照指定的步数更新CLPSO算法
        for (let i = 0; i < steps; i++) {
            this.currentStep++;
            // 计算惯性权重
            const w = this.calcInertiaWeight();
            // 更新每个粒子
            for (let particle of this.particleList) {
                // 如果粒子的flag大于等于刷新间隔, 则重新选择范例
                if (particle.flag >= this.gap) {
                    const newExemplar = this.selectExemplar(particle);
                    particle.setExemplar(newExemplar)
                }
                particle.flag = particle.flag + 1;
                // 获取这一步的Pbest
                const stepPbest = numeric.random([this.dimension]);
                // 范例的每一个维度对应的是第i个粒子
                for (let i = 0; i < this.dimension; i++) {
                    const exemplarParticleId = particle.exemplar[i];
                    // 这个粒子的pbest中的第i维就是我们要的
                    stepPbest[i] = this.particleList[exemplarParticleId].pbest[i]
                }
                particle.update(w, stepPbest);
            }
            // 更新全局最优
            this.update_gbest();
        }
        return {
            currentStep: this.currentStep,
            gbest: this.gbest,
            gbestValue: this.gbestValue,
            cluster_1: this.cluster_1,
            cluster_2: this.cluster_2
        };
    };

    /**
     * 选取范例, 范例中的每个维度记录从哪个粒子中获取pbest
     * @param particle
     * @returns {*}
     */
    selectExemplar(particle) {
        const zeros = numeric.floor(numeric.random([this.dimension]));
        // 默认的范例, 所有粒子都从自身学习
        const exemplar = numeric.add(zeros, particle.id);
        // 如果随机数大于学习率, 则从自身的pbest中学习
        const learnFromSelf = numeric.gt(numeric.random([this.dimension]), particle.learnProb);
        // 如果全部是从自身学习, 则随机找一个维度, 设为随机的粒子
        if (numeric.all(learnFromSelf)) {
            const randDimension = Math.floor(Math.random() * this.dimension);
            const randParticleId = Math.floor(Math.random() * this.particleNum);
            exemplar[randDimension] = randParticleId;
            return exemplar
        }
        for (let i = 0; i < this.particleNum; i++) {
            // 遍历每个维度, 如果该维度不从自身学习,则进行锦标赛
            if (!learnFromSelf[i]) {
                // 随机取两个粒子, 最好的那个粒子作为id
                const id1 = this.getRandomID(particle.id);
                const id2 = this.getRandomID(particle.id);
                const betterId = this.particleList[id1].pbestValue <= this.particleList[id2].pbestValue ? id1 : id2;
                exemplar[i] = betterId;
            }
        }
        return exemplar
    }

    /**
     * 随机获取粒子ID
     * @param exclusiveId 排除的ID
     * @returns {number} 随机ID
     */
    getRandomID(exclusiveId) {
        // 随机获取id
        let randomId = Math.floor(Math.random() * this.dimension);
        // 如果传了粒子Id, 则必须要跟粒子Id不同
        if (exclusiveId) {
            while (randomId === exclusiveId) {
                randomId = Math.floor(Math.random() * this.dimension)
            }
        }
        // 返回对应Id的粒子
        return randomId
    }
}

class Particle {
    constructor({id, dimension, ub, lb, learnProb, exemplar, fitFunc}) {
        // 粒子当前Id
        this.id = id;
        // 单个粒子的维度
        this.dimension = dimension;
        // 单个粒子的每个维度的上限
        this.ub = ub;
        // 单个粒子的每个维度的下限
        this.lb = lb;
        // 粒子的学习率
        this.learnProb = learnProb;
        // 粒子的范例
        this.exemplar = exemplar;
        // 粒子的范例学习情况
        this.flag = 0;
        // 单个粒子的适应度函数
        this.fitFunc = fitFunc;
        // 当前粒子的位置
        this.position = [];
        // 当前粒子的速度
        this.velocity = [];
        // 单个粒子的最优位置
        this.pbest = null;
        // 单个粒子的最优适应度值，初始值为正无穷大
        this.pbestValue = Infinity;
        this.cluster_1 = [];
        this.cluster_2 = [];
    }


    // 粒子初始化公式
    init() {
        // 随机初始化位置
        this.position = this.get_rand_vector();
        // 随机初始化速度,全为0-10的随机数
        this.velocity = numeric.mul(numeric.random([this.dimension]), 10);
        // 当前粒子的pbest就是这个位置
        this.pbest = this.position;
        // 当前粒子的best适应度值就是该位置的评价值
        this.pbestValue = this.evaluate().value;

    };

    /**
     * // 根据维度数, 获得在lb和ub范围内的随机向量
     * @returns {*}
     */
    get_rand_vector() {
        // 先产生一组0-1随机值
        let rand_vec = numeric.random([this.dimension]);
        // 下面完成的过程是： lb + (ub - lb) * 初始值
        let range = numeric.sub(this.ub, this.lb);
        rand_vec = numeric.add(this.lb, numeric.mul(rand_vec, range));
        return rand_vec;
    };

    /**
     * 粒子更新
     * @param gbest 全局最优位置
     * @param w 弹性惯性权重
     */
    update(w, stepPbest) {
        // 粒子更新公式为两步，分别是更新速度和位置
        // 更新速度：v(t+1) = w*v(t) + c*rand*(pbest_f(i)-x)
        const c = 1.49445;
        // 获取速度部分
        let velocity_part = numeric.mul(w, this.velocity);
        let pbest_part = numeric.mul(c, numeric.random([this.dimension]), numeric.sub(stepPbest, this.position));
        this.velocity = numeric.add(velocity_part, pbest_part);
        // 更新位置：x(t+1) = x(t) + v(t)
        this.position = numeric.add(this.position, this.velocity);

        // 如果更新后的位置大于ub，则放到ub上
        let gt_parts = numeric.gt(this.position, this.ub);
        for (let i = 0; i < gt_parts.length; i++) {
            if (gt_parts[i]) {
                this.position[i] = this.ub[i] * (0.7 + 0.3 * Math.random());
            }
        }
        // 如果更新后的位置小于lb，则放到lb上
        let lt_parts = numeric.lt(this.position, this.lb);
        for (let i = 0; i < lt_parts.length; i++) {
            if (lt_parts[i]) {
                this.position[i] = this.lb[i] + 0.3 * Math.random() * (this.ub[i] - this.lb[i]);
            }
        }

        // 如果更新后的适应度值优于pbest值，则更新粒子历史最优
        let fitnessObject = this.evaluate();
        if (fitnessObject.value < this.pbestValue) {
            this.pbest = this.position;
            this.pbestValue = fitnessObject.value;
            this.cluster_1 = fitnessObject.cluster_1
            this.cluster_2 = fitnessObject.cluster_2
        }
    };


    // 粒子评价函数
    evaluate() {
        // fixme 将两个集合传进去
        return this.fitFunc(this.position);
    }

    // 设置范例
    setExemplar(exemplar) {
        this.exemplar = exemplar;
        this.flag = 0
    }

}