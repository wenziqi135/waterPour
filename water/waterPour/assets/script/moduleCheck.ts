import { _decorator, color, Color, Component, instantiate, Node, Prefab, ScrollView, Toggle, tween, Tween, UITransform, v3, Vec3 } from 'cc';
import { CupTopInfo, HEIGHT_FACOR, ICupInfo, SPLIT_COUNT, WATERCOLORS, WaterInfo } from './playerData';
import { CupWater } from './CupWater';
import { EDITOR } from 'cc/env';
import { transform } from 'typescript';
import { CupColorItem } from './CupColorItem';
const { ccclass, property } = _decorator;

@ccclass('moduleCheck')
export class moduleCheck extends Component {

    private _tempLevelDiff: number = 0
    private _gameModuleType: number = 1

    @property(Prefab)
    cupColorItem: Prefab

    @property(Node)
    gameModuleChoice: Node

    @property(Node)
    customPanel: Node

    @property(Node)
    content: Node

    @property(ScrollView)
    scrollView: ScrollView

    cupItemIndex = 0

    protected onLoad(): void {

    }

    start() {

    }

    get tempLevelDiff(): number {
        return this._tempLevelDiff
    }
    set tempLevelDiff(value: number) {
        this._tempLevelDiff = value
    }

    get gameModuleType(): number {
        return this._gameModuleType
    }

    set gameModuleType(value: number) {
        this._gameModuleType = value
    }

    onClickToggle(event, customEventData) {
        let target = event.target as Node
        let isChecked = target.getComponent(Toggle).isChecked
        if (isChecked) {
            if (target.name.includes("1")) {
                this.tempLevelDiff = 1
            } else if (target.name.includes("2")) {
                this.tempLevelDiff = 2
            } else if (target.name.includes("3")) {
                this.tempLevelDiff = 3
            }
        }
    }

    onChoiceModuleTwo() {
        this.gameModuleType = 2
        this.gameModuleChoice.active = false
        this.customPanel.active = true
    }

    onAddCupColorItem() {
        this.cupItemIndex++
        let cupColorItem = instantiate(this.cupColorItem)
        cupColorItem.parent = this.content
        cupColorItem.getComponent(CupColorItem).initCupColorItem(this.cupItemIndex)

        cupColorItem.getComponent(CupColorItem).moduleCheckCp = this
    }

    stopScrollMove() {
        this.scrollView.enabled = false
    }

    startScrollMove() {
        this.scrollView.enabled = true
    }


}

