import * as fs from "fs";
import { Message, Collection, VoiceChannel } from "discord.js";
import { Command, CommandMessage, CommandoClient } from "discord.js-commando";
import * as moment from "moment";
let AsciiTable = require('ascii-table');
const humanizeDuration = require('humanize-duration');

let config = require("../../config");

export class TimerCommand extends Command {
	constructor(client:CommandoClient) {
		super(client, {
			name: "timer",
			aliases: ["timers"],
			group: "misc",
			memberName: "timer",
			description: "Multiple custom timers",
			examples: ["timers", "timer magicbeans 2d12h", "timer magicbeans"],
			argsPromptLimit: 0,
			args: [
				{
					key: "name",
					prompt: "Name of timer",
					type: "string",
					default: ""
				},
				{
					key: "time",
					prompt: "Time in format such as 7d13h5m",
					type: "string",
					default: "",
					validate: (text: string) => {
						if (/^(?:((?<days>\d+)d)?(?:(?<hours>\d+)h)?(?:(?<minutes>\d+)m)?)$/.test(text)){
							return true;
						} else {
							return "You must provide a time in a format such as 3d5h."
						}
					},
				},
			]
		});

		client.setInterval(() => {
			this.checkTimers();
		}, 10000)
	}

	public run(msg: CommandMessage, { name, time }:{name:string, time:any}): Promise<Message | Message[]> {
		let channel = msg.guild.channels.get(config.channel);
		if (channel && msg.channel !== channel){
			return msg.say(`I only work in the ${channel.name} channel.`);
		}

		let store = require("../../store");

		if (name) {
			if (name in store.timers){
				if (time){
					return msg.say(`Timer for that name already exists.`);
				} else {
					let date = new Date(store.timers[name]);
					let timeRemaining = humanizeDuration(moment(date).diff(new Date()), { units: ['d', 'h', 'm'], round: true });
					return msg.say(`**${name}** timer will expire in ${timeRemaining}`);
				}
			} else {
				if (time){
					let {days = 0, hours = 0, minutes = 0} = time.match(/^(?:((?<days>\d+)d)?(?:(?<hours>\d+)h)?(?:(?<minutes>\d+)m)?)$/).groups;
					let date = moment(new Date()).add(days, "days").add(hours, "hours").add(minutes, "minutes");
					store.timers[name] = date;
					fs.writeFile("store.json", JSON.stringify(store, null, "\t"), {encoding: "utf8"}, () => {});
					let timeRemaining = humanizeDuration(moment(date).diff(new Date()), { units: ['d', 'h', 'm'], round: true });
					return msg.say(`**${name}** timer added. Expires in ${timeRemaining}.`);
				} else {
					return msg.say(`You must provide a time in a format such as 3d5h.`);
				}
			}
		} else {
			if (Object.keys(store.timers).length > 0) {
				let table = new AsciiTable();
				table.setHeading('Key', 'Time Remaining');

				for (let name in store.timers){
					let date = new Date(store.timers[name]);
					let timeRemaining = humanizeDuration(moment(date).diff(new Date()), { units: ['d', 'h', 'm'], round: true });
					table.addRow(name, timeRemaining);
				}

				return msg.say(`\`\`\`${table.toString()}\`\`\``);
			} else {
				return msg.say(`There are currently no timers running.`);
			}
		}
	}

	private checkTimers(){
		let store = require("../../store");
		let channel:any = this.client.channels.get(config.channel);
		if (!channel){ console.log("no channel"); return; }

		if (!("notified6h" in store)) store.notified6h = [];

		let now = new Date();
		for (let name in store.timers){
			let then = new Date(store.timers[name]);
			let diffInMinutes = moment(then).diff(now, "minutes");
			let mentions = store.notify.map((id:string) => `<@${id}>`).join(", ");
			if (then < now){
				delete store.timers[name];
				channel.send(`**${name}** timer expired.`);
			} else if (diffInMinutes <= 11 && diffInMinutes >= 9 && !store.notified.includes(name)){
				store.notified.push(name);
				channel.send(`**${name}** timer will expire in 10 minutes`);

				let guild = this.client.guilds.get(config.guild);
				if (!guild) { console.log("no guild"); return; }
				let voiceChannels = guild.channels.filter(channel => channel.type === "voice") as Collection<string, VoiceChannel>;
				if (!voiceChannels) { console.log("no voice channels"); return; }

				let activeChannels = voiceChannels.filter(voiceChannel => voiceChannel.joinable && voiceChannel.members.size > 0);
				if (!activeChannels) { console.log("no active voice channels"); return; }

				let popularChannel = activeChannels.sort((a, b) => (a.members.size < b.members.size) ? 1 : (a.members.size > b.members.size) ? -1 : 0).first();
				if (!popularChannel) { console.log("no popular voice channels"); return; }

				popularChannel.join().then(connection => {
					const dispatcher = connection.playFile("./sounds/10minuteWarning.ogg", { volume: 0.4 });
					dispatcher.on("end", () => connection.disconnect());
				}).catch(console.error);
			} else if (diffInMinutes <= 361 && diffInMinutes >= 359 && !store.notified6h.includes(name)){
				store.notified6h.push(name);

				let guild = this.client.guilds.get(config.guild);
				if (!guild) { console.log("no guild"); return; }

				let raff = guild.members.find("id", "149893533271064576");
				if (!raff) { console.log("no raff"); return; }

				channel.send(`**${name}** timer will expire in 6 hours. <@${raff.id}>`);

				let voiceChannels = guild.channels.filter(channel => channel.type === "voice") as Collection<string, VoiceChannel>;
				if (!voiceChannels) { console.log("no voice channels"); return; }

				let activeChannels = voiceChannels.filter(voiceChannel => voiceChannel.joinable && voiceChannel.members.size > 0);
				if (!activeChannels) { console.log("no active voice channels"); return; }

				let popularChannel = activeChannels.sort((a, b) => (a.members.size < b.members.size) ? 1 : (a.members.size > b.members.size) ? -1 : 0).first();
				if (!popularChannel) { console.log("no popular voice channels"); return; }

				popularChannel.join().then(connection => {
					const dispatcher = connection.playFile("./sounds/6hourwarning.ogg", { volume: 0.25 });
					dispatcher.on("end", () => connection.disconnect());
				}).catch(console.error);
			}
		}

		fs.writeFile("store.json", JSON.stringify(store, null, "\t"), {encoding: "utf8"}, () => {});
	}
};
