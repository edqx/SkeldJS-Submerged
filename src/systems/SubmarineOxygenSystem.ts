import { HazelReader, HazelWriter } from "@skeldjs/util";
import { SystemType } from "@skeldjs/constant";
import { RepairSystemMessage } from "@skeldjs/protocol";
import { ExtractEventTypes } from "@skeldjs/events";

import {
    InnerShipStatus,
    SystemStatus,
    SystemStatusEvents,
    PlayerData,
    Hostable
} from "@skeldjs/core";

export interface SubmargineOxygenSystemData<RoomType extends Hostable = Hostable> {
    countdown: number;
    playersWithMask: Set<PlayerData<RoomType>>;
    doKillCheck: boolean;
}

export type SubmargineOxygenSystemEvents<RoomType extends Hostable = Hostable> = SystemStatusEvents<RoomType> &
    ExtractEventTypes<[]>;

/**
 * Represents a system responsible for handling communication sabotages on The Skeld and Polus.
 *
 * See {@link SubmargineOxygenSystemEvents} for events to listen to.
 */
export class SubmargineOxygenSystem<RoomType extends Hostable = Hostable> extends SystemStatus<
    SubmargineOxygenSystemData<RoomType>,
    SubmargineOxygenSystemEvents,
    RoomType
> implements SubmargineOxygenSystemData {
    static duration = 30;

    countdown: number;
    playersWithMask: Set<PlayerData<RoomType>>;
    doKillCheck: boolean;

    protected dirtyTimer: number;
    protected serializeKillCheck: boolean;

    constructor(
        ship: InnerShipStatus<RoomType>,
        systemType: SystemType,
        data?: HazelReader | SubmargineOxygenSystemData<RoomType>
    ) {
        super(ship, systemType, data);

        this.countdown = 10000;
        this.playersWithMask = new Set;
        this.doKillCheck = false;

        this.dirtyTimer = 0;
        this.serializeKillCheck = false;
    }

    get sabotaged() {
        return this.countdown < 10000;
    }

    patch(data: SubmargineOxygenSystemData<RoomType>) {
        this.countdown = data.countdown;
        this.playersWithMask = new Set([...data.playersWithMask]);
        this.doKillCheck = data.doKillCheck;
    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    Deserialize(reader: HazelReader, spawn: boolean) {
        this.countdown = reader.float();
        const numPlayers = reader.packed();
        const playersWithMask: Set<PlayerData<RoomType>> = new Set;
        for (let i = 0; i < numPlayers; i++) {
            const playerId = reader.uint8();
            const player = this.room.getPlayerByPlayerId(playerId);
            if (player) {
                playersWithMask.add(player);
            }
        }
        this.playersWithMask = playersWithMask;
        this.doKillCheck = reader.bool();
    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    Serialize(writer: HazelWriter, spawn: boolean) {
        writer.bool(this.sabotaged);
        writer.packed(this.playersWithMask.size);
        for (const player of this.playersWithMask) {
            if (player.playerId !== undefined)
                writer.uint8(player.playerId);
        }
        writer.bool(this.serializeKillCheck);
        this.serializeKillCheck = false;
        this.dirty = spawn;
    }

    async HandleSabotage(player: PlayerData|undefined, rpc: RepairSystemMessage|undefined) {
        this.countdown = SubmargineOxygenSystem.duration;
        this.playersWithMask.clear();
    }

    async _repair(player: PlayerData|undefined, rpc: RepairSystemMessage|undefined) {
        this.countdown = 10000;
        this.playersWithMask.clear();
    }

    async repair() {
        if (this.room.hostIsMe) {
            await this._repair(this.room.myPlayer, undefined);
        } else {
            await this._sendRepair(0);
        }
    }

    async HandleRepair(player: PlayerData<RoomType>|undefined, amount: number, rpc: RepairSystemMessage|undefined) {
        if (amount === 128) {
            if (!this.sabotaged) {
                this.HandleSabotage(player, rpc);
            }
        } else if (amount === 64) {
            if (player)
                this.playersWithMask.add(player);
        } else if (amount === 16) {
            this._repair(player, rpc);
        }
        this.dirty = true;
    }

    Detoriorate(delta: number) {
        if (this.doKillCheck) {
            this.doKillCheck = false;
            if (this.room.myPlayer) {
                this.room.myPlayer.control?.kill("oxygen system");
            }
            // todo: emit kill check
        }
        if (this.sabotaged) {
            this.countdown -= delta;
            this.dirtyTimer += delta;
            if (this.playersWithMask.size === this.room.players.size) {
                this._repair(undefined, undefined);
                this.dirty = true;
                return;
            }
            if (this.countdown < 0) {
                this.serializeKillCheck = this.doKillCheck = true;
                this.dirty = true;
                return;
            }
            if (this.dirtyTimer > 2) {
                this.dirtyTimer = 0;
                this.dirty = true;
                return;
            }
        }
    }
}
