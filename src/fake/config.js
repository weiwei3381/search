/**
 * 假目标策略的配置项
 *
 */


const trueTargetNum = parseInt(getDomValueById("true_target_num")) // 真目标数量
const fakeTargetNum = parseInt(getDomValueById("fake_target_num")) // 假目标数量
const uavNum = parseInt(getDomValueById("uav_num"))  // 无人机数量
const method = getDomValueById("method")  // 优化算法
const isFixedTrueTarget = getDomValueById("fixTrueTarget") === "1"  // 是否固定真目标
const initX = parseInt(getDomValueById("init_X") || 200) // 初始X轴坐标
const initY = parseInt(getDomValueById("init_Y") || 200)  // 初始Y轴坐标
const particleNum = parseInt(getDomValueById("particle_num") || 20)  // 种群个数
const iterNum = parseInt(getDomValueById("iter_num") || 10000)  // 迭代次数
const trueTargetLocations = getDomValueById("true_target_locations")  // 真目标分布

const config = {
    trueTargetNum,
    fakeTargetNum,
    uavNum,
    method,
    isFixedTrueTarget,
    initX,
    initY,
    particleNum,
    iterNum,
    trueTargetLocations
}

/**
 * 根据Dom节点的id获取Dom节点值
 * @param id
 */
function getDomValueById(id) {
    return document.getElementById(id).value.trim()
}

// 导出配置项
module.exports = config