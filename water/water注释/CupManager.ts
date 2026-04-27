/*
 * @Author: Mr.Hong
 * @Date: 2023-02-07 15:03:33
 * @File: CupManager.ts
*/

import { __private, _decorator, AsyncDelegate, color, Color, Component, dragonBones, EventTouch, Graphics, instantiate, Label, Layout, Node, NodeEventType, Prefab, random, sp, Tween, tween, UI, UITransform, v2, v3, Vec3, view, Widget } from 'cc';
import { UIBase } from '../core/gui/UIBase';
import { CupItem } from './CupItem';
import { GameUIEvent } from '../core/common/event/EventEnum';
import { GameInterface } from '../config/GameInterface';
import { ConfigManager } from '../config/ConfigManager';
import { Engine } from '../core/Engine';
import { StorageUtils } from '../utils/StorageUtils';
import { CommonUtils } from '../utils/CommonUtils';
import { findConfigFile } from 'typescript';

const { ccclass, property } = _decorator;

const flowWidth = 8
const colCount = 8

interface Action {
    from: number,
    to: number,
    num: number,
    colorId: number,
}

@ccclass('CupManager')
export class CupManager extends UIBase {

    @property([Prefab])
    cupItemPrefabs: Prefab[] = []

    contentNode: Node
    lineGraphics: Graphics
    curLevel: number

    private cupItems: CupItem[]
    private cupConfigs: GameInterface.ICupInfo[]
    private cupSkinId: number
    onGameStart() {
        console.log("CupManager-----onGameStart")
        this._isCompleteSuccess = false
        this.cupItems = []
        this.cupConfigs = []
        this.cupSkinId = StorageUtils.getNumber(StorageUtils.KEY_WATER_SKIN_ID, 1)
        this.lineGraphics.clear()
        this.initCupConfigs()
        this.onCreateCups()

        this.scheduleOnce(this.onShakeCupItemWhenNoMove, 5)//5秒后摇晃杯子给提示

        this.scheduleOnce(() => {
            this.onCheckSuccess()
        }, 0.1)
    }

    onCheckDieGame() {
        let nextMoveItem = this.onGetNextMoveCupItem()

        if (!nextMoveItem) {
            this.node.emit(GameUIEvent.EVENT_WATER_DIE_GAME, true)
        } else {
            this.node.emit(GameUIEvent.EVENT_WATER_DIE_GAME, false)
        }
    }

    onGetNextMoveCupItem() {
        let findMovingItem: CupItem
        for (let i = 0; i < this.cupItems.length; i++) {
            const aCupItem = this.cupItems[i]

            for (let j = 0; j < this.cupItems.length; j++) {
                const bCupItem = this.cupItems[j]

                if (aCupItem != bCupItem) {

                    let aTop = aCupItem.getTop()
                    let bTop = bCupItem.getTop()

                    if (bTop.emptyNum == 4) {
                        findMovingItem = aCupItem
                        break
                    }

                    if ((aTop.topColorId == bTop.topColorId) && (aTop.emptyNum || bTop.emptyNum)) {
                        findMovingItem = aCupItem
                        break
                    }


                }

            }

            if (findMovingItem) {
                break
            }

        }

        return findMovingItem

    }

    onShakeCupItemWhenNoMove() {
        if (this._isCompleteSuccess) {
            return
        }

        let nextMoveItem = this.onGetNextMoveCupItem()

        if (nextMoveItem) {
            nextMoveItem.onWaitMove()//做摇晃动作
        }
    }

    private initCupConfigs() {
        let configStr = StorageUtils.getStrData(StorageUtils.KEY_WATER_CONFIG, "")//初始和结束时是空的，有了倒水动作后才有数据，进游戏就有这个数据

        let cupConfig: number[] = []
        if (configStr) {
            this.cupConfigs = JSON.parse(configStr) as GameInterface.ICupInfo[]//数组0的位置表示最上面的位置

            for (let i = 0; i < this.cupConfigs.length; i++) {
                const cupConfig = this.cupConfigs[i]
                cupConfig.cupId = this.cupSkinId
            }
        } else {
            //如果没有本地保存的当前关卡的进度，则从配置表里读取
            cupConfig = ConfigManager.waterLevelConfigs[this.curLevel - 1]

            let acc = 0

            let cupMap = {}//记录每种颜色杯子的数量
            while (acc < cupConfig.length) {
                let cupInfo: GameInterface.ICupInfo = {
                    colorIds: [cupConfig[acc], cupConfig[acc + 1] || 0, cupConfig[acc + 2] || 0, cupConfig[acc + 3] || 0],
                    cupId: this.cupSkinId,
                }
                this.cupConfigs.push(cupInfo)


                for (let j = 0; j < cupInfo.colorIds.length; j++) {
                    const colorId = cupInfo.colorIds[j]
                    if (!cupMap[colorId]) {
                        cupMap[colorId] = 0
                    }
                    cupMap[colorId]++
                }
                acc += 4
            }
        }

        let actionStr = StorageUtils.getStrData(StorageUtils.KEY_WATER_ACTION, "")

        if (actionStr) {
            this._actions = JSON.parse(actionStr)
        }


    }

    private createLayout(parent: Node, name?: string) {
        let node = new Node(name)
        node.parent = parent
        let layout = node.addComponent(Layout)
        layout.type = Layout.Type.HORIZONTAL
        layout.resizeMode = Layout.ResizeMode.CONTAINER
        return layout
    }

    onCreateCups() {
        console.log("CupManager-----onCreateCups")
        this.contentNode.destroyAllChildren()

        let cupCount = this.cupConfigs.length

        for (let i = 0; i < cupCount; i++) {
            let cupNode = instantiate(this.cupItemPrefabs[this.cupSkinId - 1])//通过skinId直接创建预制体
            let cupItem = cupNode.getComponent(CupItem)
            cupItem.node.parent = this.node
            cupItem.onSetCupItemInfo(this.cupConfigs[i], this.onClickCup.bind(this))//将水杯颜色数据和点击事件传给CupItem
            this.cupItems.push(cupItem)//先创建预制体放在this.node下
        }

        for (let i = 0; i < this.cupItems.length; i++) {
            this.cupItems[i].node.parent = this.contentNode//把this.node下的预制体移到this.contentNode下
        }


        this.onReScaleContentNode()//设置杯子的缩放，水流其实就是lineGraphics画的线

        let spaceX = this.getSpaceX()// 60
        let rowCount = Math.ceil(cupCount / colCount)//一行最多有8个水杯，向上取整
        let cupSize = this.cupItems[0].node.getComponent(UITransform).contentSize//获取水杯的尺寸

        for (let i = 0; i < rowCount; i++) {//rowCount是行数,最大是两行

            let layout_h = this.createLayout(this.contentNode, "layout_h")//在contentNode下创建水平布局，把content下的预制体又放到layout_h下，contentNode下还有个垂直布局用来放第二行的layout_h
            layout_h.getComponent(UITransform).height = cupSize.height

            for (let j = 0; j < colCount; j++) {//colCount是列数，最大是8
                let idx = j + i * colCount//idx是水杯的索引，从0开始
                if (!this.cupItems[idx]) {
                    break
                }

                this.cupItems[idx].node.parent = layout_h.node//根据rowCount的值，把水杯放到第一行或第二行的layout_h里
            }

            layout_h.spacingX = spaceX//layout_h的子节点的水平间距
        }

        let layout_v = this.contentNode.getComponent(Layout)//contentNode也有layout组件，用来对layout_h进行垂直布局
        layout_v.enabled = true
        layout_v.spacingY = 60

        let layouts = this.contentNode.getComponentsInChildren(Layout)
        layouts.forEach(layout => {//更新布局后再关掉layout组件，不然移动水杯时会更新布局
            layout.updateLayout()
            layout.enabled = false
        })

        layout_v.updateLayout()
        layout_v.enabled = false


        for (let i = 0; i < this.cupItems.length; i++) {
            this.cupItems[i].orginPoint = this.cupItems[i].node.getPosition()//拿到布局后，记录水杯的初始位置
        }

    }

    private getSpaceX(): number {
        let spaceX = 40
        return spaceX + 20

    }

    private onReScaleContentNode() {
        let cupCount = this.cupItems.length
        let scale = 1
        if (cupCount > 8) {
            scale = 0.75
        }
        this.contentNode.setScale(scale, scale, scale)

        this.lineGraphics.lineWidth = flowWidth * scale
    }

    private selected: CupItem = null;
    private onClickCup(cup: CupItem) {//点击倒水

        Tween.stopAllByTarget(cup.node)

        let finshStatus = cup.checkIsFinshed()

        if (finshStatus == 1) {
            CommonUtils.showAlertTip("当前杯子已倒满")
            return
        }

        if (this.selected) {
            if (this.selected == cup) {//点击第二次时，如果点击的是同一个水杯，则取消选中
                this.doSelect(cup, false)
                this.selected = null
            } else if (this.checkPour(this.selected, cup)) {//判断两个水杯是否能倒水
                this.startPour(this.selected, cup)
            } else {
                this.doSelect(this.selected, false)
                this.selected = null
            }
        } else {
            this.selected = cup //点击第一次，selected为当前水杯
            this.doSelect(cup, true)//true是向上移动，false是向下移动
        }

    }

    private doSelect(cup: CupItem, bool: boolean) {
        let pt = cup.orginPoint
        let y = pt.y + (bool ? cup.node._uiProps.uiTransformComp.height * 0.2 : 0)

        tween(cup.node).stop()
        tween(cup.node).to(0.2, { angle: 0, position: v3(pt.x, y, pt.z) }).start()

        if (bool) {
            this.unschedule(this.onShakeCupItemWhenNoMove)
        } else {
            this.scheduleOnce(this.onShakeCupItemWhenNoMove, 5)
        }
    }

    /**检查两个杯子是否能倒水 */
    private checkPour(src: CupItem, dst: CupItem) {
        let srcTop = src.getTop()
        let dstTop = dst.getTop()

        if (srcTop.topColorId == 0) {
            CommonUtils.showAlertTip("是空杯子")
            return false
        }
        if (dstTop.topColorId == 0) {//被倒的杯子是空杯子
            return true
        }

        if (srcTop.topColorId != dstTop.topColorId) {
            CommonUtils.showAlertTip("不同的颜色无法倒入")
            return false
        }

        return srcTop.topColorNum <= dstTop.emptyNum//最顶端有颜色数量小于等于被倒的杯子的顶端空余数量，才能倒
    }

    private startPour(src: CupItem, dst: CupItem) {//开始倒水
        src.pourStatus = true
        dst.pourStatus = true

        let srcTransComp = src.node._uiProps.uiTransformComp
        let dstTransComp = dst.node._uiProps.uiTransformComp

        let srcPTransComp = src.node.parent._uiProps.uiTransformComp// src的父节点，也就是layout_h的uiTransform组件
        let dstPTransComp = dst.node.parent._uiProps.uiTransformComp//dst的父节点，也就是layout_h的uiTransform组件

        src.node.parent.setSiblingIndex(10)//contentNode总共最大两个节点，10是把要倒水的layout_h放到最上层
        src.node.setSiblingIndex(10) //layout_h最大8个节点，10是把要倒水的杯子放到layout的最上层,保证倒水时不会被其他水杯遮挡


        let dstGlobal = dst.node.getWorldPosition()
        let viewSize = view.getVisibleSize()
        let isRight = dstGlobal.x > viewSize.width * 0.5;//标记目标是否在屏幕右侧，isRight = true表示往右边倒水
        if (Math.abs(dstGlobal.x - viewSize.width * 0.5) < 2) {//目标在中间，误差不超过2
            let srcPt = src.node.getWorldPosition()
            isRight = srcPt.x < viewSize.width * 0.5;//如果被倒的在中间，倒的在被盗的左边，那就是isRight = true
        }//如果被倒的在右边，isRight就是true，如果被倒的在中间附近，则还需要判断倒水的是不是在屏幕左边(倒水喝被倒的都在左边，isRight = false,那就是往左边倒)这样可以保证在倒水的时候，倒水的杯子一直在屏幕中不会出去

        let dstPt = dst.node.getPosition()

        dstPt.y += dstTransComp.height * 0.5;//拿到目标杯子的世界坐标，并加上目标杯子的高度的一半，得到倒水的位置

        dstPt = dstPTransComp.convertToWorldSpaceAR(dstPt)//将倒水的位置转成世界坐标

        src.setPourAnchor(isRight)//修改src的锚点到右上角杯口
        console.log("执行完setPourAnchor-------------------")
        dstPt = srcPTransComp.convertToNodeSpaceAR(dstPt)//dstPt转成src的本地坐标

        let srcTop = src.getTop()

        let self = this
        /**
         * 开始倒水动画的处理函数
         * 当倒水动作开始时调用，负责设置倒水的起点和终点位置，并播放倒水动画
         * 这个方法在CupWater脚本的PourStep方法中调用，CupWater的onOutStart方法就是这个方法
         */
        const onPourStart = () => {
            // 获取源节点的世界坐标作为倒水起点


            /*
            打印可以知道当前src的位置已经是dst的位置了，因为在CupItem的moveToPour方法的tweenTo方法中，
            已经将src的坐标设置成dst的坐标了,在CupWater的pourStep中，有一个is_top标记，这个标记必须要等到水到达出水口后才会被打开，而打开的前提就是上面的tweenTo缓动执行完成倾斜，
            而完成倾斜后src的位置自然就已经到了dst的位置了，此时执行这个onPourStart方法，画线的坐标就是在dst的位置了



            */
            let startPt = src.node.getWorldPosition()//如果是往右倒，这个位置已经是在杯子的右上角了，也就是杯口
            // 创建倒水终点，使用源节点的x坐标和目标容器的水平面y坐标
            let endPt = v3(startPt.x, dst.getWaterSurfacePosY())
            // let tag1 = src.node.getChildByName("tag1")
            // tag1.parent = src.node.parent
            // tag1.setWorldPosition(startPt)
            // let tag2 = src.node.getChildByName("tag2")
            // tag2.parent = src.node.parent
            // tag2.setWorldPosition(endPt)

            // 将起点和终点坐标减去视图尺寸的一半，可能是为了调整坐标原点，startPt和endPt都是世界坐标，也就是屏幕左下角为原点的坐标，而对于水杯的父节点layout
            startPt.subtract3f(viewSize.width / 2, viewSize.height / 2, 0)
            endPt.subtract3f(viewSize.width / 2, viewSize.height / 2, 0)


            //可以用这个方法将全局的startPt和endPt转成局部坐标,因为startPt和endPt在画线的时候需要的是局部坐标，所以是转到this.root节点下的局部坐标
            //startPt = this.contentNode.parent.getComponent(UITransform).convertToNodeSpaceAR(startPt)
            //endPt = this.contentNode.parent.getComponent(UITransform).convertToNodeSpaceAR(endPt)


            // 创建颜色对象并从十六进制字符串设置颜色
            let outColor = new Color
            Color.fromHEX(outColor, srcTop.colorHex)//倒水顶部的颜色
            // 设置线条图形的描边颜色为倒出液体的颜色
            self.lineGraphics.strokeColor = outColor//绘制的线的颜色,一般与moveTo, lineTo等方法一起使用
            console.log("selfselfself-----------的值", self.name) //这个是箭头函数，函数内部没有this，使用是的函数外层的this环境，而且是在执行前就已经固定了，所以要不要使用self多此一举

            // playFlowAni内容是使用graphics绘制一条从出水口到杯底的线段，模仿水流流动的效果
            self.playFlowAni(startPt, endPt, 0.2, false, () => {
                // 动画完成后，开始在目标容器中添加水
                dst.startAddWater(srcTop.topColorId, srcTop.topColorNum, (cup: CupItem, isFinished: boolean) => {
                    // 记录这个倒水动作，本地保存，可以回退 执行气泡动画
                    self.onPourOneFinished(src, dst, srcTop.topColorId, srcTop.topColorNum);
                });
            })
        }
        //倒完水就收回去 这个是倒水完成在CupWater的pourStep执行，而不是在被倒水的杯子增加水的时候执行
        function onPourFinish() {
            //let startPt = srcTransComp.node.getWorldPosition()
            //let endPt = v3(startPt.x, dst.getWaterSurfacePosY(true));

            //startPt.subtract3f(viewSize.width / 2, viewSize.height / 2, 0)
            //endPt.subtract3f(viewSize.width / 2, viewSize.height / 2, 0)

            // self.playFlowAni(startPt, endPt, 0.2, true, () => {
            //     self.lineGraphics.clear();
            // })

            src.setNormalAnchor();

            let pt = src.orginPoint;
            let moveBack = tween(src.node)
                .delay(0.7)
                .to(0.5, { position: pt, angle: 0 }, { easing: "sineOut" })
                .delay(0.5).call(() => {
                    src.node.setSiblingIndex(0)
                    src.node.parent.setSiblingIndex(0)
                    self.onCheckSuccess()
                    // src.node.zIndex = 0;
                    // src.node.parent.zIndex = 0;

                    self.scheduleOnce(self.onShakeCupItemWhenNoMove, 5)
                })
            moveBack.start();
        }

        this.selected = null
        src.moveToPour(dstPt, isRight, onPourStart.bind(this), onPourFinish.bind(this))
    }

    private _actions: Array<Action> = [];
    /**一次倒水完成（以加水那个杯子水面升到最高为界限） */
    private onPourOneFinished(from: CupItem, to: CupItem, colorId: number, num: number) {
        let fromCupIdx = this.cupItems.indexOf(from);
        let toCupIdx = this.cupItems.indexOf(to);
        // if (this._actions.length == 5) {
        //     this._actions.shift()
        // }

        //记录一次倒水动作
        this._actions.push({
            from: fromCupIdx,
            to: toCupIdx,
            colorId: colorId,
            num: num
        })

        from.pourStatus = false
        to.pourStatus = false

        if (to.checkIsFinshed()) {
            to.onShowFinishAnimation()
        }
        console.log("流水流后的展示动画------------")

        StorageUtils.saveStrData(StorageUtils.KEY_WATER_CONFIG, JSON.stringify(this.cupConfigs))
        StorageUtils.saveStrData(StorageUtils.KEY_WATER_ACTION, JSON.stringify(this._actions))

    }

    private _isCompleteSuccess = false
    onCheckSuccess() {
        if (this._isCompleteSuccess) {
            return
        }
        let isAllFinished = this.checkIsAllFinished()
        if (isAllFinished) {
            this._isCompleteSuccess = true
            console.log("---------完成了")
            Engine.audio.playEffect("10002/audio/通关", null, GameInterface.IBundleTypeName.Levels)
            this.node.emit(GameUIEvent.EVENT_WATER_LEVEL_SUCCESS)
        } else {
            this.onCheckDieGame()
        }

    }

    public getActionNum() {
        return this._actions.length;
    }

    /**恢复上一次的操作 */
    public undoAction() {
        // 
        // if (action == null) {
        //     return false;
        // }

        if (this._actions.length == 0) {
            return false
        }
        let action = this._actions.pop()
        let { from, to, num, colorId } = action
        let toCup = this.cupItems[to]
        let fromCup = this.cupItems[from]

        toCup.removeTopWaterImmediately(num)
        fromCup.addWaterImmediately(colorId, num)

        StorageUtils.saveStrData(StorageUtils.KEY_WATER_CONFIG, JSON.stringify(this.cupConfigs))
        StorageUtils.saveStrData(StorageUtils.KEY_WATER_ACTION, JSON.stringify(this._actions))

        return true;
    }


    public getCupCount() {
        return this.cupItems.length
    }

    public isCupPouring() {
        for (let i = 0; i < this.cupItems.length; i++) {
            const cupItem = this.cupItems[i]

            if (cupItem.pourStatus) {
                return true
            }

        }

        return false
    }

    public addNewCup() {
        let parent: Node
        if (this.cupItems.length % colCount == 0) {
            // 得加一列
            let cupSize = this.cupItems[0].node.getComponent(UITransform).contentSize
            let layout_h = this.createLayout(this.contentNode, "layout_h")//当前已经有8个水杯了，就要在加一个layout_h节点在this.contentNode里
            layout_h.getComponent(UITransform).height = cupSize.height
            parent = layout_h.node
        } else {
            let minCount = 99999
            for (let i = 0; i < this.contentNode.children.length; i++) {
                const child = this.contentNode.children[i]//layout_h

                if (child.children.length < minCount) {
                    minCount = child.children.length//layout_h的子节点数量
                    parent = child//parent是layout_h
                }

            }
        }


        let cupNode = instantiate(this.cupItemPrefabs[this.cupSkinId - 1])
        let cupItem = cupNode.getComponent(CupItem)
        cupItem.node.parent = parent
        cupItem.onSetCupItemInfo({ colorIds: [0, 0, 0, 0], cupId: this.cupSkinId }, this.onClickCup.bind(this))
        this.cupItems.push(cupItem)//增加一个空白的cupItem节点

        this.cupConfigs.push({//对应增加cupItem绑定的cupConfigs数据，cupConfigs和waterConfigs不是同一种数据
            colorIds: [0, 0, 0, 0],
            cupId: this.cupSkinId,
        })

        StorageUtils.saveStrData(StorageUtils.KEY_WATER_CONFIG, JSON.stringify(this.cupConfigs))


        let spaceX = this.getSpaceX()

        let allLayouts = this.contentNode.getComponentsInChildren(Layout)

        for (let i = 0; i < allLayouts.length; i++) {//增加了cupItem节点后，需要重新计算contentNode的布局
            let layout_h = allLayouts[i]
            layout_h.spacingX = spaceX

            layout_h.enabled = true
            layout_h.updateLayout()
            layout_h.enabled = false
        }

        this.contentNode.getComponent(Layout).enabled = true
        this.contentNode.getComponent(Layout).updateLayout()
        this.contentNode.getComponent(Layout).enabled = false

        this.onReScaleContentNode()

        for (let i = 0; i < this.cupItems.length; i++) {
            this.cupItems[i].orginPoint = this.cupItems[i].node.getPosition()
        }
    }

    private checkIsAllFinished() {
        for (let cup of this.cupItems) {
            if (!cup.checkIsFinshed()) {
                return false
            }
        }
        return true;
    }

    private pointTween: Tween<Vec3>
    public playFlowAni(from: Vec3, to: Vec3, dur: number, isTail: boolean, onComplete: Function) {

        this.lineGraphics.clear()
        let orginPoint = v3(from)

        if (isTail) {
            orginPoint = v3(to)
        }
        console.log("划线起点终点--------------", orginPoint, to)

        let lineGraphics = this.lineGraphics
        this.pointTween = tween(from).to(dur, to, {
            onUpdate: (changedV3: Vec3, ratio: number) => {
                lineGraphics.clear()
                lineGraphics.moveTo(orginPoint.x, orginPoint.y)
                lineGraphics.lineTo(changedV3.x, changedV3.y)
                lineGraphics.stroke()
            }, onComplete: () => {

                tween(from).set(orginPoint).to(dur * 2, to, {
                    onUpdate: (changedV3: Vec3, ratio: number) => {
                        lineGraphics.clear()
                        lineGraphics.moveTo(changedV3.x, changedV3.y)
                        lineGraphics.lineTo(to.x, to.y)
                        lineGraphics.stroke()
                    }
                })
                .start()

                onComplete()
            },
        }).start()

    }

    @property(Number)
    public cu: number = 0

    public getFirstCupNode() {
        return this.cupItems[0].node
    }

    protected onExit(): void {
        if (this.pointTween) {
            this.pointTween.stop()
            this.pointTween = null
        }
    }

}