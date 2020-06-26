export default class Interaction{
    constructor(storage){
        this.storage = storage
        this.stepNum = 0  // 存储当前步数
    }

    // 回调函数就是把对应形状加入ainimationShape中
    step(callback){
        ++this.stepNum
        // 交互主要是无人机先飞行
        this.uavUpdate(callback)
        this.targetUpdate(callback)
        this.threatUpdate(callback)
        // 然后各个交互物与无人机之间的关系
        this.gridUpdate(callback)

    }

    // 无人机飞行
    uavUpdate(callback){
        const flock = this.storage.getFlock()
        const threats = this.storage.getThreats()
        for(let id in flock){
            const uav = flock[id]
            uav.hasFlyTarget() || uav.setFlyPos(200, 200)
            if(uav.near()){
                const targetPosition = [100+300 * Math.random(), 100+300* Math.random()]
                uav.setFlyPos(targetPosition[0],targetPosition[1])
            }
            uav.calcAllOrient(flock, threats)
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

    targetUpdate(callback){
        const targets = this.storage.getTargets()
        for(let id in targets){
            const target = targets[id]
            if(target.step(this.stepNum)){
                this.storage.setChangedZlevle(target.zlevel)
                callback(target)
            }
        }
    }

    threatUpdate(callback){
        const threats = this.storage.getThreats()
        for(let id in threats){
            const threat = threats[id]
            if(threat.step(this.stepNum)){
                this.storage.setChangedZlevle(threat.zlevel)
                callback(threat)
            }

        }
    }
}