import { _decorator, color, Color, Component, Node, tween, Tween, UITransform, v3, Vec3 } from 'cc';
import { CupTopInfo, HEIGHT_FACOR, ICupInfo, SPLIT_COUNT, WATERCOLORS, WaterInfo } from './playerData';
import { CupWater } from './CupWater';
import { EDITOR } from 'cc/env';
import { transform } from 'typescript';
const { ccclass, property } = _decorator;

@ccclass('CupItem')
export class CupItem extends Component {

    @property(CupWater)
    water: CupWater = null

    @property({ type: Node, tooltip: '水杯最外层玻璃壁' })
    imageCupNode: Node = null

    @property({ type: Node, tooltip: '水杯瓶盖' })
    coverNode: Node = null

    @property(Node)
    bubbleNode: Node = null

    @property(Node)
    waterOutTargetNode: Node = null

    cupInfo: ICupInfo
    clickCupCallback: Function
    originPoint: Vec3
    pourStatus = false

    protected onLoad(): void {
        this.bubbleNode.active = false
    }

    start() {

    }

    onSetCupItemInfo(cupInfo: ICupInfo, clickCupCallback: Function) {
        this.cupInfo = cupInfo
        this.clickCupCallback = clickCupCallback
        this.initWaterColor()
        this.reset()
    }

    reset() {
        this.node.angle = 0
        this.water.skewAngle = 0
    }

    initWaterColor() {
        /*
            keywaterConfig数据结构：[{"colorIds":[1,2,3,4],"cupId":1},{"colorIds":[1,2,3,4],"cupId":1}]
            keywaterAction数据结构：[{ "from": 4, "to": 5, "colorId": 7,  "num": 2 }, { "from": 4, "to": 5, "colorId": 7,  "num": 2 }] 
        */
        let arr: WaterInfo[] = []
        //从水杯底部进行遍历
        for (let i = SPLIT_COUNT - 1; i >= 0; i--) {
            let colorId = this.cupInfo.colorIds[i]
            if (colorId == 0) {
                continue
            }
            let lastObj = arr[arr.length - 1]
            //height从水杯底部开始计算，如果该层水颜色和上层水颜色一样，只累加height不push新的对象，否则push新的对象
            if (!lastObj || lastObj.colorId != colorId) {
                arr.push({ height: 1 / SPLIT_COUNT, colorId: colorId, color: new Color() })
            } else {
                lastObj.height += 1 / SPLIT_COUNT
            }
        }

        arr.forEach((obj) => {
            let hex = WATERCOLORS[obj.colorId] || '#000000'
            Color.fromHEX(obj.color, hex)
            obj.height = obj.height * HEIGHT_FACOR
        })
        console.log("waterInfo每个水杯中各层水的colorId以及它所占的高度比例------", arr)
        this.water.initInfos(arr)
        let isFinished = this.onCheckFinished()
        if (isFinished == 1) {
            this.coverNode.active = true
            this.bubbleNode.active = false
        }
    }

    update(deltaTime: number) {
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
        if (this.clickCupCallback) {
            this.clickCupCallback(this)
        }
    }

    onCheckFinished(): number {
        let isFinished = 1
        let colorIds = this.cupInfo.colorIds
        let tmpId = null
        let emptyNum = 0
        for (let i = 0; i < SPLIT_COUNT; i++) {
            if (tmpId == null) {
                tmpId = colorIds[i]
            }
            //遇到杯中还有颜色的情况说明还没有倒完isFinished为0,遇到空杯的情况isFinished为2,全部为同色的话isFinished为1
            if (tmpId != colorIds[i]) {
                isFinished = 0
                break
            } else if (colorIds[i] == 0) {
                emptyNum++
            }
        }
        if (emptyNum == SPLIT_COUNT) {
            isFinished = 2
        }
        return isFinished
    }

    getCupTopInfo(): CupTopInfo {
        let colorIdArray = this.cupInfo.colorIds
        let emptyNum = 0
        let topColorId = 0
        let topSameColorNum = 0
        for (let i = 0; i < SPLIT_COUNT; i++) {
            if (colorIdArray[i] == 0) {
                emptyNum++
                continue
            }
            if (topColorId == 0 || topColorId == colorIdArray[i]) {
                //顶部元素需要排除掉0元素
                topColorId = colorIdArray[i]
                topSameColorNum++
            } else {
                break
            }
        }
        return { emptyNum: emptyNum, topColorId: topColorId, topSameColorNum: topSameColorNum, colorHex: WATERCOLORS[topColorId] || '#000000' }
    }

    getWaterSurfacePosY(needAdjust = false) {
        let top = this.getCupTopInfo()
        let y = (SPLIT_COUNT - top.emptyNum) / SPLIT_COUNT
        if (y < 0) {
            y = 0
        } else if (needAdjust) {
            y -= 1 / SPLIT_COUNT * HEIGHT_FACOR
        }
        y *= HEIGHT_FACOR
        y -= 0.5
        let pt = v3(0, this.water.node.getComponent(UITransform).height * y, 0)
        pt = this.water.node.getComponent(UITransform).convertToWorldSpaceAR(pt)
        return pt.y
    }

    setPourOutCallback(onPourStart: () => void, onPourFinish: () => void) {
        const _onStart = function () {
            if (onPourStart) {
                onPourStart()
            }
        }

        let self = this
        const _onFinish = function () {
            if (self.twAction) {
                self.twAction.stop()
                self.twAction = null
            }
            if (onPourFinish) {
                onPourFinish()
            }
        }
        this.water.setPourOutCallback(_onStart, _onFinish)
    }

    private twAction: Tween<Node> = null
    moveToPour(targetCup: CupItem, targetPos: Vec3, isRight: boolean, onPourStart: () => void, onPourFinish: () => void) {

        this.setPourOutCallback(onPourStart, onPourFinish)
        let startAngle = this.water.getPourStartAngle()
        let endAngle = this.water.getPourEndAngle()
        //这里把状态修改为PourAction.out
        this.water.onStartPour()
        if (isRight) {
            startAngle *= -1
            endAngle *= -1
        }
        let moveTime = 0.4
        let pourTime = 0.6
        /*
            原来的方法是修改this.node的锚点，使得锚点就是出水口,现在在targetCup节点上添加一个标记点，this.node只移动到标记点位置,使得this.node的出水口可以对着targetCup的入水口，会简单一点
        */
        let waterOutPos = targetCup.waterOutTargetNode.getPosition()

        let offsetY = this.node.getComponent(UITransform).width / 2 + this.node.getComponent(UITransform).height / 2
        let offsetX = isRight ? -this.node.getComponent(UITransform).height / 2 : this.node.getComponent(UITransform).height / 2

        waterOutPos = waterOutPos.add(new Vec3(offsetX, offsetY, 0))
        targetCup.waterOutTargetNode.setPosition(waterOutPos)

        let worldPos = targetCup.waterOutTargetNode.getWorldPosition()
        let localPos = this.node.parent.getComponent(UITransform).convertToNodeSpaceAR(worldPos)

        //倒水杯子从当前位置移动到目标位置倾斜，并且倒完水，时间在moveTime+pourTime之和 1秒钟
        this.twAction = tween(this.node).set({ angle: 0 }).to(moveTime, { position: localPos, angle: startAngle })
            .to(pourTime, { angle: endAngle })
            .call(() => {
                this.twAction = null
            })
            .start()

        let top = this.getCupTopInfo()
        let colorIds = this.cupInfo.colorIds
        //给倒水的StartCup删除颜色数据
        for (let i = 0; i < SPLIT_COUNT; i++) {
            let _id = colorIds[i]
            if (_id == 0) {
                continue
            } else if (top.topColorId == _id) {
                colorIds[i] = 0
            } else {
                break
            }
        }

        //给被倒水的targetCup添加颜色数据
        let pourWaterCount = 0
        for (let i = SPLIT_COUNT - 1; i >= 0; i--) {
            if (targetCup.cupInfo.colorIds[i] != 0) {
                continue
            }
            targetCup.cupInfo.colorIds[i] = top.topColorId
            pourWaterCount++
            if (pourWaterCount == top.topSameColorNum) {
                break
            }
        }
    }

    //startAddWater是targetCup调用
    startAddWater(colorId: number, num: number) {
        // if (!this.cupInfo) {
        //     return
        // }
        // let pourWaterCount = 0

        // //给被倒水的targetCup添加颜色数据
        // for (let i = SPLIT_COUNT - 1; i >= 0; i--) {
        //     if (this.cupInfo.colorIds[i] != 0) {
        //         continue
        //     }
        //     this.cupInfo.colorIds[i] = colorId
        //     pourWaterCount++
        //     if (pourWaterCount == num) {
        //         break
        //     }
        // }
        let hex = WATERCOLORS[colorId] || '#000000'
        let outColor = new Color
        Color.fromHEX(outColor, hex)
        //这里把状态修改为PourAction.in
        this.water.addWaterStart({ colorId: colorId, height: num / SPLIT_COUNT * HEIGHT_FACOR, color: outColor })
    }

    rollBackAddWater(colorId: number, num: number) {
        let count = 0
        for (let i = SPLIT_COUNT - 1; i >= 0; i--) {
            if (this.cupInfo.colorIds[i] != 0) {
                continue
            }
            this.cupInfo.colorIds[i] = colorId
            count++
            if (count == num) {
                break
            }
        }
        this.initWaterColor()
    }

    rollBackSubWater(colorId: number, num: number) {
        //减少的时候需要额外判断是不是已经成型
        if (this.onCheckFinished() == 1) {
            this.bubbleNode.active = false
            this.coverNode.active = false
        }

        let count = 0
        let colorIds = this.cupInfo.colorIds
        for (let i = 0; i < SPLIT_COUNT; i++) {
            let _colorId = colorIds[i]
            if (_colorId == 0) {
                continue
            } else if (colorId == _colorId) {
                colorIds[i] = 0
                count++
                if (count >= num) {
                    break
                }
            } else {
                break
            }
        }
        this.initWaterColor()
    }
}

