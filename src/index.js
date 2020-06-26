import simulation from './simulation'

// 初始化仿真类
// 运行完毕之后获得一个ZRender对象
const si = simulation.init(document.getElementById('main'))
si.storage.addUAV({
    id: si.storage.newId(),
    zlevel: 2,
    position: [300, 300],  // 无人机位置
    angle: 0,
    v: 2,
    strategy: 'random',
})

si.storage.addUAV({
    id: si.storage.newId(),
    zlevel: 2,
    position: [0, 400],  // 无人机位置
    angle: 0,
    v: 1,
    strategy: 'random',
})

si.storage.addUAV({
    id: si.storage.newId(),
    zlevel: 2,
    position: [0, 100],  // 无人机位置
    angle: 0,
    v: 1,
    strategy: 'random',
})

si.storage.addUAV({
    id: si.storage.newId(),
    zlevel: 2,
    position: [0, 500],  // 无人机位置
    angle: 0,
    v: 1,
    strategy: 'random',
})
// 初始化网格
si.storage.initGrid(si.painter.getWidth(), si.painter.getHeight())

si.storage.addTarget({
    id: si.storage.newId(),
    position: [300, 300],
    zlevel: 1,
    v: 0,
    angle: 0,
    // 改变速度大小和方向的方法
    changeMove(step){
        if(step % 200 === 0){  // 每隔200次迭代修改一次
            this.v = Math.random() * 0.3
            this.angle = Math.random() * 360
        }
    }
})

// 也可以采用simulation.addUAV, addTarget等方法, 将单独配置传入
const option = {
    time: 30,  // 仿真用时, 单位秒
    UAV: [
        {
            id: `uav_1`,
            position: [0, 0],  // 无人机位置
            angle: 0,
            v: 0,
            strategy: 'random',
        },
        {
            id: `uav_1`,
            position: [0, 500],  // 无人机位置
            angle: 0,
            v: 0,
            strategy: 'random',
        }
    ],
    target: [
        {
            id: 'target_1',
            position: [300, 45],
            angle: 0,
            v: 0,
            onmove: function (v, angle) {
                return [v, angle]
            }
        }
    ],
    threat: [
        {
            id: 'threat_1',
            type: 'radar',
            position: [100, 50],  // 雷达的位置
            range: 30,  // 雷达的范围
            angle: 0,  // 雷达运动朝向
            v: 0,  // 运动速度
            onmove: function (v, angle) {
                return [v, angle]
            }
        },
        {
            id: 'threat_2',
            type: 'obstacle',
            range: [45, 123, 214]  // 网格id
        }
    ]
}

// // 仿真类加载配置项
// simulation.setOption(option)
si.render()

// // 开始仿真
si.emulate()


