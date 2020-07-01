const config = require("./secure.json");
const commando = require('discord.js-commando');
const channel = commando.channels.cache.get(config.LogChanId);
exports.run = (client, message, [mention, ...reason]) => {
    const PermsDeined = new Discord.MessageEmbed()
        .setTitle("You can't do that!")
        .setColor(0x00AE86)
        .setDescription("Either your not a mod, or you dont have ``BAN_MEMBERS`` permission on your role.")
        .setTimestamp()
    /// const BackToHelp = new Discord.MessageEmbed()
    //    .setTitle("Help | Kick Command")
    //    .setColor(0x00AE86)
    //    .setDescription("**!!kick reason user** | Kicks a user")
    //    .setTimestamp()

    // TODO: Add help call for wilson in later update

    //if (!message.member.roles.cache.has(modRole.id))
    //    return message.reply(PermsDeined);

    if (!message.member.hasPermission("BAN_MEMBERS"))
        return message.reply(PermsDeined);

    const BanMember = message.mentions.members.first();

    BanMember.ban(reason.join(" ")).then(member => {
        const ban = new Discord.MessageEmbed()
            .setTitle("User has been Banned")
            .setColor(0x00AE86)
            .setDescription(`${member.user.username} was succesfully Banned.`)
            .setTimestamp()
        const BanLog = new Discord.MessageEmbed()
            .setTitle("A User has been Banned")
            .setColor(0x00AE86)
            .setDescription(`${member.user.username} was succesfully Banned.`)
            .setTimestamp()
        message.reply(ban);
        channel.send(BanLog);
        

    });
};
