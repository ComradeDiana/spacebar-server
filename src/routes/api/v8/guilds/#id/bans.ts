import { Request, Response, Router } from "express";
import { BanModel, getPermission, GuildBanAddEvent, GuildBanRemoveEvent, GuildModel } from "fosscord-server-util";
import { HTTPError } from "lambert-server";
import { getIpAdress } from "../../../../../middlewares/GlobalRateLimit";
import { BanCreateSchema } from "../../../../../schema/Ban";
import { emitEvent } from "../../../../../util/Event";
import { check } from "../../../../../util/instanceOf";
import { removeMember } from "../../../../../util/Member";
import { getPublicUser } from "../../../../../util/User";

const router: Router = Router();

router.get("/", async (req: Request, res: Response) => {
	const guild_id = BigInt(req.params.id);

	const guild = await GuildModel.findOne({ id: guild_id }).exec();
	if (!guild) throw new HTTPError("Guild not found", 404);

	var bans = await BanModel.find({ guild_id: guild_id }).exec();
	return res.json(bans);
});

router.post("/:userid", check(BanCreateSchema), async (req: Request, res: Response) => {
	const guild_id = BigInt(req.params.id);
	const banned_user_id = BigInt(req.params.userid);

	const banned_user = await getPublicUser(banned_user_id);
	const perms = await getPermission(req.userid, guild_id);
	if (!perms.has("BAN_MEMBERS")) throw new HTTPError("You don't have the permission to ban members", 403);
	if (req.userid === banned_user_id) throw new HTTPError("You can't ban yourself", 400);

	await removeMember(banned_user_id, guild_id);

	const ban = await new BanModel({
		user_id: banned_user_id,
		guild_id: guild_id,
		ip: getIpAdress(req),
		executor_id: req.userid,
		reason: req.body.reason, // || otherwise empty
	}).save();

	await emitEvent({
		event: "GUILD_BAN_ADD",
		data: {
			guild_id: guild_id,
			user: banned_user,
		},
		guild_id: guild_id,
	} as GuildBanAddEvent);

	return res.json(ban).send();
});

router.delete("/:userid", async (req: Request, res: Response) => {
	var guild_id = BigInt(req.params.id);
	var banned_user_id = BigInt(req.params.userid);

	const banned_user = await getPublicUser(banned_user_id);
	const guild = await GuildModel.findOne({ id: guild_id }).exec();
	if (!guild) throw new HTTPError("Guild not found", 404);

	const perms = await getPermission(req.userid, guild.id);
	if (!perms.has("BAN_MEMBERS")) {
		throw new HTTPError("No permissions", 403);
	}

	await BanModel.deleteOne({
		user_id: banned_user_id,
		guild_id: guild.id,
	}).exec();

	await emitEvent({
		event: "GUILD_BAN_REMOVE",
		data: {
			guild_id: guild.id,
			user: banned_user,
		},
		guild_id: guild.id,
	} as GuildBanRemoveEvent);

	return res.status(204).send();
});
