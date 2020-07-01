const config = require("./secure.json");
const commando = require('discord.js-commando');
const channel = commando.channels.cache.get(config.LogChanId);
exports.run = (client, message, [mention, ...reason]) => {
    const NoModRole = new Discord.MessageEmbed()
        .setTitle("Config Error!")
        .setColor(0x00AE86)
        .setDescription("No mod role! You must have a role named ``Mods`` **it must me M not m** ")
        .setTimestamp()
    const PermsDeined = new Discord.MessageEmbed()
        .setTitle("You can't do that!")
        .setColor(0x00AE86)
        .setDescription("Either your not a mod, or you dont have ``KICK_MEMBERS`` permission on your role.")
        .setTimestamp()
    /// const BackToHelp = new Discord.MessageEmbed()
    //    .setTitle("Help | Kick Command")
    //    .setColor(0x00AE86)
    //    .setDescription("**!!kick reason user** | Kicks a user")
    //    .setTimestamp()

    // TODO: Add help call for wilson in later update

    //if (!message.member.roles.cache.has(modRole.id))
    //    return message.reply(PermsDeined);

    if (!message.member.hasPermission("KICK_MEMBERS"))
        return message.reply(PermsDeined);

    const kickMember = message.mentions.members.first();

    kickMember.kick(reason.join(" ")).then(member => {
        const Kicked = new Discord.MessageEmbed()
            .setTitle("User has been kicked")
            .setColor(0x00AE86)
            .setDescription(`${member.user.username} was succesfully kicked.`)
            .setTimestamp()
        const LogKick = new Discord.MessageEmbed()
            .setTitle("A User has been kicked")
            .setColor(0x00AE86)
            .setDescription(`${member.user.username} was succesfully kicked.`)
            .setTimestamp()
        message.reply(Kicked);
        channel.send(LogKick);
        

    });
};
