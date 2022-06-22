import {
    HindenburgPlugin,
    RoomPlugin,
    EventListener,
    PlayerSetNameEvent,
    Room
} from "@skeldjs/hindenburg";

@HindenburgPlugin("hbplugin-submerged")
export class SubmergedPlugin extends RoomPlugin {
    message: string;

    constructor(room: Room, config: any) {
        super(room, config);

        this.message = config.message;
    }

    onConfigUpdate(oldConfig: any, newConfig: any) {
        this.message = newConfig.message;
        this.logger.info("Updated message to '%s'!", this.message);
    }

    @EventListener("player.setname")
    onPlayerSetName(ev: PlayerSetNameEvent<Room>) {
        ev.room.sendChat(this.message);
    }
}
