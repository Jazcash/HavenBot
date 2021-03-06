import * as fs from "fs";
import { Message } from "discord.js";
import { Command, CommandMessage, CommandoClient } from "discord.js-commando";

export class TimerNotifyCommand extends Command {
    constructor(client: CommandoClient) {
        super(client, {
            name: "timernotify",
            group: "misc",
            memberName: "timernotify",
            description: "Toggle your notification preference for timers"
        });
    }

    public run(msg: CommandMessage): Promise<Message | Message[]> {
        const store = JSON.parse(fs.readFileSync("store.json", { encoding: "utf8" }));

        const userid = msg.member.id;

        if (store.notify.includes(userid)){
            store.notify = store.notify.filter((id: string) => id !== userid);
            fs.writeFile("store.json", JSON.stringify(store), {encoding: "utf8"}, () => {});
            return msg.say(`You will no longer be notified of timers.`);
        } else {
            store.notify.push(userid);
            fs.writeFile("store.json", JSON.stringify(store), {encoding: "utf8"}, () => {});
            return msg.say(`You will now receive timer notifications.`);
        }
    }
};
