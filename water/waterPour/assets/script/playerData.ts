import { _decorator, assetManager, Color, Component, JsonAsset, math, Node, sys, v2, Vec2 } from 'cc';
const { ccclass, property } = _decorator;

export const Event_GameLevelSuccess = "GameLevelSuccess"
export const Event_GameLevelOver = "GameLevelOver"

export interface ICupInfo {
    colorIds: number[]
    cupSkinId: number
}

export interface WaterInfo {
    colorId: number,
    color: Color,
    height: number
}

export interface Action {
    from: number,
    to: number,
    num: number,
    colorId: number
}

export interface CupTopInfo {
    emptyNum: number,
    topColorId: number,
    topSameColorNum: number,
    colorHex: string,
}

export const SPLIT_COUNT = 4
export const HEIGHT_FACOR = 0.85
export const MAX_ARR_LEN = 6
export const lineWidth = 10
export const colCount = 8


export enum PourAction {
    none,
    in,
    out
}

export const WATERCOLORS = [
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

//pt是锚点 将一个点绕原点旋转angle角度，返回旋转后的偏移值
export function rotatePt(pt: Vec2, angle: number) {
    while (angle > 360) {
        angle -= 360
    }
    while (angle < -360) {
        angle += 360
    }
    let radian = math.toRadian(angle)
    let ret = v2()
    ret.x = pt.x * Math.cos(radian) - pt.y * Math.sin(radian)
    ret.y = pt.x * Math.sin(radian) + pt.y * Math.cos(radian)
    return ret
}

@ccclass('playerData')
export class playerData extends Component {

    public static KEY_WATER_LEVEL = "key_water_level"
    public static KEY_WATER_CONFIG = "key_water_config"
    public static KEY_WATER_ACTION = "key_water_action"
    public static KEY_WATER_SKIN_ID = "key_water_skin_id"

    private waterLevelConfigs: number[][];
    private _keywaterLevel: number = 1
    private _keywaterConfig: string
    private _keywaterAction: string
    private _keywaterSkinId: number = 1


    private static _instance: playerData;
    public static async instance(): Promise<playerData> {
        if (this._instance == null) {
            this._instance = new playerData();
            await this._instance.init();
        }
        return this._instance;
    }

    private async init() {
        await this.waterLevelConfig();
    }

    private loadConfigs(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            assetManager.loadBundle("data", (err, bundle) => {
                if (!err) {
                    bundle.load("water_level", JsonAsset, (err, asset) => {
                        resolve(asset.json)
                    })
                }
            })
        })
    }

    private async waterLevelConfig() {
        this.waterLevelConfigs = await this.loadConfigs();
    }

    public get water_levelConfigs() {
        return this.waterLevelConfigs
    }

    public get key_water_level() {
        let water_level = sys.localStorage.getItem(playerData.KEY_WATER_LEVEL)
        if (water_level == null || water_level == "") {
            sys.localStorage.setItem(playerData.KEY_WATER_LEVEL, this._keywaterLevel.toString())
            return this._keywaterLevel
        }
        this._keywaterLevel = Number(water_level)
        return this._keywaterLevel
    }

    public set key_water_level(value: number) {
        this._keywaterLevel = value
        sys.localStorage.setItem(playerData.KEY_WATER_LEVEL, this._keywaterLevel.toString())
    }

    public get key_water_skin_id() {
        let water_skin_id = sys.localStorage.getItem(playerData.KEY_WATER_SKIN_ID)
        if (water_skin_id == null || water_skin_id == "") {
            sys.localStorage.setItem(playerData.KEY_WATER_SKIN_ID, this._keywaterSkinId.toString())
            return 1
        }
        this._keywaterSkinId = Number(water_skin_id)
        return this._keywaterSkinId
    }

    public set key_water_skin_id(value: number) {
        this._keywaterSkinId = value
        sys.localStorage.setItem(playerData.KEY_WATER_SKIN_ID, value.toString())
    }

    public get key_water_config() {
        let water_config = sys.localStorage.getItem(playerData.KEY_WATER_CONFIG)
        if (water_config == null || water_config == "") {
            return this._keywaterConfig
        }

        this._keywaterConfig = water_config
        return this._keywaterConfig
    }

    public set key_water_config(value: string) {
        this._keywaterConfig = value
        sys.localStorage.setItem(playerData.KEY_WATER_CONFIG, value)
    }

    public get key_water_action() {
        let water_action = sys.localStorage.getItem(playerData.KEY_WATER_ACTION)
        if (water_action == null || water_action == "") {
            return this._keywaterAction
        }
        this._keywaterAction = water_action
        return this._keywaterAction
    }

    public set key_water_action(value: string) {
        this._keywaterAction = value
        sys.localStorage.setItem(playerData.KEY_WATER_ACTION, value)
    }
}

