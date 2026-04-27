/*
 * @Author: Mr.Hong
 * @Date: 2023-02-07 15:03:33
 * @File: CupItem.ts
*/

import { _decorator, AsyncDelegate, color, Color, EventTouch, instantiate, Label, Material, Node, ScrollView, Tween, tween, Animation, v2, v3, Vec2, Vec3, UIOpacity, math } from 'cc';
import { UIBase } from '../core/gui/UIBase';
import { GameInterface } from '../config/GameInterface';
import { CupWater } from './CupWater';
import { EDITOR } from 'cc/env';
import { Engine } from '../core/Engine';

const { ccclass, property } = _decorator;
const SPLIT_COUNT = 4;
const WaterColors = [
    "#155DEF",
    "#F2C90F",
    "#BD2656",
    "#F0791F",
    "#454574",
    "#FE2D26",
    "#BCA6E3",
    "#E4584F",
    "#00B38A",
    "#DD2E44",
    "#E5C69A",
    "#65DC8E",
    "#B068F0",
    "#F010BF",
    "#538849",
]

/**高度乘数因子，满杯水只显示80% */
const HEIGHT_FACTOR = 0.85;

@ccclass('CupItem')
export class CupItem extends UIBase {
    static NAME = 'CupItem'
    static PREFAB_PATH = 'CupItem'
    static BUNDLE_NAME = '10002'

    @property(CupWater)
    private water: CupWater = null

    @property(Node)
    imageCupNode: Node

    @property(Node)
    coverNode: Node

    @property(Node)
    bubbleNode: Node

    pourStatus = false

    cupInfo: GameInterface.ICupInfo
    clickedCallback: Function
    orginPoint: Vec3

    protected onLoad(): void {
        this.bubbleNode.active = false
    }

    onSetCupItemInfo(cupInfo: GameInterface.ICupInfo, clickedCallback: Function) {
        this.cupInfo = cupInfo//colorIds是水的颜色数组，cupId是杯子的皮肤索引
        this.clickedCallback = clickedCallback

        this.initWater()
        this.reset()

    }

    reset() {
        this.node.angle = 0;
        this.water.skewAngle = 0
    }

    initWater() {
        console.log("水流流后执行-----------intwater")
        const info = this.cupInfo
        let arr = [];
        for (let i = SPLIT_COUNT - 1; i >= 0; i--) {//i从大到小，从杯底开始遍历
            let colorId = info.colorIds[i];
            if (colorId == 0) {
                continue;
            }
            let lastObj = arr[arr.length - 1];
            if (!lastObj || lastObj.colorId != colorId) {//[{height: 1/4, colorid:1}, {height: 2/4, colorid:2}, {1/4, 3}]
                arr.push({
                    height: 1 / SPLIT_COUNT,
                    colorId: colorId
                });
            } else {
                lastObj.height += 1 / SPLIT_COUNT;
            }
        }
        //console.log("initWater---pre", arr)
        arr.forEach(function (obj) {
            let hex = WaterColors[obj.colorId] || "#538849"
            // cc.log("obj.colorId",obj.colorId,"color",hex)
            obj.color = new Color()
            Color.fromHEX(obj.color, hex)
            obj.height *= HEIGHT_FACTOR;//实际上是高度乘以0.85
        })

        this.water.initInfos(arr);

        let isFinished = this.checkIsFinshed()

        if (isFinished == 1) {
            this.coverNode.active = true
            this.bubbleNode.active = true
        }
    }

    update() {
        if (EDITOR) {
            return
        }
        if (this.water.skewAngle == this.node.angle) {
            return
        }
        this.water.skewAngle = this.node.angle
    }

    onCupClicked() {
        if (this.pourStatus) {
            return
        }
        if (this.clickedCallback) {
            this.clickedCallback(this)
        }
    }

    getColorTypeCount() {
        return this.water.getWaterInfos().length
    }

    getTop() {
        let colorIds = this.cupInfo.colorIds;
        let emptyNum = 0;//杯顶的空位有几格
        let topColorId = 0;//杯顶颜色id
        let topColorNum = 0;//杯顶的颜色共有几格
        for (let i = 0; i < SPLIT_COUNT; i++) {//SPLIT_COUNT是杯子的格子数4
            if (colorIds[i] == 0) {
                emptyNum++
                continue
            }

            if (topColorId == 0 || topColorId == colorIds[i]) {//拿到杯子中不为0的格子，以及有几个颜色相同的连续色块
                topColorId = colorIds[i]
                topColorNum++
            } else {
                break
            }
        }
        return {
            emptyNum: emptyNum,
            topColorId: topColorId,
            topColorNum: topColorNum,
            colorHex: WaterColors[topColorId] || "#538849"
        }
    }

    /**
     * 设置倾倒锚点的方法
     * @param isRight 是否为右侧锚点
     */
    public setPourAnchor(isRight: boolean) {
        // 获取节点的内容尺寸
        let contentSize = this.node._uiProps.uiTransformComp.contentSize

        // 初始化一个二维坐标点
        let pt = v2(1, -3)

        // 根据不同的杯子ID设置不同的坐标点
        if (this.cupInfo.cupId == 2 || this.cupInfo.cupId == 8) {
            pt = v2(38, 3)
        } else if (this.cupInfo.cupId >= 3 && this.cupInfo.cupId <= 7 || this.cupInfo.cupId == 4) {
            pt = v2(8, 5)
        } else if (this.cupInfo.cupId == 9) {
            pt = v2(13, 8)
        }

        // 重置坐标点为原点
        //pt = v2(0, 0)

        // 根据是否为右侧锚点调整x坐标
        pt.x = isRight ? (contentSize.width - pt.x) : pt.x//以pt为(0,0)为例，如果是向右倒水，pt.x是杯子的宽度，如果是向左倒水，pt.x是0
        // 调整y坐标
        pt.y = contentSize.height - pt.y//以pt为(0,0)为例，pt.y是杯子的高度

        // 将坐标转换为相对比例
        pt.x = pt.x / contentSize.width
        pt.y = pt.y / contentSize.height//以pt为(0,0)为例，如果向右倒水，pt.x是1，如果向左倒水，pt.x是0， pt.y是1 向右是(1,1) 向左是(0,1)
        // 设置锚点
        this.setAnchor(pt)
    }

    public setNormalAnchor() {
        this.setAnchor(v2(0.5, 0.5))
    }

    /**
     * 设置节点的锚点并调整相关节点的位置
     * @param anchor - 新的锚点位置，类型为Vec2
     */
    private setAnchor(anchor: Vec2) { //向右倒水是(1,1),向左倒水是(0,1)
        // 获取UI变换组件
        let uiTransformComp = this.node._uiProps.uiTransformComp
        // 保存旧的锚点位置
        let oldAnchor = v2(uiTransformComp.anchorPoint)//倒水是(0.5,0.5)-->(1,1)  倒水完成后返回是(1,1)-->(0.5,0.5)
        console.log("保存旧的锚点位置------", oldAnchor, anchor)
        // 获取当前节点的世界坐标位置
        let selfPt = this.node.getPosition()//当前锚点世界坐标  -30,51
        console.log("selfPt当前坐标--", selfPt)
        // 获取水节点的位置
        let waterPt = this.water.node.getPosition()//水的节点
        // 获取图像杯节点的位置
        let imagePt = this.imageCupNode.getPosition()//玻璃瓶的节点
        /* 
        锚点都是指向this.node的中心点，如果是往右边倒，不考虑皮肤适配的情况下，锚点设置在(1.1)，也就是右上角，这时就是锚点右上角的位置在this.node节点的中心， 
        整个锚点框在this.node的左下角没有跟this.node节点重合，offsetPt就是一半的this.node的宽度和高度，也就是(63,257)的一半
        当偏转角度是0时，this.node的位置，实际上是锚点框加上这个(63,257)的一半，也就是(30.5,128.5),使得this.node和锚点框重合，
        this.node的子节点再反向减去这个(63,257)的一半，也就是(30.5,128.5)，使得this.node的子节点和锚点框重合
        所以在执行下面的代码后是看不到效果的，只是锚点变到了右上角，然后修改锚点框的以及子节点的位置使得跟原来的位置一致
        */
        // 设置新的锚点位置
        uiTransformComp.setAnchorPoint(anchor)//向右倒水则设置锚点为(1,1),向左倒水则设置锚点为(0,1)

        // 计算锚点偏移量
        let offsetAnchor = v2(anchor.x - oldAnchor.x, anchor.y - oldAnchor.y)//旧的锚点是(0.5,0.5),像右倒水差值是(0.5,0.5),像左倒水差值是(-0.5,0.5)
        console.log("offsetAnchor偏移量--", offsetAnchor)
        // 计算位置偏移量，考虑UI组件的宽度和高度
        let offsetPt = v2(offsetAnchor.x * uiTransformComp.width, offsetAnchor.y * uiTransformComp.height)
        console.log("计算位置偏移量，考虑UI组件的宽度和高度--", offsetPt)
        // 根据节点角度旋转偏移点
        /*
        为什么需要将偏移量也进行旋转
        前情提要：
        倒水锚点是(0.5,0.5)-->(1,1)  倒水完成后返回锚点是(1,1)-->(0.5,0.5)
        解释：如果锚点不在中心，对节点进行旋转后，节点本身的朝向就已经发生改变，如果不对偏移量进行旋转，直接节点位置加上偏移量，则是在正y轴和正x轴方向处理偏移量，但是此时由于节点的旋转，节点朝向
        已经改变，此时节点并没有对着正y轴和正x轴，而是对着旋转后的朝向，所以对于节点添加的偏移量也需要进行旋转处理。可以使用几个特殊角度来验证一下，比如90度，0度
        */
        offsetPt = rotatePt(offsetPt, this.node.angle)
        console.log("执行rotatePt函数后节点角度旋转偏移点--", offsetPt, this.node.angle)
        // 应用偏移到当前节点位置
        selfPt.x += offsetPt.x
        selfPt.y += offsetPt.y
        this.node.setPosition(selfPt)//像右边倒水x,y是正数   //原始位置是246 0  往右边倒水是276 186
        console.log("应用偏移到当前节点位置--", selfPt)

        // 反向应用偏移到水节点位置
        waterPt.x -= offsetAnchor.x * uiTransformComp.width //water是this.node的子节点，所以只需要算一次偏移量就可以同步在this.node相同的世界位置上
        waterPt.y -= offsetAnchor.y * uiTransformComp.height
        this.water.node.setPosition(waterPt)

        // 反向应用偏移到图像杯节点位置
        imagePt.x -= offsetAnchor.x * uiTransformComp.width
        imagePt.y -= offsetAnchor.y * uiTransformComp.height //将water和imagePt挪动后，整个瓶子又回到了原来的位置，只不过改变了锚点的位置

        // 设置图像杯节点的新位置
        this.imageCupNode.setPosition(imagePt)

    }

    /**获取当前水面的global y坐标 */
    /**
     * 获取水面的垂直位置（Y坐标）
     * @param needAdjust 是否需要调整位置，默认为false
     * @returns 返回水面在世界坐标系中的Y坐标值
     */
    getWaterSurfacePosY(needAdjust = false) {
        // 获取顶部位置信息
        let top = this.getTop();
        // 计算水面位置比例，基于分割数量和空格数量
        let y = (SPLIT_COUNT - top.emptyNum) / SPLIT_COUNT;
        // 确保水面位置不低于最小阈值
        if (y < 0.02) {
            y = 0.02
        } else if (needAdjust) {
            // 如果需要调整，则根据高度因子进行微调
            y -= 1.0 / SPLIT_COUNT * HEIGHT_FACTOR;
        }
        // 应用高度因子
        y *= HEIGHT_FACTOR;
        // 调整中心点偏移
        y -= 0.5;//假如计算出来的是0.2，也就是3个空格块1/4，再乘0.8，水平面在水杯的0.2位置。 这个时候是相当于锚点(0.5,0.5)计算的位置，而水平面的位置应该从杯底开始计算，所以需要减去0.5
        // 创建一个临时向量，用于计算世界坐标
        let pt = v3(0, this.water.node._uiProps.uiTransformComp.height * y, 0);
        // 将局部坐标转换为世界坐标
        pt = this.water.node._uiProps.uiTransformComp.convertToWorldSpaceAR(pt)
        // 返回转换后的世界坐标Y值
        return pt.y
    }

    /**
         * 移动到目标点、旋转瓶子并倒水
         * @param isRight 倾斜角度，向左为正，右为负
         * @param onPourStart 水开始从瓶口流出来
         * @param onPourEnd 本次水倒完了
         */
    private tween: Tween<Node> = null;
    moveToPour(dstPt: Vec3, isRight: boolean, onPourStart: () => void, onPourEnd: () => void) {
        /*
        dstpt是被倒水的坐标加上了被倒水的水杯的高度一半，再转成了layout_h的本地坐标
        isRight是向左倒水还是向右倒水，true是向右，false是向左
        onPourStart在CupManager调用moveToPour时传的是onPourStart.bind(this),
        */

        this.setPourOutCallback(onPourStart, onPourEnd)//onPourStart和onPourEnd是绑定了CupItem上下文环境的，在CupWater执行CupItem上下文的函数,onPourStart在倒水时执行，onPourEnd在接水时执行

        let startAngle = this.water.getPourStartAngle()
        let endAngle = this.water.getPourEndAngle()//startAngle和endAngle分别是开始倒水的角度和将水全部倒出的角度，比如一层倒水给三层就是82.44 和 90
        console.log("开始倒水的角度------------", startAngle, endAngle)

        this.water.onStartPour()//将状态修改为PourAction.out,拿到stopIdx通过infos.length - 1也就是curIdx减去getTopSameColorNum()得到stopIdx，stopIdx倒完这次后还要倒的次数
        console.log("修改划线状态--------------------------")
        if (isRight) {//如果是向右倒水，角度变成负数，负数角度就是顺时针旋转
            startAngle *= -1
            endAngle *= -1
        }

        let moveDur = 0.3
        let pourDur = 0.6

        this.tween = tween(this.node)
            .set({ angle: 0 })
            //.to(moveDur, { position: dstPt })
            .to(moveDur, { position: dstPt, angle: startAngle })//往前倾倒  dstPt是被倒水的坐标，y轴向上增加了半个水杯的高度，拿到dstPt的世界坐标，再转成倒水的那个杯子的父节点的layout_h的本地坐标上(可能倒水的杯子和被倒水的杯子不是同一个layout_h节点)
            //.delay(5)
            .call(() => {
                console.log("来到了dstPt位置---------------准备划线---------")
            })
            .to(pourDur, { angle: endAngle })//往后摆正 计算的是下一层的颜色的水要到杯口的角度
            //.delay(5)
            .call(() => {
                this.tween = null;
            }).start();

        let top = this.getTop();//拿到自身顶层的颜色，num等数据
        console.log("拿到顶层的颜色，num等数据", top)
        let colorIds = this.cupInfo.colorIds //颜色块_height从底部开始， colorId又是从顶部算起
        for (let i = 0; i < SPLIT_COUNT; i++) {//从顶部颜色开始遍历
            let _id = colorIds[i]
            if (_id == 0) {
                continue;
            } else if (top.topColorId == _id) {//顶部相同颜色的水都倒掉了
                colorIds[i] = 0;  //倒水后修改倒水杯中水杯中的数据
            } else {
                break;
            }
        }
    }

    private setPourOutCallback(pourStart, pourEnd) {
        //水开始从瓶口流出来
        const _onStart = function () {
            console.log("_onStart关于调用this是谁-------------", this.name) //如果下面没有bind，this指向的是CupWater， 绑了的话就是指向CupItem
            if (pourStart) {
                pourStart()
            }

        }
        //水倒完了
        const _onFinish = function () {
            if (this.tween) {
                this.tween.stop();
                this.tween = null;
            }
            if (pourEnd) {
                pourEnd()
            }
        }

        this.water.setPourOutCallback(_onStart.bind(this), _onFinish.bind(this));
    }

    //这个函数是dst调用的，也就是被倒水的杯子调用的
    startAddWater(colorId: number, num: number, onComplete: (cup: CupItem, isFInish: boolean) => void) {
        console.log("水流流完了，开始调用startAddWater------------------------", colorId, num)
        if (!this.cupInfo) {
            return
        }

        //onComplate在CupWater脚本中使用onInFInish函数接收了这个函数
        this.setPourInCallback(onComplete);

        let acc = 0;
        /*
            颜色块从水杯顶部开始数组0位置在顶部，_height从底部开始，
            cupInfo.colorIds颜色块从水杯顶部开始，也就是数组0位置在顶部，this.cupInfo又是被倒水的杯子，被倒水的杯子是从底部开始灌水，所以i从3,2,1,0开始倒水
        */
        for (let i = SPLIT_COUNT - 1; i >= 0; i--) {
            if (this.cupInfo.colorIds[i] != 0) {//这层如果有水了就跳过
                continue;
            }
            this.cupInfo.colorIds[i] = colorId;//把src顶部的水颜色赋值给dst本来为0的颜色
            if (++acc == num) {//src顶部需要倒过来的水层数
                break;
            }
        }
        let hex = WaterColors[colorId] || "#538849"
        let outColor = new Color
        Color.fromHEX(outColor, hex)
        this.water.addInfo({
            colorId: colorId,
            height: num / SPLIT_COUNT * HEIGHT_FACTOR, // 层的总数4， 高度因子0.85
            color: outColor
        });

        console.log("水流流后被倒水的的cupInfo----------------", this.cupInfo, this.water.getWaterInfos())
        Engine.audio.playPourWaterEffect(num / SPLIT_COUNT);
    }

    private setPourInCallback(onFinish) {
        //水倒完了
        const _onFinish = function () {
            let isFinished = this.checkIsFinshed()
            // cc.log("-----------isFinished",isFinished)
            if (onFinish) {
                onFinish(this, isFinished)
            }

        }
        this.water?.setPourInCallback(_onFinish.bind(this));
    }

    /**是否完成了（同颜色填满整个杯子） */
    checkIsFinshed() {
        let isFinished = 1;
        let colorIds = this.cupInfo.colorIds;
        let tmpId = null;
        let empTyNum = 0;
        for (let i = 0; i < SPLIT_COUNT; i++) {
            if (tmpId == null) {
                tmpId = colorIds[i]
            }
            if (tmpId != colorIds[i]) {
                isFinished = 0
                break;
            } else if (colorIds[i] == 0) {
                empTyNum++;
            }
        }

        if (empTyNum == SPLIT_COUNT) {
            isFinished = 2;
        }
        //console.log("checkIsFinshed--------------", empTyNum, isFinished)
        return isFinished;//满是 0 1  空是4 2
    }


    /**加水立刻 */
    addWaterImmediately(colorId: number, num: number) {
        let acc = 0;
        for (let i = SPLIT_COUNT - 1; i >= 0; i--) {
            if (this.cupInfo.colorIds[i] != 0) {
                continue;
            }
            this.cupInfo.colorIds[i] = colorId;
            if (++acc == num) {
                break;
            }
        }
        this.initWater();
    }

    /**将顶部的颜色删除num个 */
    removeTopWaterImmediately(num: number) {
        let acc = 0;
        let top = this.getTop();
        let colorIds = this.cupInfo.colorIds;
        for (let i = 0; i < SPLIT_COUNT; i++) {
            let _id = colorIds[i]
            if (_id == 0) {
                continue;
            } else if (top.topColorId == _id) {//顶部相同颜色的水都倒掉了
                colorIds[i] = 0;
                if (++acc >= num) {
                    break
                }
            } else {
                break;
            }
        }
        this.initWater();
        return top;
    }

    onShowFinishAnimation() {
        Engine.audio.playEffect("10002/audio/完成", null, GameInterface.IBundleTypeName.Levels)

        if (this.coverNode) {
            this.coverNode.active = true

            let anim = this.coverNode.getComponent(Animation)
            anim.play()
        }

        if (this.bubbleNode) {
            this.bubbleNode.active = true
        }
    }

    onWaitMove() {

        tween(this.node).to(0.3, { angle: -5 }).to(0.3, { angle: 5 }).union().repeat(3).to(0.15, { angle: 0 }).delay(2).union().repeatForever().start()
    }
}

function rotatePt(pt: Vec2, angle: number) {//将一个点绕原点旋转angle角度,返回旋转后的  第一个参数偏移的锚点量，第二个参数是角度
    let radian = angle2radian(angle);//角度变弧度
    //console.log("对比弧度接口-----", angle2radian(25), math.toRadian(25), angle2radian(-20), math.toRadian(-20), angle2radian(52), math.toRadian(52), math.toRadian(380), math.toRadian(20))
    let ret = v2();
    ret.x = pt.x * Math.cos(radian) - pt.y * Math.sin(radian);
    ret.y = pt.x * Math.sin(radian) + pt.y * Math.cos(radian);
    return ret;
}

function angle2radian(angle: number) {
    while (angle > 360) {
        angle -= 360;
    }
    while (angle < -360) {
        angle += 360;
    }
    return math.toRadian(angle);
    //return (angle % 360) * Math.PI / 180.0;//通过math.toRadian计算超过360度的弧度结果会不一样，比如math.toRadian(380), math.toRadian(20)的结果不一样，但是在参与sin cos这些计算时，380和20的角度结果应该是一样的，所以需要做一下处理
}