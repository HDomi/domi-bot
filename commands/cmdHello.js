const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('안녕')
		.setDescription('인사를 건네면 대답합니다.'),
	async execute(interaction) {
		// interaction.user를 템플릿 리터럴에 사용하면 자동으로 디스코드 유저 멘션 형태로 변환됩니다.
		await interaction.reply(`안녕하세요 ${interaction.user}님!`);
	},
};
