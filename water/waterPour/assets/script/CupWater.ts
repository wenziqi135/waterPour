import { _decorator, color, Component, math, Node, Renderer, UITransform, v2, Vec4 } from 'cc';
import { MAX_ARR_LEN, PourAction, WaterInfo } from './playerData';
const { ccclass, property } = _decorator;

@ccclass('CupWater')
export class CupWater extends Component {

    @property
    _skewAngle: number = 0

    private onOutStart: Function = null;
    private onOutFinish: Function = null;

    private addHeight = 0

    public get skewAngle() {
        return this._skewAngle
    }

    public set skewAngle(value: number) {
        value = Math.round(value * 100) / 100
        this._skewAngle = value
        this.updateAngleHeight()
    }

    private infos: WaterInfo[] = []
    private curIdx = 0
    //到这里停止倒水
    private stopIdx = -1
    private _action: PourAction = PourAction.none
    private cupWidth: number = 0
    private cupHeight: number = 0
    start() {
        this.cupWidth = this.node.getComponent(UITransform).width
        this.cupHeight = this.node.getComponent(UITransform).height
    }

    setPourOutCallback(onOutStart: Function, onOutFinish: Function) {
        this.onOutStart = onOutStart;
        this.onOutFinish = onOutFinish;
    }

    addWaterStart(waterInfo: WaterInfo) {
        this.addHeight = waterInfo.height
        waterInfo.height = 0
        //height不是一下加上来的，而是在帧调用的时候从0加到height
        this.infos.push(waterInfo)
        this._action = PourAction.in
        this.curIdx = this.infos.length - 1

        this.initSizeColor()
    }

    update(deltaTime: number) {
        if (this._action == PourAction.out) {
            this.pourStepOut()
        } else if (this._action == PourAction.in) {
            this.addStepIn()
        }
    }

    pourStepOut() {
        if (this.curIdx < 0) {
            this._action = PourAction.none
            return
        }
        let _height = 0
        for (let i = 0; i <= this.curIdx; i++) {
            _height += this.infos[i].height
        }
        let is_top = false
        let ret = math.toRadian(this.skewAngle % 360)
        let tanV = Math.abs(Math.tan(ret))
        if (_height < 0.5) {
            is_top = tanV > (this.cupHeight / this.cupWidth) / (_height * 2)
        } else {
            is_top = tanV > 2 * (this.cupHeight / this.cupWidth) * (1 - _height)
        }
        let info = this.infos[this.curIdx]
        //is_top为true,表示水已经到达了杯口的边缘，开始准备倒水了
        if (!is_top) {
            return
        }
        if (this.onOutStart) {
            //这个是划线方法，在水流到达杯口时调用，也就是CupItem.moveToPour方法的moveTime 0.4秒后调用
            this.onOutStart()
            this.onOutStart = null
        }
        info.height = Math.round((info.height - 0.005) * 1000) / 1000;
        
        if (info.height < 0.01) {
            info.height = 0
            /*  
 infos的数据结构是：
  [ {   "height": 0.2125, "colorId": 4,  "color": {"_val": 4285809989  }  }, {   "height": 0.2125,    "colorId": 2,   "color": {       "_val": 4283836093  }},]
      遇到这种颜色相同，但是分成了两层的就是pop两次
 */
            this.infos.pop()
            this.curIdx--
            if (this.curIdx == this.stopIdx) {
                if (this.onOutFinish) {
                    //这里是杯子放回原位的调用，杯子在被点击后1秒钟将杯子倾斜到能够完全倒出该种颜色的水的角度，不过倒完水的时间由需要倒多少层来决定
                    this.onOutFinish()
                    this.onOutFinish = null
                }
                this._action = PourAction.none
            }
        }
        this.updateAngleHeight()
    }

    addStepIn() {
        if (this.curIdx < 0) {
            return
        }
        let info = this.infos[this.curIdx]
        //height在addWaterStart的时候已经初始化为0了，这里再从0加到addHeight，就有水慢慢升高的效果了
        info.height = Math.round((info.height + 0.005) * 1000) / 1000;
        if (info.height >= this.addHeight) {
            info.height = this.addHeight
            this._action = PourAction.none
        }
        this.updateAngleHeight()
    }

    initInfos(infos: WaterInfo[]) {
        /*  
        infos的数据结构是：
         [ {   "height": 0.2125, "colorId": 4,  "color": {"_val": 4285809989  }  }, {   "height": 0.2125,    "colorId": 2,   "color": {       "_val": 4283836093  }},]
        */
        this.infos = infos
        this.curIdx = this.infos.length - 1
        this.initSizeColor()
        this.updateAngleHeight()
    }

    initSizeColor() {
        let uiTrans = this.node.getComponent(UITransform)
        let _colors: Vec4[] = []
        for (let i = 0; i < MAX_ARR_LEN; i++) {
            let uniform = new Vec4(0, 0, 0, 1)
            if (this.infos[i]) {
                const color = this.infos[i].color
                uniform.set(color.r / 255, color.g / 255, color.b / 255, 1)
            }
            _colors.push(uniform)
        }
        let material = this.node.getComponent(Renderer).material

        material.setProperty("colors", _colors)
        material.setProperty("iResolution", v2(uiTrans.width, uiTrans.height))
        material.setProperty("waveType", 0)
    }

    onStartPour() {
        this._action = PourAction.out
        this.stopIdx = this.curIdx - this.getTopSameColorNum()
    }

    updateAngleHeight() {
        let _heights: Vec4[] = []
        for (let i = 0; i < MAX_ARR_LEN; i++) {
            let uniform = new Vec4(0, 0, 0, 0)
            if (this.infos[i]) {
                uniform.set(this.infos[i].height, 0, 0)
            }
            _heights.push(uniform)
        }

        let material = this.node.getComponent(Renderer).material
        material.setProperty("heights", _heights)
        material.setProperty("skewAngle", this._skewAngle)
    }

    getPourStartAngle() {
        let _height = 0
        for (let i = 0; i <= this.curIdx; i++) {
            _height += this.infos[i].height
        }
        return this.getCriticalAngleWithHeight(_height)
    }

    getPourEndAngle() {
        this.stopIdx = this.curIdx - this.getTopSameColorNum()
        let _height = 0
        for (let i = 0; i <= this.stopIdx; i++) {
            _height += this.infos[i].height
        }
        return this.getCriticalAngleWithHeight(_height)
    }

    getTopSameColorNum() {
        let sameColorNum = 0
        let colorId = null
        for (let i = this.curIdx; i >= 0; i--) {
            if (colorId == null) {
                sameColorNum++
                colorId = this.infos[i].colorId
            } else if (this.infos[i].colorId == colorId) {
                sameColorNum++
            } else {
                break
            }
        }
        /*
        粗一看，sameColorNum应该一直为1才是，因为这一层的水和上一层的水颜色应该是不一样的，但是实际上，在倒完水后，相同颜色的水并没有融合成一层一个元素，只是this.infos直接push一个新元素进来，
        结构变成
        [
        {height:0.425, colorId:1,color:xxx}
        {height:0.2125, colorId:1,color:xxx}
        ]
        此时颜色是一样的，但是在数组里分成了两个元素，这种情况sameColorNum是2，没有合并成一个元素可能是在回退的时候会出现问题
        */
        return sameColorNum
    }

    //计算倒水的角度，游戏理解的唯一一个难点
    getCriticalAngleWithHeight(_height: number) {
        let ret = 0
        //倒水全部倒完了，此时角度是-90度，直接返回90度，将水杯摆正
        if (_height == 0) {
            ret = 90
            return ret
        }
        /*
       /│
      / │
    /   │
   /    │
  θ     │ 对边
 /      │
└───────┘
   邻边
        解释_height < 0.5的情况：
        当_height < 0.5时，也就是杯中水不足一半时，假设h是杯子高度，w是杯子宽度
        初始未倒水前，水的形状是长方形，计算面积得w*h*_height,
        然后倒水，在水面初次接触到杯底左下角时，水面的高度是2*_height,因为_height小于0.5，所以2*_height小于1，这时水还是没有达到右上角出水口，
        继续倒水，当水面初次接触到右上角杯口时，此时水面的高度是h，水的底边长度不再是w，需要计算此时的水底边的长度，设底边长为v，v是要小于w的
        v * h / 2 = w * h * _height
        v = 2 * w * _height
        计算此时的正切值 tan(α) = h / 2*w*_height 
                             =  (h/v)/(2 * _height)

        */
        if (_height < 0.5) {

            let tanVal = (this.cupHeight / this.cupWidth) / (2 * _height)
            //反正切函数传入正切值，返回弧度值
            ret = Math.atan(tanVal)
        } else {
            let tanVal = 2 * (this.cupHeight / this.cupWidth) * (1 - _height)
            ret = Math.atan(tanVal)
        }
        //将弧度值转换为角度值
        ret = math.toDegree(ret)
        return ret
    }
}

