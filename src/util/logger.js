import config from '../config'

// 解构获得跟bug相关的参数
const {debugMode} = config


export const logger = {
    log: function(){
        if (debugMode === 0) {
            return;
        } else if (debugMode === 1) {
            for (let k in arguments) {
                throw new Error(arguments[k]);
            }
        } else if (debugMode > 1) {
            for (let k in arguments) {
                console.log(arguments[k]);
            }
        }

        return this;
    }
}

