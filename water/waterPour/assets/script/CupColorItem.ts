import { _decorator, color, Color, Component, EventTouch, Label, Node, Sprite, tween, Tween, UITransform, v3, Vec3 } from 'cc';
import { CupTopInfo, HEIGHT_FACOR, ICupInfo, SPLIT_COUNT, WATERCOLORS, WaterInfo } from './playerData';
import { CupWater } from './CupWater';
import { EDITOR } from 'cc/env';
import { isReturnStatement, transform } from 'typescript';
import { moduleCheck } from './moduleCheck';
const { ccclass, property } = _decorator;

@ccclass('CupColorItem')
export class CupColorItem extends Component {

    moduleCheckCp: moduleCheck

    @property(Node)
    cupWater: Node = null;

    @property(Node)
    redColor: Node = null;

    @property(Node)
    greenColor: Node = null;

    @property(Node)
    blueColor: Node = null;

    @property(Node)
    cupNumLabel: Node = null;

    private redColorNum: number = 255
    private greenColorNum: number = 255
    private blueColorNum: number = 255

    cupWaterColor: string = "ffffff"

    protected onLoad(): void {

    }

    start() {
        let controRedNode = this.redColor.getChildByName("bar").getChildByName("红泡泡")
        let controGreenNode = this.greenColor.getChildByName("bar").getChildByName("绿泡泡")
        let controBlueNode = this.blueColor.getChildByName("bar").getChildByName("蓝泡泡")
        this.addNodeTouchEvent(controRedNode)
        this.addNodeTouchEvent(controGreenNode)
        this.addNodeTouchEvent(controBlueNode)
    }

    addNodeTouchEvent(node: Node) {
        node.on(Node.EventType.TOUCH_MOVE, this.onTouchNodeMove, this)
        node.on(Node.EventType.TOUCH_END, this.onTouchNodeEnd, this)
        node.on(Node.EventType.TOUCH_CANCEL, this.onTouchNodeEnd, this)
        node.on(Node.EventType.TOUCH_START, this.onTouchNodeStart, this)
    }

    offNodeTouchEvent(node: Node) {
        node.off(Node.EventType.TOUCH_MOVE, this.onTouchNodeMove, this)
        node.off(Node.EventType.TOUCH_END, this.onTouchNodeEnd, this)
        node.off(Node.EventType.TOUCH_CANCEL, this.onTouchNodeEnd, this)
        node.off(Node.EventType.TOUCH_START, this.onTouchNodeStart, this)
    }

    initCupColorItem(index: number) {
        this.cupNumLabel.getComponentInChildren(Label).string = "no." + index.toString()
    }
    onTouchNodeStart(event: EventTouch) {

    }


    onTouchNodeMove(event: EventTouch) {
        let target = event.target as Node
        this.moduleCheckCp.stopScrollMove()
        if (target.getPosition().x >= -60 && target.getPosition().x <= 60) {
            let uiPos = event.getUILocation()
            let localPos = target.parent.getComponent(UITransform).convertToNodeSpaceAR(v3(uiPos.x, uiPos.y, 0))
            if (localPos.x > 60) {
                localPos.x = 60
            }
            if (localPos.x < -60) {
                localPos.x = -60
            }
            target.setPosition(v3(localPos.x, target.getPosition().y, target.getPosition().z))

            let process = (target.getPosition().x - (-60)) / 120
            process = Math.max(0, process)
            process = Math.min(1, process)

            if (target.name.includes("红")) {
                let sp = target.parent.getChildByName("Mask").getChildByName("process")
                sp.getComponent(UITransform).width = 150 * process

                let redSp = this.redColor.getChildByName("红").getComponent(Sprite)
                this.redColorNum = Math.floor(process * 255)
                redSp.color = new Color(255, 255 - this.redColorNum, 255 - this.redColorNum)
                this.setCupColor()
            } else if (target.name.includes("绿")) {
                let sp = target.parent.getChildByName("Mask").getChildByName("process")
                sp.getComponent(UITransform).width = 150 * process

                let greenSp = this.greenColor.getChildByName("绿").getComponent(Sprite)
                this.greenColorNum = Math.floor(process * 255)
                greenSp.color = new Color(255 - this.greenColorNum, 255, 255 - this.greenColorNum)
                this.setCupColor()
            } else if (target.name.includes("蓝")) {
                let sp = target.parent.getChildByName("Mask").getChildByName("process")
                sp.getComponent(UITransform).width = 150 * process

                let blueSp = this.blueColor.getChildByName("蓝").getComponent(Sprite)
                this.blueColorNum = Math.floor(process * 255)
                blueSp.color = new Color(255 - this.blueColorNum, 255 - this.blueColorNum, 255)
                this.setCupColor()
            }
        }


    }

    onTouchNodeEnd(event: EventTouch) {
        // let target = event.target as Node
        // if (target.getPosition().x <= -60) {
        //     target.setPosition(v3(-60, target.getPosition().y, target.getPosition().z))
        // }
        // if (target.getPosition().x >= 60) {
        //     target.setPosition(v3(60, target.getPosition().y, target.getPosition().z))
        // }

        this.moduleCheckCp.startScrollMove()
    }

    setCupColor() {
        let cupWater = this.cupWater.getComponent(Sprite)
        cupWater.color = new Color(this.redColorNum, this.greenColorNum, this.blueColorNum)
        let colorStr = cupWater.color.toHEX()

    }
}

