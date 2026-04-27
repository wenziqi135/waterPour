import { _decorator, Button, Component, Graphics, isValid, Node, Prefab, sys, Toggle, tween, v3 } from 'cc';
import { Event_GameLevelOver, Event_GameLevelSuccess, playerData } from './playerData';
import { CupManager } from './CupManager';
import { moduleCheck } from './moduleCheck';
const { ccclass, property } = _decorator;

@ccclass('GameLevelController')
export class GameLevelController extends Component {

    cupManagerCop: CupManager

    moduleCheckCop: moduleCheck

    @property(Node)
    contentNode: Node = null;

    @property(Graphics)
    lineGraphics: Graphics = null;

    @property(Node)
    btnNode: Node = null;

    // @property(Node)
    // skinPopNode: Node = null;

    @property(Node)
    gameOverNode: Node = null;

    playerData: playerData
    protected async onLoad(): Promise<void> {

        this.gameOverNode.active = false
        this.playerData = await playerData.instance()
        let water_level = this.playerData.key_water_level
        let water_levelConfigs = this.playerData.water_levelConfigs
        let maxLevel = water_levelConfigs.length + 1

        if (water_level == maxLevel) {
            water_level = water_level - 1
        }

        this.cupManagerCop = this.node.getComponent(CupManager)
        this.cupManagerCop.contentNode = this.contentNode
        this.cupManagerCop.lineGraphics = this.lineGraphics
        this.cupManagerCop.curLevel = water_level
        this.cupManagerCop.playerData = this.playerData

        this.moduleCheckCop = this.node.getChildByName("root").getChildByName("moduleCheck").getComponent(moduleCheck)

        this.node.on(Event_GameLevelSuccess, this.onLevelSuccess, this)
        this.node.on(Event_GameLevelOver, this.onGameLevelOver, this)

        //获取playerData会阻塞,用引擎自带的start会跑到onLoad前面去
        //this.onGameStart()
    }
    onGameStart() {
        this.cupManagerCop.onGameStart()
        this.onContentAction()
    }

    update(deltaTime: number) {

    }

    onContentAction() {
        tween(this.contentNode).set({ position: v3(0, 2000, 0) }).to(0.8, { position: v3(0, 0, 0) }, { easing: 'quadOut' }).start()
    }

    onWaterLevelSuccess() {
        this.playerData.key_water_level += 1
        let maxLevel = this.playerData.water_levelConfigs.length + 1
        if (this.playerData.key_water_level > maxLevel) {
            this.playerData.key_water_level = maxLevel
        }

        this.playerData.key_water_config = ""
        this.playerData.key_water_action = ""

        if (this.playerData.key_water_level == maxLevel) {
            this.onGameSuccess()
            return
        }

        this.scheduleOnce(() => {
            this.onContentAction()

            this.btnNode.getChildByName("杯子").active = true
            this.btnNode.getChildByName("回退").active = true
        }, 2)
    }

    onGameSuccess() {

    }

    onRetryClicked() {
        if (this.cupManagerCop.isCupPouring()) {
            //震动 杯子正在倒水中
            return
        }

        this.playerData.key_water_config = ""
        this.playerData.key_water_action = ""

        this.btnNode.getChildByName("杯子").active = true
        this.btnNode.getChildByName("回退").active = true
        this.gameOverNode.active = false

        this.cupManagerCop.onGameStart()
    }

    onAddCupClicked() {
        if (this.cupManagerCop.isCupPouring()) {
            //震动 杯子正在倒水中
            return
        }
        if (this.cupManagerCop.getCupItemCount() >= 16) {
            //震动 杯子数量已满
            return
        }
        if (isValid(this.node)) {

            let selectCupItem = this.cupManagerCop.getSelectCupItem()
            if (selectCupItem) {
                this.cupManagerCop.pickupCupItem(selectCupItem, false, this.cupManagerCop.addNewCup.bind(this.cupManagerCop))
            } else {
                this.cupManagerCop.addNewCup()
            }

            this.gameOverNode.active = false
        }
    }

    onStepClicked() {
        if (this.cupManagerCop.isCupPouring()) {
            //震动 杯子正在倒水中
            return
        }
        if (this.cupManagerCop.getActionLength() == 0) {
            //震动 没有动作
            return
        }
        this.cupManagerCop.rollBackStepAction()
        this.gameOverNode.active = false
    }

    onLevelSuccess() {
        this.playerData.key_water_level += 1
        let water_level = this.playerData.key_water_level
        let maxLevel = this.playerData.water_levelConfigs.length + 1
        if (water_level > maxLevel) {
            water_level = maxLevel
        }
        this.playerData.key_water_config = ""
        this.playerData.key_water_action = ""

        if (water_level == maxLevel) {
            return
        }

        this.btnNode.getComponentsInChildren(Button).forEach((btn) => {
            btn.interactable = false
        })
        this.scheduleOnce(() => {
            this.btnNode.getComponentsInChildren(Button).forEach((btn) => {
                btn.interactable = true
            })
            this.cupManagerCop.curLevel = water_level
            this.onGameStart()
        }, 1)
    }

    onGameLevelOver(isOver: boolean) {
        this.gameOverNode.active = isOver
    }

    onChoiceModuleOne() {
        this.moduleCheckCop.tempLevelDiff = 0
        this.moduleCheckCop.gameModuleType = 1
        this.moduleCheckCop.node.active = false
        this.onGameStart()
    }

}

