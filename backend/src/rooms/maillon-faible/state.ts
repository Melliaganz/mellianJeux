import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") name = "";
  @type("boolean") connected = true;
  @type("boolean") isHost = false;
  @type("number") score = 0;
}

export class MaillonFaibleState extends Schema {
  @type("string") phase = "lobby";
  @type("number") bank = 0;
  @type("number") timeLeft = 0;
  @type("number") chainIndex = 0;
  @type("string") activePlayerId = "";
  @type("string") question = "";
  @type("boolean") awaitingValidation = false;
  @type("string") pendingAnswer = "";
  @type("string") lastResult = "";
  @type({ map: Player }) players = new MapSchema<Player>();
}
