/*
 * @Author: Mr.Hong
 * @Date: 2023-02-07 15:03:33
 * @File: CupItem.ts
*/

import { _decorator, AsyncDelegate, Color, Component, EventTouch, instantiate, Label, Material, math, Node, Renderer, ScrollView, Sprite, Tween, tween, UITransform, v2, v3, Vec2, Vec3, Vec4 } from 'cc';
import { UIBase } from '../core/gui/UIBase';
import { GameInterface } from '../config/GameInterface';
import { DEV } from 'cc/env';

const { ccclass, property } = _decorator;

enum PourAction {
    none,
    /**往里加水 */
    in,
    /**向外倒水 */
    out,
}

const MAX_ARR_LEN = 6;


@ccclass('CupWater')
export class CupWater extends Component {
    private _action: PourAction = PourAction.none;

    /**到这里停止倒水 */
    private stopIdx = -1;
    /**节点高宽比 */
    private _ratio: number = 1;

    @property private _skewAngle: number = 0;
    @property({ tooltip: DEV && '旋转角度' })
    public get skewAngle() { return this._skewAngle; }
    public set skewAngle(value: number) {
        //console.log("set skewAngle前----------", value)
        value = Math.round(value * 100) / 100;
        // cc.log("angle",value)
        this._skewAngle = value;
        //console.log("set skewAngle后----------", value)
        this.updateAngleHeight();
    }

    private infos: GameInterface.WaterInfo[] = []

    getWaterInfos() {
        return this.infos
    }

    /**当前是有几层水 */

    private curIdx = 0;
    initInfos(infos: GameInterface.WaterInfo[]) {
        this.infos = infos
        /*
        注意，infos.length是表示有多少个间隔，不是层数，比如颜色分布是[黑，黄，黑，黄]，这里是有4个间隔，要想把水从这个杯子中倒出去要倒4次，所以也可以把infos.length理解为倒水的次数
            而且是从杯底算起，[黑，黄，黑，黄]，杯底是黑色，this.curIdx = length - 1表示杯口的数据 
         */
        this.curIdx = this.infos.length - 1
        console.log("initInfos初始层-----------", this.infos, this.curIdx)

        this.initSizeColor();
        this.updateAngleHeight();
    }

    protected onLoad() {
        let sp = this.node.getComponent(Sprite);
        if (sp.spriteFrame) sp.spriteFrame.packable = false

        let uitrans = this.node.getComponent(UITransform)
        this._ratio = uitrans.height / uitrans.width

    }

    private initSizeColor() {
        let uitrans = this.node.getComponent(UITransform)

        let _colors: Vec4[] = []
        for (let i = 0; i < MAX_ARR_LEN; i++) {//从杯底开始算
            let uniform = new Vec4(0, 0, 0, 1.0)
            if (this.infos[i]) {
                const color = this.infos[i].color
                uniform.set(color.r / 255, color.g / 255, color.b / 255, 1.0)
            }
            _colors.push(uniform)
        }
        let material = this.node.getComponent(Renderer).material

        material.setProperty('colors', _colors)//数组只支持一维数组
        material.setProperty('iResolution', v2(uitrans.width, uitrans.height))
        material.setProperty('waveType', 0)
    }

    private updateAngleHeight() {

        let _heights: Vec4[] = []

        for (let i = 0; i < MAX_ARR_LEN; i++) {
            let uniform = new Vec4(0, 0, 0, 0)
            if (this.infos[i]) {
                uniform.set(this.infos[i].height, 0, 0)
            }
            _heights.push(uniform)
        }

        let material = this.node.getComponent(Renderer).material

        material.setProperty('heights', _heights);
        //console.log("updateAngleHeight", _heights)
        material.setProperty('skewAngle', this._skewAngle);
        //console.log("skewAngle", this._skewAngle)

        let waveType = 0.0;
        if (this._action == PourAction.in) {
            waveType = 1.0;
        } else if (this._action == PourAction.out) {
            waveType = 2.0;
        }
        material.setProperty('waveType', waveType);

        // this.showDebugCenter();
    }

    /**
     * 倾斜到哪个角度开始往外边倒水
     */
    public getPourStartAngle() {
        let _height = 0;
        for (let i = 0; i <= this.curIdx; i++) {//比如有三种水，this.curIdx为2, 遍历就是0,1,2
            _height += this.infos[i].height;
            //console.log("倾斜到哪个角度开始往外边倒水pre", this.infos[i])
        }
        console.log("倾斜到哪个角度开始往外边倒水-----", this.infos, this.curIdx, _height) //如果需要倒三次水，杯子里面[黑，黑，黄，红]，则_height为0.85，本来是1，添加了高度因子，相当于是那最顶层的水的高度
        return this.getCriticalAngleWithHeight(_height);
    }

    /**
     * 倾斜到哪个角度开始停止倒水（当前颜色的水倒完了）
     */
    public getPourEndAngle() {
        this.stopIdx = this.curIdx - this.getTopSameColorNum();

        let _height = 0;
        for (let i = 0; i <= this.stopIdx; i++) {
            _height += this.infos[i].height;
        }
        //console.log("倾斜到哪个角度开始停止倒水-----", this.infos, this.stopIdx, _height)
        return this.getCriticalAngleWithHeight(_height);
    }

    /**获取某一高度的水刚好碰到瓶口的临界倾斜角度 */
    /**
     * 根据给定的高度计算临界角度
     * @param {number} _height - 水的高度值，范围在0到1之间
     * @returns {number} 返回计算后的临界角度（度数）
     */
    /**
     * 根据高度计算临界角度
     * @param {number} _height - 输入的高度值
     * @returns {number} 返回计算后的临界角度
     */
    private getCriticalAngleWithHeight(_height) {//_height是倒水的杯子水层的厚度，_height的值包括 0，0.2125，0.425，0.6375，0.85
        console.log("getCriticalAngleWithHeight-----------", _height)
        let ret = 0;
        if (_height == 0) {//如果是0，说明水杯的水全部倒完了，成-90度, 所以直接返回90度，可以将杯子摆正
            ret = 90; // 当高度为0时，直接返回90度
            return ret;
        }

        /*
            tan(α)是对边比上邻边，下面计算tan都是用的比例值而非实际值，this._ratio是杯子的宽高比,
                  ↗
     /  │
    /   │
   /    │
  θ     │ 对边
 /      │
└───────┘
   邻边


新解释：
    假设h是杯子的高度, w是杯子的宽度
    初始未倒水前，水的形状是长方形，计算面积得w*h*_height,
    然后倒水，在水面初次接触到杯底左下角时，水面的高度是2*_height,因为_height小于0.5，所以2*_height小于1，这时水还是没有达到右上角出水口，
    继续倒水，当水面初次接触到右上角杯口时，此时水面的高度是h，水的底边长度不再是w，需要计算此时的水底边的长度，设底边长为v，
    v*h/2 = w*h*_height
    v = 2*w*_height
    计算此时的正切值，tan(α) = h / 2*w*_height
    正切值是 this._ratio / (_height * 2.0)
    所以实际上计算得出的结果是水面碰到杯口的角度，而不是之前想的碰到杯底的角度
        */

        if (_height < 0.5) {//水的体积小于杯子的一半,先碰到下瓶底
            // 计算正切值：使用比例除以高度的两倍
            let tanVal = this._ratio / (_height * 2.0); // this._ratio是杯子高度/宽度  tanVal是对边和邻边的比值，也就是正切值, 它本身不是弧度，而是用于后续计算弧度的一个中间值
            // 通过反正切函数计算弧度值
            ret = Math.atan(tanVal); //Math.atan()接收一个正切值作为参数，返回的是一个弧度，一个完整了圆实2PI。通过这个反正切获得弧度
            console.log("ret弧度---------------", ret, tanVal, math.toDegree(ret))
        } else {
            // 计算正切值：使用比例的两倍乘以(1.0 - 高度)
            let tanVal = 2.0 * this._ratio * (1.0 - _height);
            // 通过反正切函数计算弧度值
            ret = Math.atan(tanVal);
        }

        // 将弧度转换为角度
        ret = radian2angle(ret);
        console.log('this._ratio-------', this._ratio, _height, ret)
        return ret;
    }

    private getTopSameColorNum() {
        let sameColorNum = 0;
        let colorId = null;
        for (let i = this.curIdx; i >= 0; i--) {
            if (colorId == null) {
                sameColorNum++;
                colorId = this.infos[i].colorId;
            } else if (this.infos[i].colorId == colorId) {
                sameColorNum++;
            } else {
                break;
            }
        }
        console.log("getTopSameColorNum-------相同层数", this.infos, sameColorNum)
        /*
        在倒水时this.infos出现了这种数据infos = [{height: 0.425, colorId:7}, {height: 0.2125, colorId:4}, {height: 0.2125, colorId:4}]
        后面两层颜色一样，但是竟然分了两层，也就是说两种颜色，要倒水3次才能倒完,是上一次倒完没有将水层合并在一起吗
        
        */
        //sameColorNum = sameColorNum >= 1 ? 1 : 0
        return sameColorNum//sameColorNum
    }

    /**
     * 开始倒水
     * 一直倒水直到不同颜色的水到达瓶口，为当前最大能倾斜的角度
     * @returns 返回值为倾斜角度的绝对值
     */
    public onStartPour() {
        this._action = PourAction.out;

        this.stopIdx = this.curIdx - this.getTopSameColorNum();
        //看上面this.initInfos的解释
        console.log("开始倒水有几层水-----------", this.curIdx, this.stopIdx)
    }

    private addHeight = 0;
    public addInfo(info: GameInterface.WaterInfo) {
        this.addHeight = info.height;
        info.height = 0;
        //这里有问题，如果倒进来的水和原本底层的水是一样的，则不应该是push，而应该是合并，这里会影响this.getTopSameColorNum的判断
        //addStep那里好像慢慢在增加info.height
        this.infos.push(info);
        console.log("水流流后addInfo------------push------", this.infos)
        this._action = PourAction.in;
        this.curIdx = this.infos.length - 1;

        this.initSizeColor();
    }



    private onOutStart: Function = null;
    private onOutFinish: Function = null;

    public setPourOutCallback(onOutStart: Function, onOutFinish: Function) {
        this.onOutStart = onOutStart;
        this.onOutFinish = onOutFinish;
    }

    private onInFInish: Function = null;
    public setPourInCallback(onInFInish: Function) {
        this.onInFInish = onInFInish;
    }

    update() {
        if (this._action == PourAction.out) {
            this.pourStep();
        } else if (this._action == PourAction.in) {
            this.addStep()
        }
    }

    /**
     * 每帧调用，升高水面高度
     */
    addStep() {
        if (this.curIdx < 0) {
            return;
        }
        //是自己看瞎了眼，上面的this.addInfo虽然push了一层，但是info.height被设置成了0,height数据交给了this.addHeight来保存
        let info = this.infos[this.curIdx];
        //console.log("水流流后addStep------------", info.height, this.addHeight, this.infos, this.curIdx)
        info.height = Math.round((info.height + 0.005) * 1000) / 1000;//每次增加0.005的高度
        // cc.log("--------info.height",info.height)

        /*
        在两次倒水是同样的颜色的时候还是会有问题，在倒完两次同颜色的水后结构是
        [
        {height:0.425, colorId:1,color:xxx}
        {height:0.2125, colorId:1,color:xxx}
        ]
        这个infos是有两个元素的，不过在将这个infos倒给另一个CupWater时，这个infos的元素被合并了，变成
        [{height:0.6375, colorId:1,color:xxx}]
        这个合并是在pourStep函数中，在点击src进行倒水的时候pop了两次来进行倒水删除的

        完结：
        关于要不要将颜色相同的两层infos合并的问题，不要合并，合并后不能拆开，3层水要拆开倒入只有一个空位的杯子，会出问题，而且回退一步后也不好处理，一层的水倒过来变成3个高度的一层水，回退的时候出现问题
        所以不要合并
        */


        if (info.height >= this.addHeight) {
            info.height = this.addHeight;
            this._action = PourAction.none;
            if (this.onInFInish) {
                //这个方法内部的上下文是被倒水的CupItem,内容是执行气泡动画，保存这一次倒水信息，留着回退
                this.onInFInish();
                console.log("水流流后收尾-----onInFInish------------", this.infos)
                this.onInFInish = null;
            }
        }

        //这里就是修改材质显示了，什么波浪之类的
        this.updateAngleHeight();
    }

    /**
     * * update中每帧调用
     * * 降低水面高度 
     */
    pourStep() {
        console.log("pourStep-------------", this.skewAngle)
        if (this.curIdx < 0) {
            this._action = PourAction.none;
            return;
        }
        let _height = 0;
        for (let i = 0; i <= this.curIdx; i++) {
            _height += this.infos[i].height;//算出当前水的高度，一层水是0.2125,两层水0.425，四层是0.85
        }
        let is_top = false;
        let angle = (this.skewAngle % 360) * Math.PI / 180.0  //this.skewAngle在CupItem的update中实时接收CupItem的节点的角度变化，然后传给CupWater
        console.log("弧度角度update------------", angle, math.toRadian(this.skewAngle))
        let _t = Math.abs(Math.tan(angle)); // math.tan传入弧度，返回的是正切值，可以再通过Math.atan(正切值)函数获得弧度，都已经知道弧度了，直接用弧度就行
        if (_height < 0.5) {//水的体积小于杯子的一半,先碰到下瓶底 _height小于0.5的情况说明只有0层，1层，2层水

            /*
            在CupWater.getPourEndAngle函数中，已经知道了倾斜到水杯右上角出水口的正切值是this._ratio/(2 * _height), 
            _t是一直在倾斜的角度的正切值，也就是说_t大于this._ratio/(2 * _height)的话，水就已经到顶了，可以开始倒水了
            */
            is_top = _t > (this._ratio) / (_height * 2.0);
        } else {
            is_top = _t > 2.0 * this._ratio * (1.0 - _height);
        }

        let info = this.infos[this.curIdx];//最顶层的信息
        console.log("划线阻挡--------------", is_top, info.height)
        if (!is_top) {//没到瓶口，不往下倒
            if (info.height < 0.05) {//可能还留了一点点水,要继续倒出去

            } else {
                return;
            }
        }
        if (this.onOutStart) {//因为是逐帧调用，所以调用后需要销毁

            this.onOutStart();
            this.onOutStart = null;
        }

        info.height = Math.round((info.height - 0.005) * 1000) / 1000; // 每帧降低0.005的info.height, 这个info.height在updateAngleHeight实时修改material的heights属性，提供降低水平面的效果
        if (info.height < 0.01) {
            info.height = 0;

            //这个pop是src倒水的那个水杯的pop，不是dst被倒水的pop
            this.infos.pop();
            this.curIdx--;
            // cc.log("------this.curIdx",this.curIdx,this.stopIdx)

            /*
            假设结构现在是这样的，curIdx本来是1，上面--变成了0，
            {height:0.425, colorId:1,color:xxx}
            {height:0.2125, colorId:1,color:xxx}

            stopIdx是在onStartPour函数中stopIdx = this.curIdx - 2 也就是-1，这个值是固定了
            */
            console.log("水流流后倒完一层-----------------",this.curIdx, this.stopIdx, this.infos)
            if (this.curIdx == this.stopIdx) {
                if (this.onOutFinish) {
                    this.onOutFinish();
                    this.onOutFinish = null;
                }
                this._action = PourAction.none;
            }
        }
        // cc.log("this.curIdx",this.curIdx,"info.height",info.height.toFixed(2),"angle",this.skewAngle.toFixed(2))
        this.updateAngleHeight();
    }
}

function angle2radian(angle: number) {
    while (angle > 360) {
        angle -= 360;
    }
    while (angle < -360) {
        angle += 360;
    }
    return (angle % 360) * Math.PI / 180.0;
}

function radian2angle(radian: number) {
    return radian / Math.PI * 180;
}