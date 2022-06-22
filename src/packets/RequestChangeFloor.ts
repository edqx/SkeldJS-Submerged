import { BaseRpcMessage } from "@skeldjs/protocol";
import { HazelReader, HazelWriter } from "@skeldjs/util";
import { SubmergedRpcMessageTag } from "../enums";

export class RequestChangeFloorMessage extends BaseRpcMessage {
    static messageTag = SubmergedRpcMessageTag.RequestChangeFloor as const;
    messageTag = SubmergedRpcMessageTag.RequestChangeFloor as const;

    constructor(
        public readonly targetFloorIsUpper: boolean,
        public readonly sequenceId: number
    ) {
        super();
    }

    static Deserialize(reader: HazelReader) {
        const targetFloorIsUpper = reader.bool();
        const sequenceId = reader.int32();

        return new RequestChangeFloorMessage(targetFloorIsUpper, sequenceId);
    }

    Serialize(writer: HazelWriter) {
        writer.bool(this.targetFloorIsUpper);
        writer.int32(this.sequenceId);
    }

    clone() {
        return new RequestChangeFloorMessage(this.targetFloorIsUpper, this.sequenceId);
    }
}
