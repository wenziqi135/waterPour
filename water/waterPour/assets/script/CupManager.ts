import { _decorator, Color, Component, Graphics, instantiate, Layout, Node, Prefab, tween, Tween, UITransform, v3, Vec3, view } from 'cc';
import { Action, colCount, CupTopInfo, Event_GameLevelOver, Event_GameLevelSuccess, ICupInfo, lineWidth, playerData, SPLIT_COUNT } from './playerData';
import { CupItem } from './CupItem';
import { escapeLeadingUnderscores } from 'typescript';
const { ccclass, property } = _decorator;

@ccclass('CupManager')
export class CupManager extends Component {

    @property(Node)
    insLayout_h: Node

    @property([Prefab])
    cupItemPrefabs: Prefab[] = []

    contentNode: Node
    lineGraphics: Graphics
    curLevel: number
    playerData: playerData

    private cupItems: CupItem[]
    private cupConfigs: ICupInfo[] = []
    private cupSkinId: number
    private _isCompleteSuccess = false
    private _action: Action[] = []
    private selectCupItem: CupItem
    start() {

    }

    onGameStart() {
        this._isCompleteSuccess = false
        this.cupItems = []
        this.cupConfigs = []
        this.cupSkinId = this.playerData.key_water_skin_id
        this.selectCupItem = null
        this.lineGraphics.clear()
        this.initCupConfigs()
        this.onCreateCups()
        this.onCheckSuccess()
    }

    initCupConfigs() {

        /*
        keywaterConfig数据结构：[{"colorIds":[1,2,3,4],"cupId":1},{"colorIds":[1,2,3,4],"cupId":1}]
        keywaterAction数据结构：[{ "from": 4, "to": 5, "colorId": 7,  "num": 2 }, { "from": 4, "to": 5, "colorId": 7,  "num": 2 }] 
        */

        let keywaterConfig = this.playerData.key_water_config
        let waterlevelConfig: number[] = []
        if (keywaterConfig) {
            this.cupConfigs = JSON.parse(keywaterConfig) as ICupInfo[] //   colorIds: number[]  cupId: number
        } else {
            waterlevelConfig = this.playerData.water_levelConfigs[this.curLevel - 1]
            for (let i = 0; i < waterlevelConfig.length; i += 4) {
                let singtonCupInfo: ICupInfo = {
                    colorIds: [waterlevelConfig[i], waterlevelConfig[i + 1] || 0, waterlevelConfig[i + 2] || 0, waterlevelConfig[i + 3] || 0],
                    cupSkinId: this.cupSkinId,
                }
                this.cupConfigs.push(singtonCupInfo)
            }
        }
        let actionStr = this.playerData.key_water_action
        if (actionStr) {
            this._action = JSON.parse(actionStr)
        }

        console.log("this.cupConfigs一个数组，里面每个元素代表一个水杯，水杯又包含一个colorIds数组，由从杯顶到杯底的各层颜色组成，空层用0表示----------", this.cupConfigs)
    }

    onCreateCups() {
        this.contentNode.destroyAllChildren()
        let cupCount = this.cupConfigs.length
        for (let i = 0; i < cupCount; i++) {
            let cupNode = instantiate(this.cupItemPrefabs[this.cupSkinId - 1])
            let cupItem = cupNode.getComponent(CupItem)
            cupItem.node.parent = this.node
            cupItem.onSetCupItemInfo(this.cupConfigs[i], this.onClickCup.bind(this))
            this.cupItems.push(cupItem)
        }

        for (let i = 0; i < this.cupItems.length; i++) {
            this.cupItems[i].node.parent = this.contentNode
        }

        this.contentNode.setScale(1, 1, 1)
        if (this.cupItems.length > 8) {
            this.contentNode.setScale(0.8, 0.8, 0.8)
        }
        this.lineGraphics.lineWidth = lineWidth

        let rowCount = Math.ceil(cupCount / colCount)
        let cupSize = this.cupItems[0].node.getComponent(UITransform).contentSize
        for (let i = 0; i < rowCount; i++) {
            let insLayout_h = instantiate(this.insLayout_h)
            insLayout_h.parent = this.contentNode
            insLayout_h.getComponent(UITransform).height = cupSize.height
            for (let j = 0; j < colCount; j++) {
                let idx = j + i * colCount
                if (!this.cupItems[idx]) {
                    break
                }
                this.cupItems[idx].node.parent = insLayout_h
            }
            insLayout_h.getComponent(Layout).spacingX = 60
        }

        this.contentNode.getComponent(Layout).enabled = true
        this.contentNode.getComponent(Layout).spacingY = 60

        //更新布局后再关掉layout组件，不然移动水杯时会更新布局
        for (let i = 0; i < this.contentNode.children.length; i++) {
            let layout = this.contentNode.children[i].getComponent(Layout)
            layout.updateLayout()
            layout.enabled = false
        }
        this.contentNode.getComponent(Layout).updateLayout()
        this.contentNode.getComponent(Layout).enabled = false

        for (let i = 0; i < this.cupItems.length; i++) {
            this.cupItems[i].originPoint = this.cupItems[i].node.getPosition()
        }
    }

    addNewCup() {
        if (this.isCupPouring()) {
            return
        }

        this.selectCupItem = null
        let cupNode = instantiate(this.cupItemPrefabs[this.cupSkinId - 1])
        let cupItem = cupNode.getComponent(CupItem)

        if (this.cupItems.length % colCount == 0) {
            let cupSize = this.cupItems[0].node.getComponent(UITransform).contentSize
            let insLayout_h = instantiate(this.insLayout_h)
            insLayout_h.parent = this.contentNode
            insLayout_h.getComponent(UITransform).height = cupSize.height
            cupItem.node.parent = insLayout_h
        } else {
            for (let i = 0; i < this.contentNode.children.length; i++) {
                const layout_h = this.contentNode.children[i]
                if (layout_h.children.length < colCount) {
                    cupItem.node.parent = layout_h
                    break
                }
            }
        }

        //添加新的数据与节点
        this.cupItems.push(cupItem)
        this.cupConfigs.push({ colorIds: [0, 0, 0, 0], cupSkinId: this.cupSkinId })
        this.playerData.key_water_config = JSON.stringify(this.cupConfigs)
        cupItem.onSetCupItemInfo(this.cupConfigs[this.cupConfigs.length - 1], this.onClickCup.bind(this))

        let layout_hs = this.contentNode.getComponentsInChildren(Layout)
        for (let i = 0; i < layout_hs.length; i++) {
            let layout_h = layout_hs[i]
            layout_h.spacingX = 60
            layout_h.enabled = true
            layout_h.updateLayout()
            layout_h.enabled = false
        }
        this.contentNode.getComponent(Layout).enabled = true
        this.contentNode.getComponent(Layout).updateLayout()
        this.contentNode.getComponent(Layout).enabled = false

        this.contentNode.setScale(1, 1, 1)
        if (this.cupItems.length > 8) {
            this.contentNode.setScale(0.8, 0.8, 0.8)
        }
        this.lineGraphics.lineWidth = lineWidth

        //重新获取下cupItem的坐标
        for (let i = 0; i < this.cupItems.length; i++) {
            this.cupItems[i].originPoint = this.cupItems[i].node.getPosition()
        }

    }

    update(deltaTime: number) {

    }

    onClickCup(cupItem: CupItem) {
        Tween.stopAllByTarget(cupItem.node)
        let finishStatus = cupItem.onCheckFinished()
        if (finishStatus == 1) {
            this._isCompleteSuccess = true
            //杯子已满，震动
            return
        }

        if (this.selectCupItem) {
            if (this.selectCupItem == cupItem) {
                //再次点击同一个杯子，取消选中
                this.pickupCupItem(this.selectCupItem, false)
                this.selectCupItem = null
            } else {
                if (this.checkCanPour(this.selectCupItem, cupItem)) {
                    this.startPour(this.selectCupItem, cupItem)
                } else {
                    this.pickupCupItem(this.selectCupItem, false)
                    this.selectCupItem = null
                }
            }

        } else {
            //初次点击杯子
            this.selectCupItem = cupItem
            this.pickupCupItem(this.selectCupItem, true)
        }
    }

    isCupPouring() {
        for (let i = 0; i < this.cupItems.length; i++) {
            if (this.cupItems[i].pourStatus) {
                return true
            }
        }
        return false
    }

    getCupItemCount() {
        return this.cupItems.length
    }

    getActionLength() {
        return this._action.length
    }

    getSelectCupItem() {
        return this.selectCupItem
    }

    pickupCupItem(cupItem: CupItem, isPickup: boolean, callBack?: Function) {
        let originPoint = cupItem.originPoint
        tween(cupItem.node).stop()
        if (isPickup) {
            tween(cupItem.node).to(0.2, { position: v3(originPoint.x, originPoint.y + 80, originPoint.z) }, { easing: 'quadOut' }).start()
        } else {
            tween(cupItem.node).to(0.2, { position: v3(originPoint.x, originPoint.y, originPoint.z) }, { easing: 'quadIn' })
                .call(() => {
                    if (callBack) {
                        callBack()
                    }
                })
                .start()
        }
    }

    checkCanPour(startCup: CupItem, targetCup: CupItem) {
        let startTop = startCup.getCupTopInfo()
        let targetTop = targetCup.getCupTopInfo()
        if (startTop.topColorId == 0) {
            //空杯子
            return false
        }
        if (targetTop.topColorId != 0 && startTop.topColorId != targetTop.topColorId) {
            //targetCup有水且两杯的顶层颜色不同
            return false
        }
        return startTop.topSameColorNum <= targetTop.emptyNum
    }

    private cupInfoo = null
    startPour(startCup: CupItem, targetCup: CupItem) {
        startCup.pourStatus = true
        targetCup.pourStatus = true

        let startTranform = startCup.node.getComponent(UITransform)
        let targetTransform = targetCup.node.getComponent(UITransform)

        let startLayout_h = startCup.node.parent.getComponent(UITransform)
        let targetLayout_h = targetCup.node.parent.getComponent(UITransform)

        startLayout_h.node.setSiblingIndex(10)
        startCup.node.setSiblingIndex(10)

        let targetCupWoldPos = targetCup.node.getWorldPosition()
        let viewSize = view.getVisibleSize()
        let isRight = targetCupWoldPos.x > viewSize.width / 2
        //如果被倒的杯子在屏幕中间，则判断倒水的杯子在左边还是右边
        if (Math.abs(targetCupWoldPos.x - viewSize.width / 2) < 10) {
            let startCupWoldPos = startCup.node.getWorldPosition()
            isRight = startCupWoldPos.x < viewSize.width / 2
        }
        let targetPos = targetCup.node.getPosition()
        targetPos.y += 140
        //将在targetLayout_h这个参考系下的targetPos转换成世界坐标,意思是targetPos是相对于targetLayout_h的坐标,请使用convertToWorldSpaceAR来转换成世界坐标
        targetPos = targetLayout_h.convertToWorldSpaceAR(targetPos)

        //再将这个世界坐标转到startCup父节点下坐标系的本地坐标
        targetPos = startLayout_h.convertToNodeSpaceAR(targetPos)

        let startCupTop = startCup.getCupTopInfo()

        //数据在划线前就已经发生改变，先拿到没改变的数据
        let tempTargetCupInfo = {
            colorIds: [...targetCup.cupInfo.colorIds],
            cupSkinId: targetCup.cupInfo.cupSkinId
        }
        let tempTarget = instantiate(targetCup.node)
        tempTarget.parent = targetCup.node.parent
        tempTarget.active = false
        tempTarget.getComponent(CupItem).cupInfo = tempTargetCupInfo

        const onPourStart = () => {
            //拿到startCup的流水标记坐标
            let waterOutTargetNode = startCup.waterOutTargetNode
            let waterOutPos = waterOutTargetNode.getPosition()

            let offsetY = startCup.node.getComponent(UITransform).height / 2
            let offsetX = isRight ? startCup.node.getComponent(UITransform).width / 2 : -startCup.node.getComponent(UITransform).width / 2
            waterOutPos = waterOutPos.add(v3(offsetX, offsetY, 0))

            waterOutTargetNode.setPosition(waterOutPos)
            let worldPos = waterOutTargetNode.getWorldPosition()

            let endWorldPt = v3(worldPos.x, tempTarget.getComponent(CupItem).getWaterSurfacePosY())
            tempTarget.destroy()

            //graphics节点在this.contentNode下，所以需要转换成contentNode的本地坐标
            let localStartPos = this.contentNode.parent.getComponent(UITransform).convertToNodeSpaceAR(worldPos)
            let localEndPos = this.contentNode.parent.getComponent(UITransform).convertToNodeSpaceAR(endWorldPt)

            let outColor = new Color
            Color.fromHEX(outColor, startCupTop.colorHex)
            this.lineGraphics.strokeColor = outColor
            this.playFlowWaterLine(startCup, targetCup, startCupTop, localStartPos, localEndPos, 0.6, false)
        }

        //杯子放回原处 
        const onPourFinish = () => {
            tween(startCup.node).delay(0.2).to(0.5, { position: startCup.originPoint, angle: 0 }, { easing: 'quadOut' })
                .delay(0.2)
                .call(() => {
                    let startWaterOut = startCup.waterOutTargetNode
                    let targetWaterOut = targetCup.waterOutTargetNode
                    startWaterOut.setPosition(0, 0, 0)
                    targetWaterOut.setPosition(0, 0, 0)
                    startCup.node.setSiblingIndex(0)
                    startLayout_h.node.setSiblingIndex(0)
                    startCup.pourStatus = false
                    targetCup.pourStatus = false
                    this.onCheckSuccess()
                })
                .start()
        }

        this.selectCupItem = null
        startCup.moveToPour(targetCup, targetPos, isRight, onPourStart, onPourFinish)
    }

    private pointTween: Tween<Vec3>
    playFlowWaterLine(startCup: CupItem, targetCup: CupItem, startCupTop: CupTopInfo, startPos: Vec3, endPos: Vec3, duration: number, isTail: boolean) {
        this.lineGraphics.clear()
        let orginPoint = v3(startPos)
        if (isTail) {
            orginPoint = v3(endPos)
        }

        let lineGraphics = this.lineGraphics

        this.pointTween = tween(startPos).to(duration, endPos, {
            onUpdate: (changedV3: Vec3, ratio: number) => {
                lineGraphics.clear()
                //发现使用waterOut标记点的方法后，waterOut标记点的坐标会随着杯子移动而移动,所以起始点需要实时拿到点
                let startWaterOut = startCup.waterOutTargetNode
                let orginWorldPoint = startWaterOut.getWorldPosition()
                let localPos = this.contentNode.parent.getComponent(UITransform).convertToNodeSpaceAR(orginWorldPoint)

                lineGraphics.moveTo(localPos.x, localPos.y)
                lineGraphics.lineTo(localPos.x, changedV3.y)
                lineGraphics.stroke()
            },
            onComplete: () => {
                let startWaterOut = startCup.waterOutTargetNode
                let orginWorldPoint = startWaterOut.getWorldPosition()
                let localPos = this.contentNode.parent.getComponent(UITransform).convertToNodeSpaceAR(orginWorldPoint)
                tween(startPos).set(localPos).delay(duration / 2).to(duration / 2, endPos, {
                    onUpdate: (changedV3: Vec3, ratio: number) => {
                        lineGraphics.clear()
                        lineGraphics.moveTo(localPos.x, changedV3.y)
                        lineGraphics.lineTo(localPos.x, endPos.y)
                        lineGraphics.stroke()
                    },
                    onComplete: () => {
                        //水流线段全部流完后，盖盖子，记录数据到本地
                        this.onPourOutFinish(startCup, targetCup, startCupTop)
                    }
                })
                    .start()

                targetCup.startAddWater(startCupTop.topColorId, startCupTop.topSameColorNum)

            },

        }).start()
    }

    onPourOutFinish(startCup: CupItem, targetCup: CupItem, startCupTop: CupTopInfo) {
        let fromCupIdx = this.cupItems.indexOf(startCup)
        let toCupIdx = this.cupItems.indexOf(targetCup)
        this._action.push({
            from: fromCupIdx,
            to: toCupIdx,
            colorId: startCupTop.topColorId,
            num: startCupTop.topSameColorNum
        })

        if (targetCup.onCheckFinished() == 1) {
            tween(targetCup.coverNode).set({ position: v3(targetCup.coverNode.getPosition().x, targetCup.coverNode.getPosition().y + 200, 0) })
                .call(() => {
                    targetCup.coverNode.active = true
                })
                .delay(0.6)
                .to(0.5, { position: v3(targetCup.coverNode.getPosition().x, targetCup.coverNode.getPosition().y, 0) }, { easing: 'quadOut' })
                .start()

            targetCup.bubbleNode.active = true
        }

        this.playerData.key_water_config = JSON.stringify(this.cupConfigs)
        this.playerData.key_water_action = JSON.stringify(this._action)
    }

    onCheckSuccess() {
        if (this._isCompleteSuccess) {
            return
        }
        let isAllFinished = true
        for (let cupItem of this.cupItems) {
            if (!cupItem.onCheckFinished()) {
                isAllFinished = false
                break
            }
        }
        if (isAllFinished) {
            this.node.emit(Event_GameLevelSuccess)
        } else {
            let nextCanMoveCup = this.onCheckNextMoveCup()
            if (nextCanMoveCup) {
                this.node.emit(Event_GameLevelOver, false)
            } else {
                this.node.emit(Event_GameLevelOver, true)
            }

        }

    }

    rollBackStepAction() {
        if (this._action.length == 0) {
            return
        }
        let action: Action = this._action.pop()
        let fromCup = this.cupItems[action.from]
        let toCup = this.cupItems[action.to]

        fromCup.rollBackAddWater(action.colorId, action.num)
        toCup.rollBackSubWater(action.colorId, action.num)

        this.playerData.key_water_config = JSON.stringify(this.cupConfigs)
        this.playerData.key_water_action = JSON.stringify(this._action)
    }

    onCheckNextMoveCup(): CupItem {
        let nextCanMoveCup: CupItem = null
        for (let i = 0; i < this.cupItems.length; i++) {
            const iCupItem = this.cupItems[i];
            for (let j = 0; j < this.cupItems.length; j++) {
                const jCupItem = this.cupItems[j];
                if (iCupItem != jCupItem) {
                    let iTop = iCupItem.getCupTopInfo()
                    let jTop = jCupItem.getCupTopInfo()
                    if (jTop.emptyNum == 4) {
                        nextCanMoveCup = iCupItem
                        break
                    }
                    if (iTop.topColorId == jTop.topColorId && (iTop.emptyNum > 0 && jTop.emptyNum > 0)) {
                        nextCanMoveCup = iCupItem
                        break
                    }
                }
            }
            if (nextCanMoveCup) {
                break
            }
        }
        return nextCanMoveCup
    }
}

