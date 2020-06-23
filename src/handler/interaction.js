export default class Interaction{
    constructor(storage){
        this.storage = storage
    }

    // 回调函数就是把对应形状加入ainimationShape中
    step(callback){
        // 交互主要是无人机先飞行
        this.uavUpdate(callback)
        // 然后各个交互物与无人机之间的关系
        this.gridUpdate(callback)
    }

    // 无人机飞行
    uavUpdate(callback){
        const flock = this.storage.getFlock()
        for(let i in flock){
            const uav = flock[i]
            uav.hasFlyTarget() || uav.setFlyPos(500, 0)
            uav.near && uav.setFlyPos(500 * Math.random(), 500* Math.random())
            uav.fly()
            this.storage.setChangedZlevle(uav.zlevel)
            callback(uav)
        }
    }

    gridUpdate(callback){
        const grid = this.storage.getGrid()
        const flock = this.storage.getFlock()
        const changeElements = grid.update(flock)
        for (let e of changeElements){
            callback(e)
            this.storage.setChangedZlevle(e.zlevel)
        }

    }
}