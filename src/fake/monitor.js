import echarts from "echarts"

/**
 * 监视器类
 */
class Monitor {
    /**
     * 初始化类
     * @param run_step 步长
     */
    constructor() {
        // 总运行时间列表
        this.all_time_list = JSON.parse(localStorage.getItem("use_time")) || [];
        // 真目标运行时间列表
        this.true_time_list = JSON.parse(localStorage.getItem("use_true_time")) || [];
        // 迭代次数列表
        this.method_list = JSON.parse(localStorage.getItem("use_method")) || [];

        // 监控器实例
        this.monitor = echarts.init(document.getElementById('monitor'));
        // 监控器配置项
        this.option = {
            title: {
                text: '无人机目标搜索对比图'
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {            // 坐标轴指示器，坐标轴触发有效
                    type: 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
                }
            },
            color: ['#3398DB', '#ff7d6c'],
            xAxis: {
                data: this.method_list,
                type: 'category',
                name: '使用方法',
                nameLocation: 'center',
                nameGap: 23,
                axisLabel:
                    {
                        interval: 0
                    }
            },
            yAxis: {
                min: 0,
                max: function (value) {
                    return Math.ceil(value.max / 5) * 5
                },
                name: "总用时"
            },
            series: [{
                name: '搜索总用时',
                type: 'bar',
                barWidth: '30%',
                data: this.all_time_list
            }, {
                name: '搜真目标用时',
                type: 'bar',
                barWidth: '30%',
                data: this.true_time_list
            }
            ]
        };
        // 使用刚指定的配置项和数据显示图表。
        this.monitor.setOption(this.option);
    }

    /**
     * 监控器数据更新
     * @param method
     * @param all_time
     * @param true_target_time
     * @param is_end
     */
    update_data(method, all_time, true_target_time, is_end = false) {
        if (is_end) {
            localStorage.setItem("use_true_time", JSON.stringify(this.true_time_list));
            localStorage.setItem("use_time", JSON.stringify(this.all_time_list));
            localStorage.setItem("use_method", JSON.stringify(this.method_list));
        }
        if (this.method_list.length === 0) {
            this.method_list.push(method);
            this.all_time_list.push(all_time);
            this.true_time_list.push(true_target_time);
        } else {
            if (this.method_list[this.method_list.length - 1] !== method) {
                this.method_list.push(method);
                this.all_time_list.push(all_time);
                this.true_time_list.push(true_target_time);
            } else {
                this.all_time_list[this.all_time_list.length - 1] = all_time;
                this.true_time_list[this.true_time_list.length - 1] = true_target_time;
            }
        }
    }

    /**
     * 将监控器的信息进行显示
     */
    show() {
        this.monitor.setOption({
            xAxis: {
                data: this.method_list,
                type: 'category',
                name: '使用方法'
            },
            series: [
                {
                    name: '搜索总用时',
                    data: this.all_time_list
                }, {
                    name: '搜真目标用时',
                    data: this.true_time_list
                }]
        });
    }

    clear() {
        this.method_list = [];
        this.all_time_list = [];
        this.true_time_list = [];
        this.show();
    }
}


export default Monitor;


