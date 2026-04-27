/*
 * @Author: Mr.Hong
 * @Date: 2023-02-07 15:16:48
 * @File: Level10002Controller.ts
*/

import { _decorator, Component, EventTouch, Graphics, isValid, Label, Node, tween, v3 } from 'cc';
import { ControllerBase } from './ControllerBase';
import { CupManager } from './CupManager';
import { StorageUtils } from '../utils/StorageUtils';
import { SDKUtils } from '../../SDKs/SDKUtils';
import { GameInterface } from '../config/GameInterface';
import { CommonUtils } from '../utils/CommonUtils';
import { CommandEvent, GameUIEvent } from '../core/common/event/EventEnum';
import { ConfigManager } from '../config/ConfigManager';
import { PlayerProxy } from '../mvc/proxy/PlayerProxy';
import { SDKInterface } from '../../SDKs/SDKInterface';
import { ServerUtils } from '../utils/ServerUtils';

const { ccclass, property, requireComponent } = _decorator;

@ccclass('Level10002Controller')
export class Level10002Controller extends ControllerBase {

    cupManager: CupManager

    @property(Node)
    contentNode: Node

    @property(Graphics)
    lineGraphics: Graphics

    @property(Node)
    btnNode: Node

    @property(Node)
    skinPopNode: Node

    @property(Label)
    titleLabel: Label

    @property(Node)
    dieGameNode: Node

    protected onRegisterEvents(): void {
        this.cupManager.node.on(GameUIEvent.EVENT_WATER_LEVEL_SUCCESS, this.onWaterLevelSuccess, this)
        this.cupManager.node.on(GameUIEvent.EVENT_WATER_DIE_GAME, this.onWaterDieGame, this)
    }

    protected onLoad(): void {

        this.skinPopNode.active = false
        this.dieGameNode.active = false

        let playerProxy = this.facade.retrieveProxy(PlayerProxy.NAME) as PlayerProxy

        let waterLevel = playerProxy.waterLevel

        let maxLevel = ConfigManager.waterLevelConfigs.length + 1

        if (waterLevel == maxLevel) {
            waterLevel--
        }

        this.cupManager = this.getComponent(CupManager)
        this.cupManager.contentNode = this.contentNode
        this.cupManager.lineGraphics = this.lineGraphics
        this.cupManager.curLevel = waterLevel
        this.titleLabel.string = waterLevel + ""

        this.onUpdateSkinPopNode()

        CommonUtils.showAlertTip("通过第10关即可满星")
    }

    protected onStart(): void {
        this.cupManager.onGameStart()
        this.onContentAction()
    }

    onGameStart(levelId: number): void {
        this.curLevelId = levelId
    }

    onUpdateSkinPopNode() {//更新皮肤弹窗
        let skinListStr = StorageUtils.getStrData(StorageUtils.KEY_WATER_SKIN_LIST, "")

        let skinList = [1]
        if (skinListStr != "") {
            skinList = JSON.parse(skinListStr)
        } else {
            StorageUtils.saveStrData(StorageUtils.KEY_WATER_SKIN_LIST, JSON.stringify(skinList))
        }

        let skinContentNode = this.skinPopNode.getChildByPath("bg/content")

        let skinItemNodes = skinContentNode.children

        for (let i = 0; i < skinItemNodes.length; i++) {
            const skinItemNode = skinItemNodes[i]

            let skinId = Number(skinItemNode.name.split("_")[1])

            if (skinList.includes(skinId)) {
                skinItemNode.getChildByName("locked").active = false
                skinItemNode.getChildByName("video").active = false
            } else {
                skinItemNode.getChildByName("locked").active = true
                skinItemNode.getChildByName("video").active = true
            }
        }

        this.onUpdateSkinSelectedStatus()
    }

    onUpdateSkinSelectedStatus() {
        let curSkinId = StorageUtils.getNumber(StorageUtils.KEY_WATER_SKIN_ID, 1)

        let skinContentNode = this.skinPopNode.getChildByPath("bg/content")

        let skinItemNodes = skinContentNode.children

        for (let i = 0; i < skinItemNodes.length; i++) {
            const skinItemNode = skinItemNodes[i]

            let skinId = Number(skinItemNode.name.split("_")[1])

            if (curSkinId == skinId) {
                skinItemNode.getChildByName("selected").active = true
            } else {
                skinItemNode.getChildByName("selected").active = false
            }
        }
    }

    onWaterLevelSuccess() {//闯关到最后一关才表示onLevelSuccess
        let playerProxy = this.facade.retrieveProxy(PlayerProxy.NAME) as PlayerProxy

        playerProxy.waterLevel++
        let maxLevel = ConfigManager.waterLevelConfigs.length + 1

        if (playerProxy.waterLevel > maxLevel) {
            playerProxy.waterLevel = maxLevel
        }

        StorageUtils.saveStrData(StorageUtils.KEY_WATER_CONFIG, "")
        StorageUtils.saveStrData(StorageUtils.KEY_WATER_ACTION, "")

        if (playerProxy.waterLevel >= 10) {
            let playerProxy = this.facade.retrieveProxy(PlayerProxy.NAME) as PlayerProxy

            playerProxy.levelInfoMap[this.curLevelId] = {
                starCount: 3
            }
            let reqData: GameInterface.IUpdateLevelInfoRequest = {
                levelInfoMap: playerProxy.levelInfoMap
            }
            this.sendNotification(CommandEvent.EVENT_ON_UPDATE_LEVEL_INFO, reqData)
            let starCount = playerProxy.onGetAllStarCount()

            SDKUtils.onInsertRankData({ value: starCount + "" })
        }

        ServerUtils.updateServerData("waterLevel", playerProxy.waterLevel)


        if (playerProxy.waterLevel == maxLevel) {
            this.onLevelSuccess()
            return

        }

        this.scheduleOnce(() => {
            this.cupManager.curLevel = playerProxy.waterLevel
            this.cupManager.onGameStart()
            this.onContentAction()
            this.titleLabel.string = playerProxy.waterLevel + ""


            this.btnNode.getChildByName("btn_add").children[0].active = true
            this.btnNode.getChildByName("btn_step").children[0].active = true

        }, 2)
    }

    onContentAction() {
        tween(this.contentNode).set({ position: v3(0, 2000, 0) }).to(0.8, { position: v3(0, 0, 0) }, { easing: "quartOut" }).start()
    }

    onRetryClicked() {//
        StorageUtils.saveStrData(StorageUtils.KEY_WATER_CONFIG, "")
        StorageUtils.saveStrData(StorageUtils.KEY_WATER_ACTION, "")//记录步骤

        this.cupManager.onGameStart()

        this.btnNode.getChildByName("btn_add").children[0].active = true
        this.btnNode.getChildByName("btn_step").children[0].active = true
        this.dieGameNode.active = false
    }

    onAddCupClicked(event: EventTouch) {
        if (this.cupManager.isCupPouring()) {
            CommonUtils.showAlertTip("杯子正在倒水中...")
            return
        }

        if (this.cupManager.getCupCount() == 16) {
            CommonUtils.showAlertTip("瓶子数已达最大")
            return
        }

        let target = event.target as Node

        let self = this
        SDKUtils.showRewardVideoAD({ position: `添加杯子`, name: this.curLevelName }, (adStatus: SDKInterface.IAdStatus) => {
            if (adStatus.adEvent == "onReward" && isValid(self.node)) {
                this.cupManager.addNewCup()
                this.dieGameNode.active = false
            }
        })
    }

    onStepClicked(event: EventTouch) {
        if (this.cupManager.isCupPouring()) {
            CommonUtils.showAlertTip("杯子正在倒水中...")
            return
        }

        let actionCount = this.cupManager.getActionNum()

        if (actionCount == 0) {
            CommonUtils.showAlertTip("没有步数可以回退")
            return
        }

        let self = this
        SDKUtils.showRewardVideoAD({ position: `撤回步骤`, name: this.curLevelName }, (adStatus: SDKInterface.IAdStatus) => {
            if (adStatus.adEvent == "onReward" && isValid(self.node)) {
                this.cupManager.undoAction()
                this.dieGameNode.active = false
            }
        })
    }

    onSkinClicked() {
        this.skinPopNode.active = true
    }

    onSkinCloseClicked() {
        this.skinPopNode.active = false
    }

    onSkinItemClicked(event: EventTouch) {
        let target = event.target as Node

        let selectedId = Number(target.name.split("_")[1])

        let videoNode = target.getChildByName("video")

        if (videoNode.active) {
            // 要看视频
            let self = this
            SDKUtils.showRewardVideoAD({ position: `皮肤解锁`, name: this.curLevelName }, (adStatus: SDKInterface.IAdStatus) => {
                if (adStatus.adEvent == "onReward" && isValid(self.node)) {
                    let skinListStr = StorageUtils.getStrData(StorageUtils.KEY_WATER_SKIN_LIST, "")
                    let skinList = JSON.parse(skinListStr) as number[]
                    skinList.push(selectedId)
                    StorageUtils.saveStrData(StorageUtils.KEY_WATER_SKIN_LIST, JSON.stringify(skinList))

                    StorageUtils.saveNumber(StorageUtils.KEY_WATER_SKIN_ID, selectedId)
                    this.onUpdateSkinPopNode()

                    CommonUtils.showAlertTip("下一关卡或者重进即可变换")

                }
            })
        } else {

            StorageUtils.saveNumber(StorageUtils.KEY_WATER_SKIN_ID, selectedId)
            CommonUtils.showAlertTip("下一关卡或者重进即可变换")

            this.onUpdateSkinSelectedStatus()
        }
    }

    onWaterDieGame(isDieGame: boolean) {
        this.dieGameNode.active = isDieGame
    }

}