import numeric from "numeric"

/**
 * 生物地理学优化算法的javascript实现
 * @author 小熊
 * @date 2018-10-05
 */
class BBO {
    constructor(dimension, ub, lb, fitness_function, habitat_num = 30, iter_max = 10000, fit_func_caller = null) {
        // 总迭代次数
        this.iter_max = iter_max;
        // 栖息地个数
        this.habitat_num = habitat_num;
        // 单个栖息地的维度
        this.dimension = dimension;
        // 单个栖息地的每个维度的上限
        this.ub = ub;
        // 单个栖息地的每个维度的下限
        this.lb = lb;
        // 单个栖息地的适应度函数
        this.fitness_func = fitness_function;
        // 适应度函数的调用者
        this.fit_func_caller = fit_func_caller;
        // 算法中的栖息地列表
        this.habitat_list = [];
        // 全局栖息地的最优位置
        this.gbest = null;
        // 全局栖息地最优的适应度值
        this.gbestValue = Infinity;
        // 迁移率
        this.p_mod = 0.2;
        // 当前迭代步数
        this.currentStep = 0;
    }

    // 随机初始化栖息地
    init() {
        for (let i = 0; i < this.habitat_num; i++) {
            let habitat = new Habitat(this.dimension, this.ub, this.lb, this.fitness_func, this.fit_func_caller);
            habitat.init();
            this.habitat_list.push(habitat)
        }
    }

    step_run(steps) {
        // 首先判断是否第一次运行,是的话就初始化栖息地群
        if (this.habitat_list.length === 0) {
            this.init();
        }
        // 按照指定的步数更新算法
        for (let i = 0; i < steps; i++) {
            this.currentStep++;
            // 更新每个栖息地
            this.update_habitats()
        }
        return {
            currentStep: this.currentStep,
            gbest: this.gbest,
            gbestValue: this.gbestValue
        };
    }

    // 更新栖息地的迁入率,迁出率
    update_habitats() {
        // 按照适应度从小到大的顺序进行排列
        let sorted_habitats = this.habitat_list.sort((a, b) => a.fitness_value - b.fitness_value);
        let fitness_min = sorted_habitats[0].fitness_value;
        let fitness_max = sorted_habitats[sorted_habitats.length - 1].fitness_value;
        // 计算总的迁出率
        let sum_e = 0;
        // 根据最大和最小适应度,计算每个栖息地的迁入率和迁出率
        for (let habitat of this.habitat_list) {
            habitat.update(fitness_min, fitness_max);
            sum_e += habitat.emigration;
        }
        // 更新每个栖息地迁出的轮盘赌范围
        let e_begin = 0;
        for (let habitat of this.habitat_list) {
            // 轮盘赌的最小值
            habitat.e_min = e_begin;
            e_begin += habitat.emigration / sum_e;
            // 轮盘赌的最大值
            habitat.e_max = e_begin;
        }
        // 根据迁入和迁出情况更新每个栖息地
        for (let habitat of this.habitat_list) {
            // 以p_mod的概率更新栖息地
            if (Math.random() > this.p_mod) continue;
            // 对每个维度按照迁入率进行更新
            for (let i = 0; i < habitat.position.length; i++) {
                if (Math.random() > habitat.immigration) continue;
                // 轮盘赌计算迁出的栖息地
                let e_random = Math.random();
                // 如果轮盘赌对应的栖息地找到,则对这个维度进行替换
                for (let other of this.habitat_list) {
                    if (e_random >= other.e_min && e_random <= other.e_max) {
                        habitat.position[i] = other.position[i];
                    }
                }
            }
        }
        // 更新完迁入迁出率之后,重新计算适应度值
        for (let habitat of this.habitat_list) {
            habitat.evaluate();
        }
        //---------------进行突变操作---------------------
        this.mutation();
        // 突变操作结束后,重新计算适应度值
        for (let habitat of this.habitat_list) {
            let fitness_value = habitat.evaluate();
            if (fitness_value < this.gbestValue) {
                this.gbestValue = fitness_value;
                this.gbest = habitat.position.copy();
            }
        }
    }

    mutation() {
        // 设定废柴率,即留下多少个体为废柴,需要突变
        let loser_rate = 0.5;
        // 设定突变率,即每个维度进行突变的概率
        let mutation_rate = 0.1;
        // 按照适应度从大到小的顺序进行排列,只对废柴栖息地进行突变
        let reverse_habitats = this.habitat_list.sort((a, b) => b.fitness_value - a.fitness_value);
        for (let i = 0; i < reverse_habitats.length * loser_rate; i++) {
            let loser_habitat = reverse_habitats[i];
            for (let j = 0; j < loser_habitat.position.length; j++) {
                if (Math.random() > mutation_rate) continue;
                //进行突变, 突变为 lb + (ub - lb) * 随机数
                loser_habitat.position[j] = this.lb[j] + (this.ub[j] - this.lb[j]) * Math.random();
            }
        }
    }
}

class Habitat {
    constructor(dimension, ub, lb, fitness_func, fit_func_caller) {
        // 单个栖息地的维度
        this.dimension = dimension;
        // 单个栖息地的每个维度的上限
        this.ub = ub;
        // 单个栖息地的每个维度的下限
        this.lb = lb;
        // 单个栖息地的适应度函数
        this.fitness_func = fitness_func;
        // 适应度函数的调用者
        this.fit_func_caller = fit_func_caller;
        // 当前栖息地的位置
        this.position = [];
        // 计算迁出率的区间
        this.e_min = 0;
        this.e_max = 0;
        // 当前栖息地的适应度值
        this.fitness_value = 0;
        // 当前栖息地的迁入率
        this.immigration = 0;
        // 当前栖息地的迁出率
        this.emigration = 0;
    }


    // 栖息地初始化公式
    init() {
        // 随机初始化解
        this.position = this.get_rand_vector();
        // 计算每个栖息地的适应度值
        this.evaluate();

    }

    // 获得在lb和ub范围内的随机向量
    get_rand_vector() {
        // 先产生一组0-1随机值
        let rand_vec = numeric.random([this.dimension]);
        // 下面完成的过程是： lb + (ub - lb) * 初始值
        let range = numeric.sub(this.ub, this.lb);
        rand_vec = numeric.add(this.lb, numeric.mul(rand_vec, range));
        return rand_vec;
    };

    // 栖息地更新公式
    update(fitness_min, fitness_max) {
        // 计算每个栖息地的迁入率和迁出率
        this.immigration = (this.fitness_value - fitness_min) / (fitness_max - fitness_min);
        this.emigration = (fitness_max - this.fitness_value) / (fitness_max - fitness_min);
    }

    // 更新栖息地的适应度值
    evaluate() {
        // 如果评价函数的参数只需要一个,则直接传入位置
        if (this.fit_func_caller === null) {
            this.fitness_value = this.fitness_func(this.position);
        } else {
            // 直接调用传入的适应度函数
            this.fitness_value = this.fitness_func.call(this.fit_func_caller, this.position).value;
        }
        return this.fitness_value;
    }
}

export default BBO;